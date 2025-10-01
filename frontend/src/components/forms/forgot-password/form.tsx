"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "./schema";

interface ForgotPasswordFormProps {
  className?: string;
  onSubmit?: (data: ForgotPasswordFormData) => void | Promise<void>;
}

export function ForgotPasswordForm({ className, onSubmit }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsSubmitted(false)}
              >
                Try Again
              </Button>
              <div className="text-center">
                <Link 
                  href="/login" 
                  className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" size={"lg"} className="w-full" disabled={isLoading}>
                <span className="font-semibold">{isLoading ? "Sending Reset Link..." : "Send Reset Link"}</span>
              </Button>

              <div className="text-center">
                <Link 
                  href="/login" 
                  className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="text-muted-foreground text-center text-xs text-balance">
        Remember your password?{" "}
        <Link href="/login" className="underline underline-offset-4 hover:text-primary">
          Sign in here
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordForm;
