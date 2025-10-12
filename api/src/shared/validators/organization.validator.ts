import { z } from 'zod';

// Organization validation schemas
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  contactEmail: z.string().email('Invalid email format').optional(),
  contactPhone: z.string().optional(),
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  website: z.string().url('Invalid website URL').optional(),
  settings: z
    .object({
      allowPublicJoin: z.boolean().default(false),
      requireApproval: z.boolean().default(true),
      maxMembers: z.number().int().min(1).optional(),
    })
    .optional(),
  // Subscription information
  subscription: z.object({
    duration: z.enum(['6months', '1year', '2years']),
    startDate: z.string().datetime('Invalid start date format').or(z.date()).optional(),
    paymentAmount: z.number().min(0, 'Payment amount must be non-negative'),
    paymentMethod: z.string().max(50, 'Payment method must be less than 50 characters').optional(),
    notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  }),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().max(200).optional(),
  website: z.string().url().optional(),
  settings: z
    .object({
      allowPublicJoin: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      maxMembers: z.number().int().min(1).optional(),
    })
    .optional(),
});

export const organizationQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
});

// Types derived from schemas
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type OrganizationQueryInput = z.infer<typeof organizationQuerySchema>;
