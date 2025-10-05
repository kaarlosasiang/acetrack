"use client";

import { useAuth } from "@/lib/contexts/authContext";
import { getDashboardUrl } from "@/lib/utils/dashboardRouter";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StudentDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Role-based access control
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Check if user should be on this dashboard
      const expectedDashboard = getDashboardUrl(user);

      // If user is super admin or org admin, redirect to their appropriate dashboard
      if (expectedDashboard !== "/my-dashboard") {
        router.push(expectedDashboard);
        return;
      }

      // Check if user has any active organization membership
      const hasActiveMembership = user.organizations?.some(
        org => org.membership_status === "active"
      );

      if (!hasActiveMembership) {
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
  if (!user || getDashboardUrl(user) !== "/my-dashboard") {
    return null;
  }

  const primaryOrg = user.organizations?.find(
    org => org.membership_status === "active"
  );

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center sm:text-left">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              MEMBER
            </span>
          </div>
          <p className="text-lg text-gray-600">
            Welcome back, {user.first_name} {user.last_name}!
          </p>
          {primaryOrg && (
            <p className="text-sm text-gray-500">
              {primaryOrg.name} • {primaryOrg.role}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">My Events</h3>
            <p className="text-gray-600">
              View events you&apos;re attending or have attended
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">My QR Code</h3>
            <p className="text-gray-600">
              Access your personal QR code for check-ins
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">Attendance History</h3>
            <p className="text-gray-600">
              Track your event attendance and participation
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">Profile Settings</h3>
            <p className="text-gray-600">
              Update your personal information and preferences
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">Notifications</h3>
            <p className="text-gray-600">
              View announcements and important updates
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-2">Organization Info</h3>
            <p className="text-gray-600">Learn more about your organization</p>
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
