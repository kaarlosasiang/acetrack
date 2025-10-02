<?php
/**
 * Event Management Routes
 * Handles event creation, management, categories, and attachments
 */

$router->group('/api/org', function($router) {
    
    // Events Management
    $router->resource('/events', 'Event');
    $router->post('/events/{id}/publish', 'Event@publish');
    $router->post('/events/{id}/cancel', 'Event@cancel');
    $router->post('/events/{id}/complete', 'Event@complete');
    $router->get('/events/{id}/attendees', 'Event@attendees');
    $router->post('/events/{id}/banner', 'Event@uploadBanner');
    
    // Event Attachments
    $router->resource('/events/{event_id}/attachments', 'EventAttachment');
    
    // QR Code Generation for Events
    $router->get('/events/{id}/qr-code', 'Event@generateQRCode');
    
    // Event Categories
    $router->resource('/event-categories', 'EventCategory');
    $router->post('/events/{id}/categories', 'Event@assignCategories');
    
}, ['AuthMiddleware', 'TenantMiddleware']);
?>