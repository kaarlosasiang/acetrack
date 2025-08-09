<?php
class OrganizationMiddleware implements Middleware {
    public function handle($params = []) {
        $headers = getallheaders();
        $organizationId = $headers['X-Organization-ID'] ?? null;
        $user = $_SESSION['user'] ?? null;
        
        if (!$user) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Authentication required'
            ]);
            exit;
        }
        
        // Super admin can access any organization
        if (in_array('super_admin', $user['roles'])) {
            if ($organizationId) {
                $_SESSION['organization_id'] = $organizationId;
            }
            return;
        }
        
        // Regular users must stay within their organization
        if (!$user['organization_id']) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'User not associated with any organization'
            ]);
            exit;
        }
        
        // Ensure user can only access their own organization data
        $_SESSION['organization_id'] = $user['organization_id'];
        
        // Validate organization exists and is active
        $db = Database::getInstance();
        $organization = $db->fetch(
            "SELECT * FROM organizations WHERE id = :id AND status = 'active'",
            ['id' => $user['organization_id']]
        );
        
        if (!$organization) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Organization not found or inactive'
            ]);
            exit;
        }
    }
}
