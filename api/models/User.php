<?php
class User extends Model {
    protected $table = 'users';
    protected $fillable = [
        'organization_id', 'first_name', 'last_name', 'middle_name', 'email', 'password',
        'phone', 'student_id', 'course', 'year_level', 'user_type', 'status', 'approved_by',
        'birth_date', 'address', 'emergency_contact_name', 'emergency_contact_phone',
        'avatar', 'qr_code_static'
    ];
    protected $hidden = ['password'];
    
    public function create($data, $organizationId = null) {
        if (isset($data['password'])) {
            $auth = new Auth();
            $data['password'] = $auth->hashPassword($data['password']);
        }
        
        if (!isset($data['user_type'])) {
            $data['user_type'] = 'student';
        }
        
        if ($data['user_type'] === 'student' && !isset($data['status'])) {
            $data['status'] = 'pending';
        }
        
        if (!isset($data['qr_code_static'])) {
            $data['qr_code_static'] = bin2hex(random_bytes(16));
        }
        
        return parent::create($data, $organizationId);
    }
    
    public function update($id, $data, $organizationId = null) {
        if (isset($data['password'])) {
            $auth = new Auth();
            $data['password'] = $auth->hashPassword($data['password']);
        }
        
        return parent::update($id, $data, $organizationId);
    }
    
    public function getWithRoles($id, $organizationId = null) {
        $user = $this->find($id, $organizationId);
        if (!$user) {
            return null;
        }
        
        $roles = $this->db->fetchAll(
            "SELECT r.id, r.name, r.description, r.permissions 
             FROM roles r 
             INNER JOIN user_roles ur ON r.id = ur.role_id 
             WHERE ur.user_id = :user_id",
            ['user_id' => $id]
        );
        
        foreach ($roles as &$role) {
            if ($role['permissions']) {
                $role['permissions'] = json_decode($role['permissions'], true);
            }
        }
        
        $user['roles'] = $roles;
        return $user;
    }
    
    public function assignRole($userId, $roleName, $organizationId) {
        $role = $this->db->fetch(
            "SELECT id FROM roles WHERE name = :name AND organization_id = :organization_id",
            ['name' => $roleName, 'organization_id' => $organizationId]
        );

        if ($role) {
            $this->db->insert('user_roles', [
                'user_id' => $userId,
                'role_id' => $role['id']
            ]);
        }
    }
    
    public function findByEmail($email) {
        return $this->findBy(['email' => $email]);
    }

    public function findByQrCode($qrCode) {
        return $this->findBy(['qr_code_static' => $qrCode]);
    }
    
    public function approve($userId, $adminId) {
        return $this->update($userId, [
            'status' => 'active',
            'approved_by' => $adminId,
            'approved_at' => date('Y-m-d H:i:s')
        ]);
    }
}

