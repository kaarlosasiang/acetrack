"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: number[]; // Array of role IDs that can access this route
  redirectTo?: string; // Optional custom redirect path
}

export function RoleProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo 
}: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // User not logged in, redirect to login
        router.push("/login");
        return;
      }

      const userRoleId = user.role_id;
      
      if (!allowedRoles.includes(userRoleId)) {
        // User doesn't have permission for this route
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          // Default redirect based on role
          if (userRoleId === 0) {
            router.push("/dashboard"); // Admin dashboard
          } else if (userRoleId === 1) {
            router.push("/student-dashboard"); // Student dashboard
          } else {
            router.push("/login"); // Unknown role, go to login
          }
        }
      }
    }
  }, [user, loading, router, allowedRoles, redirectTo]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Image src={"/images/acetrack-icon.png"} alt="Loading..." width={50} height={50} />
        <Image src={"/images/acetrack-icon.png"} alt="Loading..." width={40} height={40} className="absolute animate-ping"/>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const userRoleId = user.role_id;
  if (!allowedRoles.includes(userRoleId)) {
    return null; // Will redirect based on role
  }

  return <>{children}</>;
}
