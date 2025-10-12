import { ValidationRequest } from '@/shared/middleware/validation.middleware';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import {
  createEventSchema,
  deleteEventSchema,
  eventQuerySchema,
  restoreEventSchema,
  updateEventSchema,
} from '@/shared/validators/event.validator';
import { NextFunction, Request, Response } from 'express';
import eventService from './eventService';

const eventController = {
  /**
   * Create a new event
   * POST /api/events
   */
  createEvent: async (req: ValidationRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const validatedData = createEventSchema.parse(req.body);

      // Check if user is authenticated
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check permissions
      if (!['admin', 'org_admin'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions to create events', 403);
      }

      // Create event
      const event = await eventService.createEvent(validatedData, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event,
      });
    } catch (error) {
      logger.error('Create event controller error:', error);
      next(error);
    }
  },

  /**
   * Get events with pagination and filtering
   * GET /api/events
   */
  getEvents: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters
      const validatedQuery = eventQuerySchema.parse(req.query);

      // Get events
      const result = await eventService.getEvents(validatedQuery, req.user?.role, req.user?.id);

      res.status(200).json({
        success: true,
        message: 'Events retrieved successfully',
        data: result.events,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get events controller error:', error);
      next(error);
    }
  },

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  getEventById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = req.params.id;

      if (!eventId) {
        throw new AppError('Event ID is required', 400);
      }

      // Parse query parameter for including deleted events
      const includeDeleted = req.query.includeDeleted === 'true';

      // Get event
      const event = await eventService.getEventById(
        eventId,
        req.user?.role,
        req.user?.id,
        includeDeleted
      );

      res.status(200).json({
        success: true,
        message: 'Event retrieved successfully',
        data: event,
      });
    } catch (error) {
      logger.error('Get event by ID controller error:', error);
      next(error);
    }
  },

  /**
   * Update event
   * PUT /api/events/:id
   */
  updateEvent: async (req: ValidationRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = req.params.id;

      if (!eventId) {
        throw new AppError('Event ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Validate request body
      const validatedData = updateEventSchema.parse(req.body);

      // Update event
      const event = await eventService.updateEvent(eventId, validatedData, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: event,
      });
    } catch (error) {
      logger.error('Update event controller error:', error);
      next(error);
    }
  },

  /**
   * Delete event
   * DELETE /api/events/:id
   */
  deleteEvent: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = req.params.id;

      if (!eventId) {
        throw new AppError('Event ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Validate query parameters
      const deleteOptions = deleteEventSchema.parse(req.query);

      // Delete event
      await eventService.deleteEvent(eventId, deleteOptions, req.user.id);

      res.status(200).json({
        success: true,
        message: deleteOptions.permanently
          ? 'Event permanently deleted'
          : 'Event deleted successfully',
      });
    } catch (error) {
      logger.error('Delete event controller error:', error);
      next(error);
    }
  },

  /**
   * Restore deleted event (admin only)
   * POST /api/events/restore
   */
  restoreEvent: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Admin only
      if (req.user.role !== 'admin') {
        throw new AppError('Only administrators can restore events', 403);
      }

      // Validate request body
      const validatedData = restoreEventSchema.parse(req.body);

      // Restore event
      const event = await eventService.restoreEvent(validatedData, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Event restored successfully',
        data: event,
      });
    } catch (error) {
      logger.error('Restore event controller error:', error);
      next(error);
    }
  },

  /**
   * Get upcoming events for an organization
   * GET /api/events/upcoming/:organizationId
   */
  getUpcomingEvents: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.params.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400);
      }

      // Parse limit parameter
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

      if (isNaN(limit) || limit < 1 || limit > 20) {
        throw new AppError('Limit must be between 1 and 20', 400);
      }

      // Get upcoming events
      const events = await eventService.getUpcomingEvents(organizationId, limit);

      res.status(200).json({
        success: true,
        message: 'Upcoming events retrieved successfully',
        data: events,
        meta: {
          organizationId,
          limit,
          count: events.length,
        },
      });
    } catch (error) {
      logger.error('Get upcoming events controller error:', error);
      next(error);
    }
  },

  /**
   * Get event statistics
   * GET /api/events/stats
   */
  getEventStats: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Determine organization filter based on user role
      let organizationId: string | undefined;

      if (req.user.role === 'org_admin') {
        // For org admins, only show stats for their organization
        const orgIdParam = req.query.organizationId as string;
        if (orgIdParam) {
          organizationId = orgIdParam;
        }
      } else if (req.user.role === 'admin') {
        // Admins can view stats for any organization or all organizations
        organizationId = req.query.organizationId as string;
      } else {
        throw new AppError('Insufficient permissions to view event statistics', 403);
      }

      // Get event statistics
      const stats = await eventService.getEventStats(organizationId);

      res.status(200).json({
        success: true,
        message: 'Event statistics retrieved successfully',
        data: stats,
        meta: {
          organizationId: organizationId || 'all',
        },
      });
    } catch (error) {
      logger.error('Get event stats controller error:', error);
      next(error);
    }
  },

  /**
   * Update event status
   * PATCH /api/events/:id/status
   */
  updateEventStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = req.params.id;

      if (!eventId) {
        throw new AppError('Event ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check permissions
      if (!['admin', 'org_admin'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions to update event status', 403);
      }

      const { status } = req.body;

      if (!status) {
        throw new AppError('Status is required', 400);
      }

      // Validate status
      const validStatuses = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      }

      // Update event status
      const event = await eventService.updateEventStatus(eventId, status, req.user.id);

      res.status(200).json({
        success: true,
        message: `Event status updated to ${status}`,
        data: event,
      });
    } catch (error) {
      logger.error('Update event status controller error:', error);
      next(error);
    }
  },

  /**
   * Get organization events (for organization admins)
   * GET /api/organizations/:organizationId/events
   */
  getOrganizationEvents: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.params.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Validate query parameters with organizationId override
      const query = { ...req.query, organizationId };
      const validatedQuery = eventQuerySchema.parse(query);

      // Get events
      const result = await eventService.getEvents(validatedQuery, req.user.role, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Organization events retrieved successfully',
        data: result.events,
        pagination: result.pagination,
        meta: {
          organizationId,
        },
      });
    } catch (error) {
      logger.error('Get organization events controller error:', error);
      next(error);
    }
  },

  /**
   * Get public events (no authentication required)
   * GET /api/events/public
   */
  getPublicEvents: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Only show published events for public access
      const query = {
        ...req.query,
        status: 'published' as const,
        includeDeleted: false,
      };
      const validatedQuery = eventQuerySchema.parse(query);

      // Get events without user context (public access)
      const result = await eventService.getEvents(validatedQuery);

      res.status(200).json({
        success: true,
        message: 'Public events retrieved successfully',
        data: result.events,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get public events controller error:', error);
      next(error);
    }
  },
};

export default eventController;
