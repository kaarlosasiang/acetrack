<?php
class RoleController extends Controller {
    private $roleModel;
    
    public function __construct() {
        parent::__construct();
        $this->roleModel = new Role();
    }
    
    public function index($params = []) {
        try {
            $organizationId = $this-getCurrentOrganization();
            $roles = $this->roleModel->getRolesByOrganization($organizationId);
            
            $this->successResponse($roles);
        } catch (Exception $e) {
            $this->errorResponse('Failed to fetch roles: ' . $e->getMessage(), 500);
        }
    }
    
    public function create($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, ['name', 'permissions']);
        
        try {
            $organizationId = $this-getCurrentOrganization();
            $role = $this->roleModel->createRole($input, $organizationId);
            
            $this->successResponse($role, 'Role created successfully', 201);
        } catch (Exception $e) {
            $this->errorResponse('Failed to create role: ' . $e->getMessage(), 400);
        }
    }
    
    public function update($params = []) {
        $roleId = $params['id'] ?? null;
        if (!$roleId) {
            $this->errorResponse('Role ID required', 400);
        }
        
        try {
            $input = $this->getInput();
            $organizationId = $this-getCurrentOrganization();
            
            $updatedRole = $this->roleModel->updateRole($roleId, $input, $organizationId);
            
            $this->successResponse($updatedRole, 'Role updated successfully');
        } catch (Exception $e) {
            $this->errorResponse('Failed to update role: ' . $e->getMessage(), 400);
        }
    }
    
    public function destroy($params = []) {
        $roleId = $params['id'] ?? null;
        if (!$roleId) {
            $this->errorResponse('Role ID required', 400);
        }
        
        try {
            $organizationId = $this-getCurrentOrganization();
            $this->roleModel->deleteRole($roleId, $organizationId);
            
            $this->successResponse(null, 'Role deleted successfully');
        } catch (Exception $e) {
            $this->errorResponse('Failed to delete role: ' . $e->getMessage(), 400);
        }
    }
}

