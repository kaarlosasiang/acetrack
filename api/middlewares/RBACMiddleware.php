<?php
class RBACMiddleware implements Middleware {
    public function handle($params = []) {
        $user = $_SESSION['user'] ?? null;
        
        if (!$user || empty($params)) {
            return; // No role restriction
        }
        
        $requiredRoles = $params;
        $userRoles = $user['roles'] ?? [];
        
        // Super admin has access to everything
        if (in_array('super_admin', $userRoles)) {
            return;
        }
        
        // Check if user has any of the required roles
        $hasAccess = false;
        foreach ($requiredRoles as $role) {
            if (in_array($role, $userRoles)) {
                $hasAccess = true;
                break;
            }
        }
        
        if (!$hasAccess) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Insufficient permissions. Required roles: ' . implode(', ', $requiredRoles)
            ]);
            exit;
        }
    }
}

