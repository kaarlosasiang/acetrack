# AceTrack Attendance System - Backend API

A comprehensive multi-tenant attendance management system built with PHP MVC architecture, designed for organizations to manage member attendance at events.

## Features

### Core Features
- **Multi-tenant Architecture**: Isolated data per organization with subscription management
- **User Management**: Registration, authentication, profile management
- **Organization Management**: Create and manage organizations with member roles
- **Event Management**: Create, schedule, and manage attendance events
- **Attendance Tracking**: QR code-based check-in/check-out system
- **Real-time Analytics**: Dashboard with attendance statistics and reports
- **News & Updates**: Organization announcements and updates
- **Officer Management**: Flexible officer positions and assignments
- **Audit Logging**: Complete activity tracking and audit trails

### Technical Features
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin, sub-admin, and member roles
- **RESTful API**: Clean, consistent API design
- **Database Abstraction**: PDO-based database layer with prepared statements
- **Input Validation**: Comprehensive validation system
- **File Upload Support**: Profile images, banners, attachments
- **Multi-tenant Security**: Tenant isolation and context management

## Project Structure

```
backend/
├── app/
│   ├── Controllers/        # API Controllers
│   │   ├── BaseController.php
│   │   └── AuthController.php
│   ├── Models/            # Data Models
│   │   ├── BaseModel.php
│   │   ├── User.php
│   │   ├── Organization.php
│   │   ├── OrganizationMember.php
│   │   ├── Event.php
│   │   └── AuditLog.php
│   ├── Middleware/        # Request Middleware
│   │   ├── AuthMiddleware.php
│   │   ├── TenantMiddleware.php
│   │   └── SuperAdminMiddleware.php
│   ├── Helpers/          # Utility Classes
│   │   ├── JWT.php
│   │   └── Validator.php
│   └── Router.php        # Route Handler
├── config/               # Configuration Files
│   ├── app.php          # Application Configuration
│   ├── database.php     # Database Configuration
│   ├── routes.php       # Main Route Loader
│   └── routes/          # Modular Route Files
│       ├── public.php   # Public routes
│       ├── auth.php     # Authentication routes
│       ├── user.php     # User management routes
│       ├── organization.php # Organization routes
│       ├── events.php   # Event management routes
│       ├── attendance.php # Attendance routes
│       ├── news.php     # News and updates routes
│       └── admin.php    # Super admin routes
├── public/              # Public Assets
│   ├── css/
│   ├── js/
│   └── images/
├── storage/             # Storage Directory
│   ├── logs/
│   └── uploads/
└── index.php           # Application Entry Point
```

## Installation

### Prerequisites
- PHP 7.4 or higher
- MySQL 5.7 or higher
- MAMP/XAMPP or similar local server environment

### Database Setup

1. **Create Database**
   ```sql
   CREATE DATABASE acetrack_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Import Schema**
   Execute the provided MySQL schema to create all necessary tables. The schema includes:
   - Users and authentication tables
   - Organizations and memberships
   - Events and attendance tracking
   - News updates and audit logs
   - Officer positions and assignments

### Configuration

1. **Database Configuration**
   Edit `config/database.php` and update the database credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_PORT', '3306');
   define('DB_NAME', 'acetrack_attendance');
   define('DB_USER', 'your_username');
   define('DB_PASS', 'your_password');
   ```

2. **Application Configuration**
   Edit `config/app.php` and update:
   ```php
   define('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production');
   define('APP_ENV', 'development'); // or 'production'
   ```

3. **File Permissions**
   Ensure the storage directory is writable:
   ```bash
   chmod 755 storage/
   chmod 755 storage/logs/
   chmod 755 storage/uploads/
   ```

## Modular Route Structure

The API routes are organized into modular files for better maintainability:

- **`config/routes/public.php`** - Public routes (health checks, organization discovery)
- **`config/routes/auth.php`** - Authentication routes (login, registration, password reset)
- **`config/routes/user.php`** - User profile and personal data routes
- **`config/routes/organization.php`** - Organization management routes
- **`config/routes/events.php`** - Event management routes
- **`config/routes/attendance.php`** - Attendance tracking routes
- **`config/routes/news.php`** - News and updates routes
- **`config/routes/admin.php`** - Super admin system management routes

This modular approach provides:
- **Better Organization**: Related routes are grouped together
- **Easier Maintenance**: Find and modify routes quickly
- **Team Collaboration**: Multiple developers can work on different modules
- **Scalability**: Easy to add new route modules

For detailed information about each route module, see `config/routes/README.md`.

## API Endpoints

### Public Endpoints

#### Health Check
```
GET / - API status and version
GET /health - Health check endpoint
```

#### Authentication
```
POST /auth/register - User registration
POST /auth/login - User login
POST /auth/forgot-password - Request password reset
POST /auth/reset-password - Reset password with token
POST /auth/verify-email - Verify email address
POST /auth/resend-verification - Resend verification email
```

#### Organizations (Public)
```
GET /organizations - List public organizations
GET /organizations/{id} - Get organization public info
POST /organizations/{id}/join-request - Request to join organization
```

### Authenticated Endpoints

#### User Profile
```
GET /api/profile - Get current user profile
PUT /api/profile - Update user profile
POST /api/profile/avatar - Upload profile avatar
POST /api/auth/logout - User logout
POST /api/auth/refresh - Refresh access token
```

#### Organization Management (Tenant Context Required)
```
GET /api/org/info - Get organization details
PUT /api/org/info - Update organization
POST /api/org/logo - Upload organization logo
POST /api/org/banner - Upload organization banner

GET /api/org/members - List organization members
POST /api/org/members - Add new member
GET /api/org/members/{id} - Get member details
PUT /api/org/members/{id} - Update member
DELETE /api/org/members/{id} - Remove member
POST /api/org/members/invite - Invite user to organization
```

#### Event Management
```
GET /api/org/events - List events
POST /api/org/events - Create new event
GET /api/org/events/{id} - Get event details
PUT /api/org/events/{id} - Update event
DELETE /api/org/events/{id} - Delete event
POST /api/org/events/{id}/publish - Publish event
POST /api/org/events/{id}/cancel - Cancel event
GET /api/org/events/{id}/qr-code - Generate event QR code
```

#### Attendance Management
```
GET /api/org/events/{id}/attendance - Get event attendance
POST /api/org/events/{id}/checkin - Admin check-in user
POST /api/org/events/{id}/checkout - Admin check-out user
GET /api/org/attendance/reports - Attendance reports
GET /api/org/attendance/export - Export attendance data
```

#### Member Access (Tenant Context Required)
```
GET /api/member/organizations - My organizations
GET /api/member/events - My events in current organization
GET /api/member/events/upcoming - My upcoming events
GET /api/member/attendance - My attendance records
POST /api/member/events/{id}/checkin - Self check-in to event
POST /api/member/events/{id}/checkout - Self check-out from event
```

### Super Admin Endpoints
```
GET /api/admin/organizations - Manage all organizations
POST /api/admin/organizations/{id}/activate - Activate organization
GET /api/admin/subscriptions - Manage subscriptions
GET /api/admin/audit-logs - System-wide audit logs
```

## Authentication

The system uses JWT (JSON Web Tokens) for authentication:

1. **Registration**: Users register with email verification required
2. **Login**: Returns access token and refresh token
3. **Token Usage**: Include in Authorization header: `Bearer {token}`
4. **Token Refresh**: Use refresh token to get new access token

### Example Authentication Flow

```javascript
// Registration
POST /auth/register
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "password_confirmation": "SecurePass123!"
}

// Login
POST /auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

// Response
{
  "success": true,
  "data": {
    "user": {...},
    "access_token": "eyJ0eXAiOiJKV1Q...",
    "refresh_token": "eyJ0eXAiOiJKV1Q...",
    "token_type": "Bearer",
    "expires_in": 604800
  }
}

// Using token in subsequent requests
Authorization: Bearer eyJ0eXAiOiJKV1Q...
```

## Multi-Tenant Architecture

The system supports multiple tenancy methods:

1. **Header-based**: Send `X-Tenant-ID` header
2. **Query Parameter**: Include `tenant_id` in URL
3. **Subdomain** (optional): `orgname.yourdomain.com`

### Example Tenant Context
```javascript
// Method 1: Header
Headers: {
  "Authorization": "Bearer {token}",
  "X-Tenant-ID": "123"
}

// Method 2: Query Parameter
GET /api/org/events?tenant_id=123

// Method 3: Subdomain (requires DNS setup)
GET https://myorg.acetrack.com/api/org/events
```

## Validation Rules

The system includes comprehensive validation:

- **Email**: Valid email format, uniqueness check
- **Password**: Minimum 8 characters, confirmed
- **Phone**: Valid phone number format
- **Student ID**: Alphanumeric, 5-20 characters
- **Dates**: Valid date/datetime formats
- **Files**: Type and size validation

## Error Handling

All API responses follow a consistent format:

```javascript
// Success Response
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}

// Error Response
{
  "success": false,
  "error": "Error type",
  "message": "Error description",
  "details": {...} // Additional error details
}

// Validation Error
{
  "success": false,
  "error": "Validation failed",
  "validation_errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

## Security Features

- **SQL Injection Protection**: PDO prepared statements
- **XSS Protection**: Input sanitization
- **CSRF Protection**: Token-based validation
- **Rate Limiting**: Can be implemented at server level
- **Input Validation**: Server-side validation for all inputs
- **Secure File Uploads**: File type and size validation
- **Audit Logging**: Complete activity tracking

## Development

### Local Development Setup

1. Start MAMP/XAMPP
2. Place project in htdocs directory
3. Create and configure database
4. Update configuration files
5. Test API endpoints using Postman or similar tools

### Testing Endpoints

Test the API using tools like Postman:

1. **Test Health Check**: `GET http://localhost/acetrack/backend/`
2. **Register User**: `POST http://localhost/acetrack/backend/auth/register`
3. **Login**: `POST http://localhost/acetrack/backend/auth/login`
4. **Access Protected Routes**: Include Authorization header

### Production Deployment

For production deployment:

1. Update `APP_ENV` to 'production'
2. Set secure JWT secret key
3. Configure proper file permissions
4. Set up SSL/HTTPS
5. Configure database with production credentials
6. Set up proper backup systems
7. Configure logging and monitoring

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team.