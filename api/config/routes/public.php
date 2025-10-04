<?php
/**
 * Public Routes - No authentication required
 */

// API Health and Status
$router->get('/', function() {
    echo json_encode([
        'success' => true,
        'message' => 'AceTrack Attendance System API',
        'version' => APP_VERSION,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
});

// Health check endpoints
$router->get('/health', 'Health@index');
$router->get('/ping', 'Health@ping');
$router->get('/system', 'Health@system');

// Public organization routes (for discovery and joining)
$router->get('/organizations', 'Organization@publicList');
$router->get('/organizations/{id}', 'Organization@publicShow');
$router->post('/organizations/{id}/join-request', 'OrganizationMember@joinRequest');

// File serving (protected uploads)
$router->get('/uploads/{filename}', 'FileController@serve');

// QR Code scanning routes (public access for events)
$router->get('/scan/{token}', 'QRScanController@scanPage');
$router->get('/api/qr/scan/{token}', 'QRScanController@scan');
$router->post('/api/qr/scan/{token}', 'QRScanController@scan');
$router->get('/api/qr/info/{token}', 'QRScanController@info');
$router->get('/api/qr/stats', 'QRScanController@stats');
$router->post('/api/qr/cleanup', 'QRScanController@cleanup');

// Security endpoints
$router->get('/api/csrf-token', function() { SecurityMiddleware::generateCSRFToken(); });

// Documentation endpoints
$router->get('/docs', function() {
    header('Content-Type: text/html');
    readfile(PUBLIC_PATH . '/docs.html');
    exit;
});

$router->get('/api-docs', function() {
    header('Content-Type: text/html');
    readfile(PUBLIC_PATH . '/swagger.html');
    exit;
});

$router->get('/health-check', function() {
    header('Content-Type: text/html');
    readfile(PUBLIC_PATH . '/health.html');
    exit;
});

// Debug route to see registered routes
$router->get('/debug/routes', function() {
    global $router;
    header('Content-Type: text/plain');
    $router->debugRoutes();
});
?>