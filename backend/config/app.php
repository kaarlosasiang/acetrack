<?php
// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Timezone
date_default_timezone_set('UTC');

// Application constants
define('APP_NAME', 'AceTrack Attendance System');
define('APP_VERSION', '1.0.0');
define('APP_ENV', 'development'); // development, production

// Paths
define('APP_ROOT', dirname(__DIR__));
define('APP_PATH', APP_ROOT . '/app');
define('CONFIG_PATH', APP_ROOT . '/config');
define('STORAGE_PATH', APP_ROOT . '/storage');
define('PUBLIC_PATH', APP_ROOT . '/public');

// JWT Configuration
define('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production');
define('JWT_EXPIRE_TIME', 3600 * 24 * 7); // 7 days

// File upload settings
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
define('ALLOWED_DOCUMENT_TYPES', ['pdf', 'doc', 'docx', 'txt']);

// Pagination
define('DEFAULT_PAGE_SIZE', 20);
define('MAX_PAGE_SIZE', 100);

// Load database configuration
require_once CONFIG_PATH . '/database.php';

// Autoload classes
spl_autoload_register(function ($className) {
    $paths = [
        APP_PATH . '/Controllers/',
        APP_PATH . '/Models/',
        APP_PATH . '/Middleware/',
        APP_PATH . '/Services/',
        APP_PATH . '/Helpers/',
        APP_ROOT . '/'
    ];
    
    foreach ($paths as $path) {
        $file = $path . $className . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});
?>