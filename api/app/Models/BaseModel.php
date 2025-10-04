<?php
abstract class BaseModel {
    protected $db;
    protected $table;
    protected $primaryKey = 'id';
    protected $fillable = [];
    protected $timestamps = true;
    protected $softDeletes = false;
    protected $tenantColumn = 'organization_id';
    protected $currentTenantId = null;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    // Set the current tenant context
    public function setTenant($tenantId) {
        $this->currentTenantId = $tenantId;
        return $this;
    }
    
    // Get current tenant ID
    public function getTenantId() {
        return $this->currentTenantId;
    }
    
    // Find a record by ID (with tenant scope if applicable)
    public function find($id) {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?";
        $params = [$id];
        
        if ($this->isTenantScoped()) {
            $sql .= " AND {$this->tenantColumn} = ?";
            $params[] = $this->currentTenantId;
        }
        
        if ($this->softDeletes) {
            $sql .= " AND deleted_at IS NULL";
        }
        
        return $this->db->queryOne($sql, $params);
    }
    
    // Find all records (with tenant scope if applicable)
    public function findAll($conditions = [], $orderBy = null, $limit = null, $offset = null) {
        $sql = "SELECT * FROM {$this->table}";
        $params = [];
        $whereClauses = [];
        
        // Add tenant scope if applicable
        if ($this->isTenantScoped()) {
            $whereClauses[] = "{$this->tenantColumn} = ?";
            $params[] = $this->currentTenantId;
        }
        
        // Add soft delete check
        if ($this->softDeletes) {
            $whereClauses[] = "deleted_at IS NULL";
        }
        
        // Add custom conditions
        foreach ($conditions as $column => $value) {
            if (is_array($value)) {
                $placeholders = str_repeat('?,', count($value) - 1) . '?';
                $whereClauses[] = "{$column} IN ({$placeholders})";
                $params = array_merge($params, $value);
            } else {
                $whereClauses[] = "{$column} = ?";
                $params[] = $value;
            }
        }
        
        // Build WHERE clause
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        // Add ORDER BY
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        
        // Add LIMIT and OFFSET
        if ($limit) {
            $sql .= " LIMIT {$limit}";
            if ($offset) {
                $sql .= " OFFSET {$offset}";
            }
        }
        
        return $this->db->query($sql, $params);
    }
    
    // Create a new record
    public function create($data) {
        // Filter data based on fillable fields
        $filteredData = $this->filterFillable($data);
        
        // Add tenant ID if applicable
        if ($this->isTenantScoped() && !isset($filteredData[$this->tenantColumn])) {
            $filteredData[$this->tenantColumn] = $this->currentTenantId;
        }
        
        // Add timestamps
        if ($this->timestamps) {
            $now = date('Y-m-d H:i:s');
            $filteredData['created_at'] = $now;
            $filteredData['updated_at'] = $now;
        }
        
        $columns = array_keys($filteredData);
        $placeholders = str_repeat('?,', count($columns) - 1) . '?';
        
        $sql = "INSERT INTO {$this->table} (" . implode(',', $columns) . ") VALUES ({$placeholders})";
        
        $result = $this->db->execute($sql, array_values($filteredData));
        
        if ($result['success']) {
            return $this->find($result['last_insert_id']);
        }
        
        return false;
    }
    
    // Update a record
    public function update($id, $data) {
        // Filter data based on fillable fields
        $filteredData = $this->filterFillable($data);
        
        // Add updated_at timestamp
        if ($this->timestamps) {
            $filteredData['updated_at'] = date('Y-m-d H:i:s');
        }
        
        $columns = array_keys($filteredData);
        $setParts = array_map(function($col) { return "{$col} = ?"; }, $columns);
        
        $sql = "UPDATE {$this->table} SET " . implode(',', $setParts) . " WHERE {$this->primaryKey} = ?";
        $params = array_merge(array_values($filteredData), [$id]);
        
        // Add tenant scope if applicable
        if ($this->isTenantScoped()) {
            $sql .= " AND {$this->tenantColumn} = ?";
            $params[] = $this->currentTenantId;
        }
        
        $result = $this->db->execute($sql, $params);
        
        if ($result['success'] && $result['affected_rows'] > 0) {
            return $this->find($id);
        }
        
        return false;
    }
    
    // Delete a record (soft delete if enabled)
    public function delete($id) {
        if ($this->softDeletes) {
            return $this->update($id, ['deleted_at' => date('Y-m-d H:i:s')]);
        }
        
        $sql = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?";
        $params = [$id];
        
        // Add tenant scope if applicable
        if ($this->isTenantScoped()) {
            $sql .= " AND {$this->tenantColumn} = ?";
            $params[] = $this->currentTenantId;
        }
        
        $result = $this->db->execute($sql, $params);
        return $result['success'] && $result['affected_rows'] > 0;
    }
    
    // Count records
    public function count($conditions = []) {
        $sql = "SELECT COUNT(*) as total FROM {$this->table}";
        $params = [];
        $whereClauses = [];
        
        // Add tenant scope if applicable
        if ($this->isTenantScoped()) {
            $whereClauses[] = "{$this->tenantColumn} = ?";
            $params[] = $this->currentTenantId;
        }
        
        // Add soft delete check
        if ($this->softDeletes) {
            $whereClauses[] = "deleted_at IS NULL";
        }
        
        // Add custom conditions
        foreach ($conditions as $column => $value) {
            $whereClauses[] = "{$column} = ?";
            $params[] = $value;
        }
        
        // Build WHERE clause
        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }
        
        $result = $this->db->queryOne($sql, $params);
        return $result ? (int)$result['total'] : 0;
    }
    
    // Check if model should be tenant-scoped
    protected function isTenantScoped() {
        return $this->tenantColumn !== null && $this->currentTenantId !== null;
    }
    
    // Filter data based on fillable fields
    protected function filterFillable($data) {
        if (empty($this->fillable)) {
            return $data;
        }
        
        return array_intersect_key($data, array_flip($this->fillable));
    }
    
    // Execute raw SQL query
    public function raw($sql, $params = []) {
        return $this->db->query($sql, $params);
    }
    
    // Execute raw SQL query and return single result
    public function rawOne($sql, $params = []) {
        return $this->db->queryOne($sql, $params);
    }
    
    // Get paginated results
    public function paginate($page = 1, $perPage = null, $conditions = [], $orderBy = null) {
        $perPage = $perPage ?: DEFAULT_PAGE_SIZE;
        $perPage = min($perPage, MAX_PAGE_SIZE);
        $offset = ($page - 1) * $perPage;
        
        $items = $this->findAll($conditions, $orderBy, $perPage, $offset);
        $total = $this->count($conditions);
        
        return [
            'data' => $items,
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
}
?>