import { User } from "@/lib/services/userService";

export type DashboardType =
  | "super-admin"
  | "org-admin"
  | "member"
  | "no-access";

/**
 * Determines the appropriate dashboard type for a user based on their roles
 */
export const getUserDashboardType = (user: User): DashboardType => {
  // Check if user is super admin (global role)
  if (user.is_super_admin === 1) {
    return "super-admin";
  }

  // Check if user has no organizations
  if (!user.organizations || user.organizations.length === 0) {
    return "no-access";
  }

  // Check for active memberships
  const activeOrgs = user.organizations.filter(
    org => org.membership_status === "active"
  );

  if (activeOrgs.length === 0) {
    return "no-access";
  }

  // Check if user has admin role in any organization
  const hasAdminRole = activeOrgs.some(
    org => org.role === "admin" || org.role === "org_subadmin"
  );

  if (hasAdminRole) {
    return "org-admin";
  }

  // Check if user is a member in any organization
  const hasMemberRole = activeOrgs.some(org => org.role === "member");

  if (hasMemberRole) {
    return "member";
  }

  return "no-access";
};

/**
 * Gets the appropriate dashboard URL based on user's dashboard type
 */
export const getDashboardUrl = (user: User): string => {
  const dashboardType = getUserDashboardType(user);

  switch (dashboardType) {
    case "super-admin":
      return "/dashboard";
    case "org-admin":
      return "/organization-dashboard";
    case "member":
      return "/my-dashboard";
    case "no-access":
    default:
      return "/no-access";
  }
};

/**
 * Gets the user's primary organization (preferring admin roles)
 */
export const getPrimaryOrganization = (user: User) => {
  if (!user.organizations || user.organizations.length === 0) {
    return null;
  }

  // First try to find an admin organization
  const adminOrg = user.organizations.find(
    org =>
      (org.role === "admin" || org.role === "org_subadmin") &&
      org.membership_status === "active"
  );

  if (adminOrg) {
    return adminOrg;
  }

  // Fall back to first active organization
  return (
    user.organizations.find(org => org.membership_status === "active") || null
  );
};

/**
 * Checks if user has admin access to any organization
 */
export const hasAdminAccess = (user: User): boolean => {
  return (
    user.organizations?.some(
      org =>
        (org.role === "admin" || org.role === "org_subadmin") &&
        org.membership_status === "active"
    ) ?? false
  );
};

/**
 * Gets all organizations where user has admin access
 */
export const getAdminOrganizations = (user: User) => {
  return (
    user.organizations?.filter(
      org =>
        (org.role === "admin" || org.role === "org_subadmin") &&
        org.membership_status === "active"
    ) ?? []
  );
};
