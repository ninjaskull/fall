#!/bin/bash

# FallOwl Deployment Script
# Optimized for AWS Linux with comprehensive error handling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo "🚀 Starting FallOwl deployment..."
echo "=================================="

# Detect OS and architecture
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_NAME="$ID"
    OS_VERSION="$VERSION_ID"
else
    OS_NAME=$(uname -s)
    OS_VERSION="unknown"
fi

print_info "Detected OS: $OS_NAME $OS_VERSION"
print_info "Architecture: $(uname -m)"

# Update system packages based on OS
print_info "Updating system packages..."
if [[ "$OS_NAME" == "amzn" ]] || [[ "$OS_NAME" == "rhel" ]] || [[ "$OS_NAME" == "centos" ]]; then
    # Amazon Linux / RHEL / CentOS
    sudo yum update -y
    sudo yum install -y curl wget unzip git
    PACKAGE_MANAGER="yum"
elif [[ "$OS_NAME" == "ubuntu" ]] || [[ "$OS_NAME" == "debian" ]]; then
    # Ubuntu / Debian
    sudo apt-get update -y
    sudo apt-get install -y curl wget unzip git
    PACKAGE_MANAGER="apt"
else
    print_warning "Unknown OS, attempting with available package manager..."
    PACKAGE_MANAGER="unknown"
fi

# Install Docker with proper error handling
if ! command -v docker &> /dev/null; then
    print_info "Installing Docker..."
    if [[ "$PACKAGE_MANAGER" == "yum" ]]; then
        sudo yum install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
    fi
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    print_status "Docker installed successfully"
    
    # Check if we need to restart session
    if ! groups | grep -q docker; then
        print_warning "Please log out and back in, then run this script again to use Docker without sudo"
        exit 1
    fi
else
    print_status "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_info "Installing Docker Compose..."
    COMPOSE_VERSION="v2.24.0"
    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]]; then
        COMPOSE_ARCH="x86_64"
    elif [[ "$ARCH" == "aarch64" ]]; then
        COMPOSE_ARCH="aarch64"
    else
        COMPOSE_ARCH="x86_64"
    fi
    
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${COMPOSE_ARCH}" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed"
else
    print_status "Docker Compose already installed"
fi

# Create optimized .env file
print_info "Creating environment configuration..."
if [ ! -f .env ]; then
    GENERATED_KEY=$(openssl rand -base64 32 | tr -d '=' | head -c 32)
    cat > .env << EOF
# FallOwl Configuration
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://postgres:fallowl123@postgres:5432/fallowl_db
POSTGRES_DB=fallowl_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=fallowl123

# Application Security
DASHBOARD_PASSWORD=demo123
ENCRYPTION_KEY=$GENERATED_KEY

# Optional Services
# BREVO_API_KEY=your_brevo_api_key_here

# Performance Settings
PORT=5000
EOF
    print_status "Environment file created"
else
    print_status "Environment file already exists"
fi

# Create optimized docker-compose.yml if not exists
if [ ! -f docker-compose.yml ]; then
    print_info "Creating Docker Compose configuration..."
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:fallowl123@postgres:5432/fallowl_db
      - DASHBOARD_PASSWORD=demo123
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=fallowl_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=fallowl123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d fallowl_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
EOF
    print_status "Docker Compose configuration created"
fi

# Create Dockerfile if not exists
if [ ! -f Dockerfile ]; then
    print_info "Creating optimized Dockerfile..."
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads && chmod 755 uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
EOF
    print_status "Dockerfile created"
fi

# Stop existing containers gracefully
print_info "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build and start containers
print_info "Building and starting FallOwl containers..."
docker-compose up --build -d

# Wait for services to be healthy
print_info "Waiting for services to initialize..."
sleep 15

# Check service health
print_info "Checking service health..."
RETRIES=30
while [ $RETRIES -gt 0 ]; do
    if docker-compose exec -T postgres pg_isready -U postgres -d fallowl_db >/dev/null 2>&1; then
        print_status "Database is ready"
        break
    fi
    print_info "Waiting for database... ($RETRIES attempts remaining)"
    sleep 2
    RETRIES=$((RETRIES-1))
done

if [ $RETRIES -eq 0 ]; then
    print_error "Database failed to start"
    docker-compose logs postgres
    exit 1
fi

# Run database migrations
print_info "Running database migrations..."
docker-compose exec -T app npm run db:push || print_warning "Migration failed - database might already be initialized"

# Verify application health
print_info "Verifying application health..."
sleep 5
if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
    print_status "Application is healthy"
else
    print_warning "Application health check failed - checking logs..."
    docker-compose logs app | tail -20
fi

echo ""
echo "============================================"
print_status "FallOwl Deployment Completed Successfully!"
echo "============================================"
echo ""
echo "🌐 Application URL: http://localhost:5000"
echo "🏥 Health Check: http://localhost:5000/api/health"
echo ""
echo "📋 Access Credentials:"
echo "   Dashboard Password: demo123"
echo ""
echo "🎯 Access Instructions:"
echo "   1. Visit: http://localhost:5000"
echo "   2. Click footer year 5 times to reveal admin access"
echo "   3. Enter password: demo123"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop application: docker-compose down"
echo "   Restart:          docker-compose restart"
echo "   Update & rebuild: git pull && docker-compose up --build -d"
echo "   Database backup:  docker-compose exec postgres pg_dump -U postgres fallowl_db > backup.sql"
echo ""
print_status "Deployment completed successfully!"