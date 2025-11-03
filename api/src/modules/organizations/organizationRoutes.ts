import { authMiddleware } from '@/shared/middleware/authMiddleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '@/shared/middleware/validation.middleware';
import {
  createOrganizationSchema,
  organizationQuerySchema,
  updateOrganizationSchema,
} from '@/shared/validators/organization.validator';
import { Router } from 'express';
import { z } from 'zod';
import organizationController from './organizationController';

const router: Router = Router();

// Validation schemas for params
const organizationParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID'),
});

// Public routes (no authentication required)
/**
 * @route   GET /api/v1/organizations/public
 * @desc    Get public organizations
 * @access  Public
 */
router.get(
  '/public',
  validateQuery(organizationQuerySchema),
  organizationController.getPublicOrganizations
);

// Protected routes (authentication required)
router.use(authMiddleware); // All routes below require authentication

// User organization routes
/**
 * @route   GET /api/v1/organizations/my-organizations
 * @desc    Get organizations where current user is a member
 * @access  Private
 */
router.get('/my-organizations', organizationController.getUserOrganizations);

// Organization CRUD routes
/**
 * @route   POST /api/v1/organizations
 * @desc    Create a new organization
 * @access  Private (admin, org_admin)
 */
router.post('/', validateBody(createOrganizationSchema), organizationController.createOrganization);

/**
 * @route   GET /api/v1/organizations
 * @desc    Get all organizations with pagination
 * @access  Private
 */
router.get('/', validateQuery(organizationQuerySchema), organizationController.getOrganizations);

/**
 * @route   GET /api/v1/organizations/:id
 * @desc    Get organization by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(organizationParamsSchema),
  organizationController.getOrganizationById
);

/**
 * @route   PUT /api/v1/organizations/:id
 * @desc    Update organization
 * @access  Private (admin, org_admin)
 */
router.put(
  '/:id',
  validateParams(organizationParamsSchema),
  validateBody(updateOrganizationSchema),
  organizationController.updateOrganization
);

/**
 * @route   DELETE /api/v1/organizations/:id
 * @desc    Delete organization (soft delete)
 * @access  Private (admin only)
 */
router.delete(
  '/:id',
  validateParams(organizationParamsSchema),
  organizationController.deleteOrganization
);

export default router;
