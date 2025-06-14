#!/bin/bash

# Simple deployment script for FallOwl
# Works on any Linux server with Docker

set -e

echo "🚀 Starting deployment of FallOwl..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. Please log out and back in, then run this script again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file with default values..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/campaign_db
POSTGRES_DB=campaign_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# App Configuration
DASHBOARD_PASSWORD=demo123
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Optional: Email Service (Brevo)
# BREVO_API_KEY=your_brevo_api_key_here
EOF
    echo "✅ Created .env file. Please edit it with your actual values."
    echo "⚠️  Make sure to change the default passwords!"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans || true

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up --build -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker-compose exec -T app npm run db:push || echo "⚠️  Migration failed - database might already be initialized"

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is now running at:"
echo "   http://localhost:5000"
echo ""
echo "📋 Default credentials:"
echo "   Dashboard Password: demo123 (change in .env file)"
echo ""
echo "🔧 To manage your deployment:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop app:     docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Update:       git pull && docker-compose up --build -d"