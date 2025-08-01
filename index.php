<?php
require_once 'config/config.php';
require_once 'core/Router.php';
require_once 'core/Database.php';
require_once 'core/Controller.php';
require_once 'core/Model.php';
require_once 'core/Auth.php';
require_once 'core/Middleware.php';
require_once 'middlewares/TenantMiddleware.php';
require_once 'middlewares/AuthMiddleware.php';
require_once 'middlewares/RBACMiddleware.php';

// Set content type for API responses
header('Content-Type: application/json');

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Tenant-ID');

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
    
    // Tenant management routes (Super Admin only)
    $router->get('/api/tenants', 'TenantController@index', ['auth', 'rbac:super_admin']);
    $router->post('/api/tenants', 'TenantController@store', ['auth', 'rbac:super_admin']);
    $router->get('/api/tenants/{id}', 'TenantController@show', ['auth', 'rbac:super_admin']);
    $router->put('/api/tenants/{id}', 'TenantController@update', ['auth', 'rbac:super_admin']);
    $router->delete('/api/tenants/{id}', 'TenantController@destroy', ['auth', 'rbac:super_admin']);
    
    // User management routes
    $router->get('/api/users', 'UserController@index', ['auth', 'tenant', 'rbac:admin,hr']);
    $router->post('/api/users', 'UserController@store', ['auth', 'tenant', 'rbac:admin,hr']);
    $router->get('/api/users/{id}', 'UserController@show', ['auth', 'tenant', 'rbac:admin,hr,employee']);
    $router->put('/api/users/{id}', 'UserController@update', ['auth', 'tenant', 'rbac:admin,hr']);
    $router->delete('/api/users/{id}', 'UserController@destroy', ['auth', 'tenant', 'rbac:admin']);
    
    // Role management routes
    $router->get('/api/roles', 'RoleController@index', ['auth', 'tenant', 'rbac:admin']);
    $router->post('/api/roles', 'RoleController@store', ['auth', 'tenant', 'rbac:admin']);
    $router->get('/api/roles/{id}', 'RoleController@show', ['auth', 'tenant', 'rbac:admin']);
    $router->put('/api/roles/{id}', 'RoleController@update', ['auth', 'tenant', 'rbac:admin']);
    $router->delete('/api/roles/{id}', 'RoleController@destroy', ['auth', 'tenant', 'rbac:admin']);
    
    // Attendance routes
    $router->get('/api/attendance', 'AttendanceController@index', ['auth', 'tenant', 'rbac:admin,hr,employee']);
    $router->post('/api/attendance/checkin', 'AttendanceController@checkIn', ['auth', 'tenant', 'rbac:employee']);
    $router->post('/api/attendance/checkout', 'AttendanceController@checkOut', ['auth', 'tenant', 'rbac:employee']);
    $router->get('/api/attendance/my', 'AttendanceController@myAttendance', ['auth', 'tenant', 'rbac:employee']);
    $router->get('/api/attendance/report', 'AttendanceController@report', ['auth', 'tenant', 'rbac:admin,hr']);
    $router->get('/api/attendance/user/{id}', 'AttendanceController@userAttendance', ['auth', 'tenant', 'rbac:admin,hr']);
    
    // Department routes
    $router->get('/api/departments', 'DepartmentController@index', ['auth', 'tenant', 'rbac:admin,hr']);
    $router->post('/api/departments', 'DepartmentController@store', ['auth', 'tenant', 'rbac:admin']);
    $router->get('/api/departments/{id}', 'DepartmentController@show', ['auth', 'tenant', 'rbac:admin,hr']);
    $router->put('/api/departments/{id}', 'DepartmentController@update', ['auth', 'tenant', 'rbac:admin']);
    $router->delete('/api/departments/{id}', 'DepartmentController@destroy', ['auth', 'tenant', 'rbac:admin']);
    
    // Profile routes
    $router->get('/api/profile', 'ProfileController@show', ['auth', 'tenant']);
    $router->put('/api/profile', 'ProfileController@update', ['auth', 'tenant']);
    
    $router->dispatch();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error',
        'message' => $e->getMessage()
    ]);
}

