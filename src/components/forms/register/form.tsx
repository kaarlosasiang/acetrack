"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { registerFormSchema, type RegisterFormData } from "./schema";
import { type RegisterData } from "./types";
import { YearLevels } from "@/lib/constants/year-levels";
import courseService from "@/lib/services/CourseService";

interface RegisterFormProps {
  className?: string;
  onSubmit?: (data: RegisterData) => void | Promise<void>;
  isLoading?: boolean;
}

export function RegisterForm({
  className,
  onSubmit,
  isLoading: externalLoading,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<
    { id: number; course_name: string, short:string }[] | undefined
  >();
  // Use external loading state if provided, otherwise use internal state
  const loading = externalLoading ?? isLoading;

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      student_id: "",
    },
  });

  // Function to generate username from first and last name
  const generateUsername = (firstName: string, lastName: string): string => {
    if (!firstName || !lastName) return "";

    // Remove spaces and special characters, convert to lowercase
    const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const cleanLastName = lastName.replace(/[^a-zA-Z]/g, "").toLowerCase();

    return `${cleanFirstName}${cleanLastName}`;
  };

  const handleSubmit = async (data: RegisterFormData) => {
    // Generate username automatically before submitting
    const generatedUsername = generateUsername(data.first_name, data.last_name);
    const dataWithUsername: RegisterData = {
      ...data,
      username: generatedUsername,
    };

    console.log(dataWithUsername);

    if (onSubmit) {
      // Only set internal loading if no external loading is provided
      if (externalLoading === undefined) {
        setIsLoading(true);
      }
      try {
        await onSubmit(dataWithUsername);
      } finally {
        if (externalLoading === undefined) {
          setIsLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      const courses = await courseService.getCourses();
      console.log(courses);

      setCourses(courses);
    };
    fetchCourses();
  }, []);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create Account</CardTitle>
          <CardDescription>
            Register to get started with AceTrack
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
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

              {/* Student ID Field */}
              <FormField
                control={form.control}
                name="student_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your student ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Course and Year Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="course_id"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Course</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="!w-full">
                            <SelectValue placeholder="Select your course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses &&
                            courses.map((course) => (
                              <SelectItem
                                key={course.id}
                                value={course.id.toString()}
                              >
                                {course.short}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year_level"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Year Level</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {YearLevels.map((level) => (
                            <SelectItem
                              key={level.value}
                              value={level.value.toString()}
                            >
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Password Fields */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                size={"lg"}
                className="w-full"
                disabled={loading}
              >
                <span className="font-semibold">
                  {loading ? "Creating Account..." : "Create Account"}
                </span>
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-center text-xs text-balance">
        By creating an account, you agree to our{" "}
        <Link
          href="/terms-and-conditions"
          className="underline underline-offset-4 hover:text-primary"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy-policy"
          className="underline underline-offset-4 hover:text-primary"
        >
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}

export default RegisterForm;
