# AWS Deployment Guide - Campaign Management App

Complete step-by-step guide to deploy your app on AWS using different services.

## Method 1: AWS Elastic Beanstalk (Easiest)

### Prerequisites
- AWS Account
- AWS CLI installed
- EB CLI installed

### Step 1: Install AWS and EB CLI
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install EB CLI
pip install awsebcli --upgrade --user
```

### Step 2: Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter output format: json
```

### Step 3: Prepare Your Application
```bash
# Clone your app
git clone <your-repo-url>
cd campaign-management-app

# Install dependencies and build
npm install
npm run build
```

### Step 4: Initialize Elastic Beanstalk
```bash
eb init

# Select your region
# Create new application: campaign-management-app
# Select platform: Node.js
# Select platform version: Node.js 18
# Do not use CodeCommit: N
# Do not set up SSH: N
```

### Step 5: Create Environment
```bash
eb create production

# Environment name: campaign-management-production
# DNS CNAME prefix: campaign-management-app
# Load balancer type: Application Load Balancer
```

### Step 6: Configure Environment Variables
```bash
eb setenv \
  NODE_ENV=production \
  DASHBOARD_PASSWORD=your-secure-password \
  ENCRYPTION_KEY=your-32-character-encryption-key \
  PORT=8080
```

### Step 7: Add PostgreSQL Database
1. Go to AWS RDS Console
2. Create Database
3. Choose PostgreSQL
4. Select Free Tier (or your preferred size)
5. Set database name: `campaign_db`
6. Set master username: `postgres`
7. Set master password: `your-db-password`
8. Note the endpoint URL

### Step 8: Update Database Configuration
```bash
eb setenv DATABASE_URL=postgresql://postgres:your-db-password@your-rds-endpoint:5432/campaign_db
```

### Step 9: Deploy
```bash
eb deploy
```

### Step 10: Initialize Database
```bash
# SSH into your instance to run migrations
eb ssh
cd /var/app/current
npm run db:push
exit
```

Your app is now live at: `http://campaign-management-production.region.elasticbeanstalk.com`

---

## Method 2: AWS ECS with Fargate (Docker-based)

### Step 1: Create ECS Cluster
```bash
aws ecs create-cluster --cluster-name campaign-app-cluster
```

### Step 2: Build and Push Docker Image
```bash
# Build image
docker build -t campaign-management-app .

# Tag for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name campaign-management-app

# Tag and push
docker tag campaign-management-app:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/campaign-management-app:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/campaign-management-app:latest
```

### Step 3: Create Task Definition
Create `task-definition.json`:
```json
{
  "family": "campaign-app-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "campaign-app",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/campaign-management-app:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://postgres:password@your-rds-endpoint:5432/campaign_db"
        },
        {
          "name": "DASHBOARD_PASSWORD",
          "value": "your-secure-password"
        },
        {
          "name": "ENCRYPTION_KEY",
          "value": "your-32-character-encryption-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/campaign-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 4: Register Task Definition
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### Step 5: Create ECS Service
```bash
aws ecs create-service \
  --cluster campaign-app-cluster \
  --service-name campaign-app-service \
  --task-definition campaign-app-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678],securityGroups=[sg-12345678],assignPublicIp=ENABLED}"
```

---

## Method 3: AWS EC2 (Manual Setup)

### Step 1: Launch EC2 Instance
1. Go to AWS EC2 Console
2. Launch Instance
3. Choose Amazon Linux 2 AMI
4. Select t2.micro (free tier)
5. Configure Security Group:
   - SSH (port 22) from your IP
   - HTTP (port 80) from anywhere
   - Custom TCP (port 5000) from anywhere
6. Create or select key pair
7. Launch instance

### Step 2: Connect to Instance
```bash
ssh -i your-key-pair.pem ec2-user@your-instance-public-ip
```

### Step 3: Install Dependencies
```bash
# Update system
sudo yum update -y

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 18
nvm use 18

# Install Docker
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 4: Deploy Application
```bash
# Clone repository
git clone <your-repo-url>
cd campaign-management-app

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

### Step 5: Configure Reverse Proxy (Optional)
```bash
# Install nginx
sudo yum install -y nginx

# Configure nginx
sudo tee /etc/nginx/conf.d/campaign-app.conf << EOF
server {
    listen 80;
    server_name your-domain.com;
    
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
    }
}
EOF

# Start nginx
sudo service nginx start
sudo chkconfig nginx on
```

---

## Method 4: AWS Lambda + RDS (Serverless)

### Step 1: Install Serverless Framework
```bash
npm install -g serverless
npm install -g serverless-offline
```

### Step 2: Create Serverless Configuration
Create `serverless.yml`:
```yaml
service: campaign-management-app

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    DATABASE_URL: ${env:DATABASE_URL}
    DASHBOARD_PASSWORD: ${env:DASHBOARD_PASSWORD}
    ENCRYPTION_KEY: ${env:ENCRYPTION_KEY}

functions:
  app:
    handler: dist/index.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
      - http:
          path: /
          method: ANY

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 5000
```

### Step 3: Modify Entry Point for Lambda
Create `lambda.js`:
```javascript
const serverless = require('serverless-http');
const app = require('./dist/index.js');

module.exports.handler = serverless(app);
```

### Step 4: Deploy
```bash
# Set environment variables
export DATABASE_URL=postgresql://postgres:password@your-rds-endpoint:5432/campaign_db
export DASHBOARD_PASSWORD=your-secure-password
export ENCRYPTION_KEY=your-32-character-encryption-key

# Deploy
serverless deploy
```

---

## Database Setup (All Methods)

### Create RDS PostgreSQL Database
```bash
aws rds create-db-instance \
  --db-instance-identifier campaign-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-12345678 \
  --publicly-accessible
```

### Security Group for RDS
```bash
aws ec2 create-security-group \
  --group-name campaign-db-sg \
  --description "Security group for Campaign Management DB"

aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-87654321
```

---

## Cost Optimization Tips

1. **Use Free Tier**: t2.micro EC2, RDS db.t3.micro
2. **Auto Scaling**: Configure ECS/Beanstalk auto scaling
3. **Reserved Instances**: For production workloads
4. **CloudWatch**: Monitor costs and set billing alerts

---

## Monitoring and Maintenance

### CloudWatch Logs
```bash
# Create log group
aws logs create-log-group --log-group-name /aws/ec2/campaign-app

# View logs
aws logs describe-log-streams --log-group-name /aws/ec2/campaign-app
```

### Health Checks
Configure health checks pointing to: `/api/health`

### SSL Certificate (Optional)
Use AWS Certificate Manager for free SSL certificates.

---

## Troubleshooting

### Common Issues:
1. **Security Groups**: Ensure proper ports are open
2. **IAM Roles**: ECS needs proper execution role
3. **Environment Variables**: Double-check all required vars
4. **Database Connection**: Verify RDS security group allows connections

### Useful Commands:
```bash
# Check EB status
eb status

# View EB logs
eb logs

# Check ECS service
aws ecs describe-services --cluster campaign-app-cluster --services campaign-app-service

# Check EC2 instance
aws ec2 describe-instances --instance-ids i-1234567890abcdef0
```

Choose the method that best fits your needs:
- **Elastic Beanstalk**: Easiest, good for beginners
- **ECS Fargate**: Best for containerized apps
- **EC2**: Most control, good for custom setups
- **Lambda**: Serverless, pay-per-use