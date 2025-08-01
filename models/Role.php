<?php
class Role extends Model {
    protected $table = 'roles';
    protected $fillable = [
        'organization_id', 'name', 'description', 'permissions', 'is_system', 'status'
    ];
    
    public function createRole($data, $organizationId) {
        $data['organization_id'] = $organizationId;
        $data['is_system'] = false; // System roles cannot be created dynamically
        $data['status'] = 'active';
        
        return $this->create($data, $organizationId);
    }
    
    public function updateRole($id, $data, $organizationId) {
        $role = $this->find($id, $organizationId);
        if (!$role) {
            throw new Exception('Role not found');
        }
        
        if ($role['is_system']) {
            throw new Exception('System roles cannot be modified');
        }
        
        return $this->update($id, $data, $organizationId);
    }
    
    public function deleteRole($id, $organizationId) {
        $role = $this->find($id, $organizationId);
        if (!$role) {
            throw new Exception('Role not found');
        }
        
        if ($role['is_system']) {
            throw new Exception('System roles cannot be deleted');
        }
        
        return $this->delete($id, $organizationId);
    }
    
    public function getRolesByOrganization($organizationId) {
        return $this->where(['organization_id' => $organizationId, 'status' => 'active']);
    }
}

