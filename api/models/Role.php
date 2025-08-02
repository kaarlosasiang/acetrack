<?php
class Role extends Model {
    protected $table = 'roles';
    protected $fillable = [
        'organization_id', 'name', 'description', 'permissions', 'is_system', 'status'
    ];
    
    // Available permissions in the system
    public static $availablePermissions = [
        // User Management
        'users.read' => 'View users',
        'users.create' => 'Create new users',
        'users.update' => 'Update user information',
        'users.delete' => 'Delete users',
        'users.*' => 'Full user management access',
        
        // Attendance Management
        'attendance.own' => 'View own attendance records',
        'attendance.read' => 'View all attendance records',
        'attendance.create' => 'Mark attendance for others',
        'attendance.update' => 'Update attendance records',
        'attendance.delete' => 'Delete attendance records',
        'attendance.*' => 'Full attendance management access',
        
        // Event Management
        'events.read' => 'View events',
        'events.create' => 'Create events',
        'events.update' => 'Update events',
        'events.delete' => 'Delete events',
        'events.register' => 'Register for events',
        'events.manage_attendance' => 'Manage event attendance',
        'events.*' => 'Full event management access',
        
        // Payment Management
        'payments.read' => 'View payment records',
        'payments.create' => 'Record payments',
        'payments.update' => 'Update payment records',
        'payments.delete' => 'Delete payment records',
        'payments.*' => 'Full payment management access',
        
        // Report Management
        'reports.read' => 'View reports',
        'reports.create' => 'Generate reports',
        'reports.financial' => 'View financial reports',
        'reports.*' => 'Full report access',
        
        // Role Management
        'roles.read' => 'View roles and permissions',
        'roles.create' => 'Create custom roles',
        'roles.update' => 'Update roles and permissions',
        'roles.delete' => 'Delete custom roles',
        'roles.*' => 'Full role management access',
        
        // Organization Management
        'organization.read' => 'View organization details',
        'organization.update' => 'Update organization information',
        'organization.*' => 'Full organization management access',
        
        // Profile Management
        'profile.read' => 'View own profile',
        'profile.update' => 'Update own profile',
        'profile.*' => 'Full profile access',
        
        // System Administration
        '*' => 'Full system access (Super Admin only)'
    ];
    
    public function createRole($data, $organizationId) {
        // Validate role name uniqueness within organization
        $existing = $this->db->fetch(
            "SELECT id FROM roles WHERE name = :name AND organization_id = :org_id",
            ['name' => $data['name'], 'org_id' => $organizationId]
        );
        
        if ($existing) {
            throw new Exception('Role name already exists in this organization');
        }
        
        // Validate permissions
        if (isset($data['permissions']) && is_array($data['permissions'])) {
            $this->validatePermissions($data['permissions']);
            $data['permissions'] = json_encode($data['permissions']);
        }
        
        $data['organization_id'] = $organizationId;
        $data['is_system'] = false; // Custom roles are never system roles
        $data['status'] = 'active';
        
        return $this->create($data, $organizationId);
    }
    
    public function updateRole($id, $data, $organizationId) {
        $role = $this->find($id, $organizationId);
        if (!$role) {
            throw new Exception('Role not found');
        }
        
        // Only allow updating system roles' permissions, not other properties
        if ($role['is_system'] && isset($data['name'])) {
            throw new Exception('Cannot change system role name');
        }
        
        // Validate permissions if provided
        if (isset($data['permissions']) && is_array($data['permissions'])) {
            $this->validatePermissions($data['permissions']);
            $data['permissions'] = json_encode($data['permissions']);
        }
        
        // Check for name uniqueness if name is being updated
        if (isset($data['name']) && $data['name'] !== $role['name']) {
            $existing = $this->db->fetch(
                "SELECT id FROM roles WHERE name = :name AND organization_id = :org_id AND id != :role_id",
                ['name' => $data['name'], 'org_id' => $organizationId, 'role_id' => $id]
            );
            
            if ($existing) {
                throw new Exception('Role name already exists in this organization');
            }
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
        
        // Check if role is assigned to any users
        $usersWithRole = $this->db->fetch(
            "SELECT COUNT(*) as count FROM user_roles WHERE role_id = :role_id",
            ['role_id' => $id]
        );
        
        if ($usersWithRole['count'] > 0) {
            throw new Exception('Cannot delete role that is assigned to users');
        }
        
        return $this->delete($id, $organizationId);
    }
    
    public function getRolesByOrganization($organizationId, $includeSystem = true) {
        $sql = "SELECT * FROM roles WHERE organization_id = :org_id AND status = 'active'";
        $params = ['org_id' => $organizationId];
        
        if ($includeSystem) {
            $sql = "SELECT * FROM roles WHERE (organization_id = :org_id OR organization_id IS NULL) AND status = 'active'";
        }
        
        $sql .= " ORDER BY is_system DESC, name ASC";
        
        $roles = $this->db->fetchAll($sql, $params);
        
        // Decode permissions JSON for each role
        foreach ($roles as &$role) {
            if ($role['permissions']) {
                $role['permissions'] = json_decode($role['permissions'], true);
            }
        }
        
        return $roles;
    }
    
    public function getRoleWithUsers($id, $organizationId) {
        $role = $this->find($id, $organizationId);
        if (!$role) {
            return null;
        }
        
        // Get users assigned to this role
        $users = $this->db->fetchAll(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.student_id, ur.assigned_at
             FROM users u
             INNER JOIN user_roles ur ON u.id = ur.user_id
             WHERE ur.role_id = :role_id AND u.organization_id = :org_id
             ORDER BY u.first_name, u.last_name",
            ['role_id' => $id, 'org_id' => $organizationId]
        );
        
        $role['assigned_users'] = $users;
        $role['permissions'] = json_decode($role['permissions'], true);
        
        return $role;
    }
    
    public static function getAvailablePermissions() {
        return self::$availablePermissions;
    }
    
    public function getOrganizationalRoles($organizationId) {
        // Get default organizational roles for ACES
        return [
            'adviser' => 'Organization Adviser - Faculty mentor with full oversight',
            'co_adviser' => 'Organization Co-Adviser - Assistant faculty mentor',
            'governor' => 'Governor - Highest student leadership position',
            'vice_governor' => 'Vice Governor - Second highest student leadership',
            'secretary' => 'Secretary - Records and documentation management',
            'treasurer' => 'Treasurer - Financial management',
            'auditor' => 'Auditor - Financial oversight and compliance',
            'business_manager' => 'Business Manager - External relations and partnerships',
            'pio' => 'Public Information Officer - Communications and media',
            'student' => 'Student Member - Basic member access'
        ];
    }
    
    private function validatePermissions($permissions) {
        $validPermissions = array_keys(self::$availablePermissions);
        
        foreach ($permissions as $permission) {
            if (!in_array($permission, $validPermissions)) {
                throw new Exception("Invalid permission: {$permission}");
            }
        }
        
        return true;
    }
    
    public function hasPermission($userRoles, $requiredPermission) {
        // Check if user has the required permission through any of their roles
        foreach ($userRoles as $role) {
            $permissions = is_string($role['permissions']) ? 
                json_decode($role['permissions'], true) : $role['permissions'];
            
            if (in_array('*', $permissions) || in_array($requiredPermission, $permissions)) {
                return true;
            }
            
            // Check for wildcard permissions (e.g., users.* covers users.read)
            foreach ($permissions as $permission) {
                if (str_ends_with($permission, '.*')) {
                    $prefix = str_replace('.*', '', $permission);
                    if (str_starts_with($requiredPermission, $prefix . '.')) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
}

