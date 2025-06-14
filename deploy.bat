@echo off
setlocal enabledelayedexpansion

echo 🚀 Campaign Management App - Windows Docker Deployment
echo ======================================================

:: Check if Docker is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Installing Docker Desktop...
    echo Please download and install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

:: Check if Docker Compose is available
docker-compose --version >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not available
    echo Please ensure Docker Desktop is running
    pause
    exit /b 1
)

:: Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file with default values...
    (
        echo # Database Configuration
        echo DATABASE_URL=postgresql://postgres:postgres@postgres:5432/campaign_db
        echo POSTGRES_DB=campaign_db
        echo POSTGRES_USER=postgres
        echo POSTGRES_PASSWORD=postgres
        echo.
        echo # App Configuration
        echo DASHBOARD_PASSWORD=admin123
        echo ENCRYPTION_KEY=change-this-32-character-key-now
        echo.
        echo # Optional: Email Service
        echo # BREVO_API_KEY=your_brevo_api_key_here
    ) > .env
    echo ✅ Created .env file
    echo ⚠️  Please change the default passwords in .env file
)

:: Stop existing containers
echo 🛑 Stopping existing containers...
docker-compose down --remove-orphans 2>nul

:: Build and start containers
echo 🔨 Building and starting containers...
docker-compose up --build -d
if %errorlevel% neq 0 (
    echo ❌ Failed to start containers
    pause
    exit /b 1
)

:: Wait for database to be ready
echo ⏳ Waiting for database to be ready...
timeout /t 10 /nobreak >nul

:: Run database migrations
echo 📊 Running database migrations...
docker-compose exec -T app npm run db:push 2>nul || echo ⚠️ Migration may have failed - database might already be initialized

echo ✅ Deployment complete!
echo.
echo 🌐 Your app is now running at:
echo    http://localhost:5000
echo.
echo 📋 Default credentials:
echo    Dashboard Password: admin123 ^(change in .env file^)
echo.
echo 🔧 To manage your deployment:
echo    View logs:    docker-compose logs -f
echo    Stop app:     docker-compose down
echo    Restart:      docker-compose restart
echo    Update:       git pull ^&^& docker-compose up --build -d
echo.

pause