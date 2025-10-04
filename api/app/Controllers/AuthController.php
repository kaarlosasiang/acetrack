<?php
require_once 'BaseController.php';

class AuthController extends BaseController {
    
    // User registration
    public function register($params = []) {
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
                'status' => 'pending' // Requires email verification
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
            
            // Send verification email
            require_once APP_PATH . '/Helpers/EmailHelper.php';
            $emailHelper = new EmailHelper();
            $emailResult = $emailHelper->sendVerificationEmail(
                $user['email'], 
                $user['first_name'] . ' ' . $user['last_name'], 
                $user['verification_token']
            );
            
            if (!$emailResult['success']) {
                $this->logger->warning('Verification Email Failed During Registration', [
                    'user_id' => $user['id'],
                    'error' => $emailResult['error']
                ]);
            }
            
            $this->success([
                'user' => [
                    'id' => $user['id'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'email' => $user['email'],
                    'status' => $user['status']
                ],
                'email_sent' => $emailResult['success']
            ], 'User registered successfully. Please check your email to verify your account.');
            
        } catch (Exception $e) {
            $this->error('Registration failed: ' . $e->getMessage(), 500);
        }
    }
    
    // User login
    public function login($params = []) {
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
            
            // Check if user is active
            if ($user['status'] !== 'active') {
                $this->error('Account is not active. Please verify your email or contact support.', 401);
            }
            
            // Update last login
            $userModel->updateLastLogin($user['id']);
            
            // Generate JWT tokens
            $accessToken = JWT::createUserToken($user);
            $refreshToken = JWT::createRefreshToken($user);
            
            // Remove sensitive data
            unset($user['password_hash']);
            unset($user['verification_token']);
            unset($user['password_reset_token']);
            
            // Log the login
            $this->logAudit('user_login', 'User', $user['id']);
            
            $this->success([
                'user' => $user,
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => JWT_EXPIRE_TIME
            ], 'Login successful');
            
        } catch (Exception $e) {
            $this->error('Login failed: ' . $e->getMessage(), 500);
        }
    }
    
    // User logout
    public function logout($params = []) {
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
            
            // Log the logout
            $this->logAudit('user_logout', 'User', $this->currentUser['id']);
            
            $this->success(null, 'Logout successful');
            
        } catch (Exception $e) {
            $this->error('Logout failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Refresh access token
    public function refresh($params = []) {
        try {
            $input = $this->getInput();
            
            if (!isset($input['refresh_token'])) {
                $this->error('Refresh token is required', 400);
            }
            
            // Validate refresh token
            $payload = JWT::validateRefreshToken($input['refresh_token']);
            
            // Find user
            $userModel = new User();
            $user = $userModel->find($payload->user_id);
            
            if (!$user || $user['status'] !== 'active') {
                $this->error('Invalid refresh token', 401);
            }
            
            // Generate new access token
            $accessToken = JWT::createUserToken($user);
            
            $this->success([
                'access_token' => $accessToken,
                'token_type' => 'Bearer',
                'expires_in' => JWT_EXPIRE_TIME
            ], 'Token refreshed successfully');
            
        } catch (Exception $e) {
            $this->error('Token refresh failed: ' . $e->getMessage(), 401);
        }
    }
    
    // Forgot password
    public function forgotPassword($params = []) {
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
                $this->logger->warning('Password Reset Email Failed', [
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
    public function resetPassword($params = []) {
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
    
    // Verify email
    public function verifyEmail($params = []) {
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
    }
    
    // Resend verification email
    public function resendVerification($params = []) {
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
    }
    
    // Get current user profile
    public function profile($params = []) {
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
?>