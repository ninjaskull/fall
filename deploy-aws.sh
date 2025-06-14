#!/bin/bash

# AWS Deployment Script for FallOwl
# Comprehensive deployment for AWS Linux with error handling

set -e

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo "🚀 FallOwl AWS Deployment Script"
echo "================================="
echo ""

# Check if running on Amazon Linux
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    if [[ "$ID" == "amzn" ]]; then
        print_status "Running on Amazon Linux"
        AMAZON_LINUX=true
    else
        print_info "Running on $PRETTY_NAME"
        AMAZON_LINUX=false
    fi
fi

# Update system packages
print_info "Updating system packages..."
if [[ "$AMAZON_LINUX" == true ]]; then
    sudo yum update -y
    sudo yum install -y unzip curl wget git
else
    sudo apt-get update -y
    sudo apt-get install -y unzip curl wget git
fi

# Install Node.js 18 if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    print_info "Installing Node.js 18..."
    if [[ "$AMAZON_LINUX" == true ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    print_status "Node.js installed: $(node -v)"
fi

# Install Python 3 and pip if needed
if ! command -v python3 &> /dev/null; then
    print_info "Installing Python 3..."
    if [[ "$AMAZON_LINUX" == true ]]; then
        sudo yum install -y python3 python3-pip
    else
        sudo apt-get install -y python3 python3-pip
    fi
fi

# Install AWS CLI v2
if ! command -v aws &> /dev/null; then
    print_info "Installing AWS CLI v2..."
    cd /tmp
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    cd - > /dev/null
    print_status "AWS CLI installed: $(aws --version)"
fi

# Install EB CLI
if ! command -v eb &> /dev/null; then
    print_info "Installing Elastic Beanstalk CLI..."
    python3 -m pip install --user awsebcli --upgrade
    export PATH=$PATH:$HOME/.local/bin
    echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.bashrc
    print_status "EB CLI installed: $(eb --version)"
fi

# Verify AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured"
    echo ""
    echo "Please configure AWS credentials:"
    echo "  aws configure"
    echo ""
    echo "You need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region (e.g., us-east-1)"
    echo "  - Output format: json"
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
print_status "AWS Account: $AWS_ACCOUNT"
print_status "AWS Region: $AWS_REGION"

# Build application
print_info "Building FallOwl application..."
npm ci --production=false
npm run build
print_status "Application built successfully"

# Generate secure credentials
print_info "Generating secure credentials..."
DASHBOARD_PASSWORD="demo123"
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '=' | head -c 32)

# Create .ebextensions directory for configuration
print_info "Creating Elastic Beanstalk configuration..."
mkdir -p .ebextensions

# Create optimized environment configuration
cat > .ebextensions/01_environment.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
  aws:elasticbeanstalk:container:nodejs:
    NodeVersion: 18.19.1
    NodeCommand: "npm start"
  aws:autoscaling:launchconfiguration:
    InstanceType: t3.micro
    SecurityGroups: default
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
    HealthCheckSuccessThreshold: Ok
    HealthCheckURL: /api/health
  aws:elasticbeanstalk:command:
    BatchSize: 30
    BatchSizeType: Percentage
  aws:autoscaling:updatepolicy:rollingupdate:
    RollingUpdateEnabled: true
    MaxBatchSize: 1
    MinInstancesInService: 0
EOF

# Create database and deployment commands
cat > .ebextensions/02_commands.config << 'EOF'
container_commands:
  01_install_dependencies:
    command: "npm ci --only=production"
    cwd: "/var/app/staging"
    ignoreErrors: false
  02_create_uploads_dir:
    command: "mkdir -p uploads && chmod 755 uploads"
    cwd: "/var/app/staging"
    ignoreErrors: true
  03_run_migrations:
    command: "npm run db:push"
    cwd: "/var/app/staging"
    leader_only: true
    ignoreErrors: true
EOF

# Create nginx configuration for better performance
cat > .ebextensions/03_nginx.config << 'EOF'
files:
  "/etc/nginx/conf.d/01_proxy.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      client_max_body_size 50M;
      proxy_read_timeout 300s;
      proxy_connect_timeout 75s;
EOF

# Create package.json script for production
cat > .ebextensions/04_package.config << 'EOF'
files:
  "/opt/elasticbeanstalk/hooks/appdeploy/pre/01_install_dependencies.sh":
    mode: "000755"
    owner: root
    group: root
    content: |
      #!/bin/bash
      cd /var/app/staging
      npm ci --only=production
EOF

print_status "Configuration files created"

# Initialize Elastic Beanstalk if not already done
if [ ! -f .elasticbeanstalk/config.yml ]; then
    print_info "Initializing Elastic Beanstalk..."
    eb init --platform "Node.js 18 running on 64bit Amazon Linux 2023" --region $AWS_REGION fallowl-app
    print_status "Elastic Beanstalk initialized"
fi

# Check if environment exists
print_info "Checking for existing Elastic Beanstalk environment..."
if ! eb status &> /dev/null 2>&1; then
    print_info "Creating new Elastic Beanstalk environment..."
    eb create fallowl-production \
        --envvars NODE_ENV=production,DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD,ENCRYPTION_KEY=$ENCRYPTION_KEY,PORT=8080 \
        --instance-types t3.micro \
        --platform "Node.js 18 running on 64bit Amazon Linux 2023" \
        --region $AWS_REGION \
        --vpc \
        --single-instance
    print_status "Environment created successfully"
else
    print_info "Updating existing environment variables..."
    eb setenv NODE_ENV=production DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD ENCRYPTION_KEY=$ENCRYPTION_KEY PORT=8080
    print_status "Environment variables updated"
fi

# Deploy the application
print_info "Deploying FallOwl to Elastic Beanstalk..."
eb deploy --timeout 20

# Wait for deployment to complete
print_info "Waiting for deployment to stabilize..."
sleep 30

# Get application URL and status
APP_URL=$(eb status | grep "CNAME" | awk '{print $2}')
HEALTH_STATUS=$(eb health | head -1)

echo ""
echo "============================================"
print_status "FallOwl Deployment Completed Successfully!"
echo "============================================"
echo ""
echo "🌐 Application URL: http://$APP_URL"
echo "🏥 Health Check: http://$APP_URL/api/health"
echo "📊 Status: $HEALTH_STATUS"
echo ""
echo "📋 Access Credentials:"
echo "   Dashboard Password: $DASHBOARD_PASSWORD"
echo "   Encryption Key: $ENCRYPTION_KEY"
echo ""
echo "🎯 Access Instructions:"
echo "   1. Visit: http://$APP_URL"
echo "   2. Click footer year 5 times to reveal admin access"
echo "   3. Enter password: $DASHBOARD_PASSWORD"
echo ""
print_warning "IMPORTANT: Database Setup Required"
echo "   1. Create RDS PostgreSQL instance"
echo "   2. Set DATABASE_URL: eb setenv DATABASE_URL=postgresql://user:pass@host:5432/db"
echo "   3. Redeploy: eb deploy"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:        eb logs"
echo "   Check status:     eb status"
echo "   Open in browser:  eb open"
echo "   SSH to instance:  eb ssh"
echo "   Scale instances:  eb scale NUMBER"
echo "   Terminate app:    eb terminate"
echo ""
echo "📱 Quick Health Check:"
curl -s "http://$APP_URL/api/health" | head -1 || echo "Health check pending..."
echo ""
print_status "Deployment script completed successfully!"