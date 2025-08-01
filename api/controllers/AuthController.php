<?php
class AuthController extends Controller {
    private $userModel;
    
    public function __construct() {
        parent::__construct();
        $this->userModel = new User();
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
                'tenant_id' => $user['tenant_id'],
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
        $this->validateRequired($input, ['first_name', 'last_name', 'email', 'password']);
        
        try {
            // Check if email already exists
            $existingUser = $this->userModel->findByEmail($input['email']);
            if ($existingUser) {
                $this->errorResponse('Email already registered', 409);
            }
            
            // For registration, user must specify tenant_id or it should be a super admin creating first tenant
            if (!isset($input['tenant_id'])) {
                $this->errorResponse('Tenant ID required for registration', 400);
            }
            
            // Create user
            $userData = [
                'tenant_id' => $input['tenant_id'],
                'first_name' => $input['first_name'],
                'last_name' => $input['last_name'],
                'email' => $input['email'],
                'password' => $input['password'],
                'phone' => $input['phone'] ?? null,
                'employee_id' => $input['employee_id'] ?? null,
                'status' => 'active'
            ];
            
            $user = $this->userModel->create($userData, $input['tenant_id']);
            
            // Assign default employee role if no roles specified
            if (isset($input['roles']) && is_array($input['roles'])) {
                $this->userModel->assignRoles($user['id'], $input['roles']);
            } else {
                // Get default employee role
                $employeeRole = $this->db->fetch(
                    "SELECT id FROM roles WHERE name = 'employee' AND tenant_id = :tenant_id",
                    ['tenant_id' => $input['tenant_id']]
                );
                
                if ($employeeRole) {
                    $this->userModel->assignRoles($user['id'], [$employeeRole['id']]);
                }
            }
            
            // Get user with roles
            $userWithRoles = $this->userModel->getWithRoles($user['id'], $input['tenant_id']);
            
            $this->logActivity('user_registration', ['user_id' => $user['id']]);
            
            $this->successResponse($userWithRoles, 'User registered successfully', 201);
            
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
                'tenant_id' => $user['tenant_id'],
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
}

