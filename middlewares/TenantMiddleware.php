<?php
class TenantMiddleware implements Middleware {
    public function handle($params = []) {
        $headers = getallheaders();
        $tenantId = $headers['X-Tenant-ID'] ?? null;
        $user = $_SESSION['user'] ?? null;
        
        if (!$user) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Authentication required'
            ]);
            exit;
        }
        
        // Super admin can access any tenant
        if (in_array('super_admin', $user['roles'])) {
            if ($tenantId) {
                $_SESSION['tenant_id'] = $tenantId;
            }
            return;
        }
        
        // Regular users must stay within their tenant
        if (!$user['tenant_id']) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'User not associated with any tenant'
            ]);
            exit;
        }
        
        // Ensure user can only access their own tenant data
        $_SESSION['tenant_id'] = $user['tenant_id'];
        
        // Validate tenant exists and is active
        $db = Database::getInstance();
        $tenant = $db->fetch(
            "SELECT * FROM tenants WHERE id = :id AND status = 'active'",
            ['id' => $user['tenant_id']]
        );
        
        if (!$tenant) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Tenant not found or inactive'
            ]);
            exit;
        }
    }
}

