"use client";

import { useAuth } from "@/lib/contexts/authContext";
import { getDashboardUrl } from "@/lib/utils/dashboardRouter";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Hook for protecting routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function useAuthGuard(options?: { redirectTo?: string }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const redirectTo = options?.redirectTo || "/login";

  useEffect(() => {
    if (isLoading) return; // Wait for auth check to complete

    if (!isAuthenticated) {
      // Save the current path for redirect after login
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== "/login" && currentPath !== "/register") {
        localStorage.setItem("redirect_after_login", currentPath);
      }
      router.push(redirectTo);
      return;
    }
  }, [isAuthenticated, isLoading, user, router, redirectTo]);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
}

/**
 * Hook for protecting routes that require guest access (not authenticated)
 * Redirects to appropriate dashboard if user is already authenticated
 */
export function useGuestGuard(options?: {
  redirectTo?: string;
  shouldPreservePath?: boolean;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const shouldPreservePath = options?.shouldPreservePath ?? true;

  useEffect(() => {
    if (isLoading) return; // Wait for auth check to complete

    if (isAuthenticated && user) {
      // Check if there's a redirect path saved and we want to preserve it
      if (shouldPreservePath) {
        const savedRedirect = localStorage.getItem("redirect_after_login");
        if (savedRedirect) {
          localStorage.removeItem("redirect_after_login");
          router.push(savedRedirect);
          return;
        }
      }

      // Get the appropriate dashboard URL based on user's role
      const dashboardUrl = options?.redirectTo || getDashboardUrl(user);
      router.push(dashboardUrl);
    }
  }, [
    isAuthenticated,
    isLoading,
    user,
    router,
    shouldPreservePath,
    options?.redirectTo,
  ]);

  return {
    isAuthenticated,
    isLoading,
  };
}

/**
 * Hook for role-based access control
 * Note: This hook is deprecated since users don't have global roles.
 * Use organization-specific role checking instead.
 */
export function useRoleGuard(
  allowedRoles: string[],
  redirectTo: string = "/unauthorized"
) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // Since users don't have global roles, redirect to unauthorized
    // This hook should not be used - implement organization-specific role checking instead
    router.push(redirectTo);
  }, [isAuthenticated, isLoading, user, router, redirectTo]);

  return {
    isAuthenticated,
    isLoading,
    user,
    hasAllowedRole: false, // Always false since global roles don't exist
  };
}
