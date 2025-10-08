<?php
require_once 'BaseController.php';

class AuthController extends BaseController
{

    // User registration
    public function register($params = [])
    {
        try {
            $input = $this->getInput();

            // Validation rules
            $rules = [
                'first_name' => 'required|max:100',
                'last_name' => 'required|max:100',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|min:8|confirmed',
                'phone_number' => 'phone',
                'course' => 'max:100',
                'year_level' => 'in:1st,2nd,3rd,4th,5th,Graduate,Alumni'
            ];

            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Create user
            $userModel = new User();
            $userData = [
                'first_name' => $input['first_name'],
                'last_name' => $input['last_name'],
                'email' => $input['email'],
                'password' => $input['password'],
                'phone_number' => $input['phone_number'] ?? null,
                'course' => $input['course'] ?? null,
                'year_level' => $input['year_level'] ?? null,
                'status' => 'active' // Direct activation without email verification
            ];

            $user = $userModel->createUser($userData);

            if (!$user) {
                $this->error('Failed to create user account');
            }

            // Log the registration
            $this->logAudit('user_registration', 'User', $user['id'], null, [
                'email' => $user['email'],
                'name' => $user['first_name'] . ' ' . $user['last_name']
            ]);

            // Email verification disabled to save email quota
            // Send verification email
            // require_once APP_PATH . '/Helpers/EmailHelper.php';
            // $emailHelper = new EmailHelper();
            // $emailResult = $emailHelper->sendVerificationEmail(
            //     $user['email'],
            //     $user['first_name'] . ' ' . $user['last_name'],
            //     $user['verification_token']
            // );

            // if (!$emailResult['success']) {
            //     require_once APP_PATH . '/Helpers/Logger.php';
            //     $logger = new Logger();
            //     $logger->warning('Verification Email Failed During Registration', [
            //         'user_id' => $user['id'],
            //         'error' => $emailResult['error']
            //     ]);
            // }

            $this->success([
                'user' => [
                    'id' => $user['id'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'email' => $user['email'],
                    'status' => $user['status']
                ],
                'email_sent' => false // Email verification disabled
            ], 'User registered successfully. Account is now active.');
        } catch (Exception $e) {
            $this->error('Registration failed: ' . $e->getMessage(), 500);
        }
    }

    // User login
    public function login($params = [])
    {
        try {
            $input = $this->getInput();

            // Validation
            $rules = [
                'email' => 'required|email',
                'password' => 'required'
            ];

            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Find user
            $userModel = new User();
            $user = $userModel->findByEmail($input['email']);

            if (!$user || !$userModel->verifyPassword($user, $input['password'])) {
                $this->error('Invalid email or password', 401);
            }

            // Email verification disabled - allow login regardless of status
            // Check if user is active
            // if ($user['status'] !== 'active') {
            //     $this->error('Account is not active. Please verify your email or contact support.', 401);
            // }

            // Update last login
            $userModel->updateLastLogin($user['id']);

            // Get user's organization memberships
            $organizations = $userModel->getUserOrganizations($user['id']);

            // Generate JWT tokens
            $accessToken = JWT::createUserToken($user);
            $refreshToken = JWT::createRefreshToken($user);

            // Set refresh token as HTTPOnly cookie
            $this->setRefreshTokenCookie($refreshToken);

            // Remove sensitive data
            unset($user['password_hash']);
            unset($user['verification_token']);
            unset($user['password_reset_token']);

            // Add organization data to user
            $user['organizations'] = $organizations;

            // Include dashboard URL for automatic frontend routing
            require_once APP_PATH . '/Helpers/DashboardRouter.php';
            $dashboardUrl = DashboardRouter::getDashboardUrl($user);

            // Log the login
            $this->logAudit('user_login', 'User', $user['id']);

            $this->success([
                'user' => $user,
                'access_token' => $accessToken,
                'token_type' => 'Bearer',
                'expires_in' => JWT_EXPIRE_TIME,
                'dashboard_url' => $dashboardUrl,
                'dashboard_type' => DashboardRouter::getUserDashboardType($user)
            ], 'Login successful');
        } catch (Exception $e) {
            $this->error('Login failed: ' . $e->getMessage(), 500);
        }
    }

    // User logout
    public function logout($params = [])
    {
        $this->requireAuth();

        try {
            // Get the current JWT token from header
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            $token = null;

            if (preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
                $token = $matches[1];
            }

            // Blacklist the token
            if ($token) {
                require_once APP_PATH . '/Helpers/SecurityHelper.php';
                $securityHelper = new SecurityHelper();
                $securityHelper->blacklistToken($token, 'logout');
            }

            // Clear refresh token cookie
            $this->clearRefreshTokenCookie();

            // Log the logout
            $this->logAudit('user_logout', 'User', $this->currentUser['id']);

            $this->success(null, 'Logout successful');
        } catch (Exception $e) {
            $this->error('Logout failed: ' . $e->getMessage(), 500);
        }
    }

    // Refresh access token
    public function refresh($params = [])
    {
        try {
            // Get refresh token from cookie instead of request body
            $refreshToken = $_COOKIE['refresh_token'] ?? null;

            if (!$refreshToken) {
                $this->error('Refresh token not found', 401);
            }

            // Validate refresh token
            $payload = JWT::validateRefreshToken($refreshToken);

            // Find user
            $userModel = new User();
            $user = $userModel->find($payload->user_id);

            if (!$user || $user['status'] !== 'active') {
                $this->clearRefreshTokenCookie();
                $this->error('Invalid refresh token', 401);
            }

            // Generate new access token
            $accessToken = JWT::createUserToken($user);

            // Optionally rotate refresh token for enhanced security
            $newRefreshToken = JWT::createRefreshToken($user);
            $this->setRefreshTokenCookie($newRefreshToken);

            $this->success([
                'access_token' => $accessToken,
                'token_type' => 'Bearer',
                'expires_in' => JWT_EXPIRE_TIME
            ], 'Token refreshed successfully');
        } catch (Exception $e) {
            $this->clearRefreshTokenCookie();
            $this->error('Token refresh failed: ' . $e->getMessage(), 401);
        }
    }

    // Forgot password
    public function forgotPassword($params = [])
    {
        try {
            $input = $this->getInput();

            // Validation
            $rules = ['email' => 'required|email'];
            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Find user
            $userModel = new User();
            $user = $userModel->findByEmail($input['email']);

            if (!$user) {
                // Return success even if user doesn't exist (security)
                $this->success(null, 'If the email exists, a password reset link has been sent.');
            }

            // Generate reset token
            $resetToken = $userModel->generatePasswordResetToken($user['id']);

            if (!$resetToken) {
                $this->error('Failed to generate reset token');
            }

            // Log the password reset request
            $this->logAudit('password_reset_requested', 'User', $user['id']);

            // Send password reset email
            require_once APP_PATH . '/Helpers/EmailHelper.php';
            $emailHelper = new EmailHelper();
            $emailResult = $emailHelper->sendPasswordResetEmail(
                $user['email'],
                $user['first_name'] . ' ' . $user['last_name'],
                $resetToken
            );

            if (!$emailResult['success']) {
                require_once APP_PATH . '/Helpers/Logger.php';
                $logger = new Logger();
                $logger->warning('Password Reset Email Failed', [
                    'user_id' => $user['id'],
                    'error' => $emailResult['error']
                ]);
            }

            // Always return success for security reasons
            $this->success(null, 'If the email exists, a password reset link has been sent.');
        } catch (Exception $e) {
            $this->error('Password reset request failed: ' . $e->getMessage(), 500);
        }
    }

    // Reset password
    public function resetPassword($params = [])
    {
        try {
            $input = $this->getInput();

            // Validation
            $rules = [
                'token' => 'required',
                'password' => 'required|min:8|confirmed'
            ];

            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Find user by reset token
            $userModel = new User();
            $user = $userModel->findByPasswordResetToken($input['token']);

            if (!$user) {
                $this->error('Invalid or expired reset token', 400);
            }

            // Update password
            $updated = $userModel->updatePassword($user['id'], $input['password']);

            if (!$updated) {
                $this->error('Failed to update password');
            }

            // Log the password reset
            $this->logAudit('password_reset_completed', 'User', $user['id']);

            $this->success(null, 'Password has been reset successfully');
        } catch (Exception $e) {
            $this->error('Password reset failed: ' . $e->getMessage(), 500);
        }
    }

    // Verify email - DISABLED
    public function verifyEmail($params = [])
    {
        // Email verification has been disabled to save email quota
        $this->error('Email verification has been disabled. All accounts are automatically active.', 400);

        /* ORIGINAL CODE - COMMENTED OUT
        try {
            $input = $this->getInput();

            if (!isset($input['token'])) {
                $this->error('Verification token is required', 400);
            }

            // Find user by verification token
            $userModel = new User();
            $user = $userModel->findByVerificationToken($input['token']);

            if (!$user) {
                $this->error('Invalid verification token', 400);
            }

            // Verify email
            $verified = $userModel->verifyEmail($user['id']);

            if (!$verified) {
                $this->error('Failed to verify email');
            }

            // Log the email verification
            $this->logAudit('email_verified', 'User', $user['id']);

            $this->success(null, 'Email verified successfully');
        } catch (Exception $e) {
            $this->error('Email verification failed: ' . $e->getMessage(), 500);
        }
        */
    }

    // Resend verification email - DISABLED
    public function resendVerification($params = [])
    {
        // Email verification has been disabled to save email quota
        $this->error('Email verification has been disabled. All accounts are automatically active.', 400);

        /* ORIGINAL CODE - COMMENTED OUT
        try {
            $input = $this->getInput();

            // Validation
            $rules = ['email' => 'required|email'];
            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Find user
            $userModel = new User();
            $user = $userModel->findByEmail($input['email']);

            if (!$user) {
                $this->error('User not found', 404);
            }

            if ($user['email_verified_at']) {
                $this->error('Email is already verified', 400);
            }

            // Generate new verification token
            $newToken = bin2hex(random_bytes(32));
            $updated = $userModel->update($user['id'], ['verification_token' => $newToken]);

            if (!$updated) {
                $this->error('Failed to generate new verification token');
            }

            // Log the resend verification
            $this->logAudit('verification_resent', 'User', $user['id']);

            // Send verification email
            require_once APP_PATH . '/Helpers/EmailHelper.php';
            $emailHelper = new EmailHelper();
            $emailResult = $emailHelper->sendVerificationEmail(
                $user['email'],
                $user['first_name'] . ' ' . $user['last_name'],
                $newToken
            );

            if ($emailResult['success']) {
                $this->success(null, 'Verification email has been resent');
            } else {
                $this->error('Failed to send verification email: ' . $emailResult['error']);
            }
        } catch (Exception $e) {
            $this->error('Failed to resend verification: ' . $e->getMessage(), 500);
        }
        */
    }

    // Set refresh token as HTTPOnly cookie
    private function setRefreshTokenCookie($refreshToken)
    {
        $cookieName = 'refresh_token';
        $expires = time() + (JWT_EXPIRE_TIME * 4); // Same as refresh token expiry
        $path = '/';
        $domain = COOKIE_DOMAIN;
        $secure = COOKIE_SECURE || (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on');
        $httpOnly = true; // Prevent XSS attacks
        $sameSite = COOKIE_SAMESITE;

        // For PHP 7.3+ with SameSite support
        if (PHP_VERSION_ID >= 70300) {
            setcookie($cookieName, $refreshToken, [
                'expires' => $expires,
                'path' => $path,
                'domain' => $domain,
                'secure' => $secure,
                'httponly' => $httpOnly,
                'samesite' => $sameSite
            ]);
        } else {
            // Fallback for older PHP versions
            setcookie($cookieName, $refreshToken, $expires, $path, $domain, $secure, $httpOnly);
        }
    }

    // Clear refresh token cookie
    private function clearRefreshTokenCookie()
    {
        $cookieName = 'refresh_token';
        $path = '/';
        $domain = COOKIE_DOMAIN;
        $secure = COOKIE_SECURE || (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on');
        $sameSite = COOKIE_SAMESITE;

        // Set cookie with past expiration date to clear it
        if (PHP_VERSION_ID >= 70300) {
            setcookie($cookieName, '', [
                'expires' => time() - 3600,
                'path' => $path,
                'domain' => $domain,
                'secure' => $secure,
                'httponly' => true,
                'samesite' => $sameSite
            ]);
        } else {
            setcookie($cookieName, '', time() - 3600, $path, $domain, $secure, true);
        }
    }

    // Get current user profile
    public function profile($params = [])
    {
        $this->requireAuth();

        try {
            $userModel = new User();
            $profile = $userModel->getProfile($this->currentUser['id'], $this->currentTenantId);

            $this->success($profile, 'Profile retrieved successfully');
        } catch (Exception $e) {
            $this->error('Failed to get profile: ' . $e->getMessage(), 500);
        }
    }
}
