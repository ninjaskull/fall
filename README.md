# Campaign Management Application

A secure full-stack web application for intelligent campaign data management with streamlined file handling and user-centric design.

## 🚀 Quick Deploy (One Command)

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/main/deploy.sh | bash
```

Or manually:

```bash
git clone <your-repo-url>
cd campaign-management-app
chmod +x deploy.sh
./deploy.sh
```

## 📋 Features

- **Secure Dashboard**: Password-protected access with session-based authentication
- **CSV Campaign Management**: Upload, process, and view campaign data with field mapping
- **File Management**: Support for documents, images, and various file types
- **Notes System**: Rich text notes with timestamps
- **Responsive Design**: Modern UI with TailwindCSS and shadcn/ui components
- **Data Encryption**: AES encryption for sensitive data storage

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: TailwindCSS + shadcn/ui
- **Authentication**: Session-based with bcrypt
- **File Storage**: Local with encryption

## 🐳 Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd campaign-management-app

# Run the deployment script
./deploy.sh
```

### Option 2: Manual Docker

```bash
# Build and run with Docker Compose
docker-compose up --build -d

# View logs
docker-compose logs -f
```

### Option 3: Traditional Server

```bash
# Install dependencies
npm install

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/campaign_db"
export DASHBOARD_PASSWORD="your-secure-password"
export ENCRYPTION_KEY="your-32-character-encryption-key"

# Build the application
npm run build

# Start production server
npm start
```

### Option 4: Platform Deployments

#### Railway
```bash
# Connect to Railway
railway login
railway link
railway up
```

#### Render
- Connect your GitHub repo to Render
- Set environment variables in dashboard
- Deploy automatically on push

#### Vercel/Netlify
- Connect GitHub repo
- Set build command: `npm run build`
- Set environment variables

## 🔧 Environment Variables

Create a `.env` file with these variables:

```env
# Required
DATABASE_URL=postgresql://user:password@host:port/database
DASHBOARD_PASSWORD=your-secure-password
ENCRYPTION_KEY=your-32-character-encryption-key

# Optional
BREVO_API_KEY=your-brevo-api-key-for-emails
NODE_ENV=production
PORT=5000
```

## 🔐 Security Features

- Password-protected dashboard access
- AES-256-GCM encryption for sensitive data
- Input validation and sanitization
- File type and size validation
- Session-based authentication
- CORS protection

## 📊 Database Setup

The application automatically creates required tables on first run. For manual setup:

```bash
# Push schema to database
npm run db:push
```

## 🎯 Usage

1. **Landing Page**: Professional web agency homepage
2. **Dashboard Access**: Click footer year 5 times to reveal password modal
3. **Campaign Upload**: Drag and drop CSV files with automatic field mapping
4. **Data Management**: View campaigns in read-only tables
5. **File Storage**: Upload and manage documents with preview capabilities
6. **Notes**: Create and manage encrypted notes

## 🔄 Updates

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up --build -d
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check database status
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Application Issues
```bash
# View application logs
docker-compose logs app

# Restart application
docker-compose restart app
```

### Port Conflicts
```bash
# Change port in docker-compose.yml
ports:
  - "3000:5000"  # External:Internal
```

## 📝 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run check

# Database operations
npm run db:push
```

## 🎨 Customization

- **Styling**: Modify `client/src/index.css` for custom themes
- **Components**: Update shadcn/ui components in `client/src/components/ui/`
- **Database**: Extend schema in `shared/schema.ts`
- **API**: Add routes in `server/routes.ts`

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs -f`
3. Ensure all environment variables are set correctly
4. Verify database connectivity