import { authMiddleware } from '@/shared/middleware/authMiddleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '@/shared/middleware/validation.middleware';
import {
  createEventSchema,
  deleteEventSchema,
  eventQuerySchema,
  restoreEventSchema,
  updateEventSchema,
} from '@/shared/validators/event.validator';
import { Router } from 'express';
import { z } from 'zod';
import eventController from './eventController';

const router: Router = Router();

// Validation schemas for params
const eventParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid event ID'),
});

const organizationParamsSchema = z.object({
  organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID'),
});

// Public routes (no authentication required)
/**
 * @route   GET /api/events/public
 * @desc    Get public events (published events only)
 * @access  Public
 */
router.get('/public', validateQuery(eventQuerySchema), eventController.getPublicEvents);

// Protected routes (authentication required)
router.use(authMiddleware); // All routes below require authentication

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private (org_admin, admin)
 */
router.post('/', validateBody(createEventSchema), eventController.createEvent);

/**
 * @route   GET /api/events
 * @desc    Get events with pagination and filtering
 * @access  Private (member, org_admin, admin)
 */
router.get('/', validateQuery(eventQuerySchema), eventController.getEvents);

/**
 * @route   GET /api/events/stats
 * @desc    Get event statistics
 * @access  Private (org_admin, admin)
 */
router.get('/stats', eventController.getEventStats);

/**
 * @route   POST /api/events/restore
 * @desc    Restore deleted event
 * @access  Private (admin only)
 */
router.post('/restore', validateBody(restoreEventSchema), eventController.restoreEvent);

/**
 * @route   GET /api/events/upcoming/:organizationId
 * @desc    Get upcoming events for an organization
 * @access  Private (member, org_admin, admin)
 */
router.get(
  '/upcoming/:organizationId',
  validateParams(organizationParamsSchema),
  eventController.getUpcomingEvents
);

/**
 * @route   GET /api/events/:id
 * @desc    Get event by ID
 * @access  Private (member, org_admin, admin)
 */
router.get('/:id', validateParams(eventParamsSchema), eventController.getEventById);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event
 * @access  Private (org_admin, admin, creator)
 */
router.put(
  '/:id',
  validateParams(eventParamsSchema),
  validateBody(updateEventSchema),
  eventController.updateEvent
);

/**
 * @route   PATCH /api/events/:id/status
 * @desc    Update event status
 * @access  Private (org_admin, admin)
 */
router.patch('/:id/status', validateParams(eventParamsSchema), eventController.updateEventStatus);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event (soft delete by default, permanent if ?permanently=true)
 * @access  Private (org_admin, admin, creator)
 */
router.delete(
  '/:id',
  validateParams(eventParamsSchema),
  validateQuery(deleteEventSchema),
  eventController.deleteEvent
);

/**
 * @route   GET /api/organizations/:organizationId/events
 * @desc    Get events for a specific organization
 * @access  Private (member, org_admin, admin)
 */
router.get(
  '/organizations/:organizationId/events',
  validateParams(organizationParamsSchema),
  validateQuery(eventQuerySchema),
  eventController.getOrganizationEvents
);

export default router;
