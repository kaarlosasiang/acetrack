"use client";

import { ForgotPasswordForm } from "@/components/forms/forgot-password/form";
import { ForgotPasswordFormData } from "@/components/forms/forgot-password/schema";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const handleSubmit = async (data: ForgotPasswordFormData) => {
    console.log("Forgot password data:", data);
    // TODO: Implement forgot password logic
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <Image
            src="/images/acetrack-icon.png"
            alt="AceTrack Icon"
            width={24}
            height={24}
          />
          AceTrack
        </Link>
        <ForgotPasswordForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
