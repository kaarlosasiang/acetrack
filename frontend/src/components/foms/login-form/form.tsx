"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import authService from "@/lib/services/authService";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoginFormSchema, LoginFormSchemaType } from "./schema";
import { LoginFormInterface } from "./types";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInterface>({
    reValidateMode: "onChange",
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormSchemaType) => {
    try {
      const response = await authService.login({
        email: data.email,
        password: data.password,
      });

      if (response.success) {
        toast.success(response.message || "Login successful!");

        // Redirect based on user role or to dashboard
        const user = response.data.user;
        if (user.role === "super_admin") {
          router.push("/super-admin");
        } else if (user.role === "student") {
          router.push("/student");
        } else {
          router.push("/dashboard");
        }
      } else {
        toast.error(response.message || "Login failed");
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        Object.keys(errors).forEach(key => {
          if (errors[key] && errors[key].length > 0) {
            toast.error(`${key}: ${errors[key][0]}`);
          }
        });
      } else {
        toast.error("An error occurred during login. Please try again.");
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form className="z-10" onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex justify-center">
            <Image
              src="/acetrack-icon.png"
              alt="Description"
              width={50}
              height={50}
            />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold">Welcome to AceTrack</h1>
            <FieldDescription>
              Don&apos;t have an account?{" "}
              <a href="/register" className="text-blue-600 hover:underline">
                Sign up
              </a>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              {...register("email")}
            />
            {errors.email && (
              <FieldDescription className="text-red-500 text-xs">
                {errors.email.message}
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="• • • • • • • •"
              {...register("password")}
            />
            {errors.password && (
              <FieldDescription className="text-red-500 text-xs">
                {errors.password.message}
              </FieldDescription>
            )}
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>
          </Field>
          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
