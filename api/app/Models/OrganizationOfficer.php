<?php
require_once 'BaseModel.php';

class OrganizationOfficer extends BaseModel {
    protected $table = 'organization_officers';
    protected $tenantColumn = 'organization_id';
    protected $fillable = [
        'organization_id', 'user_id', 'position_id',
        'term_start_date', 'term_end_date', 'is_current',
        'appointed_by_user_id', 'notes'
    ];
    
    // Get current officers for an organization
    public function getCurrentOfficers($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                oo.*,
                u.first_name, u.last_name, u.email, u.profile_image_url,
                oop.title as position_title, oop.description as position_description,
                oop.display_order,
                appointed.first_name as appointed_by_first_name,
                appointed.last_name as appointed_by_last_name
            FROM {$this->table} oo
            INNER JOIN users u ON oo.user_id = u.id
            INNER JOIN organization_officer_positions oop ON oo.position_id = oop.id
            LEFT JOIN users appointed ON oo.appointed_by_user_id = appointed.id
            WHERE oo.organization_id = ? AND oo.is_current = 1
            ORDER BY oop.display_order ASC, oop.title ASC
        ";
        
        return $this->db->query($sql, [$organizationId]);
    }
    
    // Get officer history for organization
    public function getOfficerHistory($organizationId, $limit = 50) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                oo.*,
                u.first_name, u.last_name, u.email,
                oop.title as position_title,
                appointed.first_name as appointed_by_first_name,
                appointed.last_name as appointed_by_last_name
            FROM {$this->table} oo
            INNER JOIN users u ON oo.user_id = u.id
            INNER JOIN organization_officer_positions oop ON oo.position_id = oop.id
            LEFT JOIN users appointed ON oo.appointed_by_user_id = appointed.id
            WHERE oo.organization_id = ?
            ORDER BY oo.created_at DESC
            LIMIT ?
        ";
        
        return $this->db->query($sql, [$organizationId, $limit]);
    }
    
    // Get user's officer positions in organization
    public function getUserOfficerPositions($userId, $organizationId = null) {
        $sql = "
            SELECT 
                oo.*,
                oop.title as position_title, oop.description as position_description,
                oop.display_order,
                o.name as organization_name
            FROM {$this->table} oo
            INNER JOIN organization_officer_positions oop ON oo.position_id = oop.id
            INNER JOIN organizations o ON oo.organization_id = o.id
            WHERE oo.user_id = ?
        ";
        
        $params = [$userId];
        
        if ($organizationId) {
            $sql .= " AND oo.organization_id = ?";
            $params[] = $organizationId;
        }
        
        $sql .= " ORDER BY oo.is_current DESC, oo.created_at DESC";
        
        return $this->db->query($sql, $params);
    }
    
    // Appoint user to officer position
    public function appointOfficer($organizationId, $userId, $positionId, $appointedBy, $termStartDate = null, $termEndDate = null, $notes = null) {
        // Check if user is already in this position
        $existing = $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE organization_id = ? AND user_id = ? AND position_id = ? AND is_current = 1",
            [$organizationId, $userId, $positionId]
        );
        
        if ($existing) {
            throw new Exception('User is already appointed to this position');
        }
        
        // Check if user is a member of the organization
        $memberModel = new OrganizationMember();
        $membership = $memberModel->findByUserAndOrganization($userId, $organizationId);
        
        if (!$membership || $membership['status'] !== 'active') {
            throw new Exception('User must be an active member of the organization');
        }
        
        // Create officer appointment
        return $this->create([
            'organization_id' => $organizationId,
            'user_id' => $userId,
            'position_id' => $positionId,
            'term_start_date' => $termStartDate ?: date('Y-m-d'),
            'term_end_date' => $termEndDate,
            'is_current' => true,
            'appointed_by_user_id' => $appointedBy,
            'notes' => $notes
        ]);
    }
    
    // Remove officer from position
    public function removeOfficer($officerId, $notes = null) {
        return $this->update($officerId, [
            'is_current' => false,
            'term_end_date' => date('Y-m-d'),
            'notes' => $notes
        ]);
    }
    
    // Transfer officer position to another user
    public function transferPosition($currentOfficerId, $newUserId, $appointedBy, $notes = null) {
        $currentOfficer = $this->find($currentOfficerId);
        if (!$currentOfficer) {
            throw new Exception('Officer record not found');
        }
        
        // End current officer's term
        $this->removeOfficer($currentOfficerId, 'Position transferred to new officer');
        
        // Appoint new officer
        return $this->appointOfficer(
            $currentOfficer['organization_id'],
            $newUserId,
            $currentOfficer['position_id'],
            $appointedBy,
            date('Y-m-d'),
            null,
            $notes ?: 'Position transferred from previous officer'
        );
    }
    
    // Get officers by position
    public function getOfficersByPosition($organizationId, $positionId, $currentOnly = true) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                oo.*,
                u.first_name, u.last_name, u.email, u.profile_image_url,
                oop.title as position_title
            FROM {$this->table} oo
            INNER JOIN users u ON oo.user_id = u.id
            INNER JOIN organization_officer_positions oop ON oo.position_id = oop.id
            WHERE oo.organization_id = ? AND oo.position_id = ?
        ";
        
        $params = [$organizationId, $positionId];
        
        if ($currentOnly) {
            $sql .= " AND oo.is_current = 1";
        }
        
        $sql .= " ORDER BY oo.created_at DESC";
        
        return $this->db->query($sql, $params);
    }
    
    // Check if user has officer position in organization
    public function hasOfficerPosition($userId, $organizationId, $positionTitle = null) {
        $sql = "
            SELECT COUNT(*) as count
            FROM {$this->table} oo
            INNER JOIN organization_officer_positions oop ON oo.position_id = oop.id
            WHERE oo.user_id = ? AND oo.organization_id = ? AND oo.is_current = 1
        ";
        
        $params = [$userId, $organizationId];
        
        if ($positionTitle) {
            $sql .= " AND oop.title = ?";
            $params[] = $positionTitle;
        }
        
        $result = $this->db->queryOne($sql, $params);
        return $result['count'] > 0;
    }
    
    // Get organization officer statistics
    public function getOfficerStats($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                COUNT(CASE WHEN is_current = 1 THEN 1 END) as current_officers,
                COUNT(CASE WHEN is_current = 0 THEN 1 END) as former_officers,
                COUNT(DISTINCT user_id) as unique_officers_all_time,
                COUNT(DISTINCT position_id) as filled_positions
            FROM {$this->table}
            WHERE organization_id = ?
        ";
        
        return $this->db->queryOne($sql, [$organizationId]);
    }
    
    // Get vacant positions
    public function getVacantPositions($organizationId) {
        $sql = "
            SELECT oop.*
            FROM organization_officer_positions oop
            LEFT JOIN organization_officers oo ON oop.id = oo.position_id 
                AND oo.organization_id = oop.organization_id 
                AND oo.is_current = 1
            WHERE oop.organization_id = ? 
                AND oop.is_active = 1 
                AND oo.id IS NULL
            ORDER BY oop.display_order ASC, oop.title ASC
        ";
        
        return $this->db->query($sql, [$organizationId]);
    }
    
    // Get officers with expiring terms
    public function getExpiringTerms($organizationId, $days = 30) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                oo.*,
                u.first_name, u.last_name, u.email,
                oop.title as position_title
            FROM {$this->table} oo
            INNER JOIN users u ON oo.user_id = u.id
            INNER JOIN organization_officer_positions oop ON oo.position_id = oop.id
            WHERE oo.organization_id = ? 
                AND oo.is_current = 1
                AND oo.term_end_date IS NOT NULL
                AND oo.term_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY oo.term_end_date ASC
        ";
        
        return $this->db->query($sql, [$organizationId, $days]);
    }
    
    // Extend officer term
    public function extendTerm($officerId, $newEndDate, $notes = null) {
        $officer = $this->find($officerId);
        if (!$officer) {
            throw new Exception('Officer record not found');
        }
        
        if (!$officer['is_current']) {
            throw new Exception('Cannot extend term for inactive officer');
        }
        
        return $this->update($officerId, [
            'term_end_date' => $newEndDate,
            'notes' => $notes
        ]);
    }
    
    // Validate officer data
    public function validateOfficerData($data, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($data['organization_id'])) {
            if (empty($data['organization_id'])) {
                $errors['organization_id'] = 'Organization is required';
            }
        }
        
        if (!$isUpdate || isset($data['user_id'])) {
            if (empty($data['user_id'])) {
                $errors['user_id'] = 'User is required';
            }
        }
        
        if (!$isUpdate || isset($data['position_id'])) {
            if (empty($data['position_id'])) {
                $errors['position_id'] = 'Position is required';
            }
        }
        
        if (isset($data['term_start_date']) && $data['term_start_date']) {
            if (!strtotime($data['term_start_date'])) {
                $errors['term_start_date'] = 'Invalid term start date format';
            }
        }
        
        if (isset($data['term_end_date']) && $data['term_end_date']) {
            if (!strtotime($data['term_end_date'])) {
                $errors['term_end_date'] = 'Invalid term end date format';
            } elseif (isset($data['term_start_date']) && strtotime($data['term_end_date']) <= strtotime($data['term_start_date'])) {
                $errors['term_end_date'] = 'Term end date must be after start date';
            }
        }
        
        return $errors;
    }
}
?>