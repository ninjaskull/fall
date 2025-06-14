# 🚀 Ultra-Easy Deployment Guide

Deploy your Campaign Management App anywhere in minutes with these one-click options.

## ⚡ One-Click Cloud Deployments

### Railway (Recommended)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

1. Click the button above
2. Connect your GitHub account
3. Set environment variables (auto-generated)
4. Deploy in 2 minutes

### Heroku
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/your-repo/campaign-management-app)

1. Click the button above
2. Fill in app name
3. Environment variables are pre-configured
4. Deploy automatically

### Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/your-repo/campaign-management-app)

1. Click the button above  
2. Connect GitHub repository
3. Auto-configured with render.yaml
4. PostgreSQL database included

### Fly.io
```bash
# One command deployment
flyctl launch --from https://github.com/your-repo/campaign-management-app
```

## 🐳 Docker Deployments

### Quick Start (Any Server)
```bash
# Download and run
curl -fsSL https://raw.githubusercontent.com/your-repo/main/deploy.sh | bash
```

### Manual Docker
```bash
git clone <your-repo>
cd campaign-management-app
./deploy.sh
```

### Windows
```batch
# Download repository
git clone <your-repo>
cd campaign-management-app

# Run Windows installer
install.bat

# Deploy with Docker
deploy.bat
```

## 📱 Platform-Specific Instructions

### DigitalOcean App Platform
1. Fork this repository
2. Create new app in DigitalOcean
3. Connect GitHub repository
4. Auto-detects Dockerfile
5. Add PostgreSQL database
6. Deploy

### AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize and deploy
eb init
eb create production
eb deploy
```

### Google Cloud Run
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/campaign-app
gcloud run deploy --image gcr.io/PROJECT_ID/campaign-app --platform managed
```

### Azure Container Instances
```bash
# Deploy container
az container create --resource-group myResourceGroup --name campaign-app --image your-registry/campaign-app:latest
```

## 🔧 Environment Variables

All platforms need these variables (auto-generated where possible):

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DASHBOARD_PASSWORD` | Dashboard access password | Yes |
| `ENCRYPTION_KEY` | 32-character encryption key | Yes |
| `BREVO_API_KEY` | Email service API key | No |
| `NODE_ENV` | Set to 'production' | No |
| `PORT` | Application port (auto-detected) | No |

## 🎯 Quick Setup Commands

### Development
```bash
git clone <repo>
cd campaign-management-app
./install.sh  # or install.bat on Windows
npm run dev
```

### Production (Local)
```bash
./install.sh
npm run build
npm start
```

### Docker (Includes Database)
```bash
./deploy.sh  # or deploy.bat on Windows
```

## 🔍 Health Check

After deployment, verify your app:
- Visit: `https://your-app-url.com/api/health`
- Should return: `{"status":"ok","timestamp":"...","uptime":...}`

## 🆘 Troubleshooting

### Common Issues:

**Build Failed**
- Ensure Node.js 18+ is available
- Check environment variables are set

**Database Connection Failed**
- Verify DATABASE_URL format
- Ensure PostgreSQL service is running

**Port Already in Use**
- Change PORT environment variable
- Update docker-compose.yml ports section

**Docker Issues**
- Ensure Docker is installed and running
- Try: `docker system prune -f` then redeploy

### Platform-Specific Help:

**Railway**: Check build logs in dashboard
**Heroku**: Run `heroku logs --tail`
**Render**: View logs in service dashboard
**Docker**: Run `docker-compose logs -f`

## 📞 Support

For deployment issues:
1. Check the health endpoint
2. Review platform-specific logs
3. Verify all environment variables
4. Ensure database is accessible

The app is designed to work out-of-the-box on any platform with minimal configuration.