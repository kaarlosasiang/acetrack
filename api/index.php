<?php
require_once 'config/config.php';
require_once 'core/Router.php';
require_once 'core/Database.php';
require_once 'core/Controller.php';
require_once 'core/Model.php';
require_once 'core/Auth.php';
require_once 'core/Middleware.php';
require_once 'middlewares/OrganizationMiddleware.php';
require_once 'middlewares/AuthMiddleware.php';
require_once 'middlewares/RBACMiddleware.php';

// Set content type for API responses
header('Content-Type: application/json');

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Organization-ID');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $router = new Router();
    
    // Authentication routes
    $router->post('/api/auth/login', 'AuthController@login');
    $router->post('/api/auth/register', 'AuthController@register');
    $router->post('/api/auth/refresh', 'AuthController@refresh');
    $router->post('/api/auth/logout', 'AuthController@logout', ['auth']);
    $router->post('/api/auth/forgot-password', 'AuthController@forgotPassword');
    $router->post('/api/auth/reset-password', 'AuthController@resetPassword');
    
    // Organization management routes (Super Admin only)
    $router->get('/api/organizations', 'OrganizationController@index', ['auth', 'rbac:super_admin']);
    $router->post('/api/organizations', 'OrganizationController@store', ['auth', 'rbac:super_admin']);
    $router->get('/api/organizations/{id}', 'OrganizationController@show', ['auth', 'rbac:super_admin']);
    $router->put('/api/organizations/{id}', 'OrganizationController@update', ['auth', 'rbac:super_admin']);
    $router->delete('/api/organizations/{id}', 'OrganizationController@destroy', ['auth', 'rbac:super_admin']);
    
    // User management routes
    $router->get('/api/users', 'UserController@index', ['auth', 'organization', 'rbac:org_admin,staff']);
    $router->post('/api/users', 'UserController@store', ['auth', 'organization', 'rbac:org_admin']);
    $router->get('/api/users/{id}', 'UserController@show', ['auth', 'organization', 'rbac:org_admin,staff,student']);
    $router->put('/api/users/{id}', 'UserController@update', ['auth', 'organization', 'rbac:org_admin,staff']);
    $router->delete('/api/users/{id}', 'UserController@destroy', ['auth', 'organization', 'rbac:org_admin']);
    $router->post('/api/users/{id}/approve', 'UserController@approve', ['auth', 'organization', 'rbac:org_admin']);
    
    // Role management routes
    $router->get('/api/roles', 'RoleController@index', ['auth', 'organization', 'rbac:org_admin']);
    
    // Event management routes
    $router->get('/api/events', 'EventController@index', ['auth', 'organization']);
    $router->post('/api/events', 'EventController@store', ['auth', 'organization', 'rbac:org_admin']);
    $router->get('/api/events/{id}', 'EventController@show', ['auth', 'organization']);
    $router->put('/api/events/{id}', 'EventController@update', ['auth', 'organization', 'rbac:org_admin']);
    $router->delete('/api/events/{id}', 'EventController@destroy', ['auth', 'organization', 'rbac:org_admin']);
    
    // QR Code and Attendance routes
    $router->post('/api/qr/scan', 'QRScanController@scanQR', ['auth', 'organization', 'rbac:staff']);
    $router->get('/api/qr/my-qr', 'QRScanController@getMyQR', ['auth', 'organization', 'rbac:student']);
    $router->post('/api/qr/generate-dynamic', 'QRScanController@generateDynamicQR', ['auth', 'organization', 'rbac:student']);
    
    // Attendance routes
    $router->get('/api/attendance', 'AttendanceController@index', ['auth', 'organization', 'rbac:org_admin,staff']);
    $router->get('/api/attendance/my', 'AttendanceController@myAttendance', ['auth', 'organization', 'rbac:student']);
    $router->get('/api/attendance/event/{id}', 'AttendanceController@eventAttendance', ['auth', 'organization', 'rbac:org_admin,staff']);
    
    // Notification routes
    $router->get('/api/notifications', 'NotificationController@index', ['auth', 'organization']);
    $router->post('/api/notifications/{id}/read', 'NotificationController@markAsRead', ['auth', 'organization']);
    
    // Dashboard routes
    $router->get('/api/dashboard/student', 'DashboardController@studentDashboard', ['auth', 'organization', 'rbac:student']);
    $router->get('/api/dashboard/admin', 'DashboardController@adminDashboard', ['auth', 'organization', 'rbac:org_admin']);
    $router->get('/api/dashboard/super-admin', 'DashboardController@superAdminDashboard', ['auth', 'rbac:super_admin']);
    
    // Profile routes
    $router->get('/api/profile', 'ProfileController@show', ['auth', 'organization']);
    $router->put('/api/profile', 'ProfileController@update', ['auth', 'organization']);
    
    $router->dispatch();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error',
        'message' => $e->getMessage()
    ]);
}

