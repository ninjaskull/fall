#!/bin/bash

# Complete AWS EC2 Deployment Script for Campaign Manager
# This script packages and deploys the actual application

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
        print_error "AWS CLI not found. Install from: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI not configured. Run: aws configure"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Install Node.js first."
        exit 1
    fi
    
    print_success "Prerequisites verified"
}

# Get deployment configuration
get_config() {
    print_info "Enter deployment configuration:"
    
    read -p "AWS Region (e.g., us-east-1): " AWS_REGION
    read -p "EC2 Key Pair Name: " KEY_PAIR_NAME
    read -p "Instance Type [t3.small]: " INSTANCE_TYPE
    INSTANCE_TYPE=${INSTANCE_TYPE:-t3.small}
    
    echo -n "Dashboard Password: "
    read -s DASHBOARD_PASSWORD
    echo
    
    echo -n "Database URL (PostgreSQL): "
    read -s DATABASE_URL
    echo
    
    # Optional configurations
    read -p "Brevo API Key (optional): " BREVO_API_KEY
    if [ -n "$BREVO_API_KEY" ]; then
        read -p "From Email: " FROM_EMAIL
        read -p "To Email: " TO_EMAIL
    fi
    
    read -p "Custom Domain (optional): " DOMAIN_NAME
    
    print_success "Configuration collected"
}

# Build application
build_app() {
    print_info "Building application..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi
    
    # Build the application
    print_info "Building client and server..."
    npm run build
    
    print_success "Application built successfully"
}

# Create deployment package
create_package() {
    print_info "Creating deployment package..."
    
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    DEPLOY_DIR="/tmp/campaign-manager-$TIMESTAMP"
    mkdir -p "$DEPLOY_DIR"
    
    # Copy application files
    print_info "Copying application files..."
    
    # Copy essential files
    cp -r dist "$DEPLOY_DIR/"
    cp -r server "$DEPLOY_DIR/"
    cp -r shared "$DEPLOY_DIR/"
    cp package.json "$DEPLOY_DIR/"
    cp package-lock.json "$DEPLOY_DIR/" 2>/dev/null || true
    cp drizzle.config.ts "$DEPLOY_DIR/"
    
    # Copy other necessary files
    mkdir -p "$DEPLOY_DIR/uploads"
    
    # Create production package.json
    cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "campaign-manager",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/index.js",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.0",
    "@getbrevo/brevo": "^2.0.0",
    "bcrypt": "^5.1.1",
    "drizzle-orm": "^0.36.0",
    "drizzle-kit": "^0.31.0",
    "drizzle-zod": "^0.5.1",
    "express": "^4.21.0",
    "express-session": "^1.18.0",
    "multer": "^1.4.5-lts.1",
    "nanoid": "^5.0.9",
    "papaparse": "^5.4.1",
    "ws": "^8.18.0",
    "zod": "^3.23.8"
  }
}
EOF
    
    print_success "Deployment package created at $DEPLOY_DIR"
    echo "$DEPLOY_DIR" > /tmp/deploy_dir.txt
}

# Deploy to AWS
deploy_aws() {
    print_info "Starting AWS deployment..."
    
    DEPLOY_DIR=$(cat /tmp/deploy_dir.txt)
    APP_NAME="campaign-manager-$(date +%Y%m%d%H%M%S)"
    
    # Create S3 bucket for deployment
    S3_BUCKET="$APP_NAME-deploy-$(echo $RANDOM | md5sum | head -c 8)"
    print_info "Creating S3 bucket: $S3_BUCKET"
    aws s3 mb "s3://$S3_BUCKET" --region "$AWS_REGION"
    
    # Package and upload application
    print_info "Packaging application..."
    cd "$DEPLOY_DIR"
    tar -czf ../app.tar.gz .
    aws s3 cp ../app.tar.gz "s3://$S3_BUCKET/" --region "$AWS_REGION"
    cd - > /dev/null
    
    # Get default VPC and subnet
    print_info "Setting up AWS infrastructure..."
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region "$AWS_REGION" --query 'Vpcs[0].VpcId' --output text)
    SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" --region "$AWS_REGION" --query 'Subnets[0].SubnetId' --output text)
    
    # Create security group
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$APP_NAME-sg" \
        --description "Campaign Manager Security Group" \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" \
        --query 'GroupId' --output text)
    
    # Configure security group
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    
    # Get Amazon Linux 2023 AMI
    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" \
        --region "$AWS_REGION" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text)
    
    # Create IAM role for S3 access
    ROLE_NAME="$APP_NAME-role"
    cat > trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
    
    aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document file://trust-policy.json --region "$AWS_REGION" || true
    
    # Create S3 access policy
    cat > s3-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::$S3_BUCKET/*"
        }
    ]
}
EOF
    
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "$APP_NAME-s3-policy" \
        --policy-document file://s3-policy.json \
        --region "$AWS_REGION" \
        --query 'Policy.Arn' --output text 2>/dev/null || echo "")
    
    if [ -n "$POLICY_ARN" ]; then
        aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN" --region "$AWS_REGION"
    fi
    
    # Create instance profile
    aws iam create-instance-profile --instance-profile-name "$APP_NAME-profile" --region "$AWS_REGION" || true
    aws iam add-role-to-instance-profile --instance-profile-name "$APP_NAME-profile" --role-name "$ROLE_NAME" --region "$AWS_REGION" || true
    
    sleep 10  # Wait for IAM propagation
    
    # Create user data script
    cat > user-data.sh << EOF
#!/bin/bash
exec > >(tee /var/log/user-data.log) 2>&1

# Update system
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install nginx and other tools
yum install -y nginx git

# Install PM2
npm install -g pm2

# Create app user
useradd -m -s /bin/bash appuser

# Create app directory
mkdir -p /opt/campaign-manager
cd /opt/campaign-manager

# Download application from S3
aws s3 cp s3://$S3_BUCKET/app.tar.gz . --region $AWS_REGION
tar -xzf app.tar.gz
rm app.tar.gz

# Set permissions
chown -R appuser:appuser /opt/campaign-manager

# Install production dependencies
sudo -u appuser bash << 'EOSU'
cd /opt/campaign-manager
npm ci --only=production

# Create ecosystem file
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

# Run database migrations
npm run db:push

# Start application
pm2 start ecosystem.config.js
pm2 save
EOSU

# Configure PM2 startup
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

# Start nginx
systemctl start nginx
systemctl enable nginx

# Create uploads directory
mkdir -p /opt/campaign-manager/uploads
chown -R appuser:appuser /opt/campaign-manager/uploads

# Log completion
echo "Campaign Manager deployment completed at \$(date)" >> /var/log/deployment.log
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
        --iam-instance-profile Name="$APP_NAME-profile" \
        --user-data file://user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME}]" \
        --region "$AWS_REGION" \
        --query 'Instances[0].InstanceId' --output text)
    
    print_success "Instance launched: $INSTANCE_ID"
    
    # Wait for instance
    print_info "Waiting for instance to start..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
    
    print_success "Instance running at: $PUBLIC_IP"
    
    # Wait for deployment to complete
    print_info "Waiting for application deployment (10-15 minutes)..."
    for i in {1..30}; do
        sleep 30
        if curl -s --connect-timeout 10 "http://$PUBLIC_IP/api/health" > /dev/null 2>&1; then
            print_success "Application is live and healthy!"
            break
        fi
        print_info "Deployment in progress... ($i/30)"
    done
    
    # Cleanup
    rm -f trust-policy.json s3-policy.json user-data.sh
    rm -rf "$DEPLOY_DIR"
    rm -f /tmp/deploy_dir.txt
    
    # Display results
    echo ""
    echo "==========================================="
    echo "🚀 DEPLOYMENT SUCCESSFUL!"
    echo "==========================================="
    echo ""
    echo "Application URL: http://$PUBLIC_IP"
    echo "Instance ID: $INSTANCE_ID"
    echo "Public IP: $PUBLIC_IP"
    echo "Region: $AWS_REGION"
    echo "S3 Bucket: $S3_BUCKET"
    echo ""
    echo "Access Information:"
    echo "• Web: http://$PUBLIC_IP"
    echo "• SSH: ssh -i ~/.ssh/$KEY_PAIR_NAME.pem ec2-user@$PUBLIC_IP"
    echo "• Health: curl http://$PUBLIC_IP/api/health"
    echo ""
    echo "Dashboard Access:"
    echo "1. Visit http://$PUBLIC_IP"
    echo "2. Click footer year 5 times"
    echo "3. Enter your dashboard password"
    echo ""
    if [ -n "$DOMAIN_NAME" ]; then
        echo "Domain Setup:"
        echo "• Point $DOMAIN_NAME A record to $PUBLIC_IP"
        echo ""
    fi
    echo "Management Commands:"
    echo "• View logs: sudo -u appuser pm2 logs"
    echo "• Restart app: sudo -u appuser pm2 restart campaign-manager"
    echo "• App status: sudo -u appuser pm2 status"
    echo ""
}

# Main execution
main() {
    echo "==========================================="
    echo "Campaign Manager - Complete AWS Deployment"
    echo "==========================================="
    echo ""
    
    check_prerequisites
    get_config
    build_app
    create_package
    deploy_aws
    
    print_success "Deployment completed successfully!"
}

# Error handling
trap 'print_error "Deployment failed! Check error messages above."' ERR

# Run
main "$@"