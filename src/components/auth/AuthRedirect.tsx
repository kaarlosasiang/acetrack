"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface AuthRedirectProps {
  children: React.ReactNode;
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Add a timeout for loading state to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
        console.warn('Authentication loading timed out');
      }, 15000); // 15 seconds timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  useEffect(() => {
    // Only proceed if not loading and not already redirecting
    if (!loading && !isRedirecting && user) {
      // User is authenticated, redirect to appropriate dashboard
      setIsRedirecting(true);
      
      const userRoleId = user.role_id;
      
      // Redirect based on role
      if (userRoleId === 0) {
        router.push("/dashboard"); // Admin dashboard
      } else if (userRoleId === 1) {
        router.push("/student-dashboard"); // Student dashboard
      } else {
        // Default redirect for unknown roles
        router.push("/dashboard");
      }
    }
  }, [user, loading, router, isRedirecting]);

  // If loading timed out, show error message and provide refresh option
  if (loadingTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <Image src={"/images/acetrack-icon.png"} alt="AceTrack" width={50} height={50} className="mx-auto" />
          </div>
          <p className="text-gray-600 mb-4">Loading is taking longer than expected...</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading screen
  if (loading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="relative">
          <Image src={"/images/acetrack-icon.png"} alt="Loading..." width={50} height={50} />
          <Image src={"/images/acetrack-icon.png"} alt="Loading..." width={40} height={40} className="absolute top-1 left-1 animate-ping"/>
        </div>
      </div>
    );
  }

  // If user is authenticated, don't render the auth page (will redirect)
  if (user) {
    return null;
  }

  // User is not authenticated, show the auth page
  return <>{children}</>;
}
