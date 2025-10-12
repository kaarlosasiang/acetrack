import { ValidationRequest } from '@/shared/middleware/validation.middleware';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import {
  createSubscriptionSchema,
  subscriptionQuerySchema,
  updateSubscriptionSchema,
  verifySubscriptionSchema,
} from '@/shared/validators/subscription.validator';
import { NextFunction, Request, Response } from 'express';
import subscriptionService from './subscriptionService';

const subscriptionController = {
  /**
   * Create a new subscription
   * POST /api/subscriptions
   */
  createSubscription: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const validatedData = createSubscriptionSchema.parse(req.body);

      // Check if user is org admin or admin
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      if (!['admin', 'org_admin'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions to create subscriptions', 403);
      }

      // Create subscription
      const subscription = await subscriptionService.createSubscription(validatedData, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription,
      });
    } catch (error) {
      logger.error('Create subscription controller error:', error);
      next(error);
    }
  },

  /**
   * Get subscriptions with pagination and filtering
   * GET /api/subscriptions
   */
  getSubscriptions: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters
      const validatedQuery = subscriptionQuerySchema.parse(req.query);

      // Get subscriptions
      const result = await subscriptionService.getSubscriptions(
        validatedQuery,
        req.user?.role,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        message: 'Subscriptions retrieved successfully',
        data: result.subscriptions,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get subscriptions controller error:', error);
      next(error);
    }
  },

  /**
   * Get subscription by ID
   * GET /api/subscriptions/:id
   */
  getSubscriptionById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new AppError('Subscription ID is required', 400);
      }

      // Get subscription
      const subscription = await subscriptionService.getSubscriptionById(
        subscriptionId,
        req.user?.role,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        message: 'Subscription retrieved successfully',
        data: subscription,
      });
    } catch (error) {
      logger.error('Get subscription by ID controller error:', error);
      next(error);
    }
  },

  /**
   * Update subscription
   * PUT /api/subscriptions/:id
   */
  updateSubscription: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new AppError('Subscription ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Validate request body
      const validatedData = updateSubscriptionSchema.parse(req.body);

      // Update subscription
      const subscription = await subscriptionService.updateSubscription(
        subscriptionId,
        validatedData,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        data: subscription,
      });
    } catch (error) {
      logger.error('Update subscription controller error:', error);
      next(error);
    }
  },

  /**
   * Verify subscription (admin only)
   * POST /api/subscriptions/:id/verify
   */
  verifySubscription: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new AppError('Subscription ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Admin only
      if (req.user.role !== 'admin') {
        throw new AppError('Only administrators can verify subscriptions', 403);
      }

      // Validate request body
      const validatedData = verifySubscriptionSchema.parse({
        ...req.body,
        subscriptionId,
      });

      // Verify subscription
      const subscription = await subscriptionService.verifySubscription(validatedData, req.user.id);

      res.status(200).json({
        success: true,
        message: `Subscription ${validatedData.verified ? 'approved' : 'rejected'} successfully`,
        data: subscription,
      });
    } catch (error) {
      logger.error('Verify subscription controller error:', error);
      next(error);
    }
  },

  /**
   * Cancel subscription
   * DELETE /api/subscriptions/:id
   */
  cancelSubscription: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subscriptionId = req.params.id;

      if (!subscriptionId) {
        throw new AppError('Subscription ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Cancel subscription
      await subscriptionService.cancelSubscription(subscriptionId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully',
      });
    } catch (error) {
      logger.error('Cancel subscription controller error:', error);
      next(error);
    }
  },

  /**
   * Get expiring subscriptions (admin only)
   * GET /api/subscriptions/expiring
   */
  getExpiringSubscriptions: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Admin only
      if (req.user.role !== 'admin') {
        throw new AppError('Only administrators can view expiring subscriptions', 403);
      }

      // Get days parameter (default 30)
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

      if (isNaN(days) || days < 1 || days > 365) {
        throw new AppError('Days parameter must be between 1 and 365', 400);
      }

      // Get expiring subscriptions
      const subscriptions = await subscriptionService.getExpiringSubscriptions(days);

      res.status(200).json({
        success: true,
        message: 'Expiring subscriptions retrieved successfully',
        data: subscriptions,
        meta: {
          days,
          count: subscriptions.length,
        },
      });
    } catch (error) {
      logger.error('Get expiring subscriptions controller error:', error);
      next(error);
    }
  },

  /**
   * Get organization's current subscription
   * GET /api/organizations/:organizationId/subscription
   */
  getOrganizationSubscription: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.params.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check permissions (admin or org admin of the specific organization)
      if (req.user.role !== 'admin' && req.user.role !== 'org_admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      // Get organization subscription
      const subscription = await subscriptionService.getOrganizationSubscription(organizationId);

      if (!subscription) {
        res.status(200).json({
          success: true,
          message: 'No active subscription found for this organization',
          data: null,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Organization subscription retrieved successfully',
        data: subscription,
      });
    } catch (error) {
      logger.error('Get organization subscription controller error:', error);
      next(error);
    }
  },

  /**
   * Get subscription statistics (admin only)
   * GET /api/subscriptions/stats
   */
  getSubscriptionStats: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Admin only
      if (req.user.role !== 'admin') {
        throw new AppError('Only administrators can view subscription statistics', 403);
      }

      // This could be expanded to provide comprehensive stats
      // For now, let's get basic counts and expiring subscriptions
      const expiringSubscriptions = await subscriptionService.getExpiringSubscriptions(30);

      // Get all subscriptions for basic stats
      const allSubscriptions = await subscriptionService.getSubscriptions(
        { page: 1, limit: 1000 }, // Get a large number to calculate stats
        req.user.role,
        req.user.id
      );

      const stats = {
        total: allSubscriptions.pagination.total,
        active: allSubscriptions.subscriptions.filter(s => s.status === 'active').length,
        pending: allSubscriptions.subscriptions.filter(s => s.status === 'pending').length,
        cancelled: allSubscriptions.subscriptions.filter(s => s.status === 'cancelled').length,
        expired: allSubscriptions.subscriptions.filter(s => s.status === 'expired').length,
        expiringSoon: expiringSubscriptions.length,
        planTypes: {
          sixMonths: allSubscriptions.subscriptions.filter(s => s.duration === '6months').length,
          oneYear: allSubscriptions.subscriptions.filter(s => s.duration === '1year').length,
          twoYears: allSubscriptions.subscriptions.filter(s => s.duration === '2years').length,
        },
      };

      res.status(200).json({
        success: true,
        message: 'Subscription statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      logger.error('Get subscription stats controller error:', error);
      next(error);
    }
  },
};

export default subscriptionController;
