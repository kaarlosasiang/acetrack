"use client";

import { useAuth } from "@/lib/contexts/authContext";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuthGuard();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if user has organization admin privileges or is a super admin
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Super admins can access organization features
      if (user.is_super_admin === 1) {
        return;
      }

      // Check if user has admin or org_subadmin role in any organization
      const hasOrgAdminRole = user.organizations?.some(
        org =>
          (org.role === "admin" || org.role === "org_subadmin") &&
          org.membership_status === "active"
      );

      if (!hasOrgAdminRole) {
        // User doesn't have organization admin privileges
        router.push("/no-access");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading spinner while checking authentication and permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user doesn't have organization admin privileges, show access denied
  if (isAuthenticated && user && user.is_super_admin !== 1) {
    const hasOrgAdminRole = user.organizations?.some(
      org =>
        (org.role === "admin" || org.role === "org_subadmin") &&
        org.membership_status === "active"
    );

    if (!hasOrgAdminRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-4">
              You don&apos;t have permission to access this area.
            </p>
            <p className="text-sm text-gray-500">
              Organization admin privileges required.
            </p>
          </div>
        </div>
      );
    }
  }

  // If user is authenticated and has organization admin privileges, render the content
  return <>{children}</>;
}