<?php

/**
 * Dashboard Router Helper
 * Determines appropriate dashboard routing based on user roles
 * This mirrors the frontend dashboardRouter.ts functionality
 */
class DashboardRouter
{
    /**
     * Dashboard types that match frontend DashboardType
     */
    const DASHBOARD_SUPER_ADMIN = 'super-admin';
    const DASHBOARD_ORG_ADMIN = 'org-admin';
    const DASHBOARD_MEMBER = 'member';
    const DASHBOARD_NO_ACCESS = 'no-access';

    /**
     * Determines the appropriate dashboard type for a user based on their roles
     *
     * @param array $user User data with organizations
     * @return string Dashboard type
     */
    public static function getUserDashboardType($user)
    {
        // Check if user is super admin (global role)
        if (isset($user['is_super_admin']) && $user['is_super_admin'] == 1) {
            return self::DASHBOARD_SUPER_ADMIN;
        }

        // Check if user has no organizations
        if (!isset($user['organizations']) || empty($user['organizations'])) {
            return self::DASHBOARD_NO_ACCESS;
        }

        // Check for active memberships
        $activeOrgs = array_filter($user['organizations'], function ($org) {
            return $org['membership_status'] === 'active';
        });

        if (empty($activeOrgs)) {
            return self::DASHBOARD_NO_ACCESS;
        }

        // Check if user has admin role in any organization
        $hasAdminRole = false;
        foreach ($activeOrgs as $org) {
            if ($org['role'] === 'admin' || $org['role'] === 'org_subadmin') {
                $hasAdminRole = true;
                break;
            }
        }

        if ($hasAdminRole) {
            return self::DASHBOARD_ORG_ADMIN;
        }

        // Check if user is a member in any organization
        $hasMemberRole = false;
        foreach ($activeOrgs as $org) {
            if ($org['role'] === 'member') {
                $hasMemberRole = true;
                break;
            }
        }

        if ($hasMemberRole) {
            return self::DASHBOARD_MEMBER;
        }

        return self::DASHBOARD_NO_ACCESS;
    }

    /**
     * Gets the appropriate dashboard URL based on user's dashboard type
     *
     * @param array $user User data with organizations
     * @return string Dashboard URL
     */
    public static function getDashboardUrl($user)
    {
        $dashboardType = self::getUserDashboardType($user);

        switch ($dashboardType) {
            case self::DASHBOARD_SUPER_ADMIN:
                return '/dashboard';
            case self::DASHBOARD_ORG_ADMIN:
                return '/organization-dashboard';
            case self::DASHBOARD_MEMBER:
                return '/my-dashboard';
            case self::DASHBOARD_NO_ACCESS:
            default:
                return '/no-access';
        }
    }

    /**
     * Gets the user's primary organization (preferring admin roles)
     *
     * @param array $user User data with organizations
     * @return array|null Primary organization or null
     */
    public static function getPrimaryOrganization($user)
    {
        if (!isset($user['organizations']) || empty($user['organizations'])) {
            return null;
        }

        // First try to find an admin organization
        foreach ($user['organizations'] as $org) {
            if (($org['role'] === 'admin' || $org['role'] === 'org_subadmin') &&
                $org['membership_status'] === 'active'
            ) {
                return $org;
            }
        }

        // Fall back to first active organization
        foreach ($user['organizations'] as $org) {
            if ($org['membership_status'] === 'active') {
                return $org;
            }
        }

        return null;
    }

    /**
     * Checks if user has admin access to any organization
     *
     * @param array $user User data with organizations
     * @return bool True if user has admin access
     */
    public static function hasAdminAccess($user)
    {
        if (!isset($user['organizations']) || empty($user['organizations'])) {
            return false;
        }

        foreach ($user['organizations'] as $org) {
            if (($org['role'] === 'admin' || $org['role'] === 'org_subadmin') &&
                $org['membership_status'] === 'active'
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Gets all organizations where user has admin access
     *
     * @param array $user User data with organizations
     * @return array Array of admin organizations
     */
    public static function getAdminOrganizations($user)
    {
        if (!isset($user['organizations']) || empty($user['organizations'])) {
            return [];
        }

        return array_filter($user['organizations'], function ($org) {
            return ($org['role'] === 'admin' || $org['role'] === 'org_subadmin') &&
                $org['membership_status'] === 'active';
        });
    }

    /**
     * Validates if user can access a specific dashboard type
     *
     * @param array $user User data with organizations
     * @param string $requiredDashboardType Required dashboard type
     * @return bool True if user can access the dashboard
     */
    public static function canAccessDashboard($user, $requiredDashboardType)
    {
        $userDashboardType = self::getUserDashboardType($user);

        // Super admin can access everything except member-only dashboards
        if ($userDashboardType === self::DASHBOARD_SUPER_ADMIN) {
            return $requiredDashboardType !== self::DASHBOARD_MEMBER;
        }

        // Org admins can access org-admin and member dashboards
        if ($userDashboardType === self::DASHBOARD_ORG_ADMIN) {
            return in_array($requiredDashboardType, [
                self::DASHBOARD_ORG_ADMIN,
                self::DASHBOARD_MEMBER
            ]);
        }

        // Members can only access member dashboard
        if ($userDashboardType === self::DASHBOARD_MEMBER) {
            return $requiredDashboardType === self::DASHBOARD_MEMBER;
        }

        // No access users can't access any dashboard
        return false;
    }
}
