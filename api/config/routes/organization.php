<?php
/**
 * Organization Management Routes
 * Handles organization settings, members, officers, and general management
 * Note: Authentication and tenant context handled in controllers
 */

// Organization Info and Settings
$router->get('/api/org/info', 'Organization@show');
$router->put('/api/org/info', 'Organization@update');
$router->post('/api/org/logo', 'Organization@uploadLogo');
$router->post('/api/org/banner', 'Organization@uploadBanner');
$router->post('/api/org/generate-qr', 'Organization@generateMembershipQR');

// Members Management
$router->get('/api/org/members', 'OrganizationMember@index');
$router->post('/api/org/members', 'OrganizationMember@store');
$router->get('/api/org/members/{id}', 'OrganizationMember@show');
$router->put('/api/org/members/{id}', 'OrganizationMember@update');
$router->delete('/api/org/members/{id}', 'OrganizationMember@destroy');
$router->post('/api/org/members/{id}/activate', 'OrganizationMember@activate');
$router->post('/api/org/members/{id}/deactivate', 'OrganizationMember@deactivate');
$router->post('/api/org/members/invite', 'OrganizationMember@invite');
$router->get('/api/org/members/{id}/events', 'OrganizationMember@memberEvents');

// Officer Positions and Assignments
$router->get('/api/org/officer-positions', 'OfficerPosition@index');
$router->post('/api/org/officer-positions', 'OfficerPosition@store');
$router->get('/api/org/officer-positions/{id}', 'OfficerPosition@show');
$router->put('/api/org/officer-positions/{id}', 'OfficerPosition@update');
$router->delete('/api/org/officer-positions/{id}', 'OfficerPosition@destroy');

$router->get('/api/org/officers', 'Officer@index');
$router->post('/api/org/officers', 'Officer@store');
$router->get('/api/org/officers/{id}', 'Officer@show');
$router->put('/api/org/officers/{id}', 'Officer@update');
$router->delete('/api/org/officers/{id}', 'Officer@destroy');
$router->post('/api/org/officers/{id}/appoint', 'Officer@appoint');
$router->post('/api/org/officers/{id}/remove', 'Officer@remove');

// Dashboard and Statistics
$router->get('/api/org/dashboard', 'Dashboard@index');
$router->get('/api/org/dashboard/stats', 'Dashboard@stats');
$router->get('/api/org/dashboard/recent-events', 'Dashboard@recentEvents');
$router->get('/api/org/dashboard/member-stats', 'Dashboard@memberStats');

// Subscription Management (for org admins)
$router->get('/api/org/subscription', 'SubscriptionController@show');
$router->get('/api/org/subscription/history', 'SubscriptionController@history');
$router->post('/api/org/subscription/renew', 'SubscriptionController@renew');
$router->post('/api/org/subscription/{id}/receipt', 'SubscriptionController@uploadReceipt');

// Organization Audit Logs
$router->get('/api/org/audit-logs', 'AuditLog@organizationLogs');
?>