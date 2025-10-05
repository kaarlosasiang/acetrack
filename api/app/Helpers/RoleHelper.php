<?php

/**
 * Role Helper
 * Provides easy role checking utilities for controllers
 */
class RoleHelper
{
    /**
     * Check if user has admin access in any organization
     *
     * @param array $user User data with organizations
     * @return bool
     */
    public static function hasAdminAccess($user)
    {
        require_once APP_PATH . '/Helpers/DashboardRouter.php';
        return DashboardRouter::hasAdminAccess($user);
    }

    /**
     * Check if user has admin access in specific organization
     *
     * @param array $user User data with organizations
     * @param int $organizationId Organization ID to check
     * @return bool
     */
    public static function hasAdminAccessInOrganization($user, $organizationId)
    {
        if (!isset($user['organizations']) || empty($user['organizations'])) {
            return false;
        }

        foreach ($user['organizations'] as $org) {
            if (
                $org['id'] == $organizationId &&
                ($org['role'] === 'admin' || $org['role'] === 'org_subadmin') &&
                $org['membership_status'] === 'active'
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user is a member of specific organization
     *
     * @param array $user User data with organizations
     * @param int $organizationId Organization ID to check
     * @return bool
     */
    public static function isMemberOfOrganization($user, $organizationId)
    {
        if (!isset($user['organizations']) || empty($user['organizations'])) {
            return false;
        }

        foreach ($user['organizations'] as $org) {
            if ($org['id'] == $organizationId && $org['membership_status'] === 'active') {
                return true;
            }
        }

        return false;
    }

    /**
     * Get user's role in specific organization
     *
     * @param array $user User data with organizations
     * @param int $organizationId Organization ID to check
     * @return string|null Role name or null if not a member
     */
    public static function getRoleInOrganization($user, $organizationId)
    {
        if (!isset($user['organizations']) || empty($user['organizations'])) {
            return null;
        }

        foreach ($user['organizations'] as $org) {
            if ($org['id'] == $organizationId && $org['membership_status'] === 'active') {
                return $org['role'];
            }
        }

        return null;
    }

    /**
     * Check if user has required role in current tenant organization
     *
     * @param array $user User data with organizations
     * @param int $tenantId Current tenant/organization ID
     * @param array $requiredRoles Array of required roles
     * @return bool
     */
    public static function hasRoleInTenant($user, $tenantId, $requiredRoles)
    {
        $userRole = self::getRoleInOrganization($user, $tenantId);

        if (!$userRole) {
            return false;
        }

        return in_array($userRole, $requiredRoles);
    }

    /**
     * Check if user is super admin
     *
     * @param array $user User data
     * @return bool
     */
    public static function isSuperAdmin($user)
    {
        return isset($user['is_super_admin']) && $user['is_super_admin'] == 1;
    }

    /**
     * Get all organizations where user has admin privileges
     *
     * @param array $user User data with organizations
     * @return array
     */
    public static function getAdminOrganizations($user)
    {
        require_once APP_PATH . '/Helpers/DashboardRouter.php';
        return DashboardRouter::getAdminOrganizations($user);
    }

    /**
     * Get primary organization for user (preferring admin roles)
     *
     * @param array $user User data with organizations
     * @return array|null
     */
    public static function getPrimaryOrganization($user)
    {
        require_once APP_PATH . '/Helpers/DashboardRouter.php';
        return DashboardRouter::getPrimaryOrganization($user);
    }

    /**
     * Validate access to dashboard type based on user roles
     *
     * @param array $user User data with organizations
     * @param string $dashboardType Required dashboard type
     * @return bool
     */
    public static function canAccessDashboard($user, $dashboardType)
    {
        require_once APP_PATH . '/Helpers/DashboardRouter.php';
        return DashboardRouter::canAccessDashboard($user, $dashboardType);
    }
}
