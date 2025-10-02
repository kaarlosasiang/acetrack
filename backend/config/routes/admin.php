<?php
/**
 * Super Admin Routes
 * System-wide management routes for super administrators only
 */

$router->group('/api/admin', function($router) {
    
    // Organization Management (System-wide)
    $router->resource('/organizations', 'Organization');
    $router->post('/organizations/{id}/activate', 'Organization@activate');
    $router->post('/organizations/{id}/deactivate', 'Organization@deactivate');
    
    // Subscription Management (System-wide)
    $router->get('/subscriptions', 'Subscription@index');
    $router->post('/subscriptions/{id}/verify', 'Subscription@verify');
    
    // System-wide Audit Logs
    $router->get('/audit-logs', 'AuditLog@index');
    
    // System Statistics and Analytics
    $router->get('/stats/overview', 'Admin@systemOverview');
    $router->get('/stats/organizations', 'Admin@organizationStats');
    $router->get('/stats/users', 'Admin@userStats');
    $router->get('/stats/events', 'Admin@eventStats');
    
    // User Management (System-wide)
    $router->get('/users', 'Admin@listUsers');
    $router->get('/users/{id}', 'Admin@showUser');
    $router->post('/users/{id}/activate', 'Admin@activateUser');
    $router->post('/users/{id}/deactivate', 'Admin@deactivateUser');
    $router->post('/users/{id}/make-super-admin', 'Admin@makeSuperAdmin');
    $router->post('/users/{id}/remove-super-admin', 'Admin@removeSuperAdmin');
    
    // System Maintenance
    $router->post('/maintenance/clean-logs', 'Admin@cleanAuditLogs');
    $router->get('/maintenance/system-health', 'Admin@systemHealth');
    
}, ['AuthMiddleware', 'SuperAdminMiddleware']);
?>