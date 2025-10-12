"use client";

import { useAuth } from "@/lib/contexts/authContext";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { AppSidebar } from "@/components/common/app-sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuthGuard();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const sidebarData = {
    user: user
      ? {
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          avatar: user.profile_image_url || "https://github.com/shadcn.png", // fallback to app icon
        }
      : {
          name: "Loading...",
          email: "",
          avatar: "/images/acetrack-icon.png",
        },
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        isActive: true,
      },
      {
        title: "Organizations",
        url: "/organizations",
        icon: Building2,
        items: [
          { title: "All Organizations", url: "/organizations/all" },
          {
            title: "Pending Approval",
            url: "/organizations/pending",
          },
          {
            title: "Active Organizations",
            url: "/organizations/active",
          },
          { title: "Suspended", url: "/organizations/suspended" },
        ],
      },
      {
        title: "Users",
        url: "/users",
        icon: Users,
        items: [
          { title: "All Users", url: "/users" },
          { title: "Organization Admins", url: "/users/admins" },
          { title: "Recent Registrations", url: "/users/recent" },
        ],
      },
      {
        title: "Subscriptions",
        url: "/subscriptions",
        icon: CreditCard,
        items: [
          {
            title: "Active Subscriptions",
            url: "/subscriptions/active",
          },
          {
            title: "Pending Verification",
            url: "/subscriptions/pending",
          },
          {
            title: "Revenue Analytics",
            url: "/subscriptions/analytics",
          },
        ],
      },
      {
        title: "Events",
        url: "/super-admin/events",
        icon: Calendar,
        items: [
          { title: "All Events", url: "/super-admin/events" },
          { title: "Event Analytics", url: "/super-admin/events/analytics" },
        ],
      },
      {
        title: "Analytics",
        url: "/super-admin/analytics",
        icon: BarChart3,
        items: [
          { title: "System Overview", url: "/super-admin/analytics/overview" },
          { title: "Usage Statistics", url: "/super-admin/analytics/usage" },
          { title: "Revenue Reports", url: "/super-admin/analytics/revenue" },
        ],
      },
      {
        title: "Settings",
        url: "/super-admin/settings",
        icon: Settings,
        items: [
          { title: "Platform Settings", url: "/super-admin/settings/platform" },
          { title: "Subscription Plans", url: "/super-admin/settings/plans" },
        ],
      },
    ],
  };

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
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
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

  return (
    <SidebarProvider>
      <AppSidebar data={sidebarData} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
