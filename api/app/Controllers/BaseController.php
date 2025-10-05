<?php
require_once APP_PATH . '/Helpers/DashboardRouter.php';
require_once APP_PATH . '/Helpers/RoleHelper.php';
require_once APP_PATH . '/Models/AuditLog.php';

abstract class BaseController
{
    protected $currentUser = null;
    protected $currentTenant = null;
    protected $currentTenantId = null;

    public function __construct()
    {
        // Set current user and tenant from middleware context if available
        $this->setCurrentContext();
    }

    protected function setCurrentContext()
    {
        // This would be set by middleware in actual requests
        // For now, we'll leave it as placeholder
    }

    // Enhanced role checking methods using the new helpers

    /**
     * Check if current user has admin access in any organization
     */
    protected function requireAdminAccess($errorMessage = 'Admin access required')
    {
        $this->requireAuth();

        if (!RoleHelper::hasAdminAccess($this->currentUser)) {
            $this->error($errorMessage, 403);
        }
    }

    /**
     * Check if current user has admin access in the current tenant organization
     */
    protected function requireTenantAdminAccess($errorMessage = 'Organization admin access required')
    {
        $this->requireAuth();

        if (!RoleHelper::hasAdminAccessInOrganization($this->currentUser, $this->currentTenantId)) {
            $this->error($errorMessage, 403);
        }
    }

    /**
     * Check if current user is a super admin
     */
    protected function requireSuperAdmin($errorMessage = 'Super admin access required')
    {
        $this->requireAuth();

        if (!($this->currentUser['is_super_admin'] ?? false)) {
            $this->error($errorMessage, 403);
        }
    }

    /**
     * Check if current user has one of the required roles in the current tenant
     */
    protected function requireTenantRole($requiredRoles, $errorMessage = 'Insufficient privileges')
    {
        $this->requireAuth();
        $this->requireTenantMembership();

        if (!RoleHelper::hasRoleInTenant($this->currentUser, $this->currentTenantId, $requiredRoles)) {
            $this->error($errorMessage, 403);
        }
    }

    /**
     * Get current user's dashboard information
     */
    protected function getCurrentUserDashboard()
    {
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
    protected function setCurrentUser()
    {
        $authHeader = null;

        // Check for Authorization header
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? null;
        } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }

        if ($authHeader && strpos($authHeader, 'Bearer ') === 0) {
            $token = substr($authHeader, 7);
            $this->currentUser = $this->getUserFromToken($token);
        }

        return $this->currentUser;
    }

    // Set current tenant from request
    protected function setCurrentTenant()
    {
        $tenantId = $this->getTenantFromRequest();
        if ($tenantId) {
            $this->currentTenantId = $tenantId;
            // Load tenant data if needed
            // $this->currentTenant = $this->loadTenant($tenantId);
        }
    }

    // Get tenant ID from request headers
    protected function getTenantFromRequest()
    {
        // Check X-Tenant-ID header
        $tenantId = null;

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $tenantId = $headers['X-Tenant-ID'] ?? null;
        } elseif (isset($_SERVER['HTTP_X_TENANT_ID'])) {
            $tenantId = $_SERVER['HTTP_X_TENANT_ID'];
        }

        // Fallback to URL parameters or other methods
        if (!$tenantId) {
            $tenantId = $_GET['tenant_id'] ?? $_POST['tenant_id'] ?? null;
        }

        return $tenantId ? (int)$tenantId : null;
    }

    // Get user from JWT token
    protected function getUserFromToken($token)
    {
        try {
            require_once APP_PATH . '/Helpers/JWT.php';
            $decoded = JWT::decode($token);

            // Load full user data including organizations
            require_once APP_PATH . '/Models/User.php';
            $userModel = new User();
            $user = $userModel->find($decoded['user_id']);

            if ($user) {
                // Add organizations to user data
                $user['organizations'] = $userModel->getUserOrganizations($decoded['user_id']);
            }

            return $user;
        } catch (Exception $e) {
            return null;
        }
    }

    // Require authentication
    protected function requireAuth()
    {
        if (!$this->currentUser) {
            $this->error('Authentication required', 401);
        }
    }

    // Require tenant membership
    protected function requireTenantMembership()
    {
        $this->requireAuth();

        if (!$this->currentTenantId) {
            $this->error('Tenant context required', 400);
        }

        if (!RoleHelper::isMemberOfOrganization($this->currentUser, $this->currentTenantId)) {
            $this->error('Access denied: Not a member of this organization', 403);
        }
    }

    // Legacy role check method (for backward compatibility)
    protected function requireRole($roles)
    {
        $this->requireTenantRole($roles);
    }

    // Get all input data
    protected function getInput()
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (strpos($contentType, 'application/json') !== false) {
            $input = file_get_contents('php://input');
            return json_decode($input, true) ?? [];
        }

        return array_merge($_GET, $_POST);
    }

    // Get specific input value
    protected function input($key, $default = null)
    {
        $input = $this->getInput();
        return $input[$key] ?? $default;
    }

    // Validate required fields
    protected function validateRequired($fields, $data = null)
    {
        if ($data === null) {
            $data = $this->getInput();
        }

        $missing = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
                $missing[] = $field;
            }
        }

        if (!empty($missing)) {
            $this->validationError([
                'missing_fields' => $missing,
                'message' => 'Required fields are missing: ' . implode(', ', $missing)
            ]);
        }

        return true;
    }

    // JSON response helper
    protected function jsonResponse($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    // Success response
    protected function success($data = null, $message = null)
    {
        $response = ['success' => true];

        if ($message) {
            $response['message'] = $message;
        }

        if ($data !== null) {
            $response['data'] = $data;
        }

        $this->jsonResponse($response);
    }

    // Error response
    protected function error($message, $statusCode = 400, $details = null)
    {
        $response = [
            'success' => false,
            'error' => $message
        ];

        if ($details) {
            $response['details'] = $details;
        }

        $this->jsonResponse($response, $statusCode);
    }

    // Validation error response
    protected function validationError($errors)
    {
        $this->error('Validation failed', 422, $errors);
    }

    // Get pagination parameters
    protected function getPaginationParams()
    {
        return [
            'page' => max(1, (int)($this->input('page', 1))),
            'limit' => min(100, max(10, (int)($this->input('limit', 20)))),
            'offset' => function ($page, $limit) {
                return ($page - 1) * $limit;
            }
        ];
    }

    // File upload helper
    protected function uploadFile($fileKey, $allowedTypes = null, $maxSize = null)
    {
        if (!isset($_FILES[$fileKey])) {
            throw new Exception('No file uploaded');
        }

        $file = $_FILES[$fileKey];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload error: ' . $file['error']);
        }

        // Validate file type
        if ($allowedTypes && !in_array($file['type'], $allowedTypes)) {
            throw new Exception('Invalid file type: ' . $file['type']);
        }

        // Validate file size
        if ($maxSize && $file['size'] > $maxSize) {
            throw new Exception('File too large: ' . $file['size'] . ' bytes');
        }

        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid() . '.' . $extension;
        $uploadPath = APP_PATH . '/../storage/uploads/' . $filename;

        // Create directory if it doesn't exist
        $uploadDir = dirname($uploadPath);
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
            throw new Exception('Failed to move uploaded file');
        }

        return [
            'filename' => $filename,
            'original_name' => $file['name'],
            'size' => $file['size'],
            'type' => $file['type'],
            'path' => $uploadPath
        ];
    }

    // Log audit event
    protected function logAudit($action, $entityType = null, $entityId = null, $oldValues = null, $newValues = null)
    {
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
}
