<?php
require_once 'BaseModel.php';

class OrganizationMember extends BaseModel {
    protected $table = 'organization_members';
    protected $fillable = [
        'user_id', 'organization_id', 'student_id_number', 
        'role', 'status', 'joined_at', 'left_at'
    ];
    
    // Find membership by user and organization
    public function findByUserAndOrganization($userId, $organizationId) {
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE user_id = ? AND organization_id = ?",
            [$userId, $organizationId]
        );
    }
    
    // Create membership with user details
    public function createMembership($data) {
        if (!isset($data['joined_at'])) {
            $data['joined_at'] = date('Y-m-d H:i:s');
        }
        
        return $this->create($data);
    }
    
    // Get organization members with user details
    public function getMembersWithUserDetails($organizationId, $status = null, $role = null) {
        $sql = "
            SELECT om.*, u.first_name, u.last_name, u.email, u.profile_image_url,
                   u.phone_number, u.course, u.year_level
            FROM {$this->table} om
            INNER JOIN users u ON om.user_id = u.id
            WHERE om.organization_id = ?
        ";
        
        $params = [$organizationId];
        
        if ($status) {
            $sql .= " AND om.status = ?";
            $params[] = $status;
        }
        
        if ($role) {
            $sql .= " AND om.role = ?";
            $params[] = $role;
        }
        
        $sql .= " ORDER BY om.joined_at DESC";
        
        return $this->db->query($sql, $params);
    }
    
    // Get member with user details
    public function getMemberWithUserDetails($memberId, $organizationId) {
        $sql = "
            SELECT om.*, u.first_name, u.last_name, u.email, u.profile_image_url,
                   u.phone_number, u.course, u.year_level
            FROM {$this->table} om
            INNER JOIN users u ON om.user_id = u.id
            WHERE om.id = ? AND om.organization_id = ?
        ";
        
        return $this->db->queryOne($sql, [$memberId, $organizationId]);
    }
    
    // Activate member
    public function activateMember($memberId, $organizationId) {
        return $this->updateMembershipStatus($memberId, $organizationId, 'active');
    }
    
    // Deactivate member
    public function deactivateMember($memberId, $organizationId) {
        return $this->updateMembershipStatus($memberId, $organizationId, 'inactive', date('Y-m-d H:i:s'));
    }
    
    // Update membership status
    private function updateMembershipStatus($memberId, $organizationId, $status, $leftAt = null) {
        $updateData = ['status' => $status];
        
        if ($leftAt) {
            $updateData['left_at'] = $leftAt;
        } elseif ($status === 'active') {
            $updateData['left_at'] = null;
        }
        
        $sql = "UPDATE {$this->table} SET ";
        $setParts = [];
        $params = [];
        
        foreach ($updateData as $key => $value) {
            $setParts[] = "{$key} = ?";
            $params[] = $value;
        }
        
        $sql .= implode(', ', $setParts);
        $sql .= " WHERE id = ? AND organization_id = ?";
        $params[] = $memberId;
        $params[] = $organizationId;
        
        $result = $this->db->execute($sql, $params);
        
        if ($result['success'] && $result['affected_rows'] > 0) {
            return $this->getMemberWithUserDetails($memberId, $organizationId);
        }
        
        return false;
    }
    
    // Update member role
    public function updateMemberRole($memberId, $organizationId, $role) {
        $sql = "UPDATE {$this->table} SET role = ? WHERE id = ? AND organization_id = ?";
        $result = $this->db->execute($sql, [$role, $memberId, $organizationId]);
        
        if ($result['success'] && $result['affected_rows'] > 0) {
            return $this->getMemberWithUserDetails($memberId, $organizationId);
        }
        
        return false;
    }
    
    // Get member's event attendance
    public function getMemberEventAttendance($memberId, $organizationId) {
        $member = $this->getMemberWithUserDetails($memberId, $organizationId);
        
        if (!$member) {
            return null;
        }
        
        $sql = "
            SELECT e.*, ea.check_in_time, ea.check_out_time, ea.check_in_method, ea.check_out_method
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id AND ea.member_user_id = ?
            WHERE e.organization_id = ? AND e.deleted_at IS NULL
            ORDER BY e.start_datetime DESC
        ";
        
        $events = $this->db->query($sql, [$member['user_id'], $organizationId]);
        
        return [
            'member' => $member,
            'events' => $events
        ];
    }
    
    // Invite user to organization
    public function inviteUser($organizationId, $email, $role = 'member') {
        // Check if user exists
        $userModel = new User();
        $user = $userModel->findByEmail($email);
        
        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }
        
        // Check if already a member
        $existingMember = $this->findByUserAndOrganization($user['id'], $organizationId);
        
        if ($existingMember) {
            if ($existingMember['status'] === 'active') {
                return ['success' => false, 'message' => 'User is already an active member'];
            } else {
                // Reactivate existing membership
                $updated = $this->activateMember($existingMember['id'], $organizationId);
                return ['success' => true, 'message' => 'User membership reactivated', 'member' => $updated];
            }
        }
        
        // Create new membership
        $membership = $this->createMembership([
            'user_id' => $user['id'],
            'organization_id' => $organizationId,
            'role' => $role,
            'status' => 'invited'
        ]);
        
        if ($membership) {
            return ['success' => true, 'message' => 'User invited successfully', 'member' => $membership];
        }
        
        return ['success' => false, 'message' => 'Failed to invite user'];
    }
    
    // Join organization request
    public function createJoinRequest($organizationId, $userId) {
        // Check if already a member
        $existingMember = $this->findByUserAndOrganization($userId, $organizationId);
        
        if ($existingMember) {
            return ['success' => false, 'message' => 'Already a member or have pending request'];
        }
        
        $membership = $this->createMembership([
            'user_id' => $userId,
            'organization_id' => $organizationId,
            'role' => 'member',
            'status' => 'invited' // Will be pending approval
        ]);
        
        if ($membership) {
            return ['success' => true, 'message' => 'Join request submitted successfully'];
        }
        
        return ['success' => false, 'message' => 'Failed to submit join request'];
    }
    
    // Get pending join requests
    public function getPendingRequests($organizationId) {
        return $this->getMembersWithUserDetails($organizationId, 'invited');
    }
    
    // Approve join request
    public function approveJoinRequest($memberId, $organizationId) {
        return $this->activateMember($memberId, $organizationId);
    }
    
    // Reject join request
    public function rejectJoinRequest($memberId, $organizationId) {
        $sql = "DELETE FROM {$this->table} WHERE id = ? AND organization_id = ? AND status = 'invited'";
        $result = $this->db->execute($sql, [$memberId, $organizationId]);
        
        return $result['success'] && $result['affected_rows'] > 0;
    }
    
    // Get member statistics
    public function getMemberStatistics($organizationId) {
        $sql = "
            SELECT 
                COUNT(*) as total_members,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_members,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_members,
                COUNT(CASE WHEN status = 'invited' THEN 1 END) as pending_invites,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
                COUNT(CASE WHEN role = 'org_subadmin' THEN 1 END) as subadmin_count
            FROM {$this->table}
            WHERE organization_id = ?
        ";
        
        return $this->db->queryOne($sql, [$organizationId]);
    }
    
    // Remove member from organization
    public function removeMember($memberId, $organizationId) {
        // Don't actually delete, just mark as inactive and set left_at
        return $this->deactivateMember($memberId, $organizationId);
    }
    
    // Search members
    public function searchMembers($organizationId, $query, $status = null) {
        $searchTerm = "%{$query}%";
        
        $sql = "
            SELECT om.*, u.first_name, u.last_name, u.email, u.profile_image_url,
                   u.phone_number, u.course, u.year_level
            FROM {$this->table} om
            INNER JOIN users u ON om.user_id = u.id
            WHERE om.organization_id = ?
                AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? 
                     OR om.student_id_number LIKE ? OR u.course LIKE ?)
        ";
        
        $params = [$organizationId, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm];
        
        if ($status) {
            $sql .= " AND om.status = ?";
            $params[] = $status;
        }
        
        $sql .= " ORDER BY u.first_name, u.last_name";
        
        return $this->db->query($sql, $params);
    }
}
?>