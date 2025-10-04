<?php
require_once APP_PATH . '/Helpers/SecurityHelper.php';

class SecurityMiddleware {
    private $securityHelper;
    
    public function __construct() {
        $this->securityHelper = new SecurityHelper();
    }
    
    // Main middleware execution
    public function handle($request, $next) {
        // Set security headers
        $this->securityHelper->setSecurityHeaders();
        
        // Get client IP for rate limiting
        $clientIP = $this->securityHelper->getClientIP();
        
        // Apply rate limiting
        if (!$this->applyRateLimit($clientIP)) {
            $this->sendRateLimitError();
            return;
        }
        
        // Apply CSRF protection for state-changing operations
        if ($this->requiresCSRFProtection()) {
            if (!$this->validateCSRF()) {
                $this->sendCSRFError();
                return;
            }
        }
        
        // Check if JWT token is blacklisted (for authenticated requests)
        if ($this->hasAuthToken()) {
            if ($this->isTokenBlacklisted()) {
                $this->sendBlacklistedTokenError();
                return;
            }
        }
        
        // Sanitize input data
        $this->sanitizeInput();
        
        // Continue to next middleware or controller
        return $next($request);
    }
    
    // Apply rate limiting based on endpoint and IP
    private function applyRateLimit($clientIP) {
        $endpoint = $_SERVER['REQUEST_URI'] ?? '';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        // Different rate limits for different endpoints
        $rateLimits = $this->getRateLimits($endpoint, $method);
        
        if (!$rateLimits) {
            return true; // No rate limit for this endpoint
        }
        
        $identifier = $clientIP . ':' . $endpoint . ':' . $method;
        
        return $this->securityHelper->checkRateLimit(
            $identifier, 
            $rateLimits['max_attempts'], 
            $rateLimits['time_window']
        );
    }
    
    // Get rate limits for specific endpoint
    private function getRateLimits($endpoint, $method) {
        // Auth endpoints - stricter limits
        if (strpos($endpoint, '/auth/login') !== false) {
            return ['max_attempts' => 5, 'time_window' => 900]; // 5 attempts per 15 minutes
        }
        
        if (strpos($endpoint, '/auth/register') !== false) {
            return ['max_attempts' => 3, 'time_window' => 3600]; // 3 attempts per hour
        }
        
        if (strpos($endpoint, '/auth/forgot-password') !== false) {
            return ['max_attempts' => 5, 'time_window' => 3600]; // 5 attempts per hour
        }
        
        // File upload endpoints
        if (strpos($endpoint, '/upload') !== false || $method === 'POST' && strpos($endpoint, '/file') !== false) {
            return ['max_attempts' => 20, 'time_window' => 3600]; // 20 uploads per hour
        }
        
        // Email sending endpoints
        if (strpos($endpoint, '/email') !== false || strpos($endpoint, '/resend') !== false) {
            return ['max_attempts' => 10, 'time_window' => 3600]; // 10 emails per hour
        }
        
        // API endpoints - general limit
        if (strpos($endpoint, '/api/') !== false) {
            if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
                return ['max_attempts' => 100, 'time_window' => 3600]; // 100 mutations per hour
            } else {
                return ['max_attempts' => 300, 'time_window' => 3600]; // 300 reads per hour
            }
        }
        
        return null; // No specific rate limit
    }
    
    // Check if CSRF protection is required
    private function requiresCSRFProtection() {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        // CSRF protection for state-changing operations
        if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            $endpoint = $_SERVER['REQUEST_URI'] ?? '';
            
            // Skip CSRF for login endpoint (uses different auth mechanism)
            if (strpos($endpoint, '/auth/login') !== false) {
                return false;
            }
            
            // Skip CSRF for registration (public endpoint)
            if (strpos($endpoint, '/auth/register') !== false) {
                return false;
            }
            
            // Skip CSRF for QR scan endpoints (public)
            if (strpos($endpoint, '/scan/') !== false) {
                return false;
            }
            
            return true;
        }
        
        return false;
    }
    
    // Validate CSRF token
    private function validateCSRF() {
        // Get CSRF token from header or form data
        $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? 
                     $_POST['_csrf_token'] ?? 
                     $_GET['_csrf_token'] ?? null;
        
        if (!$csrfToken) {
            return false;
        }
        
        // Get session ID (use IP + User-Agent as fallback)
        $sessionId = session_id();
        if (!$sessionId) {
            $sessionId = md5($this->securityHelper->getClientIP() . ($_SERVER['HTTP_USER_AGENT'] ?? ''));
        }
        
        return $this->securityHelper->validateCSRFToken($csrfToken, $sessionId);
    }
    
    // Check if request has auth token
    private function hasAuthToken() {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        return strpos($authHeader, 'Bearer ') === 0;
    }
    
    // Check if JWT token is blacklisted
    private function isTokenBlacklisted() {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if (preg_match('/Bearer\\s+(\\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
            return $this->securityHelper->isTokenBlacklisted($token);
        }
        
        return false;
    }
    
    // Sanitize all input data
    private function sanitizeInput() {
        // Sanitize GET parameters
        if (!empty($_GET)) {
            $_GET = $this->sanitizeArray($_GET);
        }
        
        // Sanitize POST parameters
        if (!empty($_POST)) {
            $_POST = $this->sanitizeArray($_POST);
        }
        
        // Sanitize JSON input
        if ($this->isJsonRequest()) {
            $input = file_get_contents('php://input');
            if ($input) {
                $decoded = json_decode($input, true);
                if ($decoded) {
                    $sanitized = $this->sanitizeArray($decoded);
                    // Store sanitized input for controllers to use
                    $_REQUEST['__sanitized_json'] = $sanitized;
                }
            }
        }
    }
    
    // Sanitize array of data
    private function sanitizeArray($array) {
        $sanitized = [];
        
        foreach ($array as $key => $value) {
            $key = $this->securityHelper->sanitizeHtml($key);
            
            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeArray($value);
            } elseif (is_string($value)) {
                // Different sanitization based on key name
                if (strpos(strtolower($key), 'email') !== false) {
                    $sanitized[$key] = $this->securityHelper->sanitizeEmail($value);
                } elseif (strpos(strtolower($key), 'url') !== false || strpos(strtolower($key), 'link') !== false) {
                    $sanitized[$key] = $this->securityHelper->sanitizeUrl($value);
                } elseif (strpos(strtolower($key), 'file') !== false || strpos(strtolower($key), 'name') !== false) {
                    $sanitized[$key] = $this->securityHelper->sanitizeFilename($value);
                } else {
                    // General HTML sanitization (preserve some tags for rich content)
                    $allowedTags = '<p><br><strong><em><ul><ol><li><a>';
                    if (strpos(strtolower($key), 'description') !== false || 
                        strpos(strtolower($key), 'content') !== false ||
                        strpos(strtolower($key), 'notes') !== false) {
                        $sanitized[$key] = $this->securityHelper->sanitizeHtml($value, $allowedTags);
                    } else {
                        $sanitized[$key] = $this->securityHelper->sanitizeHtml($value);
                    }
                }
            } else {
                $sanitized[$key] = $value; // Keep non-string values as-is
            }
        }
        
        return $sanitized;
    }
    
    // Check if request is JSON
    private function isJsonRequest() {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        return strpos($contentType, 'application/json') !== false;
    }
    
    // Send rate limit error
    private function sendRateLimitError() {
        $clientIP = $this->securityHelper->getClientIP();
        $endpoint = $_SERVER['REQUEST_URI'] ?? '';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        $rateLimits = $this->getRateLimits($endpoint, $method);
        $rateLimitInfo = $this->securityHelper->getRateLimitInfo(
            $clientIP . ':' . $endpoint . ':' . $method,
            $rateLimits['max_attempts'],
            $rateLimits['time_window']
        );
        
        http_response_code(429);
        header('Content-Type: application/json');
        header('Retry-After: ' . ($rateLimitInfo['window_reset_time'] - time()));
        
        echo json_encode([
            'success' => false,
            'error' => 'Rate limit exceeded',
            'message' => 'Too many requests. Please try again later.',
            'rate_limit' => [
                'max_attempts' => $rateLimits['max_attempts'],
                'attempts_used' => $rateLimitInfo['attempts_used'],
                'attempts_remaining' => $rateLimitInfo['attempts_remaining'],
                'reset_time' => date('Y-m-d H:i:s', $rateLimitInfo['window_reset_time'])
            ]
        ]);
        exit;
    }
    
    // Send CSRF error
    private function sendCSRFError() {
        // Generate new CSRF token for the response
        $sessionId = session_id();
        if (!$sessionId) {
            $sessionId = md5($this->securityHelper->getClientIP() . ($_SERVER['HTTP_USER_AGENT'] ?? ''));
        }
        
        $newToken = $this->securityHelper->generateCSRFToken($sessionId);
        
        http_response_code(403);
        header('Content-Type: application/json');
        
        echo json_encode([
            'success' => false,
            'error' => 'CSRF token validation failed',
            'message' => 'Invalid or missing CSRF token. Please refresh and try again.',
            'csrf_token' => $newToken
        ]);
        exit;
    }
    
    // Send blacklisted token error
    private function sendBlacklistedTokenError() {
        http_response_code(401);
        header('Content-Type: application/json');
        
        echo json_encode([
            'success' => false,
            'error' => 'Token blacklisted',
            'message' => 'Your session has been invalidated. Please log in again.'
        ]);
        exit;
    }
    
    // Generate CSRF token endpoint (for forms)
    public static function generateCSRFToken() {
        $securityHelper = new SecurityHelper();
        
        $sessionId = session_id();
        if (!$sessionId) {
            $sessionId = md5($securityHelper->getClientIP() . ($_SERVER['HTTP_USER_AGENT'] ?? ''));
        }
        
        $token = $securityHelper->generateCSRFToken($sessionId);
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'csrf_token' => $token
        ]);
        exit;
    }
}
?>
