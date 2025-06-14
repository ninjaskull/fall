# Campaign Management Application

## Overview

This is a full-stack web application designed as a campaign data management system with a public-facing landing page and a secure dashboard for data management. The application features a modern web agency homepage with hidden access to a password-protected dashboard where users can upload and manage campaign CSV data, notes, and documents.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: TailwindCSS with shadcn/ui component library
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Simple password-based authentication with bcrypt hashing
- **File Handling**: Multer for file uploads with configurable storage
- **Security**: AES encryption for sensitive data storage

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database service
- **ORM**: Drizzle with TypeScript schema definitions
- **File Storage**: Local file system with encrypted paths
- **Encryption**: AES-256-GCM for sensitive data protection

## Key Components

### Authentication and Authorization
- Simple password-based access control for dashboard
- JWT-like token storage in localStorage
- Bcrypt password hashing for security
- Hidden authentication trigger (5 clicks on footer year)

### Campaign Data Management
- CSV file upload and processing with drag-and-drop interface
- Automatic field detection for campaign data
- Manual field mapping when auto-detection fails
- Timezone derivation based on state and country data
- Encrypted storage of campaign data and field mappings
- Read-only spreadsheet view of uploaded campaigns

### Notes and Documents System
- Rich text note creation with timestamps
- Multi-format document upload support (PDF, DOCX, PPT, images)
- Encrypted storage of both notes and document metadata
- File preview and download capabilities

### Security Features
- AES encryption for all sensitive stored data
- Input validation and sanitization
- File type and size validation
- CORS protection and secure headers

## Data Flow

1. **Public Access**: Users land on agency homepage with hidden dashboard access
2. **Authentication**: 5 clicks on footer year reveals password modal
3. **Dashboard Access**: Successful authentication redirects to protected dashboard
4. **Campaign Upload**: CSV files processed, validated, and stored with encryption
5. **Data Management**: View campaigns in read-only tables, manage notes and documents
6. **Security Layer**: All sensitive data encrypted before database storage

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **bcrypt**: Password hashing for authentication
- **multer**: File upload handling
- **crypto**: Built-in Node.js encryption utilities

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI primitives for components
- **@hookform/resolvers**: Form validation integration
- **wouter**: Lightweight client-side routing
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Fast build tool and development server
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- Replit-based development with hot reload
- PostgreSQL database provisioned via Replit modules
- File uploads stored in local `uploads` directory
- Environment variables for database connection and encryption keys

### Production Configuration
- Vite build process for optimized frontend bundle
- ESBuild for server-side code compilation
- Static file serving from `dist/public` directory
- Database migrations via Drizzle Kit

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `DASHBOARD_PASSWORD`: Authentication password (defaults to 'admin123')
- `ENCRYPTION_KEY`: AES encryption key for data protection

## Changelog

Changelog:
- June 13, 2025. Initial setup
- June 14, 2025. Fixed database connection issues and document upload functionality:
  - Created PostgreSQL database to resolve DATABASE_URL errors
  - Fixed API endpoint mismatch between frontend and backend for document uploads
  - Updated file filter to accept CSV, Excel, and text files in document uploads
  - Resolved data structure mismatch in document display interface
  - Enhanced CSV field mapping interface with improved user experience:
    * Added CSV columns preview section showing all detected headers
    * Separated required and optional fields for better organization
    * Improved visual feedback with color-coded status indicators
    * Added better field mapping validation and user guidance
    * Fixed display issues in dropdown selections
  - Application now fully functional with working CSV campaign uploads and document management
- June 14, 2025. Transformed dashboard into cute dog-themed interface (later removed):
  - Complete UI redesign with dog lover aesthetic using pink, orange, and yellow color scheme
  - Replaced all text with dog-themed terminology (campaigns = pups, files = treats, etc.)
  - Added paw print icons and dog emojis throughout the interface
  - Removed settings tab as requested by user
  - Updated dashboard header with "Pawsome Campaign Hub" branding
  - Redesigned navigation tabs: Home, Treats (Files), Diary (Notes)
  - Enhanced campaign list with dog-themed language and cute interactions
  - Updated CSV upload component with playful dog terminology
  - Transformed notes/documents section into "Pup Diary & Memory Box"
- June 14, 2025. Reverted dog theme back to professional interface:
  - Restored clean, professional design with blue and slate color scheme
  - Removed all dog-themed terminology and emojis
  - Restored standard professional language throughout all components
  - Maintained settings tab removal as originally requested
  - Dashboard header back to "Campaign Manager" with professional branding
  - Navigation tabs restored to: Overview, Files, Notes
  - All components now feature clean, business-appropriate aesthetic while maintaining full functionality
- June 14, 2025. Enhanced SPA routing implementation:
  - Fixed CSV field mapping dropdown selection issues with z-index adjustments
  - Replaced traditional anchor tags with smooth scrolling for landing page navigation
  - Ensured all navigation uses wouter's setLocation for seamless SPA experience
  - Added manual override tracking to prevent auto-detection conflicts in field mapping
  - All page transitions now occur without reloads, maintaining application state
- June 14, 2025. Implemented strict session-based authentication:
  - Replaced persistent localStorage authentication with session-only access
  - Dashboard access now requires fresh authentication via 5-click trigger
  - Direct dashboard URLs automatically redirect to landing page
  - Browser refresh clears authentication state, requiring re-authentication
  - Added ProtectedRoute component to guard all dashboard and campaign routes
- June 14, 2025. Streamlined deployment with single AWS EC2 script:
  - Removed all platform-specific deployment files and Docker configurations
  - Created comprehensive one-click AWS EC2 deployment script (deploy-aws-ec2.sh)
  - Script handles complete infrastructure setup: VPC, subnets, security groups, RDS, EC2
  - Automated application deployment with Node.js, Nginx, PM2, and database migrations
  - Interactive credential collection for AWS, database, and email service configuration
  - Built-in health monitoring and automatic service recovery
  - Comprehensive deployment guide (AWS-DEPLOYMENT-GUIDE.md) with cost estimates and troubleshooting
  - Production environment template (.env.production.example) for configuration reference
  - Estimated monthly cost: $37-55 for complete infrastructure

## User Preferences

Preferred communication style: Simple, everyday language.