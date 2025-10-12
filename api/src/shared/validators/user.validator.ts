import { z } from 'zod';

// User validation schemas
export const createUserSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  phone: z.string().optional(),
  course: z
    .string()
    .min(1, 'Course is required')
    .max(100, 'Course must be less than 100 characters'),
  year: z.number().int().min(1, 'Year must be at least 1').max(6, 'Year must be at most 6'),
  profilePicture: z.string().url().optional(),
  role: z.enum(['admin', 'org_admin', 'member']).default('member'),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  course: z.string().min(1).max(100).optional(),
  year: z.number().int().min(1).max(6).optional(),
  profilePicture: z.string().url().optional(),
});

export const userQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  role: z.enum(['admin', 'org_admin', 'member']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  course: z.string().optional(),
  year: z.string().transform(Number).pipe(z.number().int().min(1).max(6)).optional(),
});

// Types derived from schemas
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
