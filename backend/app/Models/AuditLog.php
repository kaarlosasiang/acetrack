<?php
require_once 'BaseModel.php';

class AuditLog extends BaseModel {
    protected $table = 'audit_logs';
    protected $timestamps = false; // This table has only created_at
    protected $fillable = [
        'organization_id', 'user_id', 'action', 'entity_type', 'entity_id',
        'old_values', 'new_values', 'ip_address', 'user_agent'
    ];
    
    // Create audit log entry
    public function createLog($data) {
        $data['created_at'] = date('Y-m-d H:i:s');
        
        // Convert arrays to JSON strings if needed
        if (isset($data['old_values']) && is_array($data['old_values'])) {
            $data['old_values'] = json_encode($data['old_values']);
        }
        
        if (isset($data['new_values']) && is_array($data['new_values'])) {
            $data['new_values'] = json_encode($data['new_values']);
        }
        
        return $this->create($data);
    }
    
    // Get organization audit logs
    public function getOrganizationLogs($organizationId, $page = 1, $perPage = 50, $filters = []) {
        $sql = "
            SELECT al.*, u.first_name, u.last_name, u.email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.organization_id = ?
        ";
        
        $params = [$organizationId];
        
        // Add filters
        if (isset($filters['action'])) {
            $sql .= " AND al.action = ?";
            $params[] = $filters['action'];
        }
        
        if (isset($filters['entity_type'])) {
            $sql .= " AND al.entity_type = ?";
            $params[] = $filters['entity_type'];
        }
        
        if (isset($filters['user_id'])) {
            $sql .= " AND al.user_id = ?";
            $params[] = $filters['user_id'];
        }
        
        if (isset($filters['date_from'])) {
            $sql .= " AND DATE(al.created_at) >= ?";
            $params[] = $filters['date_from'];
        }
        
        if (isset($filters['date_to'])) {
            $sql .= " AND DATE(al.created_at) <= ?";
            $params[] = $filters['date_to'];
        }
        
        $sql .= " ORDER BY al.created_at DESC";
        
        $offset = ($page - 1) * $perPage;
        $sql .= " LIMIT {$perPage} OFFSET {$offset}";
        
        $logs = $this->db->query($sql, $params);
        
        // Get total count for pagination
        $countSql = "SELECT COUNT(*) as total FROM audit_logs WHERE organization_id = ?";
        $countParams = [$organizationId];
        
        // Apply same filters to count query
        if (isset($filters['action'])) {
            $countSql .= " AND action = ?";
            $countParams[] = $filters['action'];
        }
        
        if (isset($filters['entity_type'])) {
            $countSql .= " AND entity_type = ?";
            $countParams[] = $filters['entity_type'];
        }
        
        if (isset($filters['user_id'])) {
            $countSql .= " AND user_id = ?";
            $countParams[] = $filters['user_id'];
        }
        
        if (isset($filters['date_from'])) {
            $countSql .= " AND DATE(created_at) >= ?";
            $countParams[] = $filters['date_from'];
        }
        
        if (isset($filters['date_to'])) {
            $countSql .= " AND DATE(created_at) <= ?";
            $countParams[] = $filters['date_to'];
        }
        
        $totalResult = $this->db->queryOne($countSql, $countParams);
        $total = $totalResult['total'];
        
        // Parse JSON values in results
        foreach ($logs as &$log) {
            if ($log['old_values']) {
                $log['old_values'] = json_decode($log['old_values'], true);
            }
            if ($log['new_values']) {
                $log['new_values'] = json_decode($log['new_values'], true);
            }
        }
        
        return [
            'data' => $logs,
            'pagination' => [
                'current_page' => (int)$page,
                'per_page' => (int)$perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => $page < ceil($total / $perPage),
                'has_prev' => $page > 1
            ]
        ];
    }
    
    // Get all audit logs (super admin only)
    public function getAllLogs($page = 1, $perPage = 50, $filters = []) {
        $sql = "
            SELECT al.*, u.first_name, u.last_name, u.email, o.name as organization_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN organizations o ON al.organization_id = o.id
            WHERE 1=1
        ";
        
        $params = [];
        
        // Add filters
        if (isset($filters['organization_id'])) {
            $sql .= " AND al.organization_id = ?";
            $params[] = $filters['organization_id'];
        }
        
        if (isset($filters['action'])) {
            $sql .= " AND al.action = ?";
            $params[] = $filters['action'];
        }
        
        if (isset($filters['entity_type'])) {
            $sql .= " AND al.entity_type = ?";
            $params[] = $filters['entity_type'];
        }
        
        if (isset($filters['user_id'])) {
            $sql .= " AND al.user_id = ?";
            $params[] = $filters['user_id'];
        }
        
        if (isset($filters['date_from'])) {
            $sql .= " AND DATE(al.created_at) >= ?";
            $params[] = $filters['date_from'];
        }
        
        if (isset($filters['date_to'])) {
            $sql .= " AND DATE(al.created_at) <= ?";
            $params[] = $filters['date_to'];
        }
        
        $sql .= " ORDER BY al.created_at DESC";
        
        $offset = ($page - 1) * $perPage;
        $sql .= " LIMIT {$perPage} OFFSET {$offset}";
        
        $logs = $this->db->query($sql, $params);
        
        // Get total count for pagination
        $countSql = "SELECT COUNT(*) as total FROM audit_logs WHERE 1=1";
        $countParams = [];
        
        // Apply same filters to count query
        if (isset($filters['organization_id'])) {
            $countSql .= " AND organization_id = ?";
            $countParams[] = $filters['organization_id'];
        }
        
        if (isset($filters['action'])) {
            $countSql .= " AND action = ?";
            $countParams[] = $filters['action'];
        }
        
        if (isset($filters['entity_type'])) {
            $countSql .= " AND entity_type = ?";
            $countParams[] = $filters['entity_type'];
        }
        
        if (isset($filters['user_id'])) {
            $countSql .= " AND user_id = ?";
            $countParams[] = $filters['user_id'];
        }
        
        if (isset($filters['date_from'])) {
            $countSql .= " AND DATE(created_at) >= ?";
            $countParams[] = $filters['date_from'];
        }
        
        if (isset($filters['date_to'])) {
            $countSql .= " AND DATE(created_at) <= ?";
            $countParams[] = $filters['date_to'];
        }
        
        $totalResult = $this->db->queryOne($countSql, $countParams);
        $total = $totalResult['total'];
        
        // Parse JSON values in results
        foreach ($logs as &$log) {
            if ($log['old_values']) {
                $log['old_values'] = json_decode($log['old_values'], true);
            }
            if ($log['new_values']) {
                $log['new_values'] = json_decode($log['new_values'], true);
            }
        }
        
        return [
            'data' => $logs,
            'pagination' => [
                'current_page' => (int)$page,
                'per_page' => (int)$perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => $page < ceil($total / $perPage),
                'has_prev' => $page > 1
            ]
        ];
    }
    
    // Get audit log statistics
    public function getStatistics($organizationId = null, $days = 30) {
        $sql = "
            SELECT 
                COUNT(*) as total_logs,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT entity_type) as entity_types,
                COUNT(CASE WHEN action LIKE '%create%' THEN 1 END) as create_actions,
                COUNT(CASE WHEN action LIKE '%update%' THEN 1 END) as update_actions,
                COUNT(CASE WHEN action LIKE '%delete%' THEN 1 END) as delete_actions,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as recent_logs
            FROM audit_logs
            WHERE 1=1
        ";
        
        $params = [$days];
        
        if ($organizationId) {
            $sql .= " AND organization_id = ?";
            $params[] = $organizationId;
        }
        
        return $this->db->queryOne($sql, $params);
    }
    
    // Get most active users
    public function getMostActiveUsers($organizationId = null, $days = 30, $limit = 10) {
        $sql = "
            SELECT u.id, u.first_name, u.last_name, u.email,
                   COUNT(al.id) as activity_count
            FROM audit_logs al
            INNER JOIN users u ON al.user_id = u.id
            WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ";
        
        $params = [$days];
        
        if ($organizationId) {
            $sql .= " AND al.organization_id = ?";
            $params[] = $organizationId;
        }
        
        $sql .= " GROUP BY u.id ORDER BY activity_count DESC LIMIT {$limit}";
        
        return $this->db->query($sql, $params);
    }
    
    // Get activity by entity type
    public function getActivityByEntityType($organizationId = null, $days = 30) {
        $sql = "
            SELECT entity_type, 
                   COUNT(*) as activity_count,
                   COUNT(CASE WHEN action LIKE '%create%' THEN 1 END) as creates,
                   COUNT(CASE WHEN action LIKE '%update%' THEN 1 END) as updates,
                   COUNT(CASE WHEN action LIKE '%delete%' THEN 1 END) as deletes
            FROM audit_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ";
        
        $params = [$days];
        
        if ($organizationId) {
            $sql .= " AND organization_id = ?";
            $params[] = $organizationId;
        }
        
        $sql .= " GROUP BY entity_type ORDER BY activity_count DESC";
        
        return $this->db->query($sql, $params);
    }
    
    // Clean old audit logs (for maintenance)
    public function cleanOldLogs($daysToKeep = 365) {
        $sql = "DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)";
        $result = $this->db->execute($sql, [$daysToKeep]);
        
        return $result['affected_rows'];
    }
}
?>