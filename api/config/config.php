<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'attendance_api');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// JWT Configuration
define('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRY', 3600); // 1 hour
define('JWT_REFRESH_EXPIRY', 604800); // 7 days

// Application configuration
define('APP_NAME', 'Attendance API');
define('APP_VERSION', '1.0.0');
define('APP_ENV', 'development'); // development, production

// Pagination
define('DEFAULT_PAGE_SIZE', 10);
define('MAX_PAGE_SIZE', 100);

// File upload
define('MAX_FILE_SIZE', 5242880); // 5MB
define('UPLOAD_PATH', 'uploads/');

// Timezone
date_default_timezone_set('UTC');

// Error reporting
if (APP_ENV === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Autoloader for controllers and models
spl_autoload_register(function ($class) {
    $directories = [
        'controllers/',
        'models/',
        'core/',
        'middlewares/',
        'helpers/'
    ];
    
    foreach ($directories as $directory) {
        $file = $directory . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

