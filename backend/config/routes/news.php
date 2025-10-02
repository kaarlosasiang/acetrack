<?php
/**
 * News and Updates Management Routes
 * Handles organization announcements and news management
 */

$router->group('/api/org', function($router) {
    
    // News and Updates
    $router->resource('/news', 'NewsUpdate');
    $router->post('/news/{id}/publish', 'NewsUpdate@publish');
    $router->post('/news/{id}/archive', 'NewsUpdate@archive');
    $router->post('/news/{id}/pin', 'NewsUpdate@pin');
    $router->post('/news/{id}/unpin', 'NewsUpdate@unpin');
    $router->post('/news/{id}/banner', 'NewsUpdate@uploadBanner');
    
}, ['AuthMiddleware', 'TenantMiddleware']);
?>