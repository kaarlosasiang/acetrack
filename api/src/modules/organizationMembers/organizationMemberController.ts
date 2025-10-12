import { ValidationRequest } from '@/shared/middleware/validation.middleware';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import {
  addMemberSchema,
  approveJoinRequestSchema,
  joinRequestSchema,
  memberQuerySchema,
  updateMemberSchema,
} from '@/shared/validators/organizationMember.validator';
import { NextFunction, Request, Response } from 'express';
import organizationMemberService from './organizationMemberService';

const organizationMemberController = {
  /**
   * Add a member to an organization
   * POST /api/organization-members
   */
  addMember: async (req: ValidationRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check permissions
      if (!['admin', 'org_admin'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions to add members', 403);
      }

      // Validate request body
      const validatedData = addMemberSchema.parse(req.body);

      // Add member
      const member = await organizationMemberService.addMember(validatedData, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: member,
      });
    } catch (error) {
      logger.error('Add member controller error:', error);
      next(error);
    }
  },

  /**
   * Request to join an organization
   * POST /api/organization-members/join-request
   */
  requestToJoin: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Validate request body
      const validatedData = joinRequestSchema.parse(req.body);

      // Create join request
      const joinRequest = await organizationMemberService.requestToJoin(validatedData, req.user.id);

      const message =
        joinRequest.status === 'pending'
          ? 'Join request submitted and is pending approval'
          : 'Successfully joined organization';

      res.status(201).json({
        success: true,
        message,
        data: joinRequest,
      });
    } catch (error) {
      logger.error('Request to join controller error:', error);
      next(error);
    }
  },

  /**
   * Approve or reject a join request
   * POST /api/organization-members/approve
   */
  approveJoinRequest: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check permissions
      if (!['admin', 'org_admin'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions to approve join requests', 403);
      }

      // Validate request body
      const validatedData = approveJoinRequestSchema.parse(req.body);

      // Approve/reject join request
      const member = await organizationMemberService.approveJoinRequest(validatedData, req.user.id);

      res.status(200).json({
        success: true,
        message: `Join request ${validatedData.action === 'approve' ? 'approved' : 'rejected'} successfully`,
        data: member,
      });
    } catch (error) {
      logger.error('Approve join request controller error:', error);
      next(error);
    }
  },

  /**
   * Get organization members
   * GET /api/organization-members
   */
  getMembers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Validate query parameters
      const validatedQuery = memberQuerySchema.parse(req.query);

      // Get members
      const result = await organizationMemberService.getMembers(
        validatedQuery,
        req.user.role,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Members retrieved successfully',
        data: result.members,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get members controller error:', error);
      next(error);
    }
  },

  /**
   * Update member role or status
   * PUT /api/organization-members/:id
   */
  updateMember: async (
    req: ValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const memberId = req.params.id;

      if (!memberId) {
        throw new AppError('Member ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check permissions
      if (!['admin', 'org_admin'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions to update members', 403);
      }

      // Validate request body
      const validatedData = updateMemberSchema.parse(req.body);

      // Update member
      const member = await organizationMemberService.updateMember(
        memberId,
        validatedData,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Member updated successfully',
        data: member,
      });
    } catch (error) {
      logger.error('Update member controller error:', error);
      next(error);
    }
  },

  /**
   * Remove member from organization
   * DELETE /api/organization-members/:id
   */
  removeMember: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const memberId = req.params.id;

      if (!memberId) {
        throw new AppError('Member ID is required', 400);
      }

      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check permissions
      if (!['admin', 'org_admin'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions to remove members', 403);
      }

      // Remove member
      await organizationMemberService.removeMember(memberId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      logger.error('Remove member controller error:', error);
      next(error);
    }
  },

  /**
   * Get user's organization memberships
   * GET /api/organization-members/my-memberships
   */
  getMyMemberships: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Get user's memberships
      const memberships = await organizationMemberService.getUserMemberships(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Memberships retrieved successfully',
        data: memberships,
        meta: {
          count: memberships.length,
        },
      });
    } catch (error) {
      logger.error('Get my memberships controller error:', error);
      next(error);
    }
  },

  /**
   * Get members for a specific organization
   * GET /api/organizations/:organizationId/members
   */
  getOrganizationMembers: async (
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

      // Validate query parameters with organizationId override
      const query = { ...req.query, organizationId };
      const validatedQuery = memberQuerySchema.parse(query);

      // Get members
      const result = await organizationMemberService.getMembers(
        validatedQuery,
        req.user.role,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Organization members retrieved successfully',
        data: result.members,
        pagination: result.pagination,
        meta: {
          organizationId,
        },
      });
    } catch (error) {
      logger.error('Get organization members controller error:', error);
      next(error);
    }
  },

  /**
   * Get pending join requests for an organization
   * GET /api/organizations/:organizationId/join-requests
   */
  getPendingJoinRequests: async (
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

      // Check permissions
      if (!['admin', 'org_admin'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions to view join requests', 403);
      }

      // Get pending join requests
      const query = {
        organizationId,
        status: 'pending' as const,
        ...req.query,
      };
      const validatedQuery = memberQuerySchema.parse(query);

      const result = await organizationMemberService.getMembers(
        validatedQuery,
        req.user.role,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Pending join requests retrieved successfully',
        data: result.members,
        pagination: result.pagination,
        meta: {
          organizationId,
          status: 'pending',
        },
      });
    } catch (error) {
      logger.error('Get pending join requests controller error:', error);
      next(error);
    }
  },
};

export default organizationMemberController;
