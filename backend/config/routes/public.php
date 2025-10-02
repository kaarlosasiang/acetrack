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

$router->get('/health', function() {
    echo json_encode([
        'success' => true,
        'status' => 'healthy',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
});

// Public organization routes (for discovery and joining)
$router->get('/organizations', 'Organization@publicList');
$router->get('/organizations/{id}', 'Organization@publicShow');
$router->post('/organizations/{id}/join-request', 'OrganizationMember@joinRequest');

// File serving (protected uploads)
$router->get('/uploads/{filename}', 'FileController@serve');

// QR Code scanning route (public access for events)
$router->get('/scan/{token}', 'Attendance@scanQR');
$router->post('/scan/{token}', 'Attendance@processQRScan');
?>