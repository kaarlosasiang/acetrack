<?php
class Auth {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function generateToken($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => JWT_ALGORITHM]);
        $payload['exp'] = time() + JWT_EXPIRY;
        $payload['iat'] = time();
        $payload = json_encode($payload);
        
        $headerEncoded = $this->base64UrlEncode($header);
        $payloadEncoded = $this->base64UrlEncode($payload);
        
        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, JWT_SECRET, true);
        $signatureEncoded = $this->base64UrlEncode($signature);
        
        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    }
    
    public function generateRefreshToken($userId) {
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + JWT_REFRESH_EXPIRY);
        
        // Store refresh token in database
        $this->db->insert('refresh_tokens', [
            'user_id' => $userId,
            'token' => hash('sha256', $token),
            'expires_at' => $expiresAt,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $token;
    }
    
    public function validateToken($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;
        
        $signature = $this->base64UrlDecode($signatureEncoded);
        $expectedSignature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, JWT_SECRET, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }
        
        $payload = json_decode($this->base64UrlDecode($payloadEncoded), true);
        
        if ($payload['exp'] < time()) {
            return false;
        }
        
        return $payload;
    }
    
    public function validateRefreshToken($token) {
        $hashedToken = hash('sha256', $token);
        
        $refreshToken = $this->db->fetch(
            "SELECT * FROM refresh_tokens WHERE token = :token AND expires_at > NOW() AND revoked_at IS NULL",
            ['token' => $hashedToken]
        );
        
        return $refreshToken ?: false;
    }
    
    public function revokeRefreshToken($token) {
        $hashedToken = hash('sha256', $token);
        
        $this->db->query(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = :token",
            ['token' => $hashedToken]
        );
    }
    
    public function revokeAllUserTokens($userId) {
        $this->db->query(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = :user_id AND revoked_at IS NULL",
            ['user_id' => $userId]
        );
    }
    
    public function hashPassword($password) {
        return password_hash($password, PASSWORD_DEFAULT);
    }
    
    public function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    public function authenticateUser($email, $password) {
        $user = $this->db->fetch(
            "SELECT u.*, t.name as tenant_name, t.status as tenant_status 
             FROM users u 
             LEFT JOIN tenants t ON u.tenant_id = t.id 
             WHERE u.email = :email AND u.status = 'active'",
            ['email' => $email]
        );
        
        if (!$user || !$this->verifyPassword($password, $user['password'])) {
            return false;
        }
        
        // Check if tenant is active
        if ($user['tenant_id'] && $user['tenant_status'] !== 'active') {
            return false;
        }
        
        // Get user roles
        $roles = $this->db->fetchAll(
            "SELECT r.name FROM roles r 
             INNER JOIN user_roles ur ON r.id = ur.role_id 
             WHERE ur.user_id = :user_id",
            ['user_id' => $user['id']]
        );
        
        $user['roles'] = array_column($roles, 'name');
        unset($user['password']);
        
        return $user;
    }
    
    public function getCurrentUser() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return false;
        }
        
        $token = $matches[1];
        $payload = $this->validateToken($token);
        
        if (!$payload) {
            return false;
        }
        
        $user = $this->db->fetch(
            "SELECT u.*, t.name as tenant_name 
             FROM users u 
             LEFT JOIN tenants t ON u.tenant_id = t.id 
             WHERE u.id = :user_id AND u.status = 'active'",
            ['user_id' => $payload['user_id']]
        );
        
        if (!$user) {
            return false;
        }
        
        // Get user roles
        $roles = $this->db->fetchAll(
            "SELECT r.name FROM roles r 
             INNER JOIN user_roles ur ON r.id = ur.role_id 
             WHERE ur.user_id = :user_id",
            ['user_id' => $user['id']]
        );
        
        $user['roles'] = array_column($roles, 'name');
        unset($user['password']);
        
        return $user;
    }
    
    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    private function base64UrlDecode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }
}

