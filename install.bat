@echo off
setlocal enabledelayedexpansion

echo 🚀 Campaign Management App - Windows Installer
echo ===============================================

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first:
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1 delims=v" %%a in ('node --version') do set NODE_VERSION=%%a
echo ✅ Node.js %NODE_VERSION% detected

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed
    pause
    exit /b 1
)

:: Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

:: Create uploads directory
if not exist uploads mkdir uploads
echo ✅ Created uploads directory

:: Generate .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating environment configuration...
    
    :: Generate random values (Windows compatible)
    set DASHBOARD_PASSWORD=admin123
    set ENCRYPTION_KEY=change-this-32-character-key-now
    
    (
        echo # Campaign Management App Configuration
        echo # Generated on %date% %time%
        echo.
        echo # Database Configuration
        echo DATABASE_URL=postgresql://localhost:5432/campaign_db
        echo.
        echo # Security Settings
        echo DASHBOARD_PASSWORD=!DASHBOARD_PASSWORD!
        echo ENCRYPTION_KEY=!ENCRYPTION_KEY!
        echo.
        echo # Application Settings
        echo NODE_ENV=production
        echo PORT=5000
        echo.
        echo # Optional: Email Service ^(uncomment and configure if needed^)
        echo # BREVO_API_KEY=your_brevo_api_key_here
    ) > .env
    
    echo ✅ Generated .env file with defaults
    echo ⚠️  Please update DATABASE_URL and ENCRYPTION_KEY in .env file
    echo 📝 Default dashboard password: !DASHBOARD_PASSWORD!
) else (
    echo ✅ Using existing .env file
)

:: Build the application
echo 🔨 Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Build completed successfully
echo.
echo 🎉 Installation Complete!
echo.
echo Choose your deployment method:
echo.
echo 1. 🐳 Docker ^(Recommended - includes database^)
echo    deploy.bat
echo.
echo 2. 📦 Local with external database
echo    Update DATABASE_URL in .env, then:
echo    npm start
echo.
echo 3. 🔧 Development mode
echo    npm run dev
echo.
echo 📝 Configuration:
echo    Dashboard password: Check .env file
echo    Default port: 5000
echo    Health check: http://localhost:5000/api/health
echo.
echo 📚 Documentation: README.md

pause