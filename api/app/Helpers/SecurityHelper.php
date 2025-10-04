<?php
require_once 'Logger.php';

class SecurityHelper {
    private $logger;
    private $rateLimitStore = [];
    private $blacklistedTokens = [];
    
    public function __construct() {
        $this->logger = new Logger();
        $this->loadRateLimitData();
        $this->loadBlacklistedTokens();
    }
    
    // CSRF Protection
    
    // Generate CSRF token
    public function generateCSRFToken($sessionId = null) {
        $sessionId = $sessionId ?: session_id() ?: 'anonymous';
        $token = hash('sha256', $sessionId . microtime() . random_bytes(16));
        
        // Store token with expiry (24 hours)
        $this->storeCSRFToken($token, $sessionId);
        
        return $token;
    }
    
    // Validate CSRF token
    public function validateCSRFToken($token, $sessionId = null) {
        $sessionId = $sessionId ?: session_id() ?: 'anonymous';
        
        if (!$token) {
            return false;
        }
        
        $storedTokens = $this->getCSRFTokens($sessionId);
        
        foreach ($storedTokens as $storedToken) {
            if (hash_equals($storedToken['token'], $token)) {
                // Check if token is expired (24 hours)
                if (time() - $storedToken['created_at'] < 86400) {
                    // Remove used token (one-time use)
                    $this->removeCSRFToken($token, $sessionId);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Store CSRF token
    private function storeCSRFToken($token, $sessionId) {
        $tokenDir = STORAGE_PATH . '/csrf_tokens';
        if (!is_dir($tokenDir)) {
            mkdir($tokenDir, 0755, true);
        }
        
        $tokenFile = $tokenDir . '/csrf_' . hash('sha256', $sessionId) . '.json';
        
        $tokens = [];
        if (file_exists($tokenFile)) {
            $tokens = json_decode(file_get_contents($tokenFile), true) ?: [];
        }
        
        // Clean up expired tokens
        $tokens = array_filter($tokens, function($t) {
            return (time() - $t['created_at']) < 86400;
        });
        
        // Add new token
        $tokens[] = [
            'token' => $token,
            'created_at' => time()
        ];
        
        // Keep only last 10 tokens per session
        $tokens = array_slice($tokens, -10);
        
        file_put_contents($tokenFile, json_encode($tokens), LOCK_EX);
    }
    
    // Get CSRF tokens for session
    private function getCSRFTokens($sessionId) {
        $tokenFile = STORAGE_PATH . '/csrf_tokens/csrf_' . hash('sha256', $sessionId) . '.json';
        
        if (!file_exists($tokenFile)) {
            return [];
        }
        
        return json_decode(file_get_contents($tokenFile), true) ?: [];
    }
    
    // Remove used CSRF token
    private function removeCSRFToken($token, $sessionId) {
        $tokenFile = STORAGE_PATH . '/csrf_tokens/csrf_' . hash('sha256', $sessionId) . '.json';
        
        if (!file_exists($tokenFile)) {
            return;
        }
        
        $tokens = json_decode(file_get_contents($tokenFile), true) ?: [];
        $tokens = array_filter($tokens, function($t) use ($token) {
            return $t['token'] !== $token;
        });
        
        file_put_contents($tokenFile, json_encode($tokens), LOCK_EX);
    }
    
    // Rate Limiting
    
    // Check rate limit
    public function checkRateLimit($identifier, $maxAttempts = 60, $timeWindow = 3600) {
        $key = 'rate_limit_' . hash('sha256', $identifier);
        $now = time();
        
        if (!isset($this->rateLimitStore[$key])) {
            $this->rateLimitStore[$key] = [
                'attempts' => 1,
                'window_start' => $now,
                'last_attempt' => $now
            ];
            $this->saveRateLimitData();
            return true;
        }
        
        $data = $this->rateLimitStore[$key];
        
        // Reset window if time window has passed
        if ($now - $data['window_start'] > $timeWindow) {
            $this->rateLimitStore[$key] = [
                'attempts' => 1,
                'window_start' => $now,
                'last_attempt' => $now
            ];
            $this->saveRateLimitData();
            return true;
        }
        
        // Check if rate limit exceeded
        if ($data['attempts'] >= $maxAttempts) {
            $this->logger->warning('Rate limit exceeded', [
                'identifier' => $identifier,
                'attempts' => $data['attempts'],
                'max_attempts' => $maxAttempts,
                'time_window' => $timeWindow
            ]);
            return false;
        }
        
        // Increment attempt count
        $this->rateLimitStore[$key]['attempts']++;
        $this->rateLimitStore[$key]['last_attempt'] = $now;
        $this->saveRateLimitData();
        
        return true;
    }
    
    // Get remaining rate limit attempts
    public function getRateLimitInfo($identifier, $maxAttempts = 60, $timeWindow = 3600) {
        $key = 'rate_limit_' . hash('sha256', $identifier);
        $now = time();
        
        if (!isset($this->rateLimitStore[$key])) {
            return [
                'attempts_used' => 0,
                'attempts_remaining' => $maxAttempts,
                'window_reset_time' => $now + $timeWindow
            ];
        }
        
        $data = $this->rateLimitStore[$key];
        
        // Check if window has reset
        if ($now - $data['window_start'] > $timeWindow) {
            return [
                'attempts_used' => 0,
                'attempts_remaining' => $maxAttempts,
                'window_reset_time' => $now + $timeWindow
            ];
        }
        
        return [
            'attempts_used' => $data['attempts'],
            'attempts_remaining' => max(0, $maxAttempts - $data['attempts']),
            'window_reset_time' => $data['window_start'] + $timeWindow
        ];
    }
    
    // Load rate limit data from storage
    private function loadRateLimitData() {
        $rateLimitFile = STORAGE_PATH . '/security/rate_limits.json';
        
        if (file_exists($rateLimitFile)) {
            $data = json_decode(file_get_contents($rateLimitFile), true);
            if ($data) {
                $this->rateLimitStore = $data;
                $this->cleanupExpiredRateLimits();
            }
        }
    }
    
    // Save rate limit data to storage
    private function saveRateLimitData() {
        $securityDir = STORAGE_PATH . '/security';
        if (!is_dir($securityDir)) {
            mkdir($securityDir, 0755, true);
        }
        
        $rateLimitFile = $securityDir . '/rate_limits.json';
        file_put_contents($rateLimitFile, json_encode($this->rateLimitStore), LOCK_EX);
    }
    
    // Clean up expired rate limit entries
    private function cleanupExpiredRateLimits() {
        $now = time();
        $cleaned = 0;
        
        foreach ($this->rateLimitStore as $key => $data) {
            // Remove entries older than 24 hours
            if ($now - $data['last_attempt'] > 86400) {
                unset($this->rateLimitStore[$key]);
                $cleaned++;
            }
        }
        
        if ($cleaned > 0) {
            $this->saveRateLimitData();
            $this->logger->info('Cleaned up expired rate limit entries', ['cleaned' => $cleaned]);
        }
    }
    
    // Input Sanitization
    
    // Sanitize HTML input
    public function sanitizeHtml($input, $allowedTags = '') {
        if (!is_string($input)) {
            return $input;
        }
        
        // Remove null bytes and control characters
        $input = str_replace(chr(0), '', $input);
        $input = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $input);
        
        // Strip tags with allowed tags
        return strip_tags($input, $allowedTags);
    }
    
    // Sanitize SQL input (basic - use prepared statements instead)
    public function sanitizeSql($input) {
        if (!is_string($input)) {
            return $input;
        }
        
        // Remove dangerous characters
        $dangerous = ['--', ';', '/*', '*/', 'xp_', 'sp_', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'EXEC'];
        
        foreach ($dangerous as $danger) {
            $input = str_ireplace($danger, '', $input);
        }
        
        return trim($input);
    }
    
    // Validate and sanitize email
    public function sanitizeEmail($email) {
        $email = trim(strtolower($email));
        return filter_var($email, FILTER_SANITIZE_EMAIL);
    }
    
    // Validate and sanitize URL
    public function sanitizeUrl($url) {
        $url = trim($url);
        return filter_var($url, FILTER_SANITIZE_URL);
    }
    
    // Sanitize filename
    public function sanitizeFilename($filename) {
        // Remove path information and dangerous characters
        $filename = basename($filename);
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
        
        // Prevent hidden files and system files
        $filename = ltrim($filename, '.');
        
        // Limit length
        return substr($filename, 0, 255);
    }
    
    // Token Blacklisting
    
    // Blacklist JWT token
    public function blacklistToken($token, $reason = 'logout') {
        try {
            // Extract token info
            $tokenInfo = $this->parseJWTToken($token);
            
            if (!$tokenInfo) {
                return false;
            }
            
            $blacklistEntry = [
                'token_hash' => hash('sha256', $token),
                'user_id' => $tokenInfo['user_id'] ?? null,
                'expires_at' => $tokenInfo['exp'] ?? (time() + 86400),
                'blacklisted_at' => time(),
                'reason' => $reason
            ];
            
            $this->blacklistedTokens[] = $blacklistEntry;
            $this->saveBlacklistedTokens();
            
            $this->logger->info('Token blacklisted', [
                'user_id' => $tokenInfo['user_id'] ?? null,
                'reason' => $reason
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error('Token blacklisting failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
    
    // Check if token is blacklisted
    public function isTokenBlacklisted($token) {
        $tokenHash = hash('sha256', $token);
        
        foreach ($this->blacklistedTokens as $entry) {
            if ($entry['token_hash'] === $tokenHash) {
                // Check if blacklist entry is still valid
                if (time() < $entry['expires_at']) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Load blacklisted tokens from storage
    private function loadBlacklistedTokens() {
        $blacklistFile = STORAGE_PATH . '/security/blacklisted_tokens.json';
        
        if (file_exists($blacklistFile)) {
            $data = json_decode(file_get_contents($blacklistFile), true);
            if ($data) {
                $this->blacklistedTokens = $data;
                $this->cleanupExpiredTokens();
            }
        }
    }
    
    // Save blacklisted tokens to storage
    private function saveBlacklistedTokens() {
        $securityDir = STORAGE_PATH . '/security';
        if (!is_dir($securityDir)) {
            mkdir($securityDir, 0755, true);
        }
        
        $blacklistFile = $securityDir . '/blacklisted_tokens.json';
        file_put_contents($blacklistFile, json_encode($this->blacklistedTokens), LOCK_EX);
    }
    
    // Clean up expired blacklisted tokens
    private function cleanupExpiredTokens() {
        $now = time();
        $cleaned = 0;
        
        $this->blacklistedTokens = array_filter($this->blacklistedTokens, function($entry) use ($now, &$cleaned) {
            if ($now >= $entry['expires_at']) {
                $cleaned++;
                return false;
            }
            return true;
        });
        
        if ($cleaned > 0) {
            $this->saveBlacklistedTokens();
            $this->logger->info('Cleaned up expired blacklisted tokens', ['cleaned' => $cleaned]);
        }
    }
    
    // Parse JWT token (basic parsing)
    private function parseJWTToken($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return null;
        }
        
        try {
            // Decode payload (second part)
            $payload = json_decode(base64_decode($parts[1]), true);
            return $payload;
        } catch (Exception $e) {
            return null;
        }
    }
    
    // Security Headers
    
    // Set security headers
    public function setSecurityHeaders() {
        // Prevent XSS attacks
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        
        // HSTS (only over HTTPS)
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
        
        // Content Security Policy (basic)
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'");
        
        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');
        
        // Feature Policy
        header("Feature-Policy: microphone 'none'; camera 'none'; geolocation 'self'");
    }
    
    // Password Security
    
    // Check password strength
    public function checkPasswordStrength($password) {
        $strength = [
            'score' => 0,
            'feedback' => [],
            'is_strong' => false
        ];
        
        // Length check
        if (strlen($password) >= 8) {
            $strength['score'] += 1;
        } else {
            $strength['feedback'][] = 'Password should be at least 8 characters long';
        }
        
        // Uppercase letter
        if (preg_match('/[A-Z]/', $password)) {
            $strength['score'] += 1;
        } else {
            $strength['feedback'][] = 'Include at least one uppercase letter';
        }
        
        // Lowercase letter
        if (preg_match('/[a-z]/', $password)) {
            $strength['score'] += 1;
        } else {
            $strength['feedback'][] = 'Include at least one lowercase letter';
        }
        
        // Number
        if (preg_match('/[0-9]/', $password)) {
            $strength['score'] += 1;
        } else {
            $strength['feedback'][] = 'Include at least one number';
        }
        
        // Special character
        if (preg_match('/[^a-zA-Z0-9]/', $password)) {
            $strength['score'] += 1;
        } else {
            $strength['feedback'][] = 'Include at least one special character';
        }
        
        // Check against common passwords
        if ($this->isCommonPassword($password)) {
            $strength['score'] = max(0, $strength['score'] - 2);
            $strength['feedback'][] = 'Avoid common passwords';
        }
        
        $strength['is_strong'] = $strength['score'] >= 4;
        
        return $strength;
    }
    
    // Check if password is commonly used
    private function isCommonPassword($password) {
        $commonPasswords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890', 'password1'
        ];
        
        return in_array(strtolower($password), $commonPasswords);
    }
    
    // IP Security
    
    // Get client IP address
    public function getClientIP() {
        // Check for various headers that might contain the real IP
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // CloudFlare
            'HTTP_CLIENT_IP',            // Proxy
            'HTTP_X_FORWARDED_FOR',      // Load balancer/proxy
            'HTTP_X_FORWARDED',          // Proxy
            'HTTP_X_CLUSTER_CLIENT_IP',  // Cluster
            'HTTP_FORWARDED_FOR',        // Proxy
            'HTTP_FORWARDED',            // Proxy
            'REMOTE_ADDR'                // Direct connection
        ];
        
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = $_SERVER[$header];
                
                // Handle comma-separated IPs (from proxies)
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                
                // Validate IP address
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
    // Check if IP is in whitelist/blacklist
    public function isIPAllowed($ip, $whitelist = [], $blacklist = []) {
        // Check blacklist first
        if (!empty($blacklist)) {
            foreach ($blacklist as $blockedIP) {
                if ($this->ipInRange($ip, $blockedIP)) {
                    return false;
                }
            }
        }
        
        // If whitelist exists, IP must be in it
        if (!empty($whitelist)) {
            foreach ($whitelist as $allowedIP) {
                if ($this->ipInRange($ip, $allowedIP)) {
                    return true;
                }
            }
            return false; // Not in whitelist
        }
        
        return true; // No restrictions or passed blacklist
    }
    
    // Check if IP is in range (supports CIDR notation)
    private function ipInRange($ip, $range) {
        if (strpos($range, '/') !== false) {
            // CIDR notation
            list($subnet, $bits) = explode('/', $range);
            $ip = ip2long($ip);
            $subnet = ip2long($subnet);
            $mask = -1 << (32 - $bits);
            $subnet &= $mask;
            return ($ip & $mask) == $subnet;
        } else {
            // Direct IP match
            return $ip === $range;
        }
    }
    
    // Security Statistics
    public function getSecurityStats() {
        return [
            'blacklisted_tokens' => count($this->blacklistedTokens),
            'active_rate_limits' => count($this->rateLimitStore),
            'csrf_tokens_stored' => $this->countCSRFTokens(),
            'last_cleanup' => $this->getLastCleanupTime()
        ];
    }
    
    private function countCSRFTokens() {
        $tokenDir = STORAGE_PATH . '/csrf_tokens';
        if (!is_dir($tokenDir)) {
            return 0;
        }
        
        return count(glob($tokenDir . '/csrf_*.json'));
    }
    
    private function getLastCleanupTime() {
        $cleanupFile = STORAGE_PATH . '/security/last_cleanup.txt';
        if (file_exists($cleanupFile)) {
            return file_get_contents($cleanupFile);
        }
        return null;
    }
    
    // Cleanup expired security data
    public function performSecurityCleanup() {
        $this->cleanupExpiredRateLimits();
        $this->cleanupExpiredTokens();
        $this->cleanupExpiredCSRFTokens();
        
        // Record cleanup time
        $securityDir = STORAGE_PATH . '/security';
        if (!is_dir($securityDir)) {
            mkdir($securityDir, 0755, true);
        }
        
        file_put_contents($securityDir . '/last_cleanup.txt', date('Y-m-d H:i:s'));
        
        $this->logger->info('Security cleanup completed');
    }
    
    private function cleanupExpiredCSRFTokens() {
        $tokenDir = STORAGE_PATH . '/csrf_tokens';
        if (!is_dir($tokenDir)) {
            return;
        }
        
        $files = glob($tokenDir . '/csrf_*.json');
        $cleaned = 0;
        
        foreach ($files as $file) {
            $tokens = json_decode(file_get_contents($file), true) ?: [];
            $originalCount = count($tokens);
            
            // Remove expired tokens
            $tokens = array_filter($tokens, function($t) {
                return (time() - $t['created_at']) < 86400;
            });
            
            if (count($tokens) === 0) {
                // Remove empty file
                unlink($file);
                $cleaned += $originalCount;
            } elseif (count($tokens) < $originalCount) {
                // Update file with remaining tokens
                file_put_contents($file, json_encode($tokens), LOCK_EX);
                $cleaned += $originalCount - count($tokens);
            }
        }
        
        if ($cleaned > 0) {
            $this->logger->info('Cleaned up expired CSRF tokens', ['cleaned' => $cleaned]);
        }
    }
}
?>