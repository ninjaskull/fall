#!/bin/bash

# Simple AWS EC2 Deployment Script for Campaign Manager
# This script creates a basic EC2 instance and deploys the application

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}INFO: $1${NC}"; }
print_success() { echo -e "${GREEN}SUCCESS: $1${NC}"; }
print_error() { echo -e "${RED}ERROR: $1${NC}"; }
print_warning() { echo -e "${YELLOW}WARNING: $1${NC}"; }

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI not configured. Run 'aws configure' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Get user inputs
get_inputs() {
    print_info "Collecting deployment configuration..."
    
    echo -n "AWS Region (e.g., us-east-1): "
    read AWS_REGION
    
    echo -n "EC2 Key Pair Name: "
    read KEY_PAIR_NAME
    
    echo -n "Instance Type [t3.small]: "
    read INSTANCE_TYPE
    INSTANCE_TYPE=${INSTANCE_TYPE:-t3.small}
    
    echo -n "Dashboard Password: "
    read -s DASHBOARD_PASSWORD
    echo
    
    echo -n "Database URL (PostgreSQL connection string): "
    read -s DATABASE_URL
    echo
    
    # Optional email configuration
    echo -n "Brevo API Key (optional, press Enter to skip): "
    read -s BREVO_API_KEY
    echo
    
    if [ -n "$BREVO_API_KEY" ]; then
        echo -n "From Email: "
        read FROM_EMAIL
        echo -n "To Email: "
        read TO_EMAIL
    fi
    
    print_success "Configuration collected"
}

# Deploy to AWS
deploy() {
    print_info "Starting deployment..."
    
    # Generate unique names
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    APP_NAME="campaign-manager-$TIMESTAMP"
    
    # Get default VPC
    print_info "Getting default VPC..."
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region "$AWS_REGION" --query 'Vpcs[0].VpcId' --output text)
    
    if [ "$VPC_ID" = "None" ]; then
        print_error "No default VPC found. Please create a VPC first."
        exit 1
    fi
    
    print_success "Using VPC: $VPC_ID"
    
    # Get default subnet
    print_info "Getting default subnet..."
    SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" --region "$AWS_REGION" --query 'Subnets[0].SubnetId' --output text)
    
    print_success "Using subnet: $SUBNET_ID"
    
    # Create security group
    print_info "Creating security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$APP_NAME-sg" \
        --description "Security group for Campaign Manager" \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" \
        --query 'GroupId' --output text)
    
    # Add security group rules
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 5000 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    
    print_success "Security group created: $SG_ID"
    
    # Get latest Amazon Linux 2023 AMI
    print_info "Getting latest Amazon Linux 2023 AMI..."
    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" \
        --region "$AWS_REGION" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text)
    
    print_success "Using AMI: $AMI_ID"
    
    # Create user data script
    print_info "Creating deployment script..."
    
    cat > user-data.sh << EOF
#!/bin/bash
exec > >(tee /var/log/user-data.log) 2>&1

# Update system
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

# Install nginx
yum install -y nginx

# Install PM2 globally
npm install -g pm2

# Create app user
useradd -m -s /bin/bash appuser

# Create app directory
mkdir -p /opt/campaign-manager
cd /opt/campaign-manager

# Clone or download application (simplified - using git)
# For now, create a simple package.json and install dependencies
cat > package.json << 'EOPKG'
{
  "name": "campaign-manager",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/index.js",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --bundle --platform=node --target=node18 --outfile=server/index.js --external:@neondatabase/serverless --external:ws --external:bcrypt --external:multer --format=esm",
    "db:push": "drizzle-kit push"
  }
}
EOPKG

# Set ownership
chown -R appuser:appuser /opt/campaign-manager

# Install dependencies and build (simplified)
sudo -u appuser bash << 'EOSU'
cd /opt/campaign-manager

# Create a simple server file for testing
mkdir -p server
cat > server/index.js << 'EOSERVER'
import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static('dist'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('*', (req, res) => {
  res.json({ message: 'Campaign Manager API - Deployment in Progress' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on port \${PORT}\`);
});
EOSERVER

# Install express for basic server
npm init -y
npm install express

# Create ecosystem file for PM2
cat > ecosystem.config.js << 'EOECO'
module.exports = {
  apps: [{
    name: 'campaign-manager',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: '$DATABASE_URL',
      DASHBOARD_PASSWORD: '$DASHBOARD_PASSWORD',
      ENCRYPTION_KEY: '$(openssl rand -hex 32)',
$([ -n "$BREVO_API_KEY" ] && echo "      BREVO_API_KEY: '$BREVO_API_KEY',")
$([ -n "$FROM_EMAIL" ] && echo "      FROM_EMAIL: '$FROM_EMAIL',")
$([ -n "$TO_EMAIL" ] && echo "      TO_EMAIL: '$TO_EMAIL',")
    }
  }]
};
EOECO

# Start application
pm2 start ecosystem.config.js
pm2 save
EOSU

# Configure PM2 to start on boot
env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u appuser --hp /home/appuser
systemctl enable pm2-appuser

# Configure nginx
cat > /etc/nginx/conf.d/campaign-manager.conf << 'EONGINX'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EONGINX

# Remove default nginx config
rm -f /etc/nginx/sites-enabled/default

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

# Create uploads directory
mkdir -p /opt/campaign-manager/uploads
chown appuser:appuser /opt/campaign-manager/uploads

# Log completion
echo "Basic Campaign Manager deployment completed at \$(date)" >> /var/log/deployment.log
echo "Application should be accessible on port 5000" >> /var/log/deployment.log
EOF
    
    # Launch EC2 instance
    print_info "Launching EC2 instance..."
    
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --count 1 \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_PAIR_NAME" \
        --security-group-ids "$SG_ID" \
        --subnet-id "$SUBNET_ID" \
        --associate-public-ip-address \
        --user-data file://user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME}]" \
        --region "$AWS_REGION" \
        --query 'Instances[0].InstanceId' --output text)
    
    print_success "EC2 instance launched: $INSTANCE_ID"
    
    # Wait for instance to be running
    print_info "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
    
    print_success "Instance is running with IP: $PUBLIC_IP"
    
    # Wait for deployment
    print_info "Waiting for application deployment (this may take 5-10 minutes)..."
    
    # Check health endpoint
    for i in {1..20}; do
        sleep 30
        print_info "Checking deployment status (attempt $i/20)..."
        
        if curl -s --connect-timeout 10 "http://$PUBLIC_IP/api/health" > /dev/null 2>&1; then
            print_success "Application is running and healthy!"
            break
        fi
        
        if [ $i -eq 20 ]; then
            print_warning "Deployment may still be in progress. Check manually."
        fi
    done
    
    # Cleanup
    rm -f user-data.sh
    
    # Show results
    echo ""
    echo "========================================="
    echo "DEPLOYMENT COMPLETE!"
    echo "========================================="
    echo ""
    echo "Application URL: http://$PUBLIC_IP"
    echo "Instance ID: $INSTANCE_ID"
    echo "Public IP: $PUBLIC_IP"
    echo "Region: $AWS_REGION"
    echo ""
    echo "SSH Access: ssh -i ~/.ssh/$KEY_PAIR_NAME.pem ec2-user@$PUBLIC_IP"
    echo "Health Check: curl http://$PUBLIC_IP/api/health"
    echo ""
    echo "Next Steps:"
    echo "1. Visit http://$PUBLIC_IP to access your application"
    echo "2. SSH into the server to upload your application files"
    echo "3. Configure your domain DNS (if applicable)"
    echo ""
}

# Main execution
main() {
    echo "========================================"
    echo "Campaign Manager - Simple AWS Deployment"
    echo "========================================"
    echo ""
    
    check_prerequisites
    get_inputs
    deploy
    
    print_success "Deployment script completed!"
}

# Error handling
trap 'print_error "Deployment failed! Check the error messages above."' ERR

# Run main function
main "$@"