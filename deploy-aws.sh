#!/bin/bash

# AWS Deployment Script for Campaign Management App
# Automates Elastic Beanstalk deployment

set -e

echo "🚀 AWS Elastic Beanstalk Deployment Script"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Installing..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    print_status "AWS CLI installed"
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    print_error "EB CLI is not installed. Installing..."
    pip3 install awsebcli --upgrade --user
    export PATH=$PATH:~/.local/bin
    print_status "EB CLI installed"
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first"
    echo "You need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region (e.g., us-east-1)"
    exit 1
fi

print_status "AWS credentials configured"

# Build the application
echo "Building application..."
npm install
npm run build
print_status "Application built"

# Initialize Elastic Beanstalk if not already done
if [ ! -f .elasticbeanstalk/config.yml ]; then
    echo "Initializing Elastic Beanstalk..."
    eb init --platform node.js --region us-east-1 campaign-management-app
    print_status "Elastic Beanstalk initialized"
fi

# Create .ebextensions directory for configuration
mkdir -p .ebextensions

# Create database migration configuration
cat > .ebextensions/01_database.config << 'EOF'
container_commands:
  01_install_dependencies:
    command: "npm install"
    cwd: "/var/app/staging"
  02_run_migrations:
    command: "npm run db:push"
    cwd: "/var/app/staging"
    leader_only: true
EOF

# Create environment variables configuration
cat > .ebextensions/02_environment.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
  aws:elasticbeanstalk:container:nodejs:
    NodeVersion: 18.19.0
    NodeCommand: "npm start"
  aws:autoscaling:launchconfiguration:
    InstanceType: t3.micro
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
    HealthCheckSuccessThreshold: Ok
    HealthCheckURL: /api/health
EOF

print_status "Configuration files created"

# Generate secure environment variables
DASHBOARD_PASSWORD=$(openssl rand -base64 16 | tr -d '=' | head -c 16)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '=' | head -c 32)

echo "Generated secure credentials:"
echo "Dashboard Password: $DASHBOARD_PASSWORD"
echo "Encryption Key: $ENCRYPTION_KEY"
echo ""
print_warning "Save these credentials - you'll need them to access your app!"

# Create environment if it doesn't exist
if ! eb status &> /dev/null; then
    echo "Creating Elastic Beanstalk environment..."
    eb create production \
        --envvars DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD,ENCRYPTION_KEY=$ENCRYPTION_KEY \
        --instance-types t3.micro \
        --platform "Node.js 18 running on 64bit Amazon Linux 2023"
    print_status "Environment created"
else
    # Update environment variables
    eb setenv DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD ENCRYPTION_KEY=$ENCRYPTION_KEY
    print_status "Environment variables updated"
fi

# Deploy the application
echo "Deploying to Elastic Beanstalk..."
eb deploy

# Get the application URL
APP_URL=$(eb status | grep "CNAME" | awk '{print $2}')

print_status "Deployment completed!"
echo ""
echo "🌐 Your app is available at: http://$APP_URL"
echo "🏥 Health check: http://$APP_URL/api/health"
echo ""
echo "📋 Access credentials:"
echo "   Dashboard Password: $DASHBOARD_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: You still need to set up your PostgreSQL database"
echo "   1. Go to AWS RDS Console"
echo "   2. Create a PostgreSQL database"
echo "   3. Update DATABASE_URL: eb setenv DATABASE_URL=postgresql://..."
echo "   4. Redeploy: eb deploy"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     eb logs"
echo "   Check status:  eb status"
echo "   Open app:      eb open"
echo "   Terminate:     eb terminate"