import { ValidationRequest } from '@/shared/middleware/validation.middleware';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import { NextFunction, Request, Response } from 'express';
import organizationService from './organizationService';

const organizationController = {
  /**
   * Create a new organization
   * POST /api/v1/organizations
   */
  createOrganization: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      const organizationData = req.validatedBody;
      const result = await organizationService.createOrganization(organizationData, userId);

      logger.info(
        `Organization created: ${result.organization._id} with subscription ${result.subscription._id} by user ${userId}`
      );

      res.status(201).json({
        success: true,
        message: 'Organization and subscription created successfully',
        data: {
          organization: result.organization,
          subscription: result.subscription,
        },
      });
    } catch (error) {
      logger.error('Create organization controller error:', error);
      next(error);
    }
  },

  /**
   * Get all organizations with pagination and filtering
   * GET /api/v1/organizations
   */
  getOrganizations: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const queryParams = req.validatedQuery || {};
      const userRole = req.user?.role;

      const result = await organizationService.getOrganizations(queryParams, userRole);

      res.status(200).json({
        success: true,
        message: 'Organizations retrieved successfully',
        data: result.organizations,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get organizations controller error:', error);
      next(error);
    }
  },

  /**
   * Get organization by ID
   * GET /api/v1/organizations/:id
   */
  getOrganizationById: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: organizationId } = req.validatedParams;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      // Check if user can access this organization
      const canAccess = await organizationService.canUserAccessOrganization(userId, organizationId);
      if (!canAccess) {
        throw new AppError('Not authorized to access this organization', 403);
      }

      const organization = await organizationService.getOrganizationById(organizationId);

      res.status(200).json({
        success: true,
        message: 'Organization retrieved successfully',
        data: organization,
      });
    } catch (error) {
      logger.error('Get organization by ID controller error:', error);
      next(error);
    }
  },

  /**
   * Update organization
   * PUT /api/v1/organizations/:id
   */
  updateOrganization: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: organizationId } = req.validatedParams;
      const updateData = req.validatedBody;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      const organization = await organizationService.updateOrganization(
        organizationId,
        updateData,
        userId
      );

      logger.info(`Organization updated: ${organizationId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Organization updated successfully',
        data: organization,
      });
    } catch (error) {
      logger.error('Update organization controller error:', error);
      next(error);
    }
  },

  /**
   * Delete organization (soft delete)
   * DELETE /api/v1/organizations/:id
   */
  deleteOrganization: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: organizationId } = req.validatedParams;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      await organizationService.deleteOrganization(organizationId, userId);

      logger.info(`Organization deleted: ${organizationId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Organization deleted successfully',
      });
    } catch (error) {
      logger.error('Delete organization controller error:', error);
      next(error);
    }
  },

  /**
   * Get current user's organizations
   * GET /api/v1/organizations/my-organizations
   */
  getUserOrganizations: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      const organizations = await organizationService.getUserOrganizations(userId);

      res.status(200).json({
        success: true,
        message: 'User organizations retrieved successfully',
        data: organizations,
      });
    } catch (error) {
      logger.error('Get user organizations controller error:', error);
      next(error);
    }
  },

  /**
   * Get public organizations (for non-authenticated users or public view)
   * GET /api/v1/organizations/public
   */
  getPublicOrganizations: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const queryParams = req.validatedQuery || {};

      // Force status to active for public view
      const publicQuery = {
        ...queryParams,
        status: 'active' as const,
      };

      const result = await organizationService.getOrganizations(publicQuery);

      // Remove sensitive information for public view
      const publicOrganizations = result.organizations.map((org: any) => ({
        _id: org._id,
        name: org.name,
        description: org.description,
        logo: org.logo,
        banner: org.banner,
        website: org.website,
        socialLinks: org.socialLinks,
        memberCount: org.memberCount,
        settings: {
          allowPublicJoin: org.settings?.allowPublicJoin || false,
        },
        createdAt: org.createdAt,
      }));

      res.status(200).json({
        success: true,
        message: 'Public organizations retrieved successfully',
        data: publicOrganizations,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get public organizations controller error:', error);
      next(error);
    }
  },
};

export default organizationController;
