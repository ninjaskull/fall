# AWS EC2 One-Click Deployment Guide

## Overview
This guide will help you deploy your Campaign Management Application to AWS EC2 with a single command. The deployment script handles everything automatically including infrastructure setup, database creation, and application configuration.

## Prerequisites

### 1. AWS Account Setup
- Active AWS account with billing enabled
- AWS CLI installed and configured on your local machine
- EC2 Key Pair created in your target region

### 2. Required Permissions
Your AWS IAM user needs the following permissions:
- EC2 (full access for instances, VPC, security groups)
- RDS (full access for database creation)
- S3 (full access for deployment artifacts)
- IAM (permissions to create roles and policies)

### 3. Local Requirements
- Bash shell (Linux/macOS/WSL on Windows)
- AWS CLI v2 installed and configured
- Internet connection

## Quick Start

### Step 1: Configure AWS CLI
If not already done, configure your AWS credentials:
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

### Step 2: Create EC2 Key Pair
If you don't have an EC2 key pair, create one:
```bash
aws ec2 create-key-pair --key-name campaign-manager-key --query 'KeyMaterial' --output text > ~/.ssh/campaign-manager-key.pem
chmod 400 ~/.ssh/campaign-manager-key.pem
```

### Step 3: Run Deployment
Execute the deployment script:
```bash
./deploy-aws-ec2.sh
```

## Deployment Process

The deployment script will prompt you for the following information:

### AWS Configuration
- **AWS Region**: Target region for deployment (e.g., us-east-1)
- **EC2 Key Pair Name**: Your SSH key pair for server access
- **Instance Type**: Server size (default: t3.small)

### Database Options
Choose between:
1. **New RDS PostgreSQL** (Recommended):
   - Master Username: Database admin username
   - Master Password: Strong password (8+ characters)
   - Database Name: Application database name

2. **Existing Database**:
   - Database URL: Full PostgreSQL connection string

### Application Settings
- **Dashboard Password**: Password for accessing the admin dashboard (6+ characters)
- **Domain Name**: Optional custom domain
- **Email Service**: Optional Brevo email service configuration

### Email Configuration (Optional)
- **Brevo API Key**: For contact form submissions
- **From Email**: Sender email address
- **To Email**: Recipient email address

## What Gets Deployed

### Infrastructure
- VPC with public and private subnets
- Internet Gateway and routing
- Security groups for web and database
- RDS PostgreSQL instance (if selected)
- EC2 instance with Amazon Linux 2023

### Application Stack
- Node.js 18 runtime
- Nginx reverse proxy
- PM2 process manager
- PostgreSQL database
- SSL-ready configuration

### Automatic Setup
- Application build and optimization
- Database migrations
- PM2 process management
- Nginx configuration
- Health monitoring
- Auto-restart on server reboot

## Post-Deployment

### Accessing Your Application
1. Visit the provided public IP address
2. Click the footer year 5 times to reveal dashboard login
3. Use your configured dashboard password

### Domain Setup (If Configured)
1. Update your domain's DNS A record to point to the public IP
2. Consider setting up SSL certificate using Let's Encrypt

### Management Commands
Connect to your server:
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@your-public-ip
```

Application management:
```bash
# View application logs
sudo -u appuser pm2 logs

# Restart application
sudo -u appuser pm2 restart campaign-manager

# Check application status
sudo -u appuser pm2 status

# Health check
curl http://localhost:5000/api/health
```

## Cost Estimation

### Monthly AWS Costs (Approximate)
- **EC2 t3.small**: ~$15-20/month
- **RDS db.t3.micro**: ~$15-20/month
- **Data Transfer**: ~$5-10/month
- **Storage**: ~$2-5/month

**Total**: ~$37-55/month

### Cost Optimization Tips
- Use smaller instance types for low traffic
- Enable RDS backup retention only if needed
- Monitor usage with AWS Cost Explorer
- Set up billing alerts

## Security Features

### Built-in Security
- VPC isolation with private subnets
- Security groups with minimal required ports
- Database in private subnet
- Encrypted data storage
- HTTPS-ready configuration

### Additional Security (Recommended)
- Enable AWS CloudTrail for audit logging
- Set up AWS Config for compliance monitoring
- Configure AWS WAF for web application firewall
- Enable VPC Flow Logs for network monitoring

## Monitoring and Maintenance

### Health Monitoring
- Built-in health check endpoint
- PM2 automatic restart on failure
- Nginx error logging
- System monitoring via CloudWatch

### Backup Strategy
- RDS automated backups (7 days retention)
- Regular application file backups recommended
- Database snapshots before major updates

### Updates
- Application updates via PM2 restart
- System updates via yum update
- Monitor security patches regularly

## Troubleshooting

### Common Issues

**Deployment Fails**
- Check AWS credentials and permissions
- Verify key pair exists in target region
- Ensure sufficient service limits

**Application Not Accessible**
- Check security group rules
- Verify instance is running
- Check application logs: `sudo -u appuser pm2 logs`

**Database Connection Issues**
- Verify RDS instance status
- Check security group connectivity
- Validate database credentials

**Email Service Not Working**
- Verify Brevo API key is valid
- Check from/to email addresses
- Review application logs for errors

### Getting Help
- Check deployment logs on EC2 instance
- Review AWS CloudWatch logs
- Use AWS Support if needed
- Monitor system resources

## Cleanup

To remove all deployed resources:
```bash
# Terminate EC2 instance
aws ec2 terminate-instances --instance-ids your-instance-id

# Delete RDS instance
aws rds delete-db-instance --db-instance-identifier your-db-id --skip-final-snapshot

# Delete VPC and associated resources (after instances are terminated)
aws ec2 delete-vpc --vpc-id your-vpc-id
```

Note: Always backup your data before cleanup operations.