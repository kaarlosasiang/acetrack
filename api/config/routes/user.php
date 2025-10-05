<?php

/**
 * User Routes
 * Handles user profile management and personal data
 */

// User Profile Management (with authentication handled in controller)
$router->get('/api/profile', 'User@profile');
$router->put('/api/profile', 'User@updateProfile');
$router->post('/api/profile/avatar', 'User@uploadAvatar');

// Access Control and Dashboard Information
$router->get('/api/dashboard-info', 'Access@dashboardInfo');
$router->post('/api/validate-dashboard-access', 'Access@validateDashboardAccess');
$router->get('/api/no-access', 'Access@noAccess');

// Member organizations
$router->get('/api/member/organizations', 'User@myOrganizations');
$router->post('/api/member/organizations/{id}/join', 'User@joinOrganization');
$router->post('/api/member/organizations/{id}/leave', 'User@leaveOrganization');

// Member events (requires tenant context)
$router->get('/api/member/events', 'User@myEvents');
$router->get('/api/member/events/upcoming', 'User@upcomingEvents');
$router->get('/api/member/events/past', 'User@pastEvents');

// Member attendance records (requires tenant context)
$router->get('/api/member/attendance', 'User@myAttendance');
$router->get('/api/member/attendance/summary', 'User@attendanceSummary');

// Event check-in/check-out for members (requires tenant context)
$router->post('/api/member/events/{id}/checkin', 'Attendance@memberCheckIn');
$router->post('/api/member/events/{id}/checkout', 'Attendance@memberCheckOut');
