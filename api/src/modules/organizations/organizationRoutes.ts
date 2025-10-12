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
router.get(
  '/public',
  validateQuery(organizationQuerySchema),
  organizationController.getPublicOrganizations
);

// Protected routes (authentication required)
router.use(authMiddleware); // All routes below require authentication

// User organization routes
router.get('/my-organizations', organizationController.getUserOrganizations);

// Organization CRUD routes
router.post('/', validateBody(createOrganizationSchema), organizationController.createOrganization);

router.get('/', validateQuery(organizationQuerySchema), organizationController.getOrganizations);

router.get(
  '/:id',
  validateParams(organizationParamsSchema),
  organizationController.getOrganizationById
);

router.put(
  '/:id',
  validateParams(organizationParamsSchema),
  validateBody(updateOrganizationSchema),
  organizationController.updateOrganization
);

router.delete(
  '/:id',
  validateParams(organizationParamsSchema),
  organizationController.deleteOrganization
);

export default router;
