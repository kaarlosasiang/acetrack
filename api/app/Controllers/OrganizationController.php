<?php
require_once 'BaseController.php';

class OrganizationController extends BaseController {
    
    // Get public list of organizations (no auth required)
    public function publicList($params = []) {
        try {
            $page = max(1, (int)($this->input('page', 1)));
            $perPage = min(50, max(1, (int)($this->input('per_page', 20))));
            $search = $this->input('search');
            
            $orgModel = new Organization();
            $result = $orgModel->getPublicList($page, $perPage, $search);
            
            $this->success($result, 'Organizations retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get organizations: ' . $e->getMessage(), 500);
        }
    }
    
    // Get public organization info (no auth required)
    public function publicShow($params = []) {
        try {
            $organizationId = $params['id'] ?? null;
            
            if (!$organizationId) {
                $this->error('Organization ID is required', 400);
            }
            
            $orgModel = new Organization();
            $organization = $orgModel->getPublicInfo($organizationId);
            
            if (!$organization) {
                $this->error('Organization not found', 404);
            }
            
            $this->success($organization, 'Organization retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get organization: ' . $e->getMessage(), 500);
        }
    }
    
    // Get current organization details (tenant context required)
    public function show($params = []) {
        $this->requireTenantMembership();
        
        try {
            $orgModel = new Organization();
            $organization = $orgModel->getWithMemberCount($this->currentTenantId);
            
            if (!$organization) {
                $this->error('Organization not found', 404);
            }
            
            $this->success($organization, 'Organization details retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get organization details: ' . $e->getMessage(), 500);
        }
    }
    
    // Update organization details (admin only)
    public function update($params = []) {
        $member = $this->requireRole(['admin']);
        
        try {
            $input = $this->getInput();
            
            // Validation rules
            $rules = [
                'name' => 'max:200',
                'description' => 'max:1000'
            ];
            
            $validation = Validator::make($input, $rules);
            
            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }
            
            // Get current organization data for audit log
            $orgModel = new Organization();
            $oldOrg = $orgModel->find($this->currentTenantId);
            
            // Update organization
            $updateData = array_filter([
                'name' => $input['name'] ?? null,
                'description' => $input['description'] ?? null
            ], function($value) { return $value !== null; });
            
            $updatedOrg = $orgModel->update($this->currentTenantId, $updateData);
            
            if (!$updatedOrg) {
                $this->error('Failed to update organization');
            }
            
            // Log the update
            $this->logAudit('organization_updated', 'Organization', $this->currentTenantId,
                array_intersect_key($oldOrg, $updateData),
                $updateData
            );
            
            $this->success($updatedOrg, 'Organization updated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to update organization: ' . $e->getMessage(), 500);
        }
    }
    
    // Upload organization logo (admin only)
    public function uploadLogo($params = []) {
        $this->requireRole(['admin']);
        
        try {
            if (!isset($_FILES['logo'])) {
                $this->error('No logo file provided', 400);
            }
            
            // Upload the logo
            $uploadResult = $this->uploadFile('logo', ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE);
            
            if (!$uploadResult) {
                $this->error('Failed to upload logo');
            }
            
            // Update organization logo URL
            $orgModel = new Organization();
            $updatedOrg = $orgModel->update($this->currentTenantId, [
                'logo_url' => $uploadResult['url']
            ]);
            
            if (!$updatedOrg) {
                $this->error('Failed to update organization logo');
            }
            
            // Log the logo upload
            $this->logAudit('organization_logo_uploaded', 'Organization', $this->currentTenantId, null, [
                'filename' => $uploadResult['filename'],
                'url' => $uploadResult['url']
            ]);
            
            $this->success([
                'logo_url' => $uploadResult['url'],
                'upload_info' => $uploadResult
            ], 'Logo uploaded successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to upload logo: ' . $e->getMessage(), 500);
        }
    }
    
    // Upload organization banner (admin only)
    public function uploadBanner($params = []) {
        $this->requireRole(['admin']);
        
        try {
            if (!isset($_FILES['banner'])) {
                $this->error('No banner file provided', 400);
            }
            
            // Upload the banner
            $uploadResult = $this->uploadFile('banner', ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE);
            
            if (!$uploadResult) {
                $this->error('Failed to upload banner');
            }
            
            // Update organization banner URL
            $orgModel = new Organization();
            $updatedOrg = $orgModel->update($this->currentTenantId, [
                'banner_url' => $uploadResult['url']
            ]);
            
            if (!$updatedOrg) {
                $this->error('Failed to update organization banner');
            }
            
            // Log the banner upload
            $this->logAudit('organization_banner_uploaded', 'Organization', $this->currentTenantId, null, [
                'filename' => $uploadResult['filename'],
                'url' => $uploadResult['url']
            ]);
            
            $this->success([
                'banner_url' => $uploadResult['url'],
                'upload_info' => $uploadResult
            ], 'Banner uploaded successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to upload banner: ' . $e->getMessage(), 500);
        }
    }
    
    // Generate membership QR code for organization (admin only)
    public function generateMembershipQR($params = []) {
        $this->requireRole(['admin']);
        
        try {
            $input = $this->getInput();
            $expiresInDays = max(1, min(30, (int)($input['expires_in_days'] ?? 7))); // 1-30 days
            
            // Generate QR code using QRCodeHelper
            require_once APP_PATH . '/Helpers/QRCodeHelper.php';
            $qrHelper = new QRCodeHelper();
            
            $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiresInDays} days"));
            $qrResult = $qrHelper->generateMembershipQR($this->currentTenantId, $expiresAt);
            
            if (!$qrResult['success']) {
                $this->error('Failed to generate membership QR code: ' . $qrResult['error']);
            }
            
            // Get organization name for response
            $orgModel = new Organization();
            $organization = $orgModel->find($this->currentTenantId);
            
            // Log QR code generation
            $this->logAudit('membership_qr_generated', 'Organization', $this->currentTenantId, null, [
                'qr_token' => $qrResult['qr_token'],
                'expires_at' => $qrResult['expires_at'],
                'expires_in_days' => $expiresInDays
            ]);
            
            $this->success([
                'organization_id' => $this->currentTenantId,
                'organization_name' => $organization['name'] ?? 'Unknown',
                'qr_token' => $qrResult['qr_token'],
                'qr_url' => $qrResult['qr_url'],
                'qr_code_image' => $qrResult['qr_code_image'],
                'expires_at' => $qrResult['expires_at'],
                'expires_in_days' => $expiresInDays,
                'instructions' => 'Share this QR code with potential members. They can scan it to request membership in your organization.'
            ], 'Membership QR code generated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to generate membership QR code: ' . $e->getMessage(), 500);
        }
    }
    
    // Activate organization (super admin only)
    public function activate($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $organizationId = $params['id'] ?? null;
            
            if (!$organizationId) {
                $this->error('Organization ID is required', 400);
            }
            
            $orgModel = new Organization();
            $organization = $orgModel->find($organizationId);
            
            if (!$organization) {
                $this->error('Organization not found', 404);
            }
            
            $activated = $orgModel->activate($organizationId);
            
            if (!$activated) {
                $this->error('Failed to activate organization');
            }
            
            // Log the activation
            $this->logAudit('organization_activated', 'Organization', $organizationId, 
                ['status' => $organization['status']], 
                ['status' => 'active']
            );
            
            $this->success(null, 'Organization activated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to activate organization: ' . $e->getMessage(), 500);
        }
    }
    
    // Deactivate organization (super admin only)
    public function deactivate($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $organizationId = $params['id'] ?? null;
            
            if (!$organizationId) {
                $this->error('Organization ID is required', 400);
            }
            
            $orgModel = new Organization();
            $organization = $orgModel->find($organizationId);
            
            if (!$organization) {
                $this->error('Organization not found', 404);
            }
            
            $deactivated = $orgModel->deactivate($organizationId);
            
            if (!$deactivated) {
                $this->error('Failed to deactivate organization');
            }
            
            // Log the deactivation
            $this->logAudit('organization_deactivated', 'Organization', $organizationId,
                ['status' => $organization['status']],
                ['status' => 'inactive']
            );
            
            $this->success(null, 'Organization deactivated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to deactivate organization: ' . $e->getMessage(), 500);
        }
    }
}
?>