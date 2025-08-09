<?php
class AuthController extends Controller {
    private $userModel;
    private $passwordResetModel;
    
    public function __construct() {
        parent::__construct();
        $this->userModel = new User();
        $this->passwordResetModel = new PasswordReset();
    }
    
    public function login($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, ['email', 'password']);
        
        try {
            $user = $this->auth->authenticateUser($input['email'], $input['password']);
            
            if (!$user) {
                $this->errorResponse('Invalid credentials', 401);
            }
            
            // Generate tokens
            $tokenPayload = [
                'user_id' => $user['id'],
                'organization_id' => $user['organization_id'],
                'email' => $user['email']
            ];
            
            $accessToken = $this->auth->generateToken($tokenPayload);
            $refreshToken = $this->auth->generateRefreshToken($user['id']);
            
            $this->logActivity('user_login', ['user_id' => $user['id']]);
            
            $this->successResponse([
                'user' => $user,
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => JWT_EXPIRY
            ], 'Login successful');
            
        } catch (Exception $e) {
            $this->errorResponse('Login failed: ' . $e->getMessage(), 500);
        }
    }
    
    public function register($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, ['first_name', 'last_name', 'email', 'password', 'organization_id', 'course', 'year_level']);
        
        try {
            // Check if email already exists
            $existingUser = $this->userModel->findByEmail($input['email']);
            if ($existingUser) {
                $this->errorResponse('Email already registered', 409);
            }
            
            // Validate organization exists
            $organization = $this->db->fetch(
                "SELECT * FROM organizations WHERE id = :id AND status = 'active'",
                ['id' => $input['organization_id']]
            );
            
            if (!$organization) {
                $this->errorResponse('Organization not found or inactive', 404);
            }
            
            // Create user (will be in 'pending' status for students)
            $userData = [
                'organization_id' => $input['organization_id'],
                'first_name' => $input['first_name'],
                'last_name' => $input['last_name'],
                'middle_name' => $input['middle_name'] ?? null,
                'email' => $input['email'],
                'password' => $input['password'],
                'phone' => $input['phone'] ?? null,
                'student_id' => $input['student_id'] ?? null,
                'course' => $input['course'],
                'year_level' => $input['year_level'],
                'user_type' => 'student', // Only students can register themselves
                'birth_date' => $input['birth_date'] ?? null,
                'address' => $input['address'] ?? null,
                'emergency_contact_name' => $input['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $input['emergency_contact_phone'] ?? null
            ];
            
            $user = $this->userModel->create($userData, $input['organization_id']);
            
            // Assign student role
            $this->userModel->assignRole($user['id'], 'student', $input['organization_id']);
            
            $this->logActivity('user_registration', ['user_id' => $user['id']]);
            
            $this->successResponse([
                'id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'email' => $user['email'],
                'status' => $user['status'],
                'message' => 'Registration successful. Please wait for admin approval to access full features.'
            ], 'User registered successfully. Pending approval.', 201);
            
        } catch (Exception $e) {
            $this->errorResponse('Registration failed: ' . $e->getMessage(), 500);
        }
    }
    
    public function refresh($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, ['refresh_token']);
        
        try {
            $refreshTokenData = $this->auth->validateRefreshToken($input['refresh_token']);
            
            if (!$refreshTokenData) {
                $this->errorResponse('Invalid or expired refresh token', 401);
            }
            
            // Get user
            $user = $this->userModel->find($refreshTokenData['user_id']);
            if (!$user || $user['status'] !== 'active') {
                $this->errorResponse('User not found or inactive', 401);
            }
            
            // Generate new access token
            $tokenPayload = [
                'user_id' => $user['id'],
                'organization_id' => $user['organization_id'],
                'email' => $user['email']
            ];
            
            $accessToken = $this->auth->generateToken($tokenPayload);
            
            $this->successResponse([
                'access_token' => $accessToken,
                'token_type' => 'Bearer',
                'expires_in' => JWT_EXPIRY
            ], 'Token refreshed successfully');
            
        } catch (Exception $e) {
            $this->errorResponse('Token refresh failed: ' . $e->getMessage(), 500);
        }
    }
    
    public function logout($params = []) {
        try {
            $user = $this->getCurrentUser();
            $input = $this->getInput();
            
            if (isset($input['refresh_token'])) {
                $this->auth->revokeRefreshToken($input['refresh_token']);
            } else {
                // Revoke all refresh tokens for this user
                $this->auth->revokeAllUserTokens($user['id']);
            }
            
            $this->logActivity('user_logout', ['user_id' => $user['id']]);
            
            $this->successResponse(null, 'Logged out successfully');
            
        } catch (Exception $e) {
            $this->errorResponse('Logout failed: ' . $e->getMessage(), 500);
        }
    }
    
    public function forgotPassword($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, ['email']);
        
        try {
            $user = $this->userModel->findByEmail($input['email']);
            
            if (!$user) {
                // Don't reveal if email exists or not for security
                $this->successResponse(null, 'If the email exists, a password reset link has been sent.');
                return;
            }
            
            // Generate reset token
            $token = $this->passwordResetModel->createResetToken($user['id'], 30); // 30 minutes
            
            // In a real application, you would send an email here
            // For now, we'll just return the token (remove this in production)
            $this->logActivity('password_reset_requested', ['user_id' => $user['id']]);
            
            $this->successResponse([
                'reset_token' => $token, // Remove this in production
                'expires_in_minutes' => 30
            ], 'Password reset token generated. Check your email for instructions.');
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to process password reset request: ' . $e->getMessage(), 500);
        }
    }
    
    public function resetPassword($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, ['token', 'password']);
        
        try {
            // Validate reset token
            $resetRecord = $this->passwordResetModel->validateToken($input['token']);
            
            if (!$resetRecord) {
                $this->errorResponse('Invalid or expired reset token', 400);
            }
            
            // Update user password
            $this->userModel->update($resetRecord['user_id'], [
                'password' => $input['password']
            ]);
            
            // Mark token as used
            $this->passwordResetModel->useToken($input['token']);
            
            $this->logActivity('password_reset_completed', ['user_id' => $resetRecord['user_id']]);
            
            $this->successResponse(null, 'Password reset successfully');
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to reset password: ' . $e->getMessage(), 500);
        }
    }
}

