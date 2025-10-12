import { Organization } from '@/models/Organization';
import { OrganizationMember } from '@/models/OrganizationMember';
import { Subscription } from '@/models/Subscription';
import { User } from '@/models/User';
import { IOrganization } from '@/shared/interfaces/IOrganization';
import { ISubscription } from '@/shared/interfaces/ISubscription';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import {
  CreateOrganizationInput,
  OrganizationQueryInput,
  UpdateOrganizationInput,
} from '@/shared/validators/organization.validator';
import { Types } from 'mongoose';

export interface OrganizationResponse {
  organizations: IOrganization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OrganizationWithMemberCount extends IOrganization {
  memberCount: number;
}

export interface CreateOrganizationResult {
  organization: IOrganization;
  subscription: ISubscription;
}

const organizationService = {
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
   * Create a new organization with subscription
   */
  createOrganization: async (
    organizationData: CreateOrganizationInput,
    adminUserId: string
  ): Promise<CreateOrganizationResult> => {
    try {
      // Check if user exists and is active
      const user = await User.findById(adminUserId);
      if (!user || user.status !== 'active') {
        throw new AppError('User not found or inactive', 404);
      }

      // Check if user already has an organization as admin
      const existingOrg = await Organization.findOne({ adminUserId });
      if (existingOrg) {
        throw new AppError('User already owns an organization', 400);
      }

      // Check if organization name already exists
      const nameExists = await Organization.findOne({
        name: { $regex: new RegExp(`^${organizationData.name}$`, 'i') },
      });
      if (nameExists) {
        throw new AppError('Organization name already exists', 400);
      }

      // Extract subscription data
      const { subscription: subscriptionData, ...orgData } = organizationData;

      // Create organization with default settings
      const organization = new Organization({
        ...orgData,
        adminUserId: new Types.ObjectId(adminUserId),
        status: 'active',
        settings: {
          allowPublicJoin: false,
          requireApproval: true,
          maxMembers: undefined,
          ...orgData.settings,
        },
      });

      await organization.save();

      // Create subscription for the organization
      const startDate = subscriptionData.startDate
        ? new Date(subscriptionData.startDate)
        : new Date();
      const endDate = organizationService.calculateEndDate(startDate, subscriptionData.duration);

      const subscription = new Subscription({
        organizationId: organization._id,
        duration: subscriptionData.duration,
        startDate,
        endDate,
        paymentAmount: subscriptionData.paymentAmount,
        paymentMethod: subscriptionData.paymentMethod,
        notes: subscriptionData.notes,
        status: 'pending', // Always start as pending until verified
      });

      await subscription.save();

      // Create organization member record for the admin
      const organizationMember = new OrganizationMember({
        organizationId: organization._id,
        userId: new Types.ObjectId(adminUserId),
        role: 'org_admin',
        status: 'active',
        joinedAt: new Date(),
      });

      await organizationMember.save();

      // Update user role to org_admin
      await User.findByIdAndUpdate(adminUserId, { role: 'org_admin' });

      logger.info(
        `Organization created: ${organization.name} with ${subscriptionData.duration} subscription by user ${adminUserId}`
      );

      return {
        organization,
        subscription,
      };
    } catch (error) {
      logger.error('Create organization service error:', error);
      throw error;
    }
  },

  /**
   * Get organizations with pagination and filtering
   */
  getOrganizations: async (
    query: OrganizationQueryInput,
    userRole?: string
  ): Promise<OrganizationResponse> => {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter: any = {};

      // Only admins can see all organizations, others see only active ones
      if (userRole !== 'admin') {
        filter.status = 'active';
      } else if (query.status) {
        filter.status = query.status;
      }

      // Add search functionality
      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } },
        ];
      }

      // Get total count for pagination
      const total = await Organization.countDocuments(filter);

      // Get organizations with member count
      const organizations = await Organization.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'organizationmembers',
            localField: '_id',
            foreignField: 'organizationId',
            as: 'members',
          },
        },
        {
          $addFields: {
            memberCount: {
              $size: {
                $filter: {
                  input: '$members',
                  cond: { $eq: ['$$this.status', 'active'] },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'adminUserId',
            foreignField: '_id',
            as: 'admin',
          },
        },
        {
          $addFields: {
            adminName: {
              $concat: [
                { $arrayElemAt: ['$admin.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$admin.lastName', 0] },
              ],
            },
          },
        },
        { $project: { members: 0, admin: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      const pages = Math.ceil(total / limit);

      return {
        organizations,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error('Get organizations service error:', error);
      throw error;
    }
  },

  /**
   * Get organization by ID
   */
  getOrganizationById: async (organizationId: string): Promise<OrganizationWithMemberCount> => {
    try {
      const organization = await Organization.aggregate([
        { $match: { _id: new Types.ObjectId(organizationId) } },
        {
          $lookup: {
            from: 'organizationmembers',
            localField: '_id',
            foreignField: 'organizationId',
            as: 'members',
          },
        },
        {
          $addFields: {
            memberCount: {
              $size: {
                $filter: {
                  input: '$members',
                  cond: { $eq: ['$$this.status', 'active'] },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'adminUserId',
            foreignField: '_id',
            as: 'admin',
          },
        },
        {
          $addFields: {
            adminName: {
              $concat: [
                { $arrayElemAt: ['$admin.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$admin.lastName', 0] },
              ],
            },
            adminEmail: { $arrayElemAt: ['$admin.email', 0] },
          },
        },
        { $project: { members: 0, admin: 0 } },
      ]);

      if (!organization || organization.length === 0) {
        throw new AppError('Organization not found', 404);
      }

      return organization[0];
    } catch (error) {
      logger.error('Get organization by ID service error:', error);
      throw error;
    }
  },

  /**
   * Update organization
   */
  updateOrganization: async (
    organizationId: string,
    updateData: UpdateOrganizationInput,
    userId: string
  ): Promise<IOrganization> => {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Check if user is admin or org admin
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isOrgAdmin = organization.adminUserId.toString() === userId;
      const isSystemAdmin = user.role === 'admin';

      if (!isOrgAdmin && !isSystemAdmin) {
        throw new AppError('Not authorized to update this organization', 403);
      }

      // Check name uniqueness if name is being updated
      if (updateData.name && updateData.name !== organization.name) {
        const nameExists = await Organization.findOne({
          name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
          _id: { $ne: organizationId },
        });
        if (nameExists) {
          throw new AppError('Organization name already exists', 400);
        }
      }

      // Update organization
      const updatedOrganization = await Organization.findByIdAndUpdate(
        organizationId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedOrganization) {
        throw new AppError('Failed to update organization', 500);
      }

      logger.info(`Organization updated: ${organizationId} by user ${userId}`);

      return updatedOrganization;
    } catch (error) {
      logger.error('Update organization service error:', error);
      throw error;
    }
  },

  /**
   * Delete organization (soft delete by setting status to inactive)
   */
  deleteOrganization: async (organizationId: string, userId: string): Promise<void> => {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Check if user is admin or org admin
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isOrgAdmin = organization.adminUserId.toString() === userId;
      const isSystemAdmin = user.role === 'admin';

      if (!isOrgAdmin && !isSystemAdmin) {
        throw new AppError('Not authorized to delete this organization', 403);
      }

      // Soft delete by setting status to inactive
      await Organization.findByIdAndUpdate(organizationId, { status: 'inactive' });

      // Set all organization members to inactive
      await OrganizationMember.updateMany({ organizationId }, { status: 'inactive' });

      // If org admin is deleting their own organization, revert their role to member
      if (isOrgAdmin) {
        await User.findByIdAndUpdate(userId, { role: 'member' });
      }

      logger.info(`Organization deleted: ${organizationId} by user ${userId}`);
    } catch (error) {
      logger.error('Delete organization service error:', error);
      throw error;
    }
  },

  /**
   * Get organizations where user is a member
   */
  getUserOrganizations: async (userId: string): Promise<IOrganization[]> => {
    try {
      const organizations = await Organization.aggregate([
        {
          $lookup: {
            from: 'organizationmembers',
            localField: '_id',
            foreignField: 'organizationId',
            as: 'membership',
          },
        },
        {
          $match: {
            'membership.userId': new Types.ObjectId(userId),
            'membership.status': 'active',
            status: 'active',
          },
        },
        {
          $addFields: {
            memberCount: {
              $size: {
                $filter: {
                  input: '$membership',
                  cond: { $eq: ['$$this.status', 'active'] },
                },
              },
            },
            userRole: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$membership',
                    cond: { $eq: ['$$this.userId', new Types.ObjectId(userId)] },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $addFields: {
            userRole: '$userRole.role',
          },
        },
        { $project: { membership: 0 } },
        { $sort: { createdAt: -1 } },
      ]);

      return organizations;
    } catch (error) {
      logger.error('Get user organizations service error:', error);
      throw error;
    }
  },

  /**
   * Check if user can access organization
   */
  canUserAccessOrganization: async (userId: string, organizationId: string): Promise<boolean> => {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // System admin can access all organizations
      if (user.role === 'admin') return true;

      // Check if user is member of the organization
      const membership = await OrganizationMember.findOne({
        userId: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
        status: 'active',
      });

      return !!membership;
    } catch (error) {
      logger.error('Check user access service error:', error);
      return false;
    }
  },
};

export default organizationService;

export interface OrganizationResponse {
  organizations: IOrganization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OrganizationWithMemberCount extends IOrganization {
  memberCount: number;
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  public async createOrganization(
    organizationData: CreateOrganizationInput,
    adminUserId: string
  ): Promise<IOrganization> {
    try {
      // Check if user exists and is active
      const user = await User.findById(adminUserId);
      if (!user || user.status !== 'active') {
        throw new AppError('User not found or inactive', 404);
      }

      // Check if user already has an organization as admin
      const existingOrg = await Organization.findOne({ adminUserId });
      if (existingOrg) {
        throw new AppError('User already owns an organization', 400);
      }

      // Check if organization name already exists
      const nameExists = await Organization.findOne({
        name: { $regex: new RegExp(`^${organizationData.name}$`, 'i') },
      });
      if (nameExists) {
        throw new AppError('Organization name already exists', 400);
      }

      // Create organization with default settings
      const organization = new Organization({
        ...organizationData,
        adminUserId: new Types.ObjectId(adminUserId),
        status: 'active',
        settings: {
          allowPublicJoin: false,
          requireApproval: true,
          maxMembers: undefined,
          ...organizationData.settings,
        },
      });

      await organization.save();

      // Create organization member record for the admin
      const organizationMember = new OrganizationMember({
        organizationId: organization._id,
        userId: new Types.ObjectId(adminUserId),
        role: 'org_admin',
        status: 'active',
        joinedAt: new Date(),
      });

      await organizationMember.save();

      // Update user role to org_admin
      await User.findByIdAndUpdate(adminUserId, { role: 'org_admin' });

      logger.info(`Organization created: ${organization.name} by user ${adminUserId}`);

      return organization;
    } catch (error) {
      logger.error('Create organization service error:', error);
      throw error;
    }
  }

  /**
   * Get organizations with pagination and filtering
   */
  public async getOrganizations(
    query: OrganizationQueryInput,
    userRole?: string
  ): Promise<OrganizationResponse> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter: any = {};

      // Only admins can see all organizations, others see only active ones
      if (userRole !== 'admin') {
        filter.status = 'active';
      } else if (query.status) {
        filter.status = query.status;
      }

      // Add search functionality
      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } },
        ];
      }

      // Get total count for pagination
      const total = await Organization.countDocuments(filter);

      // Get organizations with member count
      const organizations = await Organization.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'organizationmembers',
            localField: '_id',
            foreignField: 'organizationId',
            as: 'members',
          },
        },
        {
          $addFields: {
            memberCount: {
              $size: {
                $filter: {
                  input: '$members',
                  cond: { $eq: ['$$this.status', 'active'] },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'adminUserId',
            foreignField: '_id',
            as: 'admin',
          },
        },
        {
          $addFields: {
            adminName: {
              $concat: [
                { $arrayElemAt: ['$admin.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$admin.lastName', 0] },
              ],
            },
          },
        },
        { $project: { members: 0, admin: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      const pages = Math.ceil(total / limit);

      return {
        organizations,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error('Get organizations service error:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  public async getOrganizationById(organizationId: string): Promise<OrganizationWithMemberCount> {
    try {
      const organization = await Organization.aggregate([
        { $match: { _id: new Types.ObjectId(organizationId) } },
        {
          $lookup: {
            from: 'organizationmembers',
            localField: '_id',
            foreignField: 'organizationId',
            as: 'members',
          },
        },
        {
          $addFields: {
            memberCount: {
              $size: {
                $filter: {
                  input: '$members',
                  cond: { $eq: ['$$this.status', 'active'] },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'adminUserId',
            foreignField: '_id',
            as: 'admin',
          },
        },
        {
          $addFields: {
            adminName: {
              $concat: [
                { $arrayElemAt: ['$admin.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$admin.lastName', 0] },
              ],
            },
            adminEmail: { $arrayElemAt: ['$admin.email', 0] },
          },
        },
        { $project: { members: 0, admin: 0 } },
      ]);

      if (!organization || organization.length === 0) {
        throw new AppError('Organization not found', 404);
      }

      return organization[0];
    } catch (error) {
      logger.error('Get organization by ID service error:', error);
      throw error;
    }
  }

  /**
   * Update organization
   */
  public async updateOrganization(
    organizationId: string,
    updateData: UpdateOrganizationInput,
    userId: string
  ): Promise<IOrganization> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Check if user is admin or org admin
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isOrgAdmin = organization.adminUserId.toString() === userId;
      const isSystemAdmin = user.role === 'admin';

      if (!isOrgAdmin && !isSystemAdmin) {
        throw new AppError('Not authorized to update this organization', 403);
      }

      // Check name uniqueness if name is being updated
      if (updateData.name && updateData.name !== organization.name) {
        const nameExists = await Organization.findOne({
          name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
          _id: { $ne: organizationId },
        });
        if (nameExists) {
          throw new AppError('Organization name already exists', 400);
        }
      }

      // Update organization
      const updatedOrganization = await Organization.findByIdAndUpdate(
        organizationId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedOrganization) {
        throw new AppError('Failed to update organization', 500);
      }

      logger.info(`Organization updated: ${organizationId} by user ${userId}`);

      return updatedOrganization;
    } catch (error) {
      logger.error('Update organization service error:', error);
      throw error;
    }
  }

  /**
   * Delete organization (soft delete by setting status to inactive)
   */
  public async deleteOrganization(organizationId: string, userId: string): Promise<void> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Check if user is admin or org admin
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isOrgAdmin = organization.adminUserId.toString() === userId;
      const isSystemAdmin = user.role === 'admin';

      if (!isOrgAdmin && !isSystemAdmin) {
        throw new AppError('Not authorized to delete this organization', 403);
      }

      // Soft delete by setting status to inactive
      await Organization.findByIdAndUpdate(organizationId, { status: 'inactive' });

      // Set all organization members to inactive
      await OrganizationMember.updateMany({ organizationId }, { status: 'inactive' });

      // If org admin is deleting their own organization, revert their role to member
      if (isOrgAdmin) {
        await User.findByIdAndUpdate(userId, { role: 'member' });
      }

      logger.info(`Organization deleted: ${organizationId} by user ${userId}`);
    } catch (error) {
      logger.error('Delete organization service error:', error);
      throw error;
    }
  }

  /**
   * Get organizations where user is a member
   */
  public async getUserOrganizations(userId: string): Promise<IOrganization[]> {
    try {
      const organizations = await Organization.aggregate([
        {
          $lookup: {
            from: 'organizationmembers',
            localField: '_id',
            foreignField: 'organizationId',
            as: 'membership',
          },
        },
        {
          $match: {
            'membership.userId': new Types.ObjectId(userId),
            'membership.status': 'active',
            status: 'active',
          },
        },
        {
          $addFields: {
            memberCount: {
              $size: {
                $filter: {
                  input: '$membership',
                  cond: { $eq: ['$$this.status', 'active'] },
                },
              },
            },
            userRole: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$membership',
                    cond: { $eq: ['$$this.userId', new Types.ObjectId(userId)] },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $addFields: {
            userRole: '$userRole.role',
          },
        },
        { $project: { membership: 0 } },
        { $sort: { createdAt: -1 } },
      ]);

      return organizations;
    } catch (error) {
      logger.error('Get user organizations service error:', error);
      throw error;
    }
  }

  /**
   * Check if user can access organization
   */
  public async canUserAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // System admin can access all organizations
      if (user.role === 'admin') return true;

      // Check if user is member of the organization
      const membership = await OrganizationMember.findOne({
        userId: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
        status: 'active',
      });

      return !!membership;
    } catch (error) {
      logger.error('Check user access service error:', error);
      return false;
    }
  }
}
