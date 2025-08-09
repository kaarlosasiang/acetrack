<?php
class PasswordReset extends Model {
    protected $table = 'password_resets';
    protected $fillable = [
        'user_id', 'token', 'token_hash', 'expires_at', 'used_at', 'ip_address', 'user_agent'
    ];
    
    public function createResetToken($userId, $expiryMinutes = 30) {
        // Invalidate any existing tokens for this user
        $this->db->query(
            "UPDATE password_resets SET used_at = NOW() WHERE user_id = :user_id AND used_at IS NULL",
            ['user_id' => $userId]
        );
        
        // Generate secure token
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expiresAt = date('Y-m-d H:i:s', time() + ($expiryMinutes * 60));
        
        $this->create([
            'user_id' => $userId,
            'token' => $token,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
        
        return $token;
    }
    
    public function validateToken($token) {
        $tokenHash = hash('sha256', $token);
        
        $resetRecord = $this->db->fetch(
            "SELECT * FROM password_resets 
             WHERE token_hash = :token_hash 
             AND expires_at > NOW() 
             AND used_at IS NULL",
            ['token_hash' => $tokenHash]
        );
        
        return $resetRecord;
    }
    
    public function useToken($token) {
        $tokenHash = hash('sha256', $token);
        
        return $this->db->query(
            "UPDATE password_resets 
             SET used_at = NOW() 
             WHERE token_hash = :token_hash AND used_at IS NULL",
            ['token_hash' => $tokenHash]
        );
    }
    
    public function cleanupExpiredTokens() {
        return $this->db->query(
            "DELETE FROM password_resets WHERE expires_at < NOW()"
        );
    }
}
