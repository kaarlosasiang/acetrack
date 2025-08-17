import { z } from "zod";
import { YearLevels } from "@/lib/constants/year-levels";

export const registerSchema = z
  .object({
    first_name: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must not exceed 50 characters")
      .regex(/^[a-zA-Z\s]*$/, "First name can only contain letters and spaces"),

    last_name: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must not exceed 50 characters")
      .regex(/^[a-zA-Z\s]*$/, "Last name can only contain letters and spaces"),

    email: z
      .string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),

    student_id: z
      .string()
      .min(1, "Student ID is required")
      .regex(/^[0-9-]+$/, "Student ID can only contain numbers and hyphens")
      .min(6, "Student ID must be at least 6 characters"),

    course_id: z.number().min(1, "Course is required"),

    year_level: z
      .number()
      .min(1, "Year level is required")
      .refine(
        (value) => YearLevels.some((level) => level.value === value),
        "Please select a valid year level"
      ),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),

    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
