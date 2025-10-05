"use client";

import { CSRFDebug } from "@/components/debug/csrf-debug";
import { LoginForm } from "@/components/foms/login-form/form";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { useEffect } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  useEffect(() => {
    // Check for session expired message
    const sessionExpiredMessage = localStorage.getItem("session_expired_toast");
    if (sessionExpiredMessage) {
      toast.error(sessionExpiredMessage);
      localStorage.removeItem("session_expired_toast");
    }
  }, []);

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
