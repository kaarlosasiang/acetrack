import { authMiddleware } from '@/shared/middleware/authMiddleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '@/shared/middleware/validation.middleware';
import {
  addMemberSchema,
  approveJoinRequestSchema,
  joinRequestSchema,
  memberQuerySchema,
  updateMemberSchema,
} from '@/shared/validators/organizationMember.validator';
import { Router } from 'express';
import { z } from 'zod';
import organizationMemberController from './organizationMemberController';

const router: Router = Router();

// Validation schemas for params
const memberParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid member ID'),
});

const organizationParamsSchema = z.object({
  organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID'),
});

// Protected routes (authentication required)
router.use(authMiddleware); // All routes below require authentication

/**
 * @route   POST /api/organization-members
 * @desc    Add a member to an organization (direct add by admin/org_admin)
 * @access  Private (org_admin, admin)
 */
router.post('/', validateBody(addMemberSchema), organizationMemberController.addMember);

/**
 * @route   POST /api/organization-members/join-request
 * @desc    Request to join an organization
 * @access  Private (any authenticated user)
 */
router.post(
  '/join-request',
  validateBody(joinRequestSchema),
  organizationMemberController.requestToJoin
);

/**
 * @route   POST /api/organization-members/approve
 * @desc    Approve or reject a join request
 * @access  Private (org_admin, admin)
 */
router.post(
  '/approve',
  validateBody(approveJoinRequestSchema),
  organizationMemberController.approveJoinRequest
);

/**
 * @route   GET /api/organization-members
 * @desc    Get organization members with pagination and filtering
 * @access  Private (org_admin, admin)
 */
router.get('/', validateQuery(memberQuerySchema), organizationMemberController.getMembers);

/**
 * @route   GET /api/organization-members/my-memberships
 * @desc    Get current user's organization memberships
 * @access  Private (any authenticated user)
 */
router.get('/my-memberships', organizationMemberController.getMyMemberships);

/**
 * @route   PUT /api/organization-members/:id
 * @desc    Update member role or status
 * @access  Private (org_admin, admin)
 */
router.put(
  '/:id',
  validateParams(memberParamsSchema),
  validateBody(updateMemberSchema),
  organizationMemberController.updateMember
);

/**
 * @route   DELETE /api/organization-members/:id
 * @desc    Remove member from organization
 * @access  Private (org_admin, admin)
 */
router.delete(
  '/:id',
  validateParams(memberParamsSchema),
  organizationMemberController.removeMember
);

/**
 * @route   GET /api/organizations/:organizationId/members
 * @desc    Get members for a specific organization
 * @access  Private (member, org_admin, admin)
 */
router.get(
  '/organizations/:organizationId/members',
  validateParams(organizationParamsSchema),
  validateQuery(memberQuerySchema),
  organizationMemberController.getOrganizationMembers
);

/**
 * @route   GET /api/organizations/:organizationId/join-requests
 * @desc    Get pending join requests for an organization
 * @access  Private (org_admin, admin)
 */
router.get(
  '/organizations/:organizationId/join-requests',
  validateParams(organizationParamsSchema),
  validateQuery(memberQuerySchema),
  organizationMemberController.getPendingJoinRequests
);

export default router;
