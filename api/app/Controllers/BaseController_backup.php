<?php
abstract class BaseController {
    protected $currentUser = null;
    protected $currentTenant = null;
    protected $currentTenantId = null;
    
    public function __construct() {
        // Set current user and tenant from middleware context if available
        $this->setCurrentContext();
    }
    
    protected function setCurrentContext() {
        // This would be set by middleware in actual requests
        // For now, we'll leave it as placeholder
    }
    
    // Log audit event
    protected function logAudit($action, $entityType = null, $entityId = null, $oldValues = null, $newValues = null) {
        try {
            $auditModel = new AuditLog();
            $auditModel->create([
                'organization_id' => $this->currentTenantId,
                'user_id' => $this->currentUser['id'] ?? null,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'old_values' => $oldValues ? json_encode($oldValues) : null,
                'new_values' => $newValues ? json_encode($newValues) : null,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
        } catch (Exception $e) {
            // Log audit failure but don't break the main flow
            error_log('Audit log failed: ' . $e->getMessage());
        }
    }
    
    // Enhanced role checking methods using the new helpers
    
    /**
     * Check if current user has admin access in any organization
     */
    protected function requireAdminAccess($errorMessage = 'Admin access required') {
        $this->requireAuth();
        
        require_once APP_PATH . '/Helpers/RoleHelper.php';
        
        if (!RoleHelper::hasAdminAccess($this->currentUser)) {
            $this->error($errorMessage, 403);
        }
    }
    
    /**
     * Check if current user has admin access in current tenant organization
     */
    protected function requireTenantAdminAccess($errorMessage = 'Organization admin access required') {
        $this->requireTenantMembership();
        
        require_once APP_PATH . '/Helpers/RoleHelper.php';
        
        if (!RoleHelper::hasAdminAccessInOrganization($this->currentUser, $this->currentTenantId)) {
            $this->error($errorMessage, 403);
        }
    }
    
    /**
     * Check if current user has super admin privileges
     */
    protected function requireSuperAdmin($errorMessage = 'Super admin access required') {
        $this->requireAuth();
        
        require_once APP_PATH . '/Helpers/RoleHelper.php';
        
        if (!RoleHelper::isSuperAdmin($this->currentUser)) {
            $this->error($errorMessage, 403);
        }
    }
    
    /**
     * Check if current user has specific role in current tenant
     */
    protected function requireTenantRole($requiredRoles, $errorMessage = 'Insufficient privileges') {
        $this->requireTenantMembership();
        
        require_once APP_PATH . '/Helpers/RoleHelper.php';
        
        if (!is_array($requiredRoles)) {
            $requiredRoles = [$requiredRoles];
        }
        
        if (!RoleHelper::hasRoleInTenant($this->currentUser, $this->currentTenantId, $requiredRoles)) {
            $this->error($errorMessage, 403);
        }
    }
    
    /**
     * Get current user's dashboard information
     */
    protected function getCurrentUserDashboard() {
        require_once APP_PATH . '/Helpers/DashboardRouter.php';
        
        if (!$this->currentUser) {
            return null;
        }
        
        return [
            'dashboard_type' => DashboardRouter::getUserDashboardType($this->currentUser),
            'dashboard_url' => DashboardRouter::getDashboardUrl($this->currentUser),
            'has_admin_access' => DashboardRouter::hasAdminAccess($this->currentUser),
            'primary_organization' => DashboardRouter::getPrimaryOrganization($this->currentUser)
        ];
    }
    
    // Set current authenticated user
    protected function setCurrentUser() {
        $authHeader = null;
        
        // Check multiple possible header names
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_REDIRECT_HTTP_AUTHORIZATION'];
        }
        
        if ($authHeader) {
            $token = str_replace('Bearer ', '', $authHeader);
            $this->currentUser = $this->getUserFromToken($token);
        }
    }
    
    // Set current tenant context
    protected function setCurrentTenant() {
        // Get tenant from header, subdomain, or query parameter
        $tenantId = $this->getTenantFromRequest();
        if ($tenantId) {
            $this->currentTenantId = $tenantId;
            // Load tenant details if needed
            $organizationModel = new Organization();
            $this->currentTenant = $organizationModel->find($tenantId);
        }
    }
    
    // Get tenant ID from request
    protected function getTenantFromRequest() {
        // Method 1: From header
        if (isset($_SERVER['HTTP_X_TENANT_ID'])) {
            return $_SERVER['HTTP_X_TENANT_ID'];
        }
        
        // Method 2: From query parameter
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
    
    // Get user from JWT token
    protected function getUserFromToken($token) {
        try {
            $payload = JWT::decode($token);
            if ($payload && isset($payload->user_id)) {
                $userModel = new User();
                return $userModel->find($payload->user_id);
            }
        } catch (Exception $e) {
            // Invalid token
        }
        return null;
    }
    
    // Check if user is authenticated
    protected function requireAuth() {
        if (!$this->currentUser) {
            $this->jsonResponse([
                'success' => false,
                'error' => 'Authentication required'
            ], 401);
        }
    }
    
    // Check if user belongs to current tenant
    protected function requireTenantMembership() {
        $this->requireAuth();
        
        if (!$this->currentTenantId) {
            $this->jsonResponse([
                'success' => false,
                'error' => 'Tenant context required'
            ], 400);
        }
        
        // Check if user is member of the tenant organization
        $memberModel = new OrganizationMember();
        $member = $memberModel->findByUserAndOrganization($this->currentUser['id'], $this->currentTenantId);
        
        if (!$member || $member['status'] !== 'active') {
            $this->jsonResponse([
                'success' => false,
                'error' => 'Access denied - not a member of this organization'
            ], 403);
        }
        
        return $member;
    }
    
    // Check if user has specific role within tenant
    protected function requireRole($roles) {
        $member = $this->requireTenantMembership();
        
        if (is_string($roles)) {
            $roles = [$roles];
        }
        
        if (!in_array($member['role'], $roles)) {
            $this->jsonResponse([
                'success' => false,
                'error' => 'Insufficient permissions'
            ], 403);
        }
        
        return $member;
    }
    
    // Check if user is super admin
    protected function requireSuperAdmin() {
        $this->requireAuth();
        
        if (!$this->currentUser['is_super_admin']) {
            $this->jsonResponse([
                'success' => false,
                'error' => 'Super admin access required'
            ], 403);
        }
    }
    
    // Get request input data
    protected function getInput() {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        
        if (strpos($contentType, 'application/json') !== false) {
            $input = json_decode(file_get_contents('php://input'), true);
            return $input ?: [];
        }
        
        return array_merge($_GET, $_POST);
    }
    
    // Get specific input field with default value
    protected function input($key, $default = null) {
        $data = $this->getInput();
        return $data[$key] ?? $default;
    }
    
    // Validate required fields
    protected function validateRequired($fields, $data = null) {
        $data = $data ?: $this->getInput();
        $missing = [];
        
        foreach ($fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $missing[] = $field;
            }
        }
        
        if (!empty($missing)) {
            $this->jsonResponse([
                'success' => false,
                'error' => 'Missing required fields',
                'missing_fields' => $missing
            ], 400);
        }
        
        return true;
    }
    
    // Send JSON response
    protected function jsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Send success response
    protected function success($data = null, $message = null) {
        $response = ['success' => true];
        
        if ($message) {
            $response['message'] = $message;
        }
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        $this->jsonResponse($response);
    }
    
    // Send error response
    protected function error($message, $statusCode = 400, $details = null) {
        $response = [
            'success' => false,
            'error' => $message
        ];
        
        if ($details) {
            $response['details'] = $details;
        }
        
        $this->jsonResponse($response, $statusCode);
    }
    
    // Send validation error response
    protected function validationError($errors) {
        $this->jsonResponse([
            'success' => false,
            'error' => 'Validation failed',
            'validation_errors' => $errors
        ], 422);
    }
    
    // Get pagination parameters
    protected function getPaginationParams() {
        return [
            'page' => max(1, (int)($this->input('page', 1))),
            'per_page' => min(MAX_PAGE_SIZE, max(1, (int)($this->input('per_page', DEFAULT_PAGE_SIZE))))
        ];
    }
    
    // Upload file
    protected function uploadFile($fileKey, $allowedTypes = null, $maxSize = null) {
        if (!isset($_FILES[$fileKey]) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
            return false;
        }
        
        $file = $_FILES[$fileKey];
        $maxSize = $maxSize ?: MAX_UPLOAD_SIZE;
        
        // Check file size
        if ($file['size'] > $maxSize) {
            throw new Exception('File size exceeds maximum allowed size');
        }
        
        // Check file type
        $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($allowedTypes && !in_array($fileExt, $allowedTypes)) {
            throw new Exception('File type not allowed');
        }
        
        // Generate unique filename
        $filename = uniqid() . '_' . time() . '.' . $fileExt;
        $uploadPath = STORAGE_PATH . '/uploads/';
        
        // Create upload directory if it doesn't exist
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }
        
        $fullPath = $uploadPath . $filename;
        
        if (move_uploaded_file($file['tmp_name'], $fullPath)) {
            return [
                'filename' => $filename,
                'original_name' => $file['name'],
                'path' => $fullPath,
                'url' => '/uploads/' . $filename,
                'size' => $file['size'],
                'type' => $file['type']
            ];
        }
        
        return false;
    }
    
    // Log audit event
    protected function logAudit($action, $entityType = null, $entityId = null, $oldValues = null, $newValues = null) {
        try {
            $auditModel = new AuditLog();
            $auditModel->create([
                'organization_id' => $this->currentTenantId,
                'user_id' => $this->currentUser['id'] ?? null,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'old_values' => $oldValues ? json_encode($oldValues) : null,
                'new_values' => $newValues ? json_encode($newValues) : null,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
        } catch (Exception $e) {
            // Log audit failures silently to avoid breaking the main operation
            error_log('Audit logging failed: ' . $e->getMessage());
        }
    }
    
    // Enhanced role checking methods using the new helpers
    
    /**
     * Check if current user has admin access in any organization
     */
    protected function requireAdminAccess($errorMessage = 'Admin access required') {
        $this->requireAuth();
        
        require_once APP_PATH . '/Helpers/RoleHelper.php';
        
        if (!RoleHelper::hasAdminAccess($this->currentUser)) {
            $this->error($errorMessage, 403);
        }
    }
    
    /**
     * Check if current user has admin access in current tenant organization
     */
    protected function requireTenantAdminAccess($errorMessage = 'Organization admin access required') {
        $this->requireTenantMembership();
        
        require_once APP_PATH . '/Helpers/RoleHelper.php';
        
        if (!RoleHelper::hasAdminAccessInOrganization($this->currentUser, $this->currentTenantId)) {
            $this->error($errorMessage, 403);
        }
    }
    
    /**
     * Check if current user has super admin privileges
     */
    protected function requireSuperAdminAccess($errorMessage = 'Super admin access required') {
        $this->requireAuth();
        
        require_once APP_PATH . '/Helpers/RoleHelper.php';
        
        if (!RoleHelper::isSuperAdmin($this->currentUser)) {
            $this->error($errorMessage, 403);
        }
    }
    
    /**
     * Check if current user has specific role in current tenant
     */
    protected function requireTenantRole($requiredRoles, $errorMessage = 'Insufficient privileges') {
        $this->requireTenantMembership();
        
        require_once APP_PATH . '/Helpers/RoleHelper.php';
        
        if (!is_array($requiredRoles)) {
            $requiredRoles = [$requiredRoles];
        }
        
        if (!RoleHelper::hasRoleInTenant($this->currentUser, $this->currentTenantId, $requiredRoles)) {
            $this->error($errorMessage, 403);
        }
    }
    
    /**
     * Get current user's dashboard information
     */
    protected function getCurrentUserDashboard() {
        require_once APP_PATH . '/Helpers/DashboardRouter.php';
        
        if (!$this->currentUser) {
            return null;
        }
        
        return [
            'dashboard_type' => DashboardRouter::getUserDashboardType($this->currentUser),
            'dashboard_url' => DashboardRouter::getDashboardUrl($this->currentUser),
            'has_admin_access' => DashboardRouter::hasAdminAccess($this->currentUser),
            'primary_organization' => DashboardRouter::getPrimaryOrganization($this->currentUser)
        ];
    }
}
?>