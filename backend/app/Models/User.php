<?php
require_once 'BaseModel.php';

class User extends BaseModel {
    protected $table = 'users';
    protected $tenantColumn = null; // Users are not tenant-scoped
    protected $fillable = [
        'first_name', 'last_name', 'email', 'password_hash',
        'profile_image_url', 'phone_number', 'course', 'year_level',
        'is_super_admin', 'status', 'email_verified_at',
        'verification_token', 'password_reset_token', 'password_reset_expires_at',
        'last_login_at'
    ];
    
    // Find user by email
    public function findByEmail($email) {
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE email = ? AND deleted_at IS NULL",
            [$email]
        );
    }
    
    // Find user by verification token
    public function findByVerificationToken($token) {
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE verification_token = ? AND deleted_at IS NULL",
            [$token]
        );
    }
    
    // Find user by password reset token
    public function findByPasswordResetToken($token) {
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE password_reset_token = ? 
             AND password_reset_expires_at > NOW() AND deleted_at IS NULL",
            [$token]
        );
    }
    
    // Create new user with password hashing
    public function createUser($data) {
        // Hash password if provided
        if (isset($data['password'])) {
            $data['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
            unset($data['password']);
        }
        
        // Generate verification token
        $data['verification_token'] = bin2hex(random_bytes(32));
        
        return $this->create($data);
    }
    
    // Verify password
    public function verifyPassword($user, $password) {
        return password_verify($password, $user['password_hash']);
    }
    
    // Update password
    public function updatePassword($userId, $newPassword) {
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        return $this->update($userId, [
            'password_hash' => $hashedPassword,
            'password_reset_token' => null,
            'password_reset_expires_at' => null
        ]);
    }
    
    // Generate password reset token
    public function generatePasswordResetToken($userId) {
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour
        
        $updated = $this->update($userId, [
            'password_reset_token' => $token,
            'password_reset_expires_at' => $expiresAt
        ]);
        
        return $updated ? $token : false;
    }
    
    // Verify email
    public function verifyEmail($userId) {
        return $this->update($userId, [
            'email_verified_at' => date('Y-m-d H:i:s'),
            'verification_token' => null,
            'status' => 'active'
        ]);
    }
    
    // Update last login
    public function updateLastLogin($userId) {
        return $this->update($userId, [
            'last_login_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    // Get user organizations
    public function getUserOrganizations($userId) {
        $sql = "
            SELECT o.*, om.role, om.status as membership_status, om.joined_at
            FROM organizations o
            INNER JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_id = ? AND o.deleted_at IS NULL
            ORDER BY om.joined_at DESC
        ";
        
        return $this->db->query($sql, [$userId]);
    }
    
    // Get user events in specific organization
    public function getUserEventsInOrganization($userId, $organizationId) {
        $sql = "
            SELECT e.*, ea.check_in_time, ea.check_out_time
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id AND ea.member_user_id = ?
            WHERE e.organization_id = ? AND e.status = 'published' AND e.deleted_at IS NULL
            ORDER BY e.start_datetime DESC
        ";
        
        return $this->db->query($sql, [$userId, $organizationId]);
    }
    
    // Get upcoming events for user in organization
    public function getUpcomingEvents($userId, $organizationId, $limit = 10) {
        $sql = "
            SELECT e.*, ea.check_in_time, ea.check_out_time
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id AND ea.member_user_id = ?
            WHERE e.organization_id = ? 
                AND e.status = 'published' 
                AND e.start_datetime > NOW()
                AND e.deleted_at IS NULL
            ORDER BY e.start_datetime ASC
            LIMIT {$limit}
        ";
        
        return $this->db->query($sql, [$userId, $organizationId]);
    }
    
    // Get past events for user in organization
    public function getPastEvents($userId, $organizationId, $limit = 20) {
        $sql = "
            SELECT e.*, ea.check_in_time, ea.check_out_time
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id AND ea.member_user_id = ?
            WHERE e.organization_id = ? 
                AND e.status IN ('published', 'completed')
                AND e.start_datetime < NOW()
                AND e.deleted_at IS NULL
            ORDER BY e.start_datetime DESC
            LIMIT {$limit}
        ";
        
        return $this->db->query($sql, [$userId, $organizationId]);
    }
    
    // Get user attendance summary
    public function getAttendanceSummary($userId, $organizationId) {
        $sql = "
            SELECT 
                COUNT(DISTINCT e.id) as total_events,
                COUNT(DISTINCT ea.id) as attended_events,
                COUNT(DISTINCT CASE WHEN ea.check_out_time IS NOT NULL THEN ea.id END) as completed_attendances,
                COALESCE(ROUND((COUNT(DISTINCT ea.id) * 100.0 / NULLIF(COUNT(DISTINCT e.id), 0)), 2), 0) as attendance_percentage
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id AND ea.member_user_id = ?
            WHERE e.organization_id = ? 
                AND e.status IN ('published', 'completed')
                AND e.deleted_at IS NULL
        ";
        
        return $this->db->queryOne($sql, [$userId, $organizationId]);
    }
    
    // Get user profile with organization context
    public function getProfile($userId, $organizationId = null) {
        $user = $this->find($userId);
        
        if (!$user) {
            return null;
        }
        
        // Remove sensitive data
        unset($user['password_hash']);
        unset($user['verification_token']);
        unset($user['password_reset_token']);
        
        // Add organization-specific data if tenant context is provided
        if ($organizationId) {
            $memberModel = new OrganizationMember();
            $membership = $memberModel->findByUserAndOrganization($userId, $organizationId);
            $user['membership'] = $membership;
        }
        
        return $user;
    }
    
    // Search users (for admin purposes)
    public function searchUsers($query, $limit = 50) {
        $searchTerm = "%{$query}%";
        $sql = "
            SELECT id, first_name, last_name, email, course, year_level, 
                   profile_image_url, status, created_at
            FROM {$this->table}
            WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR course LIKE ?)
                AND deleted_at IS NULL
            ORDER BY first_name, last_name
            LIMIT {$limit}
        ";
        
        return $this->db->query($sql, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
}
?>