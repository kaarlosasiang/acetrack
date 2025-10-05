"use client";

import { AuthPageLoading } from "@/components/common/auth-loading";
import { useGuestGuard } from "@/lib/hooks/useAuthGuard";

export default function ForgotPasswordPage() {
  // Redirect to dashboard if user is already authenticated
  const { isLoading } = useGuestGuard();

  // Show loading state while checking authentication
  if (isLoading) {
    return <AuthPageLoading message="Redirecting..." />;
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-3xl font-bold">Forgot Password</h1>
        <p className="text-lg text-gray-600">
          Please enter your email to reset your password.
        </p>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <p className="text-sm text-gray-500">
          © 2024 AceTrack. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
