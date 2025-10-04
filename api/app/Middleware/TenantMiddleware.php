<?php
class TenantMiddleware {
    
    public function handle() {
        // Get tenant ID from request
        $tenantId = $this->getTenantIdFromRequest();
        
        if (!$tenantId) {
            $this->forbidden('Tenant context is required');
        }
        
        // Verify tenant exists and is active
        $organizationModel = new Organization();
        $organization = $organizationModel->find($tenantId);
        
        if (!$organization) {
            $this->forbidden('Organization not found');
        }
        
        if ($organization['status'] !== 'active') {
            $this->forbidden('Organization is not active');
        }
        
        // Check subscription status
        if (!$organizationModel->isSubscriptionActive($tenantId)) {
            $this->forbidden('Organization subscription has expired');
        }
        
        // Check if authenticated user is member of this organization
        $user = $_SERVER['AUTHENTICATED_USER'] ?? null;
        if ($user) {
            $memberModel = new OrganizationMember();
            $membership = $memberModel->findByUserAndOrganization($user['id'], $tenantId);
            
            if (!$membership || $membership['status'] !== 'active') {
                $this->forbidden('You are not a member of this organization');
            }
            
            // Set membership info in global context
            $_SERVER['ORGANIZATION_MEMBERSHIP'] = $membership;
        }
        
        // Set tenant context globally
        $_SERVER['TENANT_ID'] = $tenantId;
        $_SERVER['TENANT_ORGANIZATION'] = $organization;
    }
    
    private function getTenantIdFromRequest() {
        // Method 1: From X-Tenant-ID header
        if (isset($_SERVER['HTTP_X_TENANT_ID'])) {
            return $_SERVER['HTTP_X_TENANT_ID'];
        }
        
        // Method 2: From tenant_id query parameter
        if (isset($_GET['tenant_id'])) {
            return $_GET['tenant_id'];
        }
        
        // Method 3: From subdomain (if using subdomain-based tenancy)
        if (isset($_SERVER['HTTP_HOST'])) {
            $host = $_SERVER['HTTP_HOST'];
            $parts = explode('.', $host);
            
            if (count($parts) > 2 && $parts[0] !== 'www') {
                // Look up organization by subdomain
                $organizationModel = new Organization();
                $org = $organizationModel->findBySubdomain($parts[0]);
                return $org ? $org['id'] : null;
            }
        }
        
        return null;
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