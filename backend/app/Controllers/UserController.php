<?php
require_once 'BaseController.php';

class UserController extends BaseController {
    
    // Get current user profile
    public function profile($params = []) {
        $this->requireAuth();
        
        try {
            $userModel = new User();
            $profile = $userModel->getProfile($this->currentUser['id'], $this->currentTenantId);
            
            $this->success($profile, 'Profile retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get profile: ' . $e->getMessage(), 500);
        }
    }
    
    // Update user profile
    public function updateProfile($params = []) {
        $this->requireAuth();
        
        try {
            $input = $this->getInput();
            
            // Validation rules
            $rules = [
                'first_name' => 'max:100',
                'last_name' => 'max:100',
                'phone_number' => 'phone',
                'course' => 'max:100',
                'year_level' => 'in:1st,2nd,3rd,4th,5th,Graduate,Alumni'
            ];
            
            $validation = Validator::make($input, $rules);
            
            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }
            
            // Update user profile
            $userModel = new User();
            $oldUser = $userModel->find($this->currentUser['id']);
            
            $updateData = array_filter([
                'first_name' => $input['first_name'] ?? null,
                'last_name' => $input['last_name'] ?? null,
                'phone_number' => $input['phone_number'] ?? null,
                'course' => $input['course'] ?? null,
                'year_level' => $input['year_level'] ?? null
            ], function($value) { return $value !== null; });
            
            $updatedUser = $userModel->update($this->currentUser['id'], $updateData);
            
            if (!$updatedUser) {
                $this->error('Failed to update profile');
            }
            
            // Log the profile update
            $this->logAudit('profile_updated', 'User', $this->currentUser['id'], 
                array_intersect_key($oldUser, $updateData), 
                $updateData
            );
            
            // Remove sensitive data
            unset($updatedUser['password_hash']);
            unset($updatedUser['verification_token']);
            unset($updatedUser['password_reset_token']);
            
            $this->success($updatedUser, 'Profile updated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to update profile: ' . $e->getMessage(), 500);
        }
    }
    
    // Upload user avatar
    public function uploadAvatar($params = []) {
        $this->requireAuth();
        
        try {
            if (!isset($_FILES['avatar'])) {
                $this->error('No avatar file provided', 400);
            }
            
            // Upload the avatar
            $uploadResult = $this->uploadFile('avatar', ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE);
            
            if (!$uploadResult) {
                $this->error('Failed to upload avatar');
            }
            
            // Update user's profile image URL
            $userModel = new User();
            $updatedUser = $userModel->update($this->currentUser['id'], [
                'profile_image_url' => $uploadResult['url']
            ]);
            
            if (!$updatedUser) {
                $this->error('Failed to update profile image');
            }
            
            // Log the avatar upload
            $this->logAudit('avatar_uploaded', 'User', $this->currentUser['id'], null, [
                'filename' => $uploadResult['filename'],
                'url' => $uploadResult['url']
            ]);
            
            $this->success([
                'profile_image_url' => $uploadResult['url'],
                'upload_info' => $uploadResult
            ], 'Avatar uploaded successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to upload avatar: ' . $e->getMessage(), 500);
        }
    }
    
    // Get user's organizations
    public function myOrganizations($params = []) {
        $this->requireAuth();
        
        try {
            $userModel = new User();
            $organizations = $userModel->getUserOrganizations($this->currentUser['id']);
            
            $this->success($organizations, 'Organizations retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get organizations: ' . $e->getMessage(), 500);
        }
    }
    
    // Join an organization
    public function joinOrganization($params = []) {
        $this->requireAuth();
        
        try {
            $organizationId = $params['id'] ?? null;
            
            if (!$organizationId) {
                $this->error('Organization ID is required', 400);
            }
            
            // Check if organization exists and is active
            $orgModel = new Organization();
            $organization = $orgModel->find($organizationId);
            
            if (!$organization || $organization['status'] !== 'active') {
                $this->error('Organization not found or inactive', 404);
            }
            
            // Check if user can join (not already a member)
            if (!$orgModel->canUserJoin($organizationId, $this->currentUser['id'])) {
                $this->error('You are already a member of this organization', 400);
            }
            
            // Create membership
            $memberModel = new OrganizationMember();
            $membership = $memberModel->create([
                'organization_id' => $organizationId,
                'user_id' => $this->currentUser['id'],
                'role' => 'member',
                'status' => 'pending' // Requires approval
            ]);
            
            if (!$membership) {
                $this->error('Failed to create membership request');
            }
            
            // Log the join request
            $this->logAudit('organization_join_requested', 'OrganizationMember', $membership['id'], null, [
                'organization_id' => $organizationId,
                'organization_name' => $organization['name']
            ]);
            
            $this->success($membership, 'Join request submitted successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to join organization: ' . $e->getMessage(), 500);
        }
    }
    
    // Leave an organization
    public function leaveOrganization($params = []) {
        $this->requireAuth();
        
        try {
            $organizationId = $params['id'] ?? null;
            
            if (!$organizationId) {
                $this->error('Organization ID is required', 400);
            }
            
            // Find membership
            $memberModel = new OrganizationMember();
            $membership = $memberModel->findByUserAndOrganization($this->currentUser['id'], $organizationId);
            
            if (!$membership) {
                $this->error('You are not a member of this organization', 404);
            }
            
            // Don't allow the last admin to leave
            if ($membership['role'] === 'admin') {
                $adminCount = $memberModel->count([
                    'organization_id' => $organizationId,
                    'role' => 'admin',
                    'status' => 'active'
                ]);
                
                if ($adminCount <= 1) {
                    $this->error('Cannot leave organization as the last admin. Please appoint another admin first.', 400);
                }
            }
            
            // Soft delete the membership
            $deleted = $memberModel->delete($membership['id']);
            
            if (!$deleted) {
                $this->error('Failed to leave organization');
            }
            
            // Log the leave action
            $this->logAudit('organization_left', 'OrganizationMember', $membership['id'], $membership, null);
            
            $this->success(null, 'Successfully left the organization');
            
        } catch (Exception $e) {
            $this->error('Failed to leave organization: ' . $e->getMessage(), 500);
        }
    }
    
    // Get user's events in current organization
    public function myEvents($params = []) {
        $this->requireTenantMembership();
        
        try {
            $userModel = new User();
            $events = $userModel->getUserEventsInOrganization($this->currentUser['id'], $this->currentTenantId);
            
            $this->success($events, 'Events retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get events: ' . $e->getMessage(), 500);
        }
    }
    
    // Get upcoming events for user
    public function upcomingEvents($params = []) {
        $this->requireTenantMembership();
        
        try {
            $limit = min(50, max(1, (int)($this->input('limit', 10))));
            
            $userModel = new User();
            $events = $userModel->getUpcomingEvents($this->currentUser['id'], $this->currentTenantId, $limit);
            
            $this->success($events, 'Upcoming events retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get upcoming events: ' . $e->getMessage(), 500);
        }
    }
    
    // Get past events for user
    public function pastEvents($params = []) {
        $this->requireTenantMembership();
        
        try {
            $limit = min(100, max(1, (int)($this->input('limit', 20))));
            
            $userModel = new User();
            $events = $userModel->getPastEvents($this->currentUser['id'], $this->currentTenantId, $limit);
            
            $this->success($events, 'Past events retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get past events: ' . $e->getMessage(), 500);
        }
    }
    
    // Get user's attendance records
    public function myAttendance($params = []) {
        $this->requireTenantMembership();
        
        try {
            // Get pagination parameters
            $paginationParams = $this->getPaginationParams();
            
            // TODO: Implement attendance records query
            // This would require an EventAttendance model or extending User model
            
            $this->success([], 'Attendance records retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get attendance records: ' . $e->getMessage(), 500);
        }
    }
    
    // Get user's attendance summary
    public function attendanceSummary($params = []) {
        $this->requireTenantMembership();
        
        try {
            $userModel = new User();
            $summary = $userModel->getAttendanceSummary($this->currentUser['id'], $this->currentTenantId);
            
            $this->success($summary, 'Attendance summary retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get attendance summary: ' . $e->getMessage(), 500);
        }
    }
}
?>