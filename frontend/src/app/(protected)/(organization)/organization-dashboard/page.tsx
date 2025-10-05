"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/contexts/authContext";
import { getDashboardUrl } from "@/lib/utils/dashboardRouter";
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Crown,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrganizationDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [primaryOrg, setPrimaryOrg] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Check if user should be on this dashboard
      const expectedDashboard = getDashboardUrl(user);

      // If this is not their expected dashboard, redirect
      if (expectedDashboard !== "/organization-dashboard") {
        router.push(expectedDashboard);
        return;
      }

      // Super admins can access organization features
      if (user.is_super_admin === 1) {
        // Set a default org or show all orgs for super admin
        if (user.organizations && user.organizations.length > 0) {
          setPrimaryOrg(user.organizations[0]);
        }
        return;
      }

      // Check if user has admin role in any organization
      const hasAdminRole = user.organizations?.some(
        org =>
          (org.role === "admin" || org.role === "org_subadmin") &&
          org.membership_status === "active"
      );

      if (!hasAdminRole) {
        router.push("/no-access");
        return;
      }

      // Find the primary organization (first active admin role)
      if (user.organizations && user.organizations.length > 0) {
        const adminOrg = user.organizations.find(
          org =>
            (org.role === "admin" || org.role === "org_subadmin") &&
            org.membership_status === "active"
        );
        setPrimaryOrg(adminOrg || user.organizations[0]);
      }
    }
  }, [user, isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show nothing if not authorized (will be redirected)
  if (
    !isAuthenticated ||
    !user ||
    getDashboardUrl(user) !== "/organization-dashboard"
  ) {
    return null;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "org_subadmin":
        return "secondary";
      case "member":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "org_subadmin":
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Organization Dashboard
            </h1>
            {user.is_super_admin === 1 ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Super Admin
              </Badge>
            ) : (
              <Badge variant="default" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {primaryOrg?.role === "admin" ? "Admin" : "Sub Admin"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Welcome back, {user.first_name} {user.last_name}
          </p>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg">
                {user.first_name} {user.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <Badge
                variant={user.status === "active" ? "default" : "secondary"}
              >
                {user.status}
              </Badge>
            </div>
            {user.course && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Course
                </p>
                <p className="text-lg">{user.course}</p>
              </div>
            )}
            {user.year_level && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Year Level
                </p>
                <p className="text-lg">{user.year_level}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Organizations
              </p>
              <p className="text-lg">{user.organizations?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Organization Card */}
      {primaryOrg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Primary Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Organization
                </p>
                <p className="text-lg font-semibold">{primaryOrg.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Your Role
                </p>
                <Badge
                  variant={getRoleBadgeVariant(primaryOrg.role)}
                  className="flex items-center gap-1 w-fit"
                >
                  {getRoleIcon(primaryOrg.role)}
                  {primaryOrg.role}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Membership Status
                </p>
                <Badge
                  variant={
                    primaryOrg.membership_status === "active"
                      ? "default"
                      : "secondary"
                  }
                >
                  {primaryOrg.membership_status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Joined
                </p>
                <p className="text-lg">
                  {new Date(primaryOrg.joined_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations List */}
      {user.organizations && user.organizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Organizations ({user.organizations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.organizations.map(org => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{org.name}</h3>
                      <Badge
                        variant={getRoleBadgeVariant(org.role)}
                        className="flex items-center gap-1"
                      >
                        {getRoleIcon(org.role)}
                        {org.role}
                      </Badge>
                      <Badge
                        variant={
                          org.membership_status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {org.membership_status}
                      </Badge>
                    </div>
                    {org.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {org.description}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Joined: {new Date(org.joined_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="flex items-center gap-2 h-20 flex-col"
            >
              <Users className="h-6 w-6" />
              <span>Manage Members</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 h-20 flex-col"
            >
              <Calendar className="h-6 w-6" />
              <span>Events</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 h-20 flex-col"
            >
              <BarChart3 className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 h-20 flex-col"
            >
              <Bell className="h-6 w-6" />
              <span>Notifications</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(
                {
                  userId: user.id,
                  email: user.email,
                  isSuperAdmin: user.is_super_admin,
                  organizationsCount: user.organizations?.length,
                  organizations: user.organizations?.map(org => ({
                    id: org.id,
                    name: org.name,
                    role: org.role,
                    status: org.membership_status,
                  })),
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
