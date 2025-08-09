<?php
require_once 'models/Organization.php';

class OrganizationController extends Controller {
    private $organizationModel;
    
    public function __construct() {
        parent::__construct();
        $this->organizationModel = new Organization();
    }

    // List all organizations (Super Admin only)
    public function index($params = []) {
        try {
            $queryParams = $this->getQueryParams();
            $filters = [
                'status' => $queryParams['status'] ?? null,
                'search' => $queryParams['search'] ?? null,
                'limit' => $queryParams['limit'] ?? null
            ];
            
            $organizations = $this->organizationModel->getAll($filters);
            
            $this->successResponse($organizations);
        } catch (Exception $e) {
            $this->errorResponse('Failed to fetch organizations: ' . $e->getMessage(), 500);
        }
    }

    // Create new organization (Super Admin only)
    public function store($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, ['name', 'contact_email']);
        
        try {
            $organizationData = [
                'name' => $input['name'],
                'abbreviation' => $input['abbreviation'] ?? null,
                'description' => $input['description'] ?? null,
                'contact_email' => $input['contact_email'],
                'contact_phone' => $input['contact_phone'] ?? null,
                'status' => 'active',
                'is_owner' => false, // Only ACES is owner
                'settings' => $input['settings'] ?? []
            ];
            
            $newOrganization = $this->organizationModel->create($organizationData);
            
            $this->logActivity('organization_created', [
                'organization_id' => $newOrganization['id'],
                'organization_name' => $newOrganization['name']
            ]);
            
            $this->successResponse($newOrganization, 'Organization created successfully', 201);
        } catch (Exception $e) {
            $this->errorResponse('Failed to create organization: ' . $e->getMessage(), 400);
        }
    }

    // Show organization details (Super Admin only)
    public function show($params = []) {
        $organizationId = $params['id'] ?? null;
        if (!$organizationId) {
            $this->errorResponse('Organization ID required', 400);
        }
        
        try {
            $organization = $this->organizationModel->getById($organizationId);
            if (!$organization) {
                $this->errorResponse('Organization not found', 404);
            }
            
            // Get organization stats
            $stats = $this->organizationModel->getStats($organizationId);
            $organization['stats'] = $stats;
            
            $this->successResponse($organization);
        } catch (Exception $e) {
            $this->errorResponse('Failed to fetch organization: ' . $e->getMessage(), 500);
        }
    }

    // Update organization details (Super Admin only)
    public function update($params = []) {
        $organizationId = $params['id'] ?? null;
        if (!$organizationId) {
            $this->errorResponse('Organization ID required', 400);
        }
        
        try {
            $input = $this->getInput();
            
            $updatedOrganization = $this->organizationModel->update($organizationId, $input);
            if (!$updatedOrganization) {
                $this->errorResponse('Organization not found', 404);
            }
            
            $this->logActivity('organization_updated', [
                'organization_id' => $organizationId,
                'changes' => array_keys($input)
            ]);
            
            $this->successResponse($updatedOrganization, 'Organization updated successfully');
        } catch (Exception $e) {
            $this->errorResponse('Failed to update organization: ' . $e->getMessage(), 400);
        }
    }

    // Delete organization (Super Admin only)
    public function destroy($params = []) {
        $organizationId = $params['id'] ?? null;
        if (!$organizationId) {
            $this->errorResponse('Organization ID required', 400);
        }
        
        try {
            // Check if organization is owner (ACES cannot be deleted)
            $organization = $this->organizationModel->getById($organizationId);
            if (!$organization) {
                $this->errorResponse('Organization not found', 404);
            }
            
            if ($organization['is_owner']) {
                $this->errorResponse('Owner organization cannot be deleted', 403);
            }
            
            // Check if organization has users
            $userCount = $this->db->fetch(
                "SELECT COUNT(*) as count FROM users WHERE organization_id = ?",
                [$organizationId]
            );
            
            if ($userCount['count'] > 0) {
                $this->errorResponse('Cannot delete organization with existing users', 400);
            }
            
            if ($this->organizationModel->delete($organizationId)) {
                $this->logActivity('organization_deleted', [
                    'organization_id' => $organizationId,
                    'organization_name' => $organization['name']
                ]);
                
                $this->successResponse(null, 'Organization deleted successfully');
            } else {
                $this->errorResponse('Failed to delete organization', 500);
            }
        } catch (Exception $e) {
            $this->errorResponse('Failed to delete organization: ' . $e->getMessage(), 500);
        }
    }

    // Update organization subscription (Super Admin only)
    public function updateSubscription($params = []) {
        $organizationId = $params['id'] ?? null;
        if (!$organizationId) {
            $this->errorResponse('Organization ID required', 400);
        }
        
        $input = $this->getInput();
        $this->validateRequired($input, ['subscription_start', 'subscription_end']);
        
        try {
            $success = $this->organizationModel->updateSubscription(
                $organizationId,
                $input['subscription_start'],
                $input['subscription_end']
            );
            
            if ($success) {
                $this->logActivity('subscription_updated', [
                    'organization_id' => $organizationId,
                    'subscription_start' => $input['subscription_start'],
                    'subscription_end' => $input['subscription_end']
                ]);
                
                $this->successResponse(null, 'Subscription updated successfully');
            } else {
                $this->errorResponse('Organization not found', 404);
            }
        } catch (Exception $e) {
            $this->errorResponse('Failed to update subscription: ' . $e->getMessage(), 500);
        }
    }

    // Check subscription status
    public function checkSubscription($params = []) {
        $organizationId = $params['id'] ?? null;
        if (!$organizationId) {
            $this->errorResponse('Organization ID required', 400);
        }
        
        try {
            $subscriptionStatus = $this->organizationModel->checkSubscriptionStatus($organizationId);
            
            if ($subscriptionStatus === false) {
                $this->errorResponse('Organization not found', 404);
            }
            
            $this->successResponse($subscriptionStatus);
        } catch (Exception $e) {
            $this->errorResponse('Failed to check subscription: ' . $e->getMessage(), 500);
        }
    }
}
