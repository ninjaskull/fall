#!/bin/bash

# AWS EC2 Amazon Linux One-Click Deployment Script
# Campaign Management Application
# This script deploys the entire application to AWS EC2 with all dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to prompt for input with validation
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="$3"
    local validation_regex="$4"
    local error_message="$5"
    
    while true; do
        if [ "$is_secret" = "true" ]; then
            echo -n -e "${YELLOW}$prompt: ${NC}"
            read -s input
            echo
        else
            echo -n -e "${YELLOW}$prompt: ${NC}"
            read input
        fi
        
        if [ -n "$validation_regex" ] && [[ ! $input =~ $validation_regex ]]; then
            print_error "$error_message"
            continue
        fi
        
        if [ -n "$input" ]; then
            eval "$var_name='$input'"
            break
        else
            print_error "This field is required. Please enter a value."
        fi
    done
}

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        print_info "Installation guide: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured or credentials are invalid."
        print_info "Please run 'aws configure' first or check your credentials."
        exit 1
    fi
}

# Main deployment function
main() {
    print_header "AWS EC2 Campaign Management App Deployment"
    
    print_info "This script will deploy your Campaign Management Application to AWS EC2."
    print_info "Please have the following ready:"
    echo "  • AWS IAM credentials with EC2, RDS, and IAM permissions"
    echo "  • Database connection details (or we'll create RDS)"
    echo "  • Domain name (optional)"
    echo "  • Email service credentials (optional)"
    echo ""
    
    read -p "Press Enter to continue or Ctrl+C to exit..."
    
    # Check AWS CLI
    check_aws_cli
    
    # Collect AWS Configuration
    print_header "AWS Configuration"
    
    prompt_input "AWS Region (e.g., us-east-1)" "AWS_REGION" "false" "^[a-z0-9-]+$" "Please enter a valid AWS region"
    prompt_input "EC2 Key Pair Name (for SSH access)" "KEY_PAIR_NAME" "false" "^[a-zA-Z0-9._-]+$" "Please enter a valid key pair name"
    prompt_input "Instance Type (default: t3.small)" "INSTANCE_TYPE" "false"
    INSTANCE_TYPE=${INSTANCE_TYPE:-t3.small}
    
    # Database Configuration
    print_header "Database Configuration"
    echo "Choose database option:"
    echo "1. Create new RDS PostgreSQL instance (recommended)"
    echo "2. Use existing database"
    
    while true; do
        read -p "Enter choice (1 or 2): " db_choice
        case $db_choice in
            1)
                USE_RDS=true
                prompt_input "RDS Master Username" "DB_USERNAME" "false" "^[a-zA-Z][a-zA-Z0-9_]*$" "Username must start with a letter"
                prompt_input "RDS Master Password (min 8 chars)" "DB_PASSWORD" "true" "^.{8,}$" "Password must be at least 8 characters"
                prompt_input "Database Name" "DB_NAME" "false" "^[a-zA-Z][a-zA-Z0-9_]*$" "Database name must start with a letter"
                break
                ;;
            2)
                USE_RDS=false
                prompt_input "Database URL (full connection string)" "DATABASE_URL" "true"
                break
                ;;
            *)
                print_error "Please enter 1 or 2"
                ;;
        esac
    done
    
    # Application Configuration
    print_header "Application Configuration"
    
    prompt_input "Dashboard Password" "DASHBOARD_PASSWORD" "true" "^.{6,}$" "Password must be at least 6 characters"
    
    echo "Domain Configuration (optional):"
    read -p "Custom domain name (leave empty for default): " DOMAIN_NAME
    
    # Email Configuration (Optional)
    print_header "Email Service Configuration (Optional)"
    echo "Configure email service for contact form submissions:"
    read -p "Enable email service? (y/n): " enable_email
    
    if [[ $enable_email =~ ^[Yy]$ ]]; then
        prompt_input "Brevo API Key" "BREVO_API_KEY" "true"
        prompt_input "From Email Address" "FROM_EMAIL" "false" "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" "Please enter a valid email address"
        prompt_input "To Email Address" "TO_EMAIL" "false" "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" "Please enter a valid email address"
    fi
    
    # Confirm deployment
    print_header "Deployment Summary"
    echo "AWS Region: $AWS_REGION"
    echo "Instance Type: $INSTANCE_TYPE"
    echo "Key Pair: $KEY_PAIR_NAME"
    if [ "$USE_RDS" = true ]; then
        echo "Database: New RDS PostgreSQL instance"
        echo "DB Name: $DB_NAME"
        echo "DB Username: $DB_USERNAME"
    else
        echo "Database: External database"
    fi
    [ -n "$DOMAIN_NAME" ] && echo "Domain: $DOMAIN_NAME"
    [ -n "$BREVO_API_KEY" ] && echo "Email Service: Brevo configured"
    echo ""
    
    read -p "Proceed with deployment? (y/n): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled."
        exit 0
    fi
    
    # Start deployment
    deploy_to_aws
}

deploy_to_aws() {
    print_header "Starting AWS Deployment"
    
    # Generate unique identifiers
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    APP_NAME="campaign-manager-$TIMESTAMP"
    
    print_info "Creating deployment package..."
    
    # Create deployment directory
    DEPLOY_DIR="/tmp/$APP_NAME"
    mkdir -p "$DEPLOY_DIR"
    
    # Copy application files
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='uploads' --exclude='dist' . "$DEPLOY_DIR/"
    
    print_success "Application files prepared"
    
    # Create VPC and Security Groups
    print_info "Setting up AWS infrastructure..."
    
    # Create VPC
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block 10.0.0.0/16 \
        --region "$AWS_REGION" \
        --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$APP_NAME-vpc}]" \
        --query 'Vpc.VpcId' --output text)
    
    print_success "VPC created: $VPC_ID"
    
    # Enable DNS hostnames
    aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames --region "$AWS_REGION"
    
    # Create Internet Gateway
    IGW_ID=$(aws ec2 create-internet-gateway \
        --region "$AWS_REGION" \
        --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$APP_NAME-igw}]" \
        --query 'InternetGateway.InternetGatewayId' --output text)
    
    # Attach Internet Gateway to VPC
    aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$AWS_REGION"
    
    print_success "Internet Gateway created and attached: $IGW_ID"
    
    # Create Public Subnet
    SUBNET_ID=$(aws ec2 create-subnet \
        --vpc-id "$VPC_ID" \
        --cidr-block 10.0.1.0/24 \
        --region "$AWS_REGION" \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-public-subnet}]" \
        --query 'Subnet.SubnetId' --output text)
    
    print_success "Public subnet created: $SUBNET_ID"
    
    # Create Route Table
    ROUTE_TABLE_ID=$(aws ec2 create-route-table \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" \
        --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$APP_NAME-public-rt}]" \
        --query 'RouteTable.RouteTableId' --output text)
    
    # Add route to Internet Gateway
    aws ec2 create-route --route-table-id "$ROUTE_TABLE_ID" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID" --region "$AWS_REGION"
    
    # Associate Route Table with Subnet
    aws ec2 associate-route-table --subnet-id "$SUBNET_ID" --route-table-id "$ROUTE_TABLE_ID" --region "$AWS_REGION"
    
    print_success "Route table configured"
    
    # Create Security Group for Web Server
    WEB_SG_ID=$(aws ec2 create-security-group \
        --group-name "$APP_NAME-web-sg" \
        --description "Security group for Campaign Manager web server" \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" \
        --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$APP_NAME-web-sg}]" \
        --query 'GroupId' --output text)
    
    # Add security group rules
    aws ec2 authorize-security-group-ingress --group-id "$WEB_SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$WEB_SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$WEB_SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$WEB_SG_ID" --protocol tcp --port 5000 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    
    print_success "Web security group created: $WEB_SG_ID"
    
    # Create RDS if requested
    if [ "$USE_RDS" = true ]; then
        print_info "Creating RDS PostgreSQL instance..."
        
        # Create DB Subnet Group
        PRIVATE_SUBNET_ID=$(aws ec2 create-subnet \
            --vpc-id "$VPC_ID" \
            --cidr-block 10.0.2.0/24 \
            --availability-zone "${AWS_REGION}b" \
            --region "$AWS_REGION" \
            --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-private-subnet}]" \
            --query 'Subnet.SubnetId' --output text)
        
        aws ec2 create-db-subnet-group \
            --db-subnet-group-name "$APP_NAME-db-subnet-group" \
            --db-subnet-group-description "DB subnet group for Campaign Manager" \
            --subnet-ids "$SUBNET_ID" "$PRIVATE_SUBNET_ID" \
            --region "$AWS_REGION" \
            --tags "Key=Name,Value=$APP_NAME-db-subnet-group"
        
        # Create DB Security Group
        DB_SG_ID=$(aws ec2 create-security-group \
            --group-name "$APP_NAME-db-sg" \
            --description "Security group for Campaign Manager database" \
            --vpc-id "$VPC_ID" \
            --region "$AWS_REGION" \
            --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$APP_NAME-db-sg}]" \
            --query 'GroupId' --output text)
        
        # Allow PostgreSQL access from web security group
        aws ec2 authorize-security-group-ingress \
            --group-id "$DB_SG_ID" \
            --protocol tcp \
            --port 5432 \
            --source-group "$WEB_SG_ID" \
            --region "$AWS_REGION"
        
        # Create RDS instance
        DB_INSTANCE_ID="$APP_NAME-db"
        aws rds create-db-instance \
            --db-instance-identifier "$DB_INSTANCE_ID" \
            --db-instance-class db.t3.micro \
            --engine postgres \
            --master-username "$DB_USERNAME" \
            --master-user-password "$DB_PASSWORD" \
            --allocated-storage 20 \
            --db-name "$DB_NAME" \
            --vpc-security-group-ids "$DB_SG_ID" \
            --db-subnet-group-name "$APP_NAME-db-subnet-group" \
            --backup-retention-period 7 \
            --no-multi-az \
            --storage-type gp2 \
            --no-publicly-accessible \
            --region "$AWS_REGION" \
            --tags "Key=Name,Value=$APP_NAME-database"
        
        print_info "Waiting for RDS instance to be available (this may take 10-15 minutes)..."
        aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_ID" --region "$AWS_REGION"
        
        # Get RDS endpoint
        DB_ENDPOINT=$(aws rds describe-db-instances \
            --db-instance-identifier "$DB_INSTANCE_ID" \
            --region "$AWS_REGION" \
            --query 'DBInstances[0].Endpoint.Address' --output text)
        
        DATABASE_URL="postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:5432/$DB_NAME"
        
        print_success "RDS PostgreSQL instance created: $DB_ENDPOINT"
    fi
    
    # Get latest Amazon Linux 2023 AMI
    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" \
        --region "$AWS_REGION" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text)
    
    print_success "Using AMI: $AMI_ID"
    
    # Create User Data script
    cat > "$DEPLOY_DIR/user-data.sh" << EOF
#!/bin/bash
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install nginx
yum install -y nginx

# Install PM2 globally
npm install -g pm2

# Create app user
useradd -m -s /bin/bash appuser

# Create app directory
mkdir -p /opt/campaign-manager
cd /opt/campaign-manager

# Download and extract application
aws s3 cp s3://$S3_BUCKET_NAME/campaign-manager.tar.gz . --region $AWS_REGION
tar -xzf campaign-manager.tar.gz
rm campaign-manager.tar.gz

# Set ownership
chown -R appuser:appuser /opt/campaign-manager

# Switch to app user and install dependencies
sudo -u appuser bash << 'EOSU'
cd /opt/campaign-manager
npm ci --only=production
npm run build

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
    
    location /api/health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }
}
EONGINX

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

# Create uploads directory
mkdir -p /opt/campaign-manager/uploads
chown appuser:appuser /opt/campaign-manager/uploads

# Run database migrations
sudo -u appuser bash << 'EOMIG'
cd /opt/campaign-manager
npm run db:push
EOMIG

# Create health check script
cat > /opt/campaign-manager/health-check.sh << 'EOHEALTH'
#!/bin/bash
response=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
if [ "\$response" = "200" ]; then
    exit 0
else
    exit 1
fi
EOHEALTH

chmod +x /opt/campaign-manager/health-check.sh

# Log completion
echo "Campaign Manager deployment completed at \$(date)" >> /var/log/deployment.log
EOF
    
    # Create S3 bucket for deployment artifacts
    S3_BUCKET_NAME="$APP_NAME-deployment-$(echo $RANDOM | md5sum | head -c 8)"
    aws s3 mb "s3://$S3_BUCKET_NAME" --region "$AWS_REGION"
    
    print_success "S3 bucket created: $S3_BUCKET_NAME"
    
    # Create deployment package
    cd "$DEPLOY_DIR"
    tar -czf campaign-manager.tar.gz --exclude='user-data.sh' .
    
    # Upload to S3
    aws s3 cp campaign-manager.tar.gz "s3://$S3_BUCKET_NAME/" --region "$AWS_REGION"
    
    print_success "Application package uploaded to S3"
    
    # Update user data script with S3 bucket name
    sed -i "s/\$S3_BUCKET_NAME/$S3_BUCKET_NAME/g" user-data.sh
    
    # Create IAM role for EC2 instance
    ROLE_NAME="$APP_NAME-ec2-role"
    
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
    
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file://trust-policy.json \
        --region "$AWS_REGION"
    
    # Create and attach policy for S3 access
    cat > s3-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::$S3_BUCKET_NAME/*"
        }
    ]
}
EOF
    
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "$APP_NAME-s3-policy" \
        --policy-document file://s3-policy.json \
        --region "$AWS_REGION" \
        --query 'Policy.Arn' --output text)
    
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "$POLICY_ARN" \
        --region "$AWS_REGION"
    
    # Create instance profile
    aws iam create-instance-profile \
        --instance-profile-name "$APP_NAME-profile" \
        --region "$AWS_REGION"
    
    aws iam add-role-to-instance-profile \
        --instance-profile-name "$APP_NAME-profile" \
        --role-name "$ROLE_NAME" \
        --region "$AWS_REGION"
    
    # Wait for instance profile to be ready
    sleep 10
    
    print_success "IAM role and instance profile created"
    
    # Launch EC2 instance
    print_info "Launching EC2 instance..."
    
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --count 1 \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_PAIR_NAME" \
        --security-group-ids "$WEB_SG_ID" \
        --subnet-id "$SUBNET_ID" \
        --associate-public-ip-address \
        --iam-instance-profile Name="$APP_NAME-profile" \
        --user-data file://user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME}]" \
        --region "$AWS_REGION" \
        --query 'Instances[0].InstanceId' --output text)
    
    print_success "EC2 instance launched: $INSTANCE_ID"
    
    # Wait for instance to be running
    print_info "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"
    
    # Get instance public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
    
    print_success "Instance is running with public IP: $PUBLIC_IP"
    
    # Wait for deployment to complete
    print_info "Waiting for application deployment to complete (this may take 5-10 minutes)..."
    
    # Check deployment status
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        sleep 30
        attempt=$((attempt + 1))
        
        if curl -s --connect-timeout 10 "http://$PUBLIC_IP/api/health" > /dev/null 2>&1; then
            print_success "Application is healthy and responding!"
            break
        else
            print_info "Attempt $attempt/$max_attempts - Still deploying..."
        fi
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_warning "Deployment may still be in progress. Please check manually."
    fi
    
    # Clean up local files
    rm -rf "$DEPLOY_DIR"
    
    # Print deployment summary
    print_header "Deployment Complete!"
    
    echo -e "${GREEN}🚀 Campaign Management Application Successfully Deployed!${NC}\n"
    echo "📋 Deployment Details:"
    echo "   • Application URL: http://$PUBLIC_IP"
    echo "   • EC2 Instance ID: $INSTANCE_ID"
    echo "   • Public IP: $PUBLIC_IP"
    echo "   • Region: $AWS_REGION"
    echo "   • Instance Type: $INSTANCE_TYPE"
    
    if [ "$USE_RDS" = true ]; then
        echo "   • Database: RDS PostgreSQL ($DB_ENDPOINT)"
    else
        echo "   • Database: External database configured"
    fi
    
    [ -n "$DOMAIN_NAME" ] && echo "   • Domain: $DOMAIN_NAME (configure DNS manually)"
    [ -n "$BREVO_API_KEY" ] && echo "   • Email Service: Brevo configured"
    
    echo ""
    echo "🔗 Next Steps:"
    echo "   1. Visit http://$PUBLIC_IP to access your application"
    echo "   2. Click footer year 5 times to access dashboard"
    echo "   3. Use your configured dashboard password to login"
    
    if [ -n "$DOMAIN_NAME" ]; then
        echo "   4. Configure your domain's DNS to point to $PUBLIC_IP"
        echo "   5. Consider setting up SSL certificate (Let's Encrypt recommended)"
    fi
    
    echo ""
    echo "🔧 Management:"
    echo "   • SSH access: ssh -i ~/.ssh/$KEY_PAIR_NAME.pem ec2-user@$PUBLIC_IP"
    echo "   • Application logs: sudo -u appuser pm2 logs"
    echo "   • Restart app: sudo -u appuser pm2 restart campaign-manager"
    echo "   • Health check: curl http://$PUBLIC_IP/api/health"
    
    echo ""
    echo "💰 Cost Management:"
    echo "   • Monitor your AWS costs in the AWS Console"
    echo "   • Instance type: $INSTANCE_TYPE"
    if [ "$USE_RDS" = true ]; then
        echo "   • RDS instance: db.t3.micro"
    fi
    
    echo ""
    print_success "Deployment completed successfully! 🎉"
}

# Error handling
trap 'print_error "Deployment failed! Check the error messages above."' ERR

# Run main function
main "$@"