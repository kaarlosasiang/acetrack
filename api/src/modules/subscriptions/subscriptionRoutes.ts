import { authMiddleware } from '@/shared/middleware/authMiddleware';
import { validateBody, validateParams } from '@/shared/middleware/validation.middleware';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  verifySubscriptionSchema,
} from '@/shared/validators/subscription.validator';
import { Router } from 'express';
import { z } from 'zod';
import subscriptionController from './subscriptionController';

const router: Router = Router();

// Validation schemas for params
const subscriptionParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid subscription ID'),
});

const organizationParamsSchema = z.object({
  organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID'),
});

// Protected routes (authentication required)
router.use(authMiddleware); // All routes below require authentication

/**
 * @route   POST /api/subscriptions
 * @desc    Create a new subscription
 * @access  Private (org_admin, admin)
 */
router.post('/', validateBody(createSubscriptionSchema), subscriptionController.createSubscription);

/**
 * @route   GET /api/subscriptions
 * @desc    Get subscriptions with pagination and filtering
 * @access  Private (org_admin, admin)
 */
router.get('/', subscriptionController.getSubscriptions);

/**
 * @route   GET /api/subscriptions/stats
 * @desc    Get subscription statistics
 * @access  Private (admin only)
 */
router.get('/stats', subscriptionController.getSubscriptionStats);

/**
 * @route   GET /api/subscriptions/expiring
 * @desc    Get expiring subscriptions
 * @access  Private (admin only)
 */
router.get('/expiring', subscriptionController.getExpiringSubscriptions);

/**
 * @route   GET /api/subscriptions/:id
 * @desc    Get subscription by ID
 * @access  Private (org_admin, admin)
 */
router.get(
  '/:id',
  validateParams(subscriptionParamsSchema),
  subscriptionController.getSubscriptionById
);

/**
 * @route   PUT /api/subscriptions/:id
 * @desc    Update subscription
 * @access  Private (org_admin, admin)
 */
router.put(
  '/:id',
  validateParams(subscriptionParamsSchema),
  validateBody(updateSubscriptionSchema),
  subscriptionController.updateSubscription
);

/**
 * @route   POST /api/subscriptions/:id/verify
 * @desc    Verify subscription (approve/reject)
 * @access  Private (admin only)
 */
router.post(
  '/:id/verify',
  validateParams(subscriptionParamsSchema),
  validateBody(verifySubscriptionSchema),
  subscriptionController.verifySubscription
);

/**
 * @route   DELETE /api/subscriptions/:id
 * @desc    Cancel subscription
 * @access  Private (org_admin, admin)
 */
router.delete(
  '/:id',
  validateParams(subscriptionParamsSchema),
  subscriptionController.cancelSubscription
);

/**
 * @route   GET /api/organizations/:organizationId/subscription
 * @desc    Get organization's current subscription
 * @access  Private (org_admin, admin)
 */
router.get(
  '/organizations/:organizationId/subscription',
  validateParams(organizationParamsSchema),
  subscriptionController.getOrganizationSubscription
);

export default router;
