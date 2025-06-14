#!/bin/bash

# FallOwl Installation Script
# Optimized for AWS Linux with comprehensive dependency management

set -e

echo "🚀 FallOwl - Universal Installer"
echo "================================"

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

# Detect environment
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_NAME="$ID"
    OS_VERSION="$VERSION_ID"
    print_info "Detected OS: $PRETTY_NAME"
else
    OS_NAME=$(uname -s | tr '[:upper:]' '[:lower:]')
    OS_VERSION="unknown"
    print_info "Detected OS: $OS_NAME"
fi

# Check if running on AWS
AWS_INSTANCE=false
if curl -s --max-time 3 http://169.254.169.254/latest/meta-data/instance-id >/dev/null 2>&1; then
    AWS_INSTANCE=true
    INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type)
    print_status "Running on AWS EC2: $INSTANCE_TYPE"
fi

# Check if running as root
INSTALL_AS_ROOT=false
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root - will create fallowl user for application"
    INSTALL_AS_ROOT=true
else
    print_info "Running as user: $(whoami)"
fi

# Install system dependencies based on OS
print_info "Installing system dependencies..."
if [[ "$OS_NAME" == "amzn" ]] || [[ "$OS_NAME" == "rhel" ]] || [[ "$OS_NAME" == "centos" ]]; then
    if [[ "$INSTALL_AS_ROOT" == true ]]; then
        yum update -y
        yum groupinstall -y "Development Tools"
        yum install -y curl wget unzip git openssl
    else
        sudo yum update -y
        sudo yum groupinstall -y "Development Tools"
        sudo yum install -y curl wget unzip git openssl
    fi
    PACKAGE_MANAGER="yum"
elif [[ "$OS_NAME" == "ubuntu" ]] || [[ "$OS_NAME" == "debian" ]]; then
    if [[ "$INSTALL_AS_ROOT" == true ]]; then
        apt-get update -y
        apt-get install -y build-essential curl wget unzip git openssl
    else
        sudo apt-get update -y
        sudo apt-get install -y build-essential curl wget unzip git openssl
    fi
    PACKAGE_MANAGER="apt"
else
    print_warning "Unknown OS - proceeding with manual checks"
    PACKAGE_MANAGER="unknown"
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first:"
    print_info "Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js $(node --version) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

# Install dependencies
print_info "Installing dependencies..."
npm install --production=false

# Create uploads directory
mkdir -p uploads
print_status "Created uploads directory"

# Generate .env file if it doesn't exist
if [ ! -f .env ]; then
    print_info "Creating environment configuration..."
    
    # Generate random encryption key
    ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # Generate random password
    DASHBOARD_PASSWORD=$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64 | tr -d '=' | head -c 16)
    
    cat > .env << EOF
# Campaign Management App Configuration
# Generated on $(date)

# Database Configuration
DATABASE_URL=postgresql://localhost:5432/campaign_db

# Security Settings
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Application Settings
NODE_ENV=production
PORT=5000

# Optional: Email Service (uncomment and configure if needed)
# BREVO_API_KEY=your_brevo_api_key_here
EOF

    print_status "Generated .env file with secure defaults"
    print_warning "Database URL set to localhost - update .env if using external database"
    print_info "Generated dashboard password: $DASHBOARD_PASSWORD"
else
    print_status "Using existing .env file"
fi

# Build the application
print_info "Building application..."
npm run build

print_status "Build completed successfully"

# Deployment options
echo ""
print_info "🎉 Installation Complete!"
echo ""
echo "Choose your deployment method:"
echo ""
echo "1. 🐳 Docker (Recommended - includes database)"
echo "   ./deploy.sh"
echo ""
echo "2. 📦 Local with external database"
echo "   Update DATABASE_URL in .env, then:"
echo "   npm start"
echo ""
echo "3. ☁️  Cloud Platform"
echo "   - Railway: npm run deploy:railway"
echo "   - Heroku: npm run deploy:heroku"
echo "   - Fly.io: npm run deploy:fly"
echo ""
echo "4. 🔧 Development mode"
echo "   npm run dev"
echo ""

# Check for PostgreSQL
if command -v psql &> /dev/null; then
    print_status "PostgreSQL detected - you can run locally"
    echo "   To setup local database:"
    echo "   createdb campaign_db"
    echo "   npm run db:push"
    echo "   npm start"
else
    print_warning "PostgreSQL not detected - consider using Docker deployment"
fi

echo ""
print_info "📝 Configuration:"
echo "   Dashboard password: Check .env file"
echo "   Default port: 5000"
echo "   Health check: http://localhost:5000/api/health"
echo ""
print_info "📚 Documentation: README.md"
print_info "🆘 Support: Check troubleshooting section in README.md"