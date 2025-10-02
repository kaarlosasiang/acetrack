<?php
class JWT {
    
    // Generate JWT token
    public static function encode($payload) {
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];
        
        $header = self::base64UrlEncode(json_encode($header));
        $payload = self::base64UrlEncode(json_encode($payload));
        
        $signature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
        $signature = self::base64UrlEncode($signature);
        
        return $header . "." . $payload . "." . $signature;
    }
    
    // Decode JWT token
    public static function decode($jwt) {
        $parts = explode('.', $jwt);
        
        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }
        
        list($header, $payload, $signature) = $parts;
        
        // Verify signature
        $expectedSignature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
        $expectedSignature = self::base64UrlEncode($expectedSignature);
        
        if (!hash_equals($signature, $expectedSignature)) {
            throw new Exception('Invalid token signature');
        }
        
        $payload = json_decode(self::base64UrlDecode($payload));
        
        if (!$payload) {
            throw new Exception('Invalid token payload');
        }
        
        // Check expiration
        if (isset($payload->exp) && $payload->exp < time()) {
            throw new Exception('Token has expired');
        }
        
        return $payload;
    }
    
    // Create token for user
    public static function createUserToken($user) {
        $payload = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'iat' => time(), // Issued at
            'exp' => time() + JWT_EXPIRE_TIME // Expiration time
        ];
        
        return self::encode($payload);
    }
    
    // Base64 URL encode
    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    // Base64 URL decode
    private static function base64UrlDecode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }
    
    // Generate refresh token
    public static function createRefreshToken($user) {
        $payload = [
            'user_id' => $user['id'],
            'type' => 'refresh',
            'iat' => time(),
            'exp' => time() + (JWT_EXPIRE_TIME * 4) // 4x longer than access token
        ];
        
        return self::encode($payload);
    }
    
    // Validate refresh token
    public static function validateRefreshToken($token) {
        try {
            $payload = self::decode($token);
            
            if (!isset($payload->type) || $payload->type !== 'refresh') {
                throw new Exception('Invalid refresh token');
            }
            
            return $payload;
        } catch (Exception $e) {
            throw new Exception('Invalid refresh token: ' . $e->getMessage());
        }
    }
}
?>