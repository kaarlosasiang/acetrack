<?php
require_once 'BaseController.php';
require_once APP_PATH . '/Models/OrganizationMember.php';
require_once APP_PATH . '/Models/User.php';
require_once APP_PATH . '/Models/Organization.php';
require_once APP_PATH . '/Models/AuditLog.php';
require_once APP_PATH . '/Helpers/Validator.php';

class OrganizationMemberController extends BaseController
{

    // Get all members of the organization (admin only)
    public function index($params = [])
    {
        // Use the new enhanced role checking method
        $this->requireTenantRole(['admin', 'org_subadmin'], 'Admin or sub-admin access required to view members');

        try {
            $paginationParams = $this->getPaginationParams();
            $status = $this->input('status'); // active, inactive, invited
            $role = $this->input('role'); // admin, org_subadmin, member
            $search = $this->input('search');

            $memberModel = new OrganizationMember();
            $memberModel->setTenant($this->currentTenantId);

            $conditions = [];
            if ($status) {
                $conditions['status'] = $status;
            }
            if ($role) {
                $conditions['role'] = $role;
            }

            $result = $memberModel->paginate(
                $paginationParams['page'],
                $paginationParams['per_page'],
                $conditions,
                'joined_at DESC'
            );

            // Add user information to each member
            foreach ($result['data'] as &$member) {
                $userModel = new User();
                $user = $userModel->find($member['user_id']);
                if ($user) {
                    $member['user'] = [
                        'id' => $user['id'],
                        'first_name' => $user['first_name'],
                        'last_name' => $user['last_name'],
                        'email' => $user['email'],
                        'profile_image_url' => $user['profile_image_url']
                    ];
                }
            }

            $this->success($result, 'Organization members retrieved successfully');
        } catch (Exception $e) {
            $this->error('Failed to get organization members: ' . $e->getMessage(), 500);
        }
    }

    // Add new member to organization (admin only)
    public function store($params = [])
    {
        $this->requireTenantRole(['admin'], 'Organization admin access required to add members');

        try {
            $input = $this->getInput();

            // Validation rules
            $rules = [
                'user_id' => 'required|integer',
                'role' => 'required|in:admin,org_subadmin,member',
                'student_id_number' => 'max:50'
            ];

            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Check if user exists
            $userModel = new User();
            $user = $userModel->find($input['user_id']);

            if (!$user) {
                $this->error('User not found', 404);
            }

            // Check if user is already a member
            $memberModel = new OrganizationMember();
            $existingMembership = $memberModel->findByUserAndOrganization($input['user_id'], $this->currentTenantId);

            if ($existingMembership) {
                $this->error('User is already a member of this organization', 400);
            }

            // Create membership
            $memberData = [
                'organization_id' => $this->currentTenantId,
                'user_id' => $input['user_id'],
                'role' => $input['role'],
                'status' => 'active',
                'student_id_number' => $input['student_id_number'] ?? null
            ];

            $member = $memberModel->create($memberData);

            if (!$member) {
                $this->error('Failed to add member');
            }

            // Add user information to response
            $member['user'] = [
                'id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'email' => $user['email']
            ];

            // Log the member addition
            $this->logAudit('member_added', 'OrganizationMember', $member['id'], null, $memberData);

            $this->success($member, 'Member added successfully');
        } catch (Exception $e) {
            $this->error('Failed to add member: ' . $e->getMessage(), 500);
        }
    }

    // Get specific member details (admin/subadmin only)
    public function show($params = [])
    {
        $this->requireTenantRole(['admin', 'org_subadmin'], 'Admin or sub-admin access required to view member details');

        try {
            $memberId = $params['id'] ?? null;

            if (!$memberId) {
                $this->error('Member ID is required', 400);
            }

            $memberModel = new OrganizationMember();
            $memberModel->setTenant($this->currentTenantId);
            $member = $memberModel->find($memberId);

            if (!$member) {
                $this->error('Member not found', 404);
            }

            // Add user information
            $userModel = new User();
            $user = $userModel->find($member['user_id']);

            if ($user) {
                $member['user'] = [
                    'id' => $user['id'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'email' => $user['email'],
                    'profile_image_url' => $user['profile_image_url'],
                    'phone_number' => $user['phone_number'],
                    'course' => $user['course'],
                    'year_level' => $user['year_level']
                ];
            }

            // Get attendance summary
            $attendanceSummary = $userModel->getAttendanceSummary($member['user_id'], $this->currentTenantId);
            $member['attendance_summary'] = $attendanceSummary;

            $this->success($member, 'Member details retrieved successfully');
        } catch (Exception $e) {
            $this->error('Failed to get member details: ' . $e->getMessage(), 500);
        }
    }

    // Update member information (admin only)
    public function update($params = [])
    {
        $this->requireTenantRole(['admin'], 'Organization admin access required to update members');

        try {
            $memberId = $params['id'] ?? null;

            if (!$memberId) {
                $this->error('Member ID is required', 400);
            }

            $input = $this->getInput();

            // Get current member
            $memberModel = new OrganizationMember();
            $memberModel->setTenant($this->currentTenantId);
            $currentMember = $memberModel->find($memberId);

            if (!$currentMember) {
                $this->error('Member not found', 404);
            }

            // Don't allow changing the last admin
            if ($currentMember['role'] === 'admin' && isset($input['role']) && $input['role'] !== 'admin') {
                $adminCount = $memberModel->count([
                    'organization_id' => $this->currentTenantId,
                    'role' => 'admin',
                    'status' => 'active'
                ]);

                if ($adminCount <= 1) {
                    $this->error('Cannot change role of the last admin', 400);
                }
            }

            // Validation rules
            $rules = [
                'role' => 'in:admin,org_subadmin,member',
                'status' => 'in:active,inactive',
                'student_id_number' => 'max:50'
            ];

            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Update member
            $updateData = array_filter([
                'role' => $input['role'] ?? null,
                'status' => $input['status'] ?? null,
                'student_id_number' => $input['student_id_number'] ?? null
            ], function ($value) {
                return $value !== null;
            });

            $updatedMember = $memberModel->update($memberId, $updateData);

            if (!$updatedMember) {
                $this->error('Failed to update member');
            }

            // Log the member update
            $this->logAudit(
                'member_updated',
                'OrganizationMember',
                $memberId,
                array_intersect_key($currentMember, $updateData),
                $updateData
            );

            $this->success($updatedMember, 'Member updated successfully');
        } catch (Exception $e) {
            $this->error('Failed to update member: ' . $e->getMessage(), 500);
        }
    }

    // Remove member from organization (admin only)
    public function destroy($params = [])
    {
        $this->requireTenantRole(['admin'], 'Organization admin access required to remove members');

        try {
            $memberId = $params['id'] ?? null;

            if (!$memberId) {
                $this->error('Member ID is required', 400);
            }

            $memberModel = new OrganizationMember();
            $memberModel->setTenant($this->currentTenantId);
            $member = $memberModel->find($memberId);

            if (!$member) {
                $this->error('Member not found', 404);
            }

            // Don't allow removing the last admin
            if ($member['role'] === 'admin') {
                $adminCount = $memberModel->count([
                    'organization_id' => $this->currentTenantId,
                    'role' => 'admin',
                    'status' => 'active'
                ]);

                if ($adminCount <= 1) {
                    $this->error('Cannot remove the last admin', 400);
                }
            }

            // Soft delete the member
            $deleted = $memberModel->delete($memberId);

            if (!$deleted) {
                $this->error('Failed to remove member');
            }

            // Log the member removal
            $this->logAudit('member_removed', 'OrganizationMember', $memberId, $member, null);

            $this->success(null, 'Member removed successfully');
        } catch (Exception $e) {
            $this->error('Failed to remove member: ' . $e->getMessage(), 500);
        }
    }

    // Activate member (admin only)
    public function activate($params = [])
    {
        $this->requireTenantRole(['admin'], 'Organization admin access required to activate members');

        try {
            $memberId = $params['id'] ?? null;

            if (!$memberId) {
                $this->error('Member ID is required', 400);
            }

            $memberModel = new OrganizationMember();
            $memberModel->setTenant($this->currentTenantId);
            $member = $memberModel->find($memberId);

            if (!$member) {
                $this->error('Member not found', 404);
            }

            if ($member['status'] === 'active') {
                $this->error('Member is already active', 400);
            }

            $updatedMember = $memberModel->update($memberId, [
                'status' => 'active',
                'joined_at' => date('Y-m-d H:i:s')
            ]);

            if (!$updatedMember) {
                $this->error('Failed to activate member');
            }

            // Log the member activation
            $this->logAudit(
                'member_activated',
                'OrganizationMember',
                $memberId,
                ['status' => $member['status']],
                ['status' => 'active']
            );

            $this->success($updatedMember, 'Member activated successfully');
        } catch (Exception $e) {
            $this->error('Failed to activate member: ' . $e->getMessage(), 500);
        }
    }

    // Deactivate member (admin only)
    public function deactivate($params = [])
    {
        $this->requireTenantRole(['admin'], 'Organization admin access required to deactivate members');

        try {
            $memberId = $params['id'] ?? null;

            if (!$memberId) {
                $this->error('Member ID is required', 400);
            }

            $memberModel = new OrganizationMember();
            $memberModel->setTenant($this->currentTenantId);
            $member = $memberModel->find($memberId);

            if (!$member) {
                $this->error('Member not found', 404);
            }

            // Don't allow deactivating the last admin
            if ($member['role'] === 'admin') {
                $adminCount = $memberModel->count([
                    'organization_id' => $this->currentTenantId,
                    'role' => 'admin',
                    'status' => 'active'
                ]);

                if ($adminCount <= 1) {
                    $this->error('Cannot deactivate the last admin', 400);
                }
            }

            if ($member['status'] === 'inactive') {
                $this->error('Member is already inactive', 400);
            }

            $updatedMember = $memberModel->update($memberId, [
                'status' => 'inactive',
                'left_at' => date('Y-m-d H:i:s')
            ]);

            if (!$updatedMember) {
                $this->error('Failed to deactivate member');
            }

            // Log the member deactivation
            $this->logAudit(
                'member_deactivated',
                'OrganizationMember',
                $memberId,
                ['status' => $member['status']],
                ['status' => 'inactive']
            );

            $this->success($updatedMember, 'Member deactivated successfully');
        } catch (Exception $e) {
            $this->error('Failed to deactivate member: ' . $e->getMessage(), 500);
        }
    }

    // Invite user to organization (admin only)
    public function invite($params = [])
    {
        $this->requireTenantRole(['admin'], 'Organization admin access required to invite members');

        try {
            $input = $this->getInput();

            // Validation rules
            $rules = [
                'email' => 'required|email'
            ];

            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Check if user exists
            $userModel = new User();
            $user = $userModel->findByEmail($input['email']);

            if (!$user) {
                $this->error('User not found with this email address', 404);
            }

            // Check if user is already a member
            $memberModel = new OrganizationMember();
            $existingMembership = $memberModel->findByUserAndOrganization($user['id'], $this->currentTenantId);

            if ($existingMembership) {
                $this->error('User is already a member of this organization', 400);
            }

            // Create invitation
            $memberData = [
                'organization_id' => $this->currentTenantId,
                'user_id' => $user['id'],
                'role' => 'member',
                'status' => 'invited'
            ];

            $member = $memberModel->create($memberData);

            if (!$member) {
                $this->error('Failed to send invitation');
            }

            // TODO: Send invitation email

            // Log the invitation
            $this->logAudit('member_invited', 'OrganizationMember', $member['id'], null, $memberData);

            $this->success([
                'member' => $member,
                'user' => [
                    'email' => $user['email'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name']
                ],
                'invitation_sent' => true
            ], 'Invitation sent successfully');
        } catch (Exception $e) {
            $this->error('Failed to send invitation: ' . $e->getMessage(), 500);
        }
    }

    // Get member's events (admin/subadmin only)
    public function memberEvents($params = [])
    {
        $this->requireTenantRole(['admin', 'org_subadmin'], 'Admin or sub-admin access required to view member events');

        try {
            $memberId = $params['id'] ?? null;

            if (!$memberId) {
                $this->error('Member ID is required', 400);
            }

            $memberModel = new OrganizationMember();
            $memberModel->setTenant($this->currentTenantId);
            $member = $memberModel->find($memberId);

            if (!$member) {
                $this->error('Member not found', 404);
            }

            // Get member's events
            $userModel = new User();
            $events = $userModel->getUserEventsInOrganization($member['user_id'], $this->currentTenantId);

            $this->success([
                'member_id' => $memberId,
                'user_id' => $member['user_id'],
                'events' => $events
            ], 'Member events retrieved successfully');
        } catch (Exception $e) {
            $this->error('Failed to get member events: ' . $e->getMessage(), 500);
        }
    }

    // Handle join request (public endpoint)
    public function joinRequest($params = [])
    {
        try {
            $organizationId = $params['id'] ?? null;
            $input = $this->getInput();

            if (!$organizationId) {
                $this->error('Organization ID is required', 400);
            }

            // Validation rules
            $rules = [
                'email' => 'required|email',
                'message' => 'max:500'
            ];

            $validation = Validator::make($input, $rules);

            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }

            // Check if organization exists and is active
            $orgModel = new Organization();
            $organization = $orgModel->find($organizationId);

            if (!$organization || $organization['status'] !== 'active') {
                $this->error('Organization not found or inactive', 404);
            }

            // Check if user exists
            $userModel = new User();
            $user = $userModel->findByEmail($input['email']);

            if (!$user) {
                $this->error('User not found with this email address', 404);
            }

            // Check if user is already a member or has pending request
            $memberModel = new OrganizationMember();
            $existingMembership = $memberModel->findByUserAndOrganization($user['id'], $organizationId);

            if ($existingMembership) {
                $status = $existingMembership['status'];
                if ($status === 'active') {
                    $this->error('You are already a member of this organization', 400);
                } elseif ($status === 'invited') {
                    $this->error('You already have a pending request to join this organization', 400);
                }
            }

            // Create join request
            $memberData = [
                'organization_id' => $organizationId,
                'user_id' => $user['id'],
                'role' => 'member',
                'status' => 'invited'
            ];

            $member = $memberModel->create($memberData);

            if (!$member) {
                $this->error('Failed to create join request');
            }

            // Log the join request (without tenant context for public endpoint)
            $auditLog = new AuditLog();
            $auditLog->create([
                'organization_id' => $organizationId,
                'user_id' => $user['id'],
                'action' => 'join_request_created',
                'entity_type' => 'OrganizationMember',
                'entity_id' => $member['id'],
                'new_values' => json_encode($memberData),
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);

            $this->success([
                'request_id' => $member['id'],
                'organization' => $organization['name'],
                'status' => 'invited'
            ], 'Join request submitted successfully');
        } catch (Exception $e) {
            $this->error('Failed to submit join request: ' . $e->getMessage(), 500);
        }
    }
}
