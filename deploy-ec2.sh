#!/bin/bash

# FallOwl EC2 Deployment Script
# Complete setup for AWS EC2 instances with zero-error deployment

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

echo "🚀 FallOwl EC2 Deployment Script"
echo "================================"
echo ""

# Get system information
INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type 2>/dev/null || echo "unknown")
AVAILABILITY_ZONE=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone 2>/dev/null || echo "unknown")
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")

print_info "EC2 Instance Type: $INSTANCE_TYPE"
print_info "Availability Zone: $AVAILABILITY_ZONE"
print_info "Public IP: $PUBLIC_IP"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. Creating fallowl user..."
    useradd -m -s /bin/bash fallowl 2>/dev/null || true
    usermod -aG wheel fallowl 2>/dev/null || true
    usermod -aG sudo fallowl 2>/dev/null || true
    print_status "User 'fallowl' created"
fi

# Update system packages
print_info "Updating system packages..."
if command -v yum &> /dev/null; then
    yum update -y
    yum install -y epel-release
    yum groupinstall -y "Development Tools"
    yum install -y curl wget unzip git nginx certbot python3-certbot-nginx openssl
    FIREWALL_CMD="firewall-cmd"
    PACKAGE_MANAGER="yum"
elif command -v apt-get &> /dev/null; then
    apt-get update -y
    apt-get install -y build-essential curl wget unzip git nginx certbot python3-certbot-nginx openssl ufw
    FIREWALL_CMD="ufw"
    PACKAGE_MANAGER="apt"
else
    print_error "Unsupported package manager"
    exit 1
fi

# Configure firewall
print_info "Configuring firewall..."
if [[ "$FIREWALL_CMD" == "firewall-cmd" ]]; then
    systemctl start firewalld
    systemctl enable firewalld
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=5000/tcp
    firewall-cmd --reload
elif [[ "$FIREWALL_CMD" == "ufw" ]]; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 5000/tcp
fi
print_status "Firewall configured"

# Install Node.js 18
print_info "Installing Node.js 18..."
if [[ "$PACKAGE_MANAGER" == "yum" ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
print_status "Node.js installed: $(node -v)"

# Install PM2 for process management
print_info "Installing PM2 process manager..."
npm install -g pm2
pm2 startup
print_status "PM2 installed"

# Install PostgreSQL
print_info "Installing PostgreSQL..."
if [[ "$PACKAGE_MANAGER" == "yum" ]]; then
    yum install -y postgresql-server postgresql-contrib
    postgresql-setup initdb
    systemctl start postgresql
    systemctl enable postgresql
else
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Configure PostgreSQL
print_info "Configuring PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE DATABASE fallowl_db;
CREATE USER fallowl WITH ENCRYPTED PASSWORD 'fallowl123';
GRANT ALL PRIVILEGES ON DATABASE fallowl_db TO fallowl;
ALTER USER fallowl CREATEDB;
\q
EOF
print_status "PostgreSQL configured"

# Clone and setup application
print_info "Setting up FallOwl application..."
cd /opt
git clone https://github.com/replit/fallowl.git fallowl 2>/dev/null || {
    print_info "Creating application directory..."
    mkdir -p fallowl
    cd fallowl
    
    # If no git repo, copy current directory
    if [[ -f ../package.json ]]; then
        cp -r ../* . 2>/dev/null || true
    fi
}

cd /opt/fallowl
chown -R fallowl:fallowl /opt/fallowl

# Install dependencies and build
print_info "Installing dependencies..."
sudo -u fallowl npm ci
sudo -u fallowl npm run build
print_status "Application built"

# Create environment file
print_info "Creating production environment..."
sudo -u fallowl cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://fallowl:fallowl123@localhost:5432/fallowl_db
DASHBOARD_PASSWORD=demo123
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '=' | head -c 32)
EOF

# Create uploads directory
sudo -u fallowl mkdir -p uploads
sudo -u fallowl chmod 755 uploads

# Run database migrations
print_info "Running database migrations..."
sudo -u fallowl npm run db:push

# Create PM2 ecosystem file
print_info "Creating PM2 configuration..."
sudo -u fallowl cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fallowl',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create logs directory
sudo -u fallowl mkdir -p logs

# Configure Nginx
print_info "Configuring Nginx..."
cat > /etc/nginx/conf.d/fallowl.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    location /api/health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }
}
EOF

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx
print_status "Nginx configured"

# Start application with PM2
print_info "Starting FallOwl application..."
cd /opt/fallowl
sudo -u fallowl pm2 start ecosystem.config.js
sudo -u fallowl pm2 save

# Setup PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u fallowl --hp /home/fallowl
systemctl enable pm2-fallowl

# Create health check script
print_info "Creating health monitoring..."
cat > /usr/local/bin/fallowl-health.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
    echo "$(date): Health check failed, restarting application" >> /var/log/fallowl-health.log
    sudo -u fallowl pm2 restart fallowl
fi
EOF
chmod +x /usr/local/bin/fallowl-health.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/fallowl-health.sh") | crontab -

# Setup log rotation
cat > /etc/logrotate.d/fallowl << 'EOF'
/opt/fallowl/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 fallowl fallowl
    postrotate
        sudo -u fallowl pm2 reloadLogs
    endscript
}
EOF

# Create backup script
print_info "Creating backup system..."
cat > /usr/local/bin/fallowl-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/fallowl-backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
sudo -u postgres pg_dump fallowl_db > $BACKUP_DIR/database_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /opt fallowl --exclude=node_modules --exclude=logs

# Keep only last 7 backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): Backup completed" >> /var/log/fallowl-backup.log
EOF
chmod +x /usr/local/bin/fallowl-backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/fallowl-backup.sh") | crontab -

# Final health check
print_info "Performing final health check..."
sleep 10

if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
    HEALTH_STATUS="Healthy"
else
    HEALTH_STATUS="Unhealthy - Check logs"
fi

echo ""
echo "============================================"
print_status "FallOwl EC2 Deployment Completed!"
echo "============================================"
echo ""
echo "🌐 Application URL: http://$PUBLIC_IP"
echo "🏥 Health Check: http://$PUBLIC_IP/api/health"
echo "📊 Status: $HEALTH_STATUS"
echo ""
echo "📋 Access Credentials:"
echo "   Dashboard Password: demo123"
echo ""
echo "🎯 Access Instructions:"
echo "   1. Visit: http://$PUBLIC_IP"
echo "   2. Click footer year 5 times to reveal admin access"
echo "   3. Enter password: demo123"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:           pm2 logs fallowl"
echo "   Restart app:         pm2 restart fallowl"
echo "   Stop app:            pm2 stop fallowl"
echo "   Check status:        pm2 status"
echo "   Monitor resources:   pm2 monit"
echo "   View nginx logs:     tail -f /var/log/nginx/error.log"
echo "   Database backup:     /usr/local/bin/fallowl-backup.sh"
echo ""
echo "📁 Important Paths:"
echo "   Application:         /opt/fallowl"
echo "   Logs:               /opt/fallowl/logs"
echo "   Backups:            /opt/fallowl-backups"
echo "   Nginx config:       /etc/nginx/conf.d/fallowl.conf"
echo ""
print_status "Deployment completed successfully!"