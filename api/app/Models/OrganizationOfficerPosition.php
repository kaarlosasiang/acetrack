<?php
require_once 'BaseModel.php';

class OrganizationOfficerPosition extends BaseModel {
    protected $table = 'organization_officer_positions';
    protected $tenantColumn = 'organization_id';
    protected $fillable = [
        'organization_id', 'title', 'description', 'display_order', 'is_active'
    ];
    
    // Get all positions for an organization
    public function getOrganizationPositions($organizationId, $activeOnly = true) {
        $this->setTenant($organizationId);
        
        $conditions = [];
        if ($activeOnly) {
            $conditions['is_active'] = 1;
        }
        
        return $this->findAll($conditions, 'display_order ASC, title ASC');
    }
    
    // Find position by title within organization
    public function findByTitle($organizationId, $title) {
        $this->setTenant($organizationId);
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE organization_id = ? AND title = ?",
            [$organizationId, $title]
        );
    }
    
    // Create position with validation
    public function createPosition($data) {
        // Check if position title already exists in organization
        if ($this->findByTitle($data['organization_id'], $data['title'])) {
            throw new Exception('Position title already exists in this organization');
        }
        
        // Set default values
        if (!isset($data['is_active'])) {
            $data['is_active'] = true;
        }
        
        if (!isset($data['display_order'])) {
            // Get highest display order and add 1
            $maxOrder = $this->getMaxDisplayOrder($data['organization_id']);
            $data['display_order'] = $maxOrder + 1;
        }
        
        return $this->create($data);
    }
    
    // Update position with validation
    public function updatePosition($positionId, $data) {
        $position = $this->find($positionId);
        if (!$position) {
            throw new Exception('Position not found');
        }
        
        // Check if new title conflicts with existing positions
        if (isset($data['title']) && $data['title'] !== $position['title']) {
            if ($this->findByTitle($position['organization_id'], $data['title'])) {
                throw new Exception('Position title already exists in this organization');
            }
        }
        
        return $this->update($positionId, $data);
    }
    
    // Get maximum display order for organization
    public function getMaxDisplayOrder($organizationId) {
        $this->setTenant($organizationId);
        
        $result = $this->db->queryOne(
            "SELECT MAX(display_order) as max_order FROM {$this->table} WHERE organization_id = ?",
            [$organizationId]
        );
        
        return $result['max_order'] ? (int)$result['max_order'] : 0;
    }
    
    // Reorder positions
    public function reorderPositions($organizationId, $positionOrders) {
        $this->setTenant($organizationId);
        
        foreach ($positionOrders as $positionId => $displayOrder) {
            $this->update($positionId, ['display_order' => $displayOrder]);
        }
        
        return true;
    }
    
    // Get position with current officers
    public function getPositionWithOfficers($positionId) {
        $sql = "
            SELECT 
                oop.*,
                COUNT(oo.id) as current_officer_count,
                GROUP_CONCAT(
                    CONCAT(u.first_name, ' ', u.last_name) 
                    ORDER BY oo.created_at 
                    SEPARATOR ', '
                ) as current_officers
            FROM {$this->table} oop
            LEFT JOIN organization_officers oo ON oop.id = oo.position_id AND oo.is_current = 1
            LEFT JOIN users u ON oo.user_id = u.id
            WHERE oop.id = ?
            GROUP BY oop.id
        ";
        
        return $this->db->queryOne($sql, [$positionId]);
    }
    
    // Get positions with officer counts
    public function getPositionsWithOfficerCounts($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                oop.*,
                COUNT(oo.id) as current_officer_count,
                COUNT(CASE WHEN oo.is_current = 0 THEN 1 END) as former_officer_count
            FROM {$this->table} oop
            LEFT JOIN organization_officers oo ON oop.id = oo.position_id
            WHERE oop.organization_id = ?
            GROUP BY oop.id
            ORDER BY oop.display_order ASC, oop.title ASC
        ";
        
        return $this->db->query($sql, [$organizationId]);
    }
    
    // Activate/deactivate position
    public function togglePosition($positionId, $isActive = null) {
        $position = $this->find($positionId);
        if (!$position) {
            throw new Exception('Position not found');
        }
        
        // If not specified, toggle current state
        if ($isActive === null) {
            $isActive = !$position['is_active'];
        }
        
        // If deactivating, check for current officers
        if (!$isActive) {
            $officerCount = $this->db->queryOne(
                "SELECT COUNT(*) as count FROM organization_officers WHERE position_id = ? AND is_current = 1",
                [$positionId]
            );
            
            if ($officerCount['count'] > 0) {
                throw new Exception('Cannot deactivate position with current officers. Remove officers first.');
            }
        }
        
        return $this->update($positionId, ['is_active' => $isActive ? 1 : 0]);
    }
    
    // Delete position (checks for officers)
    public function deletePosition($positionId, $transferToPositionId = null) {
        $position = $this->find($positionId);
        if (!$position) {
            throw new Exception('Position not found');
        }
        
        // Check if position has associated officers
        $officerCount = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM organization_officers WHERE position_id = ?",
            [$positionId]
        );
        
        if ($officerCount['count'] > 0) {
            if ($transferToPositionId) {
                // Transfer officers to another position
                $this->db->execute(
                    "UPDATE organization_officers SET position_id = ? WHERE position_id = ?",
                    [$transferToPositionId, $positionId]
                );
            } else {
                throw new Exception('Cannot delete position with associated officers. Transfer officers first or specify a transfer position.');
            }
        }
        
        return $this->delete($positionId);
    }
    
    // Get position history
    public function getPositionHistory($positionId) {
        $sql = "
            SELECT 
                oo.*,
                u.first_name, u.last_name, u.email,
                appointed.first_name as appointed_by_first_name,
                appointed.last_name as appointed_by_last_name
            FROM organization_officers oo
            INNER JOIN users u ON oo.user_id = u.id
            LEFT JOIN users appointed ON oo.appointed_by_user_id = appointed.id
            WHERE oo.position_id = ?
            ORDER BY oo.created_at DESC
        ";
        
        return $this->db->query($sql, [$positionId]);
    }
    
    // Get vacant positions (no current officers)
    public function getVacantPositions($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT oop.*
            FROM {$this->table} oop
            LEFT JOIN organization_officers oo ON oop.id = oo.position_id AND oo.is_current = 1
            WHERE oop.organization_id = ? 
                AND oop.is_active = 1 
                AND oo.id IS NULL
            ORDER BY oop.display_order ASC, oop.title ASC
        ";
        
        return $this->db->query($sql, [$organizationId]);
    }
    
    // Get position statistics
    public function getPositionStats($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                COUNT(*) as total_positions,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_positions,
                COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_positions
            FROM {$this->table}
            WHERE organization_id = ?
        ";
        
        return $this->db->queryOne($sql, [$organizationId]);
    }
    
    // Create default positions for new organization
    public function createDefaultPositions($organizationId) {
        $defaultPositions = [
            ['title' => 'President', 'description' => 'Chief executive officer of the organization', 'display_order' => 1],
            ['title' => 'Vice President', 'description' => 'Second-in-command', 'display_order' => 2],
            ['title' => 'Secretary', 'description' => 'Responsible for documentation and communications', 'display_order' => 3],
            ['title' => 'Treasurer', 'description' => 'Manages organization finances', 'display_order' => 4],
            ['title' => 'Auditor', 'description' => 'Internal auditing and compliance', 'display_order' => 5],
            ['title' => 'Public Relations Officer', 'description' => 'Handles external communications and publicity', 'display_order' => 6]
        ];
        
        $created = [];
        foreach ($defaultPositions as $position) {
            $position['organization_id'] = $organizationId;
            $position['is_active'] = true;
            $created[] = $this->create($position);
        }
        
        return $created;
    }
    
    // Validate position data
    public function validatePositionData($data, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($data['title'])) {
            if (empty($data['title'])) {
                $errors['title'] = 'Position title is required';
            } elseif (strlen($data['title']) > 100) {
                $errors['title'] = 'Position title must not exceed 100 characters';
            }
        }
        
        if (!$isUpdate || isset($data['organization_id'])) {
            if (empty($data['organization_id'])) {
                $errors['organization_id'] = 'Organization is required';
            }
        }
        
        if (isset($data['display_order']) && $data['display_order'] !== null) {
            if (!is_numeric($data['display_order']) || $data['display_order'] < 0) {
                $errors['display_order'] = 'Display order must be a positive number';
            }
        }
        
        return $errors;
    }
}
?>