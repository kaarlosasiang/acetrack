import { z } from 'zod';

// Organization Member validation schemas
export const addMemberSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['org_admin', 'member', 'officer']).default('member'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export const updateMemberSchema = z.object({
  role: z.enum(['org_admin', 'member', 'officer']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  notes: z.string().max(500).optional(),
});

export const memberQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  organizationId: z.string().optional(),
  role: z.enum(['org_admin', 'member', 'officer']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  search: z.string().optional(),
});

export const joinRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
});

export const approveJoinRequestSchema = z.object({
  membershipId: z.string().min(1, 'Membership ID is required'),
  action: z.enum(['approve', 'reject']),
  role: z.enum(['org_admin', 'member', 'officer']).default('member'),
  rejectionReason: z.string().max(500).optional(),
});

// Types derived from schemas
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberQueryInput = z.infer<typeof memberQuerySchema>;
export type JoinRequestInput = z.infer<typeof joinRequestSchema>;
export type ApproveJoinRequestInput = z.infer<typeof approveJoinRequestSchema>;
