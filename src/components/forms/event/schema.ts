import { z } from "zod";

/**
 * Event form validation schema
 * Validates the form data before submission to the database
 */
export const eventFormSchema = z.object({
  banner: z
    .string()
    .url({ message: "Banner must be a valid URL." })
    .optional()
    .or(z.literal(""))
    .optional(),
  name: z
    .string()
    .min(2, { message: "Event name must be at least 2 characters." })
    .max(100, { message: "Event name must not exceed 100 characters." }),
  description: z
    .string()
    .max(1000, { message: "Description must not exceed 1000 characters." })
    .optional(),
  location: z
    .string()
    .min(2, { message: "Location must be at least 2 characters." })
    .max(200, { message: "Location must not exceed 200 characters." }),
  status: z
    .number()
    .int()
    .min(0, { message: "Status must be 0 or greater." })
    .max(2, { message: "Status must be 2 or less." }),
  start_datetime: z
    .string()
    .min(1, { message: "Start date/time is required." })
    .refine((date) => new Date(date) > new Date(), {
      message: "Start date must be in the future.",
    }),
  end_datetime: z
    .string()
    .min(1, { message: "End date/time is required." }),
}).refine(
  (data) => {
    if (data.start_datetime && data.end_datetime) {
      return new Date(data.start_datetime) < new Date(data.end_datetime);
    }
    return true;
  },
  {
    message: "End date must be after start date.",
    path: ["end_datetime"],
  }
);

/**
 * Event status validation schema for select components
 */
export const eventStatusSchema = z.enum(["0", "1", "2"], {
  message: "Please select a valid status.",
});

/**
 * File upload validation schema
 */
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size must be less than 10MB.",
    })
    .refine((file) => file.type.startsWith("image/"), {
      message: "File must be an image.",
    })
    .refine(
      (file) => ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type),
      {
        message: "File must be JPEG, PNG, GIF, or WebP format.",
      }
    ),
});
