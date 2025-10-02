# Modular Route Structure

This directory contains modular route files to keep the routing system organized and maintainable. Each file contains routes for specific functionality areas.

## Route Files Overview

### 1. `public.php` - Public Routes
- **Description**: Routes that don't require authentication
- **Examples**: Health checks, organization discovery, QR scanning
- **Middleware**: None
- **Base Path**: `/`

### 2. `auth.php` - Authentication Routes
- **Description**: User authentication and account management
- **Examples**: Registration, login, password reset, email verification
- **Middleware**: None (public), `AuthMiddleware` (for logout/refresh)
- **Base Path**: `/auth/`, `/api/auth/`

### 3. `user.php` - User Management Routes
- **Description**: User profile management and personal data
- **Examples**: Profile updates, personal organizations, member activities
- **Middleware**: `AuthMiddleware`, `TenantMiddleware` (for member routes)
- **Base Path**: `/api/`, `/api/member/`

### 4. `organization.php` - Organization Management Routes
- **Description**: Organization settings, members, officers, dashboard
- **Examples**: Org info, member management, officer assignments, dashboard
- **Middleware**: `AuthMiddleware` + `TenantMiddleware`
- **Base Path**: `/api/org/`

### 5. `events.php` - Event Management Routes
- **Description**: Event creation, management, categories, attachments
- **Examples**: Event CRUD, publishing, QR codes, categories
- **Middleware**: `AuthMiddleware` + `TenantMiddleware`
- **Base Path**: `/api/org/`

### 6. `attendance.php` - Attendance Management Routes
- **Description**: Check-in/check-out, attendance reports, analytics
- **Examples**: Event attendance, manual check-ins, reports, exports
- **Middleware**: `AuthMiddleware` + `TenantMiddleware`
- **Base Path**: `/api/org/`

### 7. `news.php` - News and Updates Routes
- **Description**: Organization announcements and news management
- **Examples**: News CRUD, publishing, pinning, banners
- **Middleware**: `AuthMiddleware` + `TenantMiddleware`
- **Base Path**: `/api/org/`

### 8. `admin.php` - Super Admin Routes
- **Description**: System-wide administration and management
- **Examples**: System stats, user management, organization oversight
- **Middleware**: `AuthMiddleware` + `SuperAdminMiddleware`
- **Base Path**: `/api/admin/`

## Route Structure Benefits

### 1. **Maintainability**
- Each file focuses on a specific domain
- Easier to locate and modify routes
- Reduced cognitive load when working with routes

### 2. **Team Collaboration**
- Multiple developers can work on different route files simultaneously
- Clear ownership boundaries for different features
- Reduced merge conflicts

### 3. **Scalability**
- Easy to add new route modules
- Clean separation of concerns
- Simple to understand the overall structure

### 4. **Testing**
- Easier to write focused tests for specific route groups
- Clear boundaries for integration testing
- Better test organization

## Adding New Route Modules

To add a new route module:

1. **Create the route file** in this directory:
   ```php
   <?php
   /**
    * New Module Routes
    * Description of what this module handles
    */
   
   $router->group('/api/new-module', function($router) {
       // Your routes here
   }, ['AuthMiddleware', 'TenantMiddleware']);
   ?>
   ```

2. **Load it in the main routes.php**:
   ```php
   // Load New Module Routes
   require_once CONFIG_PATH . '/routes/new-module.php';
   ```

3. **Update this README** to document the new module

## Middleware Usage Patterns

### Common Middleware Combinations:
- **Public**: No middleware
- **Authenticated**: `['AuthMiddleware']`
- **Organization Context**: `['AuthMiddleware', 'TenantMiddleware']`
- **Super Admin**: `['AuthMiddleware', 'SuperAdminMiddleware']`

### Route Groups:
Most routes are wrapped in groups to apply middleware consistently:
```php
$router->group('/api/org', function($router) {
    // All routes here automatically get both middlewares
}, ['AuthMiddleware', 'TenantMiddleware']);
```

## Best Practices

1. **Group Related Routes**: Keep functionally related routes in the same file
2. **Use Descriptive Comments**: Document what each route group does
3. **Consistent Middleware**: Apply middleware at the group level when possible
4. **RESTful Naming**: Use RESTful conventions for route naming
5. **Resource Routes**: Use `$router->resource()` for standard CRUD operations

## Route Organization Example

```
/api/org/events          # List events
/api/org/events/{id}     # Get specific event
/api/org/events/{id}/attendees      # Event-specific data
/api/org/events/{id}/qr-code        # Event-specific actions
/api/org/events/{id}/publish        # Event state changes
```

This modular approach makes the routing system more maintainable, scalable, and easier to understand for both current and future developers.