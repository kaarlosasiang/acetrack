<?php
class User extends Model {
    protected $table = 'users';
    protected $fillable = [
        'tenant_id', 'first_name', 'last_name', 'email', 'password', 
 'phone', 'employee_id', 'department_id', 
        'status', 'avatar'
    ];
    protected $hidden = ['password'];
    
    public function create($data, $tenantId = null) {
        if (isset($data['password'])) {
            $auth = new Auth();
            $data['password'] = $auth->hashPassword($data['password']);
        }
        
        return parent::create($data, $tenantId);
    }
    
   public function update($id, $data, $tenantId = null) {
        if (isset($data['password'])) {
            $auth = new Auth();
            $data['password'] = $auth->hashPassword($data['password']);
        }
        
        return parent::update($id, $data, $tenantId);
    }
    
    public function getWithRoles($id, $tenantId = null) {
        $user = $this->find($id, $tenantId);
        if (!$user) {
            return null;
        }
        
        $roles = $this->db->fetchAll(
            "SELECT r.id, r.name, r.description 
             FROM roles r 
             INNER JOIN user_roles ur ON r.id = ur.role_id 
             WHERE ur.user_id = :user_id",
            ['user_id' => $id]
        );
        
        $user['roles'] = $roles;
        return $user;
    }
    
    public function assignRoles($userId, $roleIds, $tenantId = null) {
        // Remove existing roles
        $this->db->query(
            "DELETE FROM user_roles WHERE user_id = :user_id",
            ['user_id' => $userId]
        );
        
        // Assign new roles
        foreach ($roleIds as $roleId) {
            $this->db->insert('user_roles', [
                'user_id' => $userId,
                'role_id' => $roleId
            ]);
        }
    }
    
    public function findByEmail($email, $tenantId = null) {
        return $this->findBy(['email' => $email], $tenantId);
    }
    
    public function findByEmployeeId($employeeId, $tenantId = null) {
        return $this->findBy(['employee_id' => $employeeId], $tenantId);
    }
    
    public function getByDepartment($departmentId, $tenantId = null) {
        return $this->where(['department_id' => $departmentId], $tenantId);
    }
}

