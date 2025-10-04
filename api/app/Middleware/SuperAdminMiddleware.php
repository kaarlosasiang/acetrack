<?php
class SuperAdminMiddleware {
    
    public function handle() {
        // Get authenticated user (should be set by AuthMiddleware)
        $user = $_SERVER['AUTHENTICATED_USER'] ?? null;
        
        if (!$user) {
            $this->forbidden('Authentication required');
        }
        
        // Check if user is super admin
        if (!$user['is_super_admin']) {
            $this->forbidden('Super admin access required');
        }
    }
    
    private function forbidden($message) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Forbidden',
            'message' => $message
        ]);
        exit();
    }
}
?>