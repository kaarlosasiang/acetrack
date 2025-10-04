<?php
require_once 'config/app.php';
require_once 'app/Router.php';

// Start output buffering and session
ob_start();
session_start();

// Set content type header
header('Content-Type: application/json');

// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS requests
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Initialize router
    $router = new Router();
    
    // Load routes
    require_once 'config/routes.php';
    
    // Resolve and dispatch the current route
    $router->dispatch();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

ob_end_flush();
?>