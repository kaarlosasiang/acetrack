"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/components/forms/register/form";
import { RegisterFormData } from "@/components/forms/register/schema";
import authService from "@/lib/services/AuthService";
import courseService from "@/lib/services/CourseService";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    
    try {
      // Step 1: Get course ID from course value
      const courseId = await courseService.getCourseIdByValue(data.course);
      if (!courseId) {
        toast.error("Invalid course selected. Please try again.");
        return;
      }

      // Step 2: Create Supabase auth user
      const authResult = await authService.register(data.email, data.password, {
        student_id: data.studentId,
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        course_id: courseId,
        year_id: data.yearLevel,
        role_id: 1, // Default to student role
      });

      if (!authResult.user) {
        toast.error("Failed to create account. Please try again.");
        return;
      }

      // Step 3: Create user profile in database
      await authService.createUserProfile({
        student_id: data.studentId,
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        course_id: courseId,
        year_id: data.yearLevel,
        role_id: 1, // Default to student role
      });

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
