"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/components/forms/register/form";
import { RegisterFormData } from "@/components/forms/register/schema";
import authService from "@/lib/services/AuthService";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    
    try {
      const authResult = await authService.register(data.email, data.password, {
        student_id: data.student_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        course_id: data.course_id,
        year_level: data.year_level,
        role_id: 1, // Default to student role
      });

      if (!authResult.user) {
        toast.error("Failed to create account. Please try again.");
        return;
      }

      // Success - show message and redirect
      toast.success("Account created successfully! Please check your email to verify your account.");
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (error: unknown) {
      console.error("Registration error:", error);
      
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage?.includes("already registered")) {
        toast.error("An account with this email already exists.");
      } else if (errorMessage?.includes("student_id")) {
        toast.error("This student ID is already registered.");
      } else if (errorMessage?.includes("email")) {
        toast.error("Invalid email address or email already in use.");
      } else if (errorMessage?.includes("password")) {
        toast.error("Password does not meet requirements.");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <Image
            src="/images/acetrack-icon.png"
            alt="AceTrack Icon"
            width={24}
            height={24}
          />
          AceTrack
        </Link>
        <RegisterForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
