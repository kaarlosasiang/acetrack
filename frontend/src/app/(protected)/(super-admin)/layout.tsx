"use client";

import { useAuth } from "@/lib/contexts/authContext";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuthGuard();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if user has super admin privileges
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.is_super_admin !== 1) {
        // User is not a super admin, redirect to their appropriate dashboard
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

  // If user is not a super admin, show access denied
  if (isAuthenticated && user && user.is_super_admin !== 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access this area.
          </p>
          <p className="text-sm text-gray-500">
            Super admin privileges required.
          </p>
        </div>
      </div>
    );
  }

  // If user is authenticated and is a super admin, render the content
  return <>{children}</>;
}