<?php
require_once 'BaseController.php';

/**
 * Access Control Controller
 * Handles access denied scenarios and role-based redirections
 */
class AccessController extends BaseController
{
    /**
     * Handle no-access scenarios
     * Returns appropriate error messages based on user's situation
     */
    public function noAccess($params = [])
    {
        // If user is not authenticated, require login
        if (!$this->currentUser) {
            $this->error('Authentication required. Please log in to continue.', 401);
        }

        try {
            require_once APP_PATH . '/Helpers/DashboardRouter.php';
            require_once APP_PATH . '/Helpers/RoleHelper.php';

            $user = $this->currentUser;
            $dashboardType = DashboardRouter::getUserDashboardType($user);

            // Provide specific guidance based on user's situation
            switch ($dashboardType) {
                case DashboardRouter::DASHBOARD_NO_ACCESS:
                    if (empty($user['organizations'])) {
                        $this->error('No organization membership found. Please join an organization to access the platform.', 403);
                    } else {
                        $this->error('Your organization membership is pending or inactive. Please contact an administrator.', 403);
                    }
                    break;

                case DashboardRouter::DASHBOARD_MEMBER:
                    $this->error('This area is restricted to organization administrators. Contact your admin for access.', 403);
                    break;

                case DashboardRouter::DASHBOARD_ORG_ADMIN:
                    $this->error('This area is restricted to system administrators.', 403);
                    break;

                case DashboardRouter::DASHBOARD_SUPER_ADMIN:
                    $this->error('You already have the highest level of access. Please use the appropriate dashboard.', 400);
                    break;

                default:
                    $this->error('Access denied. Please contact support if you believe this is an error.', 403);
            }
        } catch (Exception $e) {
            $this->error('Unable to verify access permissions: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get user's dashboard information
     * Returns dashboard type and URL for the current user
     */
    public function dashboardInfo($params = [])
    {
        $this->requireAuth();

        try {
            require_once APP_PATH . '/Helpers/DashboardRouter.php';

            $user = $this->currentUser;
            $dashboardType = DashboardRouter::getUserDashboardType($user);
            $dashboardUrl = DashboardRouter::getDashboardUrl($user);
            $primaryOrg = DashboardRouter::getPrimaryOrganization($user);

            $this->success([
                'dashboard_type' => $dashboardType,
                'dashboard_url' => $dashboardUrl,
                'primary_organization' => $primaryOrg,
                'admin_organizations' => DashboardRouter::getAdminOrganizations($user),
                'has_admin_access' => DashboardRouter::hasAdminAccess($user)
            ], 'Dashboard information retrieved successfully');
        } catch (Exception $e) {
            $this->error('Failed to get dashboard information: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Validate access to specific dashboard type
     * Used by frontend to verify user can access a particular dashboard
     */
    public function validateDashboardAccess($params = [])
    {
        $this->requireAuth();

        try {
            $input = $this->getInput();
            $dashboardType = $input['dashboard_type'] ?? null;

            if (!$dashboardType) {
                $this->error('Dashboard type is required', 400);
            }

            require_once APP_PATH . '/Helpers/DashboardRouter.php';

            $user = $this->currentUser;
            $canAccess = DashboardRouter::canAccessDashboard($user, $dashboardType);

            if ($canAccess) {
                $this->success([
                    'can_access' => true,
                    'dashboard_type' => $dashboardType,
                    'user_dashboard_type' => DashboardRouter::getUserDashboardType($user)
                ], 'Access granted');
            } else {
                $this->error('Access denied to ' . $dashboardType . ' dashboard', 403);
            }
        } catch (Exception $e) {
            $this->error('Failed to validate dashboard access: ' . $e->getMessage(), 500);
        }
    }
}
