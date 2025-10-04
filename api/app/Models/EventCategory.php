<?php
require_once 'BaseModel.php';

class EventCategory extends BaseModel {
    protected $table = 'event_categories';
    protected $tenantColumn = 'organization_id';
    protected $fillable = [
        'organization_id', 'name', 'description', 'color_hex'
    ];
    
    // Get all categories for an organization
    public function getOrganizationCategories($organizationId) {
        $this->setTenant($organizationId);
        return $this->findAll([], 'name ASC');
    }
    
    // Find category by name within organization
    public function findByName($organizationId, $name) {
        $this->setTenant($organizationId);
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE organization_id = ? AND name = ?",
            [$organizationId, $name]
        );
    }
    
    // Create category with validation
    public function createCategory($data) {
        // Check if category name already exists in organization
        if ($this->findByName($data['organization_id'], $data['name'])) {
            throw new Exception('Category name already exists in this organization');
        }
        
        // Set default color if not provided
        if (!isset($data['color_hex'])) {
            $data['color_hex'] = $this->generateRandomColor();
        }
        
        return $this->create($data);
    }
    
    // Update category with validation
    public function updateCategory($categoryId, $data) {
        $category = $this->find($categoryId);
        if (!$category) {
            throw new Exception('Category not found');
        }
        
        // Check if new name conflicts with existing categories
        if (isset($data['name']) && $data['name'] !== $category['name']) {
            if ($this->findByName($category['organization_id'], $data['name'])) {
                throw new Exception('Category name already exists in this organization');
            }
        }
        
        return $this->update($categoryId, $data);
    }
    
    // Get events for a specific category
    public function getCategoryEvents($categoryId, $status = 'published') {
        $sql = "
            SELECT e.*, ecm.category_id
            FROM events e
            INNER JOIN event_category_mapping ecm ON e.id = ecm.event_id
            WHERE ecm.category_id = ?
                AND e.deleted_at IS NULL
        ";
        
        $params = [$categoryId];
        
        if ($status) {
            $sql .= " AND e.status = ?";
            $params[] = $status;
        }
        
        $sql .= " ORDER BY e.start_datetime DESC";
        
        return $this->db->query($sql, $params);
    }
    
    // Get category usage statistics
    public function getCategoryStats($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                ec.id,
                ec.name,
                ec.color_hex,
                COUNT(ecm.event_id) as event_count,
                COUNT(CASE WHEN e.status = 'published' THEN 1 END) as published_event_count,
                COUNT(CASE WHEN e.status = 'draft' THEN 1 END) as draft_event_count
            FROM {$this->table} ec
            LEFT JOIN event_category_mapping ecm ON ec.id = ecm.category_id
            LEFT JOIN events e ON ecm.event_id = e.id AND e.deleted_at IS NULL
            WHERE ec.organization_id = ?
            GROUP BY ec.id, ec.name, ec.color_hex
            ORDER BY event_count DESC, ec.name ASC
        ";
        
        return $this->db->query($sql, [$organizationId]);
    }
    
    // Delete category (checks for associated events)
    public function deleteCategory($categoryId, $transferToCategoryId = null) {
        $category = $this->find($categoryId);
        if (!$category) {
            throw new Exception('Category not found');
        }
        
        // Check if category has associated events
        $eventCount = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM event_category_mapping WHERE category_id = ?",
            [$categoryId]
        );
        
        if ($eventCount['count'] > 0) {
            if ($transferToCategoryId) {
                // Transfer events to another category
                $this->db->execute(
                    "UPDATE event_category_mapping SET category_id = ? WHERE category_id = ?",
                    [$transferToCategoryId, $categoryId]
                );
            } else {
                // Remove category mappings (events become uncategorized)
                $this->db->execute(
                    "DELETE FROM event_category_mapping WHERE category_id = ?",
                    [$categoryId]
                );
            }
        }
        
        return $this->delete($categoryId);
    }
    
    // Assign event to categories
    public function assignEventToCategories($eventId, $categoryIds) {
        // Remove existing category assignments
        $this->db->execute(
            "DELETE FROM event_category_mapping WHERE event_id = ?",
            [$eventId]
        );
        
        // Add new category assignments
        foreach ($categoryIds as $categoryId) {
            $this->db->execute(
                "INSERT INTO event_category_mapping (event_id, category_id) VALUES (?, ?)",
                [$eventId, $categoryId]
            );
        }
        
        return true;
    }
    
    // Get event categories
    public function getEventCategories($eventId) {
        $sql = "
            SELECT ec.*
            FROM {$this->table} ec
            INNER JOIN event_category_mapping ecm ON ec.id = ecm.category_id
            WHERE ecm.event_id = ?
            ORDER BY ec.name ASC
        ";
        
        return $this->db->query($sql, [$eventId]);
    }
    
    // Generate random color for category
    private function generateRandomColor() {
        $colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85929E', '#A569BD'
        ];
        
        return $colors[array_rand($colors)];
    }
    
    // Validate category data
    public function validateCategoryData($data, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($data['name'])) {
            if (empty($data['name'])) {
                $errors['name'] = 'Category name is required';
            } elseif (strlen($data['name']) > 100) {
                $errors['name'] = 'Category name must not exceed 100 characters';
            }
        }
        
        if (!$isUpdate || isset($data['organization_id'])) {
            if (empty($data['organization_id'])) {
                $errors['organization_id'] = 'Organization is required';
            }
        }
        
        if (isset($data['color_hex']) && $data['color_hex']) {
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $data['color_hex'])) {
                $errors['color_hex'] = 'Color must be a valid hex color code (e.g., #FF6B6B)';
            }
        }
        
        return $errors;
    }
    
    // Get popular categories (most used)
    public function getPopularCategories($organizationId, $limit = 10) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                ec.*,
                COUNT(ecm.event_id) as usage_count
            FROM {$this->table} ec
            LEFT JOIN event_category_mapping ecm ON ec.id = ecm.category_id
            WHERE ec.organization_id = ?
            GROUP BY ec.id
            HAVING usage_count > 0
            ORDER BY usage_count DESC, ec.name ASC
            LIMIT ?
        ";
        
        return $this->db->query($sql, [$organizationId, $limit]);
    }
}
?>