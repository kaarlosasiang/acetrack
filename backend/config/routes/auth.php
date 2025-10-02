<?php
/**
 * Authentication Routes
 * Handles user registration, login, password reset, email verification
 */

// User Registration and Login (No auth required)
$router->post('/auth/register', 'Auth@register');
$router->post('/auth/login', 'Auth@login');
$router->post('/auth/forgot-password', 'Auth@forgotPassword');
$router->post('/auth/reset-password', 'Auth@resetPassword');
$router->post('/auth/verify-email', 'Auth@verifyEmail');
$router->post('/auth/resend-verification', 'Auth@resendVerification');

// Authenticated auth routes (require authentication)
$router->group('/api/auth', function($router) {
    $router->post('/logout', 'Auth@logout');
    $router->post('/refresh', 'Auth@refresh');
}, ['AuthMiddleware']);
?>