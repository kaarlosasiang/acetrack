# School Organization Attendance API - PHP MVC REST API

A comprehensive REST API built with PHP MVC architecture designed specifically for student organizations. Features Role-Based Access Control (RBAC), Multi-tenancy, Event Management, and Student Attendance System.

## Features

- **Multi-tenancy**: Complete organization isolation with secure data segregation
- **Dynamic RBAC**: Customizable role-based access control with admin-managed roles
- **Student Management**: Comprehensive student profiles with academic information
- **Attendance System**: Multiple attendance types (regular, meetings, events, activities)
- **Event Management**: Create and manage organization events with attendance tracking
- **Academic Structure**: Support for programs, sections, academic years
- **Subscription Management**: Physical payment tracking and subscription periods
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **RESTful API**: Clean REST endpoints following best practices
- **Activity Logging**: Comprehensive audit trail
- **Export Functionality**: CSV export for reports

## Requirements

- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache/Nginx web server
- PDO MySQL extension

## Installation

1. **Clone the repository**
   ```bash
   cd /path/to/your/webroot
   git clone <repository-url> attendance-api
   cd attendance-api
   ```

2. **Configure Database**
   - Create a MySQL database named `attendance_api`
   - Import the database schema:
   ```bash
   mysql -u your_username -p attendance_api < database/schema.sql
   ```

3. **Configure Application**
   - Copy and edit the configuration file:
   ```php
   // In config/config.php, update database credentials:
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'attendance_api');
   define('DB_USER', 'your_username');
   define('DB_PASS', 'your_password');
   
   // Change the JWT secret key:
   define('JWT_SECRET', 'your-super-secret-jwt-key');
   ```

4. **Set Up Web Server**
   - Point your web server document root to the project directory
   - Ensure `mod_rewrite` is enabled for Apache
   - All requests should be routed through `index.php`

## Default Credentials

- **Super Admin**: admin@system.local / admin123

## API Endpoints

### Authentication
```
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
POST /api/auth/refresh        # Refresh access token
POST /api/auth/logout         # User logout
```

### User Management
```
GET    /api/users             # List users (Admin/HR)
POST   /api/users             # Create user (Admin/HR)
GET    /api/users/{id}        # Get user details
PUT    /api/users/{id}        # Update user (Admin/HR)
DELETE /api/users/{id}        # Delete user (Admin)
```

### Attendance
```
GET  /api/attendance          # List attendance records
POST /api/attendance/checkin  # Clock in
POST /api/attendance/checkout # Clock out
GET  /api/attendance/my       # My attendance records
GET  /api/attendance/report   # Attendance report (Admin/HR)
GET  /api/attendance/user/{id} # User attendance (Admin/HR)
```

### Tenant Management (Super Admin only)
```
GET    /api/tenants           # List tenants
POST   /api/tenants           # Create tenant
GET    /api/tenants/{id}      # Get tenant details
PUT    /api/tenants/{id}      # Update tenant
DELETE /api/tenants/{id}      # Delete tenant
```

## Authentication

### Login Request
```json
POST /api/auth/login
{
    "email": "user@company.com",
    "password": "password123"
}
```

### Response
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@company.com",
            "tenant_id": 2,
            "roles": ["employee"]
        },
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "refresh_token": "abc123...",
        "token_type": "Bearer",
        "expires_in": 3600
    }
}
```

### Headers for Protected Routes
```
Authorization: Bearer {access_token}
X-Tenant-ID: {tenant_id}  # Optional for super admin
Content-Type: application/json
```

## Attendance Workflow

### Check In
```json
POST /api/attendance/checkin
{
    "location": "Office",
    "notes": "Regular check-in"
}
```

### Check Out
```json
POST /api/attendance/checkout
{
    "notes": "End of workday"
}
```

### My Attendance
```
GET /api/attendance/my?start_date=2023-01-01&end_date=2023-01-31
```

## Role-Based Access Control

### Default Roles
- **super_admin**: Full system access across all tenants
- **admin**: Tenant administrator with full tenant access
- **hr**: Human resources with user and attendance management
- **manager**: Department manager with read access
- **employee**: Regular employee with own attendance access

### Permission Examples
```php
// Admin or HR can create users
'rbac:admin,hr'

// Only admins can delete users
'rbac:admin'

// Employees can access their own attendance
'rbac:employee'
```

## Multi-tenancy

### Tenant Isolation
- All data is automatically filtered by tenant_id
- Users can only access data within their tenant
- Super admins can switch between tenants using X-Tenant-ID header

### Creating a New Tenant
```json
POST /api/tenants
{
    "name": "Company ABC",
    "domain": "companyabc.com",
    "status": "active"
}
```

## Error Handling

### Error Response Format
```json
{
    "success": false,
    "message": "Error description",
    "errors": ["field1", "field2"]  // Optional validation errors
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Database Schema

### Key Tables
- `tenants` - Multi-tenant organizations
- `users` - User accounts with tenant association
- `roles` - RBAC roles with permissions
- `user_roles` - User-role assignments
- `attendance` - Attendance records
- `departments` - Organizational departments
- `activity_logs` - Audit trail

## Security Features

- JWT token authentication with refresh tokens
- Password hashing using PHP's password_hash()
- SQL injection prevention using prepared statements
- XSS protection with input sanitization
- CORS headers for cross-origin requests
- Activity logging for audit trails
- Session-based temporary storage for middleware

## Development

### Adding New Endpoints
1. Define route in `index.php`
2. Create controller method
3. Add middleware for authentication/authorization
4. Test with appropriate user roles

### Custom Middleware
```php
class CustomMiddleware implements Middleware {
    public function handle($params = []) {
        // Middleware logic
    }
}
```

## Production Deployment

1. Set `APP_ENV` to 'production' in config
2. Use HTTPS for all API calls
3. Set secure JWT secret key
4. Configure proper error logging
5. Set up database backups
6. Monitor activity logs for security

## Support

For issues and questions, please check the documentation or create an issue in the repository.

## License

This project is licensed under the MIT License.

