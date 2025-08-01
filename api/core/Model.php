<?php
class Model {
    protected $db;
    protected $table;
    protected $primaryKey = 'id';
    protected $fillable = [];
    protected $hidden = [];
    protected $timestamps = true;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function find($id, $tenantId = null) {
        $where = [$this->primaryKey => $id];
        if ($tenantId !== null) {
            $where['tenant_id'] = $tenantId;
        }
        
        $params = [];
        $whereClause = [];
        foreach ($where as $column => $value) {
            $whereClause[] = "{$column} = :{$column}";
            $params[$column] = $value;
        }
        
        $sql = "SELECT * FROM {$this->table} WHERE " . implode(' AND ', $whereClause);
        $result = $this->db->fetch($sql, $params);
        
        return $result ? $this->formatOutput($result) : null;
    }
    
    public function findBy($where, $tenantId = null) {
        if ($tenantId !== null) {
            $where['tenant_id'] = $tenantId;
        }
        
        $params = [];
        $whereClause = [];
        foreach ($where as $column => $value) {
            $whereClause[] = "{$column} = :{$column}";
            $params[$column] = $value;
        }
        
        $sql = "SELECT * FROM {$this->table} WHERE " . implode(' AND ', $whereClause);
        $result = $this->db->fetch($sql, $params);
        
        return $result ? $this->formatOutput($result) : null;
    }
    
    public function all($tenantId = null, $limit = null, $offset = null) {
        $sql = "SELECT * FROM {$this->table}";
        $params = [];
        
        if ($tenantId !== null) {
            $sql .= " WHERE tenant_id = :tenant_id";
            $params['tenant_id'] = $tenantId;
        }
        
        $sql .= " ORDER BY {$this->primaryKey} DESC";
        
        if ($limit !== null) {
            $sql .= " LIMIT :limit";
            $params['limit'] = $limit;
            
            if ($offset !== null) {
                $sql .= " OFFSET :offset";
                $params['offset'] = $offset;
            }
        }
        
        $results = $this->db->fetchAll($sql, $params);
        return array_map([$this, 'formatOutput'], $results);
    }
    
    public function count($tenantId = null) {
        $sql = "SELECT COUNT(*) as total FROM {$this->table}";
        $params = [];
        
        if ($tenantId !== null) {
            $sql .= " WHERE tenant_id = :tenant_id";
            $params['tenant_id'] = $tenantId;
        }
        
        $result = $this->db->fetch($sql, $params);
        return $result['total'] ?? 0;
    }
    
    public function create($data, $tenantId = null) {
        $data = $this->filterFillable($data);
        
        if ($this->timestamps) {
            $data['created_at'] = date('Y-m-d H:i:s');
            $data['updated_at'] = date('Y-m-d H:i:s');
        }
        
        $id = $this->db->insert($this->table, $data, $tenantId);
        return $this->find($id, $tenantId);
    }
    
    public function update($id, $data, $tenantId = null) {
        $data = $this->filterFillable($data);
        
        if ($this->timestamps) {
            $data['updated_at'] = date('Y-m-d H:i:s');
        }
        
        $where = [$this->primaryKey => $id];
        $this->db->update($this->table, $data, $where, $tenantId);
        
        return $this->find($id, $tenantId);
    }
    
    public function delete($id, $tenantId = null) {
        $where = [$this->primaryKey => $id];
        return $this->db->delete($this->table, $where, $tenantId);
    }
    
    public function where($conditions, $tenantId = null) {
        if ($tenantId !== null) {
            $conditions['tenant_id'] = $tenantId;
        }
        
        $params = [];
        $whereClause = [];
        foreach ($conditions as $column => $value) {
            if (is_array($value)) {
                $placeholders = [];
                foreach ($value as $i => $v) {
                    $placeholder = "{$column}_{$i}";
                    $placeholders[] = ":{$placeholder}";
                    $params[$placeholder] = $v;
                }
                $whereClause[] = "{$column} IN (" . implode(',', $placeholders) . ")";
            } else {
                $whereClause[] = "{$column} = :{$column}";
                $params[$column] = $value;
            }
        }
        
        $sql = "SELECT * FROM {$this->table} WHERE " . implode(' AND ', $whereClause);
        $results = $this->db->fetchAll($sql, $params);
        
        return array_map([$this, 'formatOutput'], $results);
    }
    
    protected function filterFillable($data) {
        if (empty($this->fillable)) {
            return $data;
        }
        
        return array_intersect_key($data, array_flip($this->fillable));
    }
    
    protected function formatOutput($data) {
        if (!empty($this->hidden)) {
            foreach ($this->hidden as $field) {
                unset($data[$field]);
            }
        }
        
        return $data;
    }
    
    public function beginTransaction() {
        return $this->db->beginTransaction();
    }
    
    public function commit() {
        return $this->db->commit();
    }
    
    public function rollback() {
        return $this->db->rollback();
    }
}

