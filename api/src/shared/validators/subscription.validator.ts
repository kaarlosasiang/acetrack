import { z } from 'zod';

// Subscription validation schemas
export const createSubscriptionSchema = z
  .object({
    organizationId: z.string().min(1, 'Organization ID is required'),
    duration: z.enum(['6months', '1year', '2years']),
    startDate: z.string().datetime('Invalid start date format').or(z.date()),
    endDate: z.string().datetime('Invalid end date format').or(z.date()).optional(), // Optional - will auto-calculate if not provided
    paymentAmount: z.number().min(0, 'Payment amount must be non-negative'),
    paymentMethod: z.string().max(50, 'Payment method must be less than 50 characters').optional(),
    autoRenewal: z.boolean().default(false),
    notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  })
  .refine(
    data => {
      // Only validate if both dates are provided
      if (data.endDate) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        return endDate > startDate;
      }
      return true; // Skip validation if endDate is not provided (will be auto-calculated)
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export const updateSubscriptionSchema = z
  .object({
    duration: z.enum(['6months', '1year', '2years']).optional(),
    startDate: z.string().datetime().or(z.date()).optional(),
    endDate: z.string().datetime().or(z.date()).optional(),
    status: z.enum(['active', 'expired', 'cancelled', 'pending']).optional(),
    paymentAmount: z.number().min(0).optional(),
    paymentMethod: z.string().max(50).optional(),
    autoRenewal: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    data => {
      if (data.startDate && data.endDate) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        return endDate > startDate;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export const verifySubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  verified: z.boolean(),
  notes: z.string().max(500).optional(),
});

export const subscriptionQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  organizationId: z.string().optional(),
  duration: z.enum(['6months', '1year', '2years']).optional(),
  status: z.enum(['active', 'expired', 'cancelled', 'pending']).optional(),
  autoRenewal: z.boolean().optional(),
  expiring: z.boolean().optional(), // Filter for subscriptions expiring within 30 days
});

// Types derived from schemas
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type VerifySubscriptionInput = z.infer<typeof verifySubscriptionSchema>;
export type SubscriptionQueryInput = z.infer<typeof subscriptionQuerySchema>;
