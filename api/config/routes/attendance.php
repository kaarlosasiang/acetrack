<?php
/**
 * Attendance Management Routes
 * Handles check-in/check-out, attendance reports, and analytics
 */

$router->group('/api/org', function($router) {
    
    // Attendance Management
    $router->get('/events/{id}/attendance', 'Attendance@eventAttendance');
    $router->post('/events/{id}/checkin', 'Attendance@checkIn');
    $router->post('/events/{id}/checkout', 'Attendance@checkOut');
    
    // Manual Attendance Management (Admin)
    $router->post('/attendance/{id}/manual-checkin', 'Attendance@manualCheckIn');
    $router->post('/attendance/{id}/manual-checkout', 'Attendance@manualCheckOut');
    
    // Member Attendance Records
    $router->get('/attendance/member/{member_id}', 'Attendance@memberAttendance');
    
    // Attendance Reports and Analytics
    $router->get('/attendance/reports', 'Attendance@reports');
    $router->get('/attendance/export', 'Attendance@export');
    
}, ['AuthMiddleware', 'TenantMiddleware']);
?>