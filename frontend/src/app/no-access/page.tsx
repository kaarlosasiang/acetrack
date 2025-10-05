"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/contexts/authContext";
import { getDashboardUrl } from "@/lib/utils/dashboardRouter";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NoAccessPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleGoToDashboard = () => {
    if (user) {
      const dashboardUrl = getDashboardUrl(user);
      router.push(dashboardUrl);
    } else {
      router.push("/login");
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            You don&apos;t have permission to access this area.
          </p>

          {user && (
            <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded">
              <p>
                <strong>Current Role:</strong>{" "}
                {user.is_super_admin === 1
                  ? "Super Admin"
                  : user.organizations && user.organizations.length > 0
                    ? user.organizations[0].role
                    : "No organization"}
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button onClick={handleGoToDashboard} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>

            <Button variant="outline" onClick={handleGoBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>

            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                Login as Different User
              </Button>
            </Link>
          </div>

          <div className="text-xs text-gray-400 mt-6">
            If you believe this is an error, please contact your administrator.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
