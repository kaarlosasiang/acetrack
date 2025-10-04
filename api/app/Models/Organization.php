<?php
require_once 'BaseModel.php';

class Organization extends BaseModel {
    protected $table = 'organizations';
    protected $tenantColumn = null; // Organizations are not tenant-scoped (they ARE the tenants)
    protected $softDeletes = true;
    protected $fillable = [
        'name', 'description', 'logo_url', 'banner_url', 
        'is_default', 'status', 'subscription_start', 'subscription_end'
    ];
    
    // Find organization by subdomain (if using subdomain-based tenancy)
    public function findBySubdomain($subdomain) {
        // This would require a subdomain column in your organizations table
        // For now, we'll implement a simple name-based lookup
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE LOWER(REPLACE(name, ' ', '')) = LOWER(?) 
             AND status = 'active' AND deleted_at IS NULL",
            [$subdomain]
        );
    }
    
    // Get organization with member count
    public function getWithMemberCount($id) {
        $sql = "
            SELECT o.*, 
                   COUNT(om.id) as member_count,
                   COUNT(CASE WHEN om.role = 'admin' THEN 1 END) as admin_count
            FROM organizations o
            LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
            WHERE o.id = ? AND o.deleted_at IS NULL
            GROUP BY o.id
        ";
        
        return $this->db->queryOne($sql, [$id]);
    }
    
    // Get organization statistics
    public function getStatistics($id) {
        $sql = "
            SELECT 
                COUNT(DISTINCT om.id) as total_members,
                COUNT(DISTINCT CASE WHEN om.status = 'active' THEN om.id END) as active_members,
                COUNT(DISTINCT e.id) as total_events,
                COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_events,
                COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_events,
                COUNT(DISTINCT ea.id) as total_attendances
            FROM organizations o
            LEFT JOIN organization_members om ON o.id = om.organization_id
            LEFT JOIN events e ON o.id = e.organization_id AND e.deleted_at IS NULL
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE o.id = ? AND o.deleted_at IS NULL
        ";
        
        return $this->db->queryOne($sql, [$id]);
    }
    
    // Get recent events for organization
    public function getRecentEvents($id, $limit = 10) {
        $sql = "
            SELECT e.*, COUNT(ea.id) as attendance_count
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE e.organization_id = ? AND e.deleted_at IS NULL
            GROUP BY e.id
            ORDER BY e.start_datetime DESC
            LIMIT {$limit}
        ";
        
        return $this->db->query($sql, [$id]);
    }
    
    // Get upcoming events for organization
    public function getUpcomingEvents($id, $limit = 10) {
        $sql = "
            SELECT e.*, COUNT(ea.id) as attendance_count
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE e.organization_id = ? 
                AND e.start_datetime > NOW() 
                AND e.status = 'published'
                AND e.deleted_at IS NULL
            GROUP BY e.id
            ORDER BY e.start_datetime ASC
            LIMIT {$limit}
        ";
        
        return $this->db->query($sql, [$id]);
    }
    
    // Check if organization subscription is active
    public function isSubscriptionActive($id) {
        $org = $this->find($id);
        
        if (!$org) {
            return false;
        }
        
        $now = date('Y-m-d');
        
        return $org['status'] === 'active' && 
               $org['subscription_start'] <= $now && 
               ($org['subscription_end'] === null || $org['subscription_end'] >= $now);
    }
    
    // Get organizations with expired subscriptions
    public function getExpiredSubscriptions() {
        $sql = "
            SELECT *
            FROM {$this->table}
            WHERE subscription_end < CURDATE()
                AND status = 'active'
                AND deleted_at IS NULL
            ORDER BY subscription_end ASC
        ";
        
        return $this->db->query($sql);
    }
    
    // Get organizations expiring soon
    public function getExpiringSoon($days = 30) {
        $sql = "
            SELECT *
            FROM {$this->table}
            WHERE subscription_end BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                AND status = 'active'
                AND deleted_at IS NULL
            ORDER BY subscription_end ASC
        ";
        
        return $this->db->query($sql, [$days]);
    }
    
    // Update subscription dates
    public function updateSubscription($id, $startDate, $endDate) {
        return $this->update($id, [
            'subscription_start' => $startDate,
            'subscription_end' => $endDate,
            'status' => 'active'
        ]);
    }
    
    // Activate organization
    public function activate($id) {
        return $this->update($id, ['status' => 'active']);
    }
    
    // Deactivate organization
    public function deactivate($id) {
        return $this->update($id, ['status' => 'inactive']);
    }
    
    // Get public organization list (for joining)
    public function getPublicList($page = 1, $perPage = 20, $search = null) {
        $sql = "
            SELECT o.id, o.name, o.description, o.logo_url, 
                   COUNT(om.id) as member_count
            FROM {$this->table} o
            LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
            WHERE o.status = 'active' AND o.deleted_at IS NULL
        ";
        
        $params = [];
        
        if ($search) {
            $sql .= " AND (o.name LIKE ? OR o.description LIKE ?)";
            $searchTerm = "%{$search}%";
            $params = [$searchTerm, $searchTerm];
        }
        
        $sql .= " GROUP BY o.id ORDER BY o.name ASC";
        
        $offset = ($page - 1) * $perPage;
        $sql .= " LIMIT {$perPage} OFFSET {$offset}";
        
        $organizations = $this->db->query($sql, $params);
        
        // Get total count for pagination
        $countSql = "
            SELECT COUNT(DISTINCT o.id) as total
            FROM {$this->table} o
            WHERE o.status = 'active' AND o.deleted_at IS NULL
        ";
        
        if ($search) {
            $countSql .= " AND (o.name LIKE ? OR o.description LIKE ?)";
        }
        
        $totalResult = $this->db->queryOne($countSql, $search ? [$searchTerm, $searchTerm] : []);
        $total = $totalResult['total'];
        
        return [
            'data' => $organizations,
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
    
    // Get organization with public information only
    public function getPublicInfo($id) {
        $sql = "
            SELECT o.id, o.name, o.description, o.logo_url, o.banner_url,
                   COUNT(om.id) as member_count,
                   COUNT(CASE WHEN e.status = 'published' AND e.start_datetime > NOW() THEN 1 END) as upcoming_events
            FROM {$this->table} o
            LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
            LEFT JOIN events e ON o.id = e.organization_id AND e.deleted_at IS NULL
            WHERE o.id = ? AND o.status = 'active' AND o.deleted_at IS NULL
            GROUP BY o.id
        ";
        
        return $this->db->queryOne($sql, [$id]);
    }
    
    // Check if user can join organization (not already a member)
    public function canUserJoin($organizationId, $userId) {
        $memberModel = new OrganizationMember();
        $membership = $memberModel->findByUserAndOrganization($userId, $organizationId);
        
        return !$membership; // User can join if not already a member
    }
    
    // Get organization dashboard data
    public function getDashboardData($id) {
        // Get basic statistics
        $stats = $this->getStatistics($id);
        
        // Get recent events
        $recentEvents = $this->getRecentEvents($id, 5);
        
        // Get upcoming events
        $upcomingEvents = $this->getUpcomingEvents($id, 5);
        
        // Get member activity (recent joins)
        $sql = "
            SELECT u.first_name, u.last_name, u.profile_image_url, om.joined_at
            FROM organization_members om
            INNER JOIN users u ON om.user_id = u.id
            WHERE om.organization_id = ? AND om.status = 'active'
            ORDER BY om.joined_at DESC
            LIMIT 10
        ";
        $recentMembers = $this->db->query($sql, [$id]);
        
        return [
            'statistics' => $stats,
            'recent_events' => $recentEvents,
            'upcoming_events' => $upcomingEvents,
            'recent_members' => $recentMembers
        ];
    }
}
?>