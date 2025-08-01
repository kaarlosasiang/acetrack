<?php
class AuthMiddleware implements Middleware {
    public function handle($params = []) {
        session_start();
        
        $auth = new Auth();
        $user = $auth->getCurrentUser();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized: Invalid or expired token'
            ]);
            exit;
        }
        
        // Store user in session for easy access
        $_SESSION['user'] = $user;
        $_SESSION['tenant_id'] = $user['tenant_id'];
    }
}

