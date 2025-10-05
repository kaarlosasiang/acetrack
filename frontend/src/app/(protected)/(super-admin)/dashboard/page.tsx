"use client";

import { useAuth } from "@/lib/contexts/authContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SuperAdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Additional role check (layout already handles basic auth)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.is_super_admin !== 1) {
        router.push("/no-access");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show nothing if not authorized (will be redirected)
  if (!user || user.is_super_admin !== 1) {
    return null;
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center sm:text-left">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-lg text-gray-600">
            Welcome back, {user.first_name} {user.last_name}!
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">System Overview</h3>
            <p className="text-gray-600">
              Monitor system-wide metrics and performance
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">User Management</h3>
            <p className="text-gray-600">
              Manage all users and their permissions
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">Organizations</h3>
            <p className="text-gray-600">
              Oversee all organizations and subscriptions
            </p>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <p className="text-sm text-gray-500">
          © 2024 AceTrack. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
