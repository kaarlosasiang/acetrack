<?php
class AuthMiddleware
{

    public function handle()
    {
        // Check for Authorization header (multiple possible locations)
        $authHeader = null;

        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_REDIRECT_HTTP_AUTHORIZATION'];
        }

        if (!$authHeader) {
            $this->unauthorized('Authorization header is required');
        }

        // Check Bearer token format
        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $this->unauthorized('Invalid authorization header format');
        }

        $token = $matches[1];

        try {
            // Decode JWT token
            $payload = JWT::decode($token);

            if (!$payload || !isset($payload->user_id)) {
                $this->unauthorized('Invalid token payload');
            }

            // Verify user exists - status check removed for email verification disabled system
            $userModel = new User();
            $user = $userModel->find($payload->user_id);

            if (!$user) {
                $this->unauthorized('User not found');
            }

            // Email verification disabled - allow all users regardless of status
            // if (!$user || $user['status'] !== 'active') {
            //     $this->unauthorized('User not found or inactive');
            // }

            // Set user in global context (could be improved with proper DI)
            $_SERVER['AUTHENTICATED_USER'] = $user;
        } catch (Exception $e) {
            $this->unauthorized('Token validation failed: ' . $e->getMessage());
        }
    }

    private function unauthorized($message)
    {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized',
            'message' => $message
        ]);
        exit();
    }
}
