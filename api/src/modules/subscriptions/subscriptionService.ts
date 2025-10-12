import { Organization } from '@/models/Organization';
import { Subscription } from '@/models/Subscription';
import { User } from '@/models/User';
import { ISubscription } from '@/shared/interfaces/ISubscription';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import {
  CreateSubscriptionInput,
  SubscriptionQueryInput,
  UpdateSubscriptionInput,
  VerifySubscriptionInput,
} from '@/shared/validators/subscription.validator';
import { Types } from 'mongoose';

export interface SubscriptionResponse {
  subscriptions: ISubscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SubscriptionWithDetails extends ISubscription {
  organizationName?: string;
  verifiedByName?: string;
}

const subscriptionService = {
  /**
   * Calculate end date based on start date and duration
   */
  calculateEndDate: (startDate: Date, duration: '6months' | '1year' | '2years'): Date => {
    const endDate = new Date(startDate);

    switch (duration) {
      case '6months':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case '1year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case '2years':
        endDate.setFullYear(endDate.getFullYear() + 2);
        break;
    }

    return endDate;
  },

  /**
   * Create a new subscription
   */
  createSubscription: async (
    subscriptionData: CreateSubscriptionInput,
    createdBy: string
  ): Promise<ISubscription> => {
    try {
      // Verify organization exists
      const organization = await Organization.findById(subscriptionData.organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Check if organization already has an active subscription
      const existingSubscription = await Subscription.findOne({
        organizationId: subscriptionData.organizationId,
        status: { $in: ['active', 'pending'] },
      });

      if (existingSubscription) {
        throw new AppError('Organization already has an active or pending subscription', 400);
      }

      // Auto-calculate end date if not provided
      let endDate = subscriptionData.endDate;
      if (!endDate) {
        endDate = subscriptionService.calculateEndDate(
          new Date(subscriptionData.startDate),
          subscriptionData.duration
        );
      }

      // Create subscription
      const subscription = new Subscription({
        ...subscriptionData,
        organizationId: new Types.ObjectId(subscriptionData.organizationId),
        endDate,
        status: 'pending', // Always start as pending until verified
      });

      await subscription.save();

      logger.info(
        `Subscription created: ${subscription._id} for organization ${subscriptionData.organizationId}`
      );

      return subscription;
    } catch (error) {
      logger.error('Create subscription service error:', error);
      throw error;
    }
  },

  /**
   * Get subscriptions with pagination and filtering
   */
  getSubscriptions: async (
    query: SubscriptionQueryInput,
    userRole?: string,
    userId?: string
  ): Promise<SubscriptionResponse> => {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter: any = {};

      // Apply organization filter if provided
      if (query.organizationId) {
        filter.organizationId = new Types.ObjectId(query.organizationId);
      }

      // Apply duration filter
      if (query.duration) {
        filter.duration = query.duration;
      }

      // Apply status filter
      if (query.status) {
        filter.status = query.status;
      }

      // Handle expiring subscriptions filter
      if (query.expiring) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        filter.status = 'active';
        filter.startDate = { $lte: now };
        filter.endDate = { $gte: now, $lte: thirtyDaysFromNow };
      }

      // Role-based access control
      if (userRole !== 'admin') {
        // Non-admin users can only see their organization's subscriptions
        if (!query.organizationId && userId) {
          // Get user's organization
          const user = await User.findById(userId);
          if (user && user.role === 'org_admin') {
            const organization = await Organization.findOne({ adminUserId: userId });
            if (organization) {
              filter.organizationId = organization._id;
            } else {
              // User has no organization, return empty result
              return {
                subscriptions: [],
                pagination: { page, limit, total: 0, pages: 0 },
              };
            }
          } else {
            throw new AppError('Insufficient permissions to view subscriptions', 403);
          }
        }
      }

      // Get total count for pagination
      const total = await Subscription.countDocuments(filter);

      // Get subscriptions with organization and verifier details
      const subscriptions = await Subscription.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'organizations',
            localField: 'organizationId',
            foreignField: '_id',
            as: 'organization',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'verifiedBy',
            foreignField: '_id',
            as: 'verifier',
          },
        },
        {
          $addFields: {
            organizationName: { $arrayElemAt: ['$organization.name', 0] },
            verifiedByName: {
              $concat: [
                { $arrayElemAt: ['$verifier.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$verifier.lastName', 0] },
              ],
            },
          },
        },
        { $project: { organization: 0, verifier: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      const pages = Math.ceil(total / limit);

      return {
        subscriptions,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error('Get subscriptions service error:', error);
      throw error;
    }
  },

  /**
   * Get subscription by ID
   */
  getSubscriptionById: async (
    subscriptionId: string,
    userRole?: string,
    userId?: string
  ): Promise<SubscriptionWithDetails> => {
    try {
      const subscription = await Subscription.aggregate([
        { $match: { _id: new Types.ObjectId(subscriptionId) } },
        {
          $lookup: {
            from: 'organizations',
            localField: 'organizationId',
            foreignField: '_id',
            as: 'organization',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'verifiedBy',
            foreignField: '_id',
            as: 'verifier',
          },
        },
        {
          $addFields: {
            organizationName: { $arrayElemAt: ['$organization.name', 0] },
            verifiedByName: {
              $concat: [
                { $arrayElemAt: ['$verifier.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$verifier.lastName', 0] },
              ],
            },
          },
        },
        { $project: { organization: 0, verifier: 0 } },
      ]);

      if (!subscription || subscription.length === 0) {
        throw new AppError('Subscription not found', 404);
      }

      const subscriptionData = subscription[0];

      // Role-based access control
      if (userRole !== 'admin' && userId) {
        const user = await User.findById(userId);
        if (user && user.role === 'org_admin') {
          const organization = await Organization.findOne({ adminUserId: userId });
          if (
            !organization ||
            organization._id.toString() !== subscriptionData.organizationId.toString()
          ) {
            throw new AppError('Insufficient permissions to view this subscription', 403);
          }
        } else {
          throw new AppError('Insufficient permissions to view subscriptions', 403);
        }
      }

      return subscriptionData;
    } catch (error) {
      logger.error('Get subscription by ID service error:', error);
      throw error;
    }
  },

  /**
   * Update subscription
   */
  updateSubscription: async (
    subscriptionId: string,
    updateData: UpdateSubscriptionInput,
    userId: string
  ): Promise<ISubscription> => {
    try {
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      // Check user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isAdmin = user.role === 'admin';
      let isOrgAdmin = false;

      if (user.role === 'org_admin') {
        const organization = await Organization.findOne({ adminUserId: userId });
        isOrgAdmin = !!(
          organization && organization._id.toString() === subscription.organizationId.toString()
        );
      }

      if (!isAdmin && !isOrgAdmin) {
        throw new AppError('Insufficient permissions to update this subscription', 403);
      }

      // Org admins can only update certain fields
      if (isOrgAdmin && !isAdmin) {
        const allowedFields = ['paymentMethod', 'notes'];
        const updateFields = Object.keys(updateData);
        const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));

        if (hasDisallowedFields) {
          throw new AppError('Organization admins can only update payment method and notes', 403);
        }
      }

      // Update subscription
      const updatedSubscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedSubscription) {
        throw new AppError('Failed to update subscription', 500);
      }

      logger.info(`Subscription updated: ${subscriptionId} by user ${userId}`);

      return updatedSubscription;
    } catch (error) {
      logger.error('Update subscription service error:', error);
      throw error;
    }
  },

  /**
   * Verify subscription (admin only)
   */
  verifySubscription: async (
    verifyData: VerifySubscriptionInput,
    verifiedBy: string
  ): Promise<ISubscription> => {
    try {
      const subscription = await Subscription.findById(verifyData.subscriptionId);

      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      // Check if user is admin
      const user = await User.findById(verifiedBy);
      if (!user || user.role !== 'admin') {
        throw new AppError('Only administrators can verify subscriptions', 403);
      }

      const updateData: any = {
        verifiedBy: new Types.ObjectId(verifiedBy),
        verifiedAt: new Date(),
      };

      if (verifyData.verified) {
        updateData.status = 'active';
      } else {
        updateData.status = 'cancelled';
      }

      if (verifyData.notes) {
        updateData.notes = verifyData.notes;
      }

      const updatedSubscription = await Subscription.findByIdAndUpdate(
        verifyData.subscriptionId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedSubscription) {
        throw new AppError('Failed to verify subscription', 500);
      }

      logger.info(
        `Subscription ${verifyData.verified ? 'approved' : 'rejected'}: ${verifyData.subscriptionId} by ${verifiedBy}`
      );

      return updatedSubscription;
    } catch (error) {
      logger.error('Verify subscription service error:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async (subscriptionId: string, userId: string): Promise<void> => {
    try {
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      // Check user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isAdmin = user.role === 'admin';
      let isOrgAdmin = false;

      if (user.role === 'org_admin') {
        const organization = await Organization.findOne({ adminUserId: userId });
        isOrgAdmin = !!(
          organization && organization._id.toString() === subscription.organizationId.toString()
        );
      }

      if (!isAdmin && !isOrgAdmin) {
        throw new AppError('Insufficient permissions to cancel this subscription', 403);
      }

      // Cancel subscription
      await Subscription.findByIdAndUpdate(subscriptionId, { status: 'cancelled' });

      logger.info(`Subscription cancelled: ${subscriptionId} by user ${userId}`);
    } catch (error) {
      logger.error('Cancel subscription service error:', error);
      throw error;
    }
  },

  /**
   * Get expiring subscriptions (admin only)
   */
  getExpiringSubscriptions: async (days: number = 30): Promise<ISubscription[]> => {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const expiringSubscriptions = await Subscription.aggregate([
        {
          $match: {
            status: 'active',
            startDate: { $lte: now },
            endDate: { $gte: now, $lte: futureDate },
          },
        },
        {
          $lookup: {
            from: 'organizations',
            localField: 'organizationId',
            foreignField: '_id',
            as: 'organization',
          },
        },
        {
          $addFields: {
            organizationName: { $arrayElemAt: ['$organization.name', 0] },
            daysRemaining: {
              $ceil: {
                $divide: [{ $subtract: ['$endDate', now] }, 1000 * 60 * 60 * 24],
              },
            },
          },
        },
        { $project: { organization: 0 } },
        { $sort: { endDate: 1 } },
      ]);

      return expiringSubscriptions;
    } catch (error) {
      logger.error('Get expiring subscriptions service error:', error);
      throw error;
    }
  },

  /**
   * Get organization's current subscription
   */
  getOrganizationSubscription: async (organizationId: string): Promise<ISubscription | null> => {
    try {
      const subscription = await Subscription.findOne({
        organizationId: new Types.ObjectId(organizationId),
        status: 'active',
      }).sort({ createdAt: -1 });

      return subscription;
    } catch (error) {
      logger.error('Get organization subscription service error:', error);
      throw error;
    }
  },
};

export default subscriptionService;
