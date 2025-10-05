"use client";

import { AuthLoading } from "@/components/common/auth-loading";
import { CSRFDebug } from "@/components/debug/csrf-debug";
import { LoginForm } from "@/components/foms/login-form/form";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { useGuestGuard } from "@/lib/hooks/useAuthGuard";
import { useEffect } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  // Redirect to dashboard if user is already authenticated
  const { isLoading } = useGuestGuard();

  useEffect(() => {
    // Check for session expired message
    const sessionExpiredMessage = localStorage.getItem("session_expired_toast");
    if (sessionExpiredMessage) {
      toast.error(sessionExpiredMessage);
      localStorage.removeItem("session_expired_toast");
    }
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="relative flex w-full flex-col items-start justify-start overflow-hidden">
        <BackgroundRippleEffect />
        <div className="min-h-svh w-full bg-background flex flex-col items-center justify-center gap-6 p-6 md:p-10">
          <div className="w-full max-w-sm flex items-center justify-center">
            <AuthLoading message="Redirecting..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col items-start justify-start overflow-hidden">
      <BackgroundRippleEffect />
      <div className="min-h-svh w-full bg-background flex flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
      <CSRFDebug />
    </div>
  );
}
