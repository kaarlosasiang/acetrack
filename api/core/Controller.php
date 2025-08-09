<?php
class Controller {
    protected $db;
    protected $auth;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->auth = new Auth();
    }
    
    protected function getInput() {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?: [];
    }
    
    protected function getQueryParams() {
        return $_GET;
    }
    
    protected function getHeaders() {
        return getallheaders();
    }
    
    protected function jsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }
    
    protected function successResponse($data = null, $message = 'Success') {
        $response = ['success' => true, 'message' => $message];
        if ($data !== null) {
            $response['data'] = $data;
        }
        $this->jsonResponse($response);
    }
    
    protected function errorResponse($message, $statusCode = 400, $errors = null) {
        $response = ['success' => false, 'message' => $message];
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        $this->jsonResponse($response, $statusCode);
    }
    
    protected function validateRequired($data, $required) {
        $missing = [];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $missing[] = $field;
            }
        }
        
        if (!empty($missing)) {
            $this->errorResponse('Missing required fields', 400, $missing);
        }
    }
    
    protected function getCurrentUser() {
        return $_SESSION['user'] ?? null;
    }
    
    protected function getCurrentOrganization() {
        return $_SESSION['organization_id'] ?? null;
    }
    
    // Keep for backward compatibility
    protected function getCurrentTenant() {
        return $this->getCurrentOrganization();
    }
    
    protected function getPaginationParams() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(MAX_PAGE_SIZE, max(1, intval($_GET['limit'] ?? DEFAULT_PAGE_SIZE)));
        $offset = ($page - 1) * $limit;
        
        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset
        ];
    }
    
    protected function paginatedResponse($data, $total, $page, $limit) {
        $totalPages = ceil($total / $limit);
        
        $this->jsonResponse([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ]
        ]);
    }
    
    protected function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    protected function sanitizeInput($data) {
        if (is_array($data)) {
            return array_map([$this, 'sanitizeInput'], $data);
        }
        return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
    }
    
    protected function logActivity($action, $details = null) {
        $user = $this->getCurrentUser();
        $organizationId = $this->getCurrentOrganization();
        
        if ($user) {
            $this->db->insert('activity_logs', [
                'user_id' => $user['id'],
                'organization_id' => $organizationId,
                'action' => $action,
                'details' => $details ? json_encode($details) : null,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }
}

