import { Organization } from '@/models/Organization';
import { OrganizationMember } from '@/models/OrganizationMember';
import { User } from '@/models/User';
import { IOrganizationMember } from '@/shared/interfaces/IOrganizationMember';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import {
  AddMemberInput,
  ApproveJoinRequestInput,
  JoinRequestInput,
  MemberQueryInput,
  UpdateMemberInput,
} from '@/shared/validators/organizationMember.validator';
import { Types } from 'mongoose';

export interface MemberResponse {
  members: IOrganizationMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MemberWithDetails extends IOrganizationMember {
  userName?: string;
  userEmail?: string;
  organizationName?: string;
}

const organizationMemberService = {
  /**
   * Add a member to an organization (direct add by admin)
   */
  addMember: async (memberData: AddMemberInput, addedBy: string): Promise<IOrganizationMember> => {
    try {
      // Verify organization exists
      const organization = await Organization.findById(memberData.organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Verify user exists
      const user = await User.findById(memberData.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if user adding the member has permission
      const addingUser = await User.findById(addedBy);
      if (!addingUser) {
        throw new AppError('Adding user not found', 404);
      }

      // Permission check: admin or org_admin of the organization
      if (addingUser.role !== 'admin') {
        if (addingUser.role === 'org_admin') {
          const adminOrg = await Organization.findOne({ adminUserId: addedBy });
          if (!adminOrg || adminOrg._id.toString() !== memberData.organizationId) {
            throw new AppError('Insufficient permissions to add members to this organization', 403);
          }
        } else {
          throw new AppError('Insufficient permissions to add members', 403);
        }
      }

      // Check if user is already a member
      const existingMember = await OrganizationMember.findOne({
        organizationId: memberData.organizationId,
        userId: memberData.userId,
      });

      if (existingMember) {
        throw new AppError('User is already a member of this organization', 400);
      }

      // Create organization member
      const organizationMember = new OrganizationMember({
        organizationId: new Types.ObjectId(memberData.organizationId),
        userId: new Types.ObjectId(memberData.userId),
        role: memberData.role || 'member',
        status: 'active', // Direct add is immediately active
        joinDate: new Date(),
        notes: memberData.notes,
      });

      await organizationMember.save();

      // Update user role if they're becoming org_admin and weren't already
      if (memberData.role === 'org_admin' && user.role === 'member') {
        await User.findByIdAndUpdate(memberData.userId, { role: 'org_admin' });
      }

      logger.info(
        `Member added: ${memberData.userId} to organization ${memberData.organizationId} by ${addedBy}`
      );

      return organizationMember;
    } catch (error) {
      logger.error('Add member service error:', error);
      throw error;
    }
  },

  /**
   * Request to join an organization
   */
  requestToJoin: async (
    joinData: JoinRequestInput,
    userId: string
  ): Promise<IOrganizationMember> => {
    try {
      // Verify organization exists
      const organization = await Organization.findById(joinData.organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if user is already a member
      const existingMember = await OrganizationMember.findOne({
        organizationId: joinData.organizationId,
        userId: userId,
      });

      if (existingMember) {
        if (existingMember.status === 'pending') {
          throw new AppError('Join request already pending', 400);
        } else {
          throw new AppError('User is already a member of this organization', 400);
        }
      }

      // Check organization settings
      if (!organization.settings?.allowPublicJoin) {
        throw new AppError('This organization does not allow public join requests', 403);
      }

      // Create join request
      const joinRequest = new OrganizationMember({
        organizationId: new Types.ObjectId(joinData.organizationId),
        userId: new Types.ObjectId(userId),
        role: 'member', // Default role for join requests
        status: organization.settings?.requireApproval ? 'pending' : 'active',
        joinDate: new Date(),
        notes: joinData.message,
      });

      await joinRequest.save();

      logger.info(`Join request created: ${userId} for organization ${joinData.organizationId}`);

      return joinRequest;
    } catch (error) {
      logger.error('Request to join service error:', error);
      throw error;
    }
  },

  /**
   * Approve or reject a join request
   */
  approveJoinRequest: async (
    approvalData: ApproveJoinRequestInput,
    approvedBy: string
  ): Promise<IOrganizationMember> => {
    try {
      // Find the member record
      const member = await OrganizationMember.findById(approvalData.membershipId);
      if (!member) {
        throw new AppError('Member request not found', 404);
      }

      if (member.status !== 'pending') {
        throw new AppError('Member request is not pending approval', 400);
      }

      // Check if user approving has permission
      const approvingUser = await User.findById(approvedBy);
      if (!approvingUser) {
        throw new AppError('Approving user not found', 404);
      }

      // Permission check: admin or org_admin of the organization
      if (approvingUser.role !== 'admin') {
        if (approvingUser.role === 'org_admin') {
          const adminOrg = await Organization.findOne({ adminUserId: approvedBy });
          if (!adminOrg || adminOrg._id.toString() !== member.organizationId.toString()) {
            throw new AppError(
              'Insufficient permissions to approve members for this organization',
              403
            );
          }
        } else {
          throw new AppError('Insufficient permissions to approve members', 403);
        }
      }

      // Update member status
      const updateData: any = {
        status: approvalData.action === 'approve' ? 'active' : 'inactive',
      };

      if (approvalData.action === 'approve') {
        updateData.role = approvalData.role || 'member';
        if (approvalData.rejectionReason) {
          updateData.rejectionReason = approvalData.rejectionReason;
        }
      } else {
        // If rejected, we might want to remove the record entirely
        await OrganizationMember.findByIdAndDelete(approvalData.membershipId);
        logger.info(
          `Join request rejected and removed: ${approvalData.membershipId} by ${approvedBy}`
        );
        return member; // Return the original member data before deletion
      }

      const updatedMember = await OrganizationMember.findByIdAndUpdate(
        approvalData.membershipId,
        updateData,
        { new: true }
      );

      if (!updatedMember) {
        throw new AppError('Failed to update member status', 500);
      }

      // Update user role if they're becoming org_admin
      if (approvalData.action === 'approve' && approvalData.role === 'org_admin') {
        await User.findByIdAndUpdate(member.userId, { role: 'org_admin' });
      }

      logger.info(
        `Join request ${approvalData.action === 'approve' ? 'approved' : 'rejected'}: ${approvalData.membershipId} by ${approvedBy}`
      );

      return updatedMember;
    } catch (error) {
      logger.error('Approve join request service error:', error);
      throw error;
    }
  },

  /**
   * Get organization members
   */
  getMembers: async (
    query: MemberQueryInput,
    userRole?: string,
    userId?: string
  ): Promise<MemberResponse> => {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter: any = {};

      if (query.organizationId) {
        filter.organizationId = new Types.ObjectId(query.organizationId);
      }

      if (query.role) {
        filter.role = query.role;
      }

      if (query.status) {
        filter.status = query.status;
      }

      // Role-based access control
      if (userRole !== 'admin') {
        if (userRole === 'org_admin' && userId) {
          // Org admin can only see their organization's members
          const organization = await Organization.findOne({ adminUserId: userId });
          if (organization) {
            filter.organizationId = organization._id;
          } else {
            return {
              members: [],
              pagination: { page, limit, total: 0, pages: 0 },
            };
          }
        } else {
          throw new AppError('Insufficient permissions to view members', 403);
        }
      }

      // Get total count
      const total = await OrganizationMember.countDocuments(filter);

      // Build aggregation pipeline
      const pipeline: any[] = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
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
            userName: {
              $concat: [
                { $arrayElemAt: ['$user.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$user.lastName', 0] },
              ],
            },
            userEmail: { $arrayElemAt: ['$user.email', 0] },
            organizationName: { $arrayElemAt: ['$organization.name', 0] },
          },
        },
        { $project: { user: 0, organization: 0 } },
      ];

      // Add search if provided
      if (query.search) {
        pipeline.splice(1, 0, {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userForSearch',
          },
        });
        pipeline.push({
          $match: {
            $or: [
              { 'userForSearch.firstName': { $regex: query.search, $options: 'i' } },
              { 'userForSearch.lastName': { $regex: query.search, $options: 'i' } },
              { 'userForSearch.email': { $regex: query.search, $options: 'i' } },
            ],
          },
        });
      }

      pipeline.push({ $sort: { joinDate: -1 } }, { $skip: skip }, { $limit: limit });

      const members = await OrganizationMember.aggregate(pipeline);

      const pages = Math.ceil(total / limit);

      return {
        members,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error('Get members service error:', error);
      throw error;
    }
  },

  /**
   * Update member role or status
   */
  updateMember: async (
    memberId: string,
    updateData: UpdateMemberInput,
    updatedBy: string
  ): Promise<IOrganizationMember> => {
    try {
      const member = await OrganizationMember.findById(memberId);
      if (!member) {
        throw new AppError('Member not found', 404);
      }

      // Check permissions
      const updatingUser = await User.findById(updatedBy);
      if (!updatingUser) {
        throw new AppError('Updating user not found', 404);
      }

      // Permission check: admin or org_admin of the organization
      if (updatingUser.role !== 'admin') {
        if (updatingUser.role === 'org_admin') {
          const adminOrg = await Organization.findOne({ adminUserId: updatedBy });
          if (!adminOrg || adminOrg._id.toString() !== member.organizationId.toString()) {
            throw new AppError(
              'Insufficient permissions to update members in this organization',
              403
            );
          }
        } else {
          throw new AppError('Insufficient permissions to update members', 403);
        }
      }

      // Update member
      const updatedMember = await OrganizationMember.findByIdAndUpdate(
        memberId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedMember) {
        throw new AppError('Failed to update member', 500);
      }

      // Update user role if necessary
      if (updateData.role) {
        const user = await User.findById(member.userId);
        if (user) {
          if (updateData.role === 'org_admin' && user.role === 'member') {
            await User.findByIdAndUpdate(member.userId, { role: 'org_admin' });
          } else if (updateData.role !== 'org_admin' && user.role === 'org_admin') {
            // Check if user is admin of any other organization
            const isAdminElsewhere = await Organization.findOne({
              adminUserId: member.userId,
              _id: { $ne: member.organizationId },
            });
            if (!isAdminElsewhere) {
              await User.findByIdAndUpdate(member.userId, { role: 'member' });
            }
          }
        }
      }

      logger.info(`Member updated: ${memberId} by ${updatedBy}`);

      return updatedMember;
    } catch (error) {
      logger.error('Update member service error:', error);
      throw error;
    }
  },

  /**
   * Remove member from organization
   */
  removeMember: async (memberId: string, removedBy: string): Promise<void> => {
    try {
      const member = await OrganizationMember.findById(memberId);
      if (!member) {
        throw new AppError('Member not found', 404);
      }

      // Check permissions
      const removingUser = await User.findById(removedBy);
      if (!removingUser) {
        throw new AppError('Removing user not found', 404);
      }

      // Permission check: admin or org_admin of the organization
      if (removingUser.role !== 'admin') {
        if (removingUser.role === 'org_admin') {
          const adminOrg = await Organization.findOne({ adminUserId: removedBy });
          if (!adminOrg || adminOrg._id.toString() !== member.organizationId.toString()) {
            throw new AppError(
              'Insufficient permissions to remove members from this organization',
              403
            );
          }
        } else {
          throw new AppError('Insufficient permissions to remove members', 403);
        }
      }

      // Cannot remove the organization admin
      const organization = await Organization.findById(member.organizationId);
      if (organization && organization.adminUserId.toString() === member.userId.toString()) {
        throw new AppError('Cannot remove the organization administrator', 400);
      }

      // Remove member
      await OrganizationMember.findByIdAndDelete(memberId);

      // Update user role if they were org_admin
      const user = await User.findById(member.userId);
      if (user && user.role === 'org_admin') {
        // Check if user is admin of any other organization
        const isAdminElsewhere = await Organization.findOne({
          adminUserId: member.userId,
          _id: { $ne: member.organizationId },
        });
        if (!isAdminElsewhere) {
          await User.findByIdAndUpdate(member.userId, { role: 'member' });
        }
      }

      logger.info(`Member removed: ${memberId} by ${removedBy}`);
    } catch (error) {
      logger.error('Remove member service error:', error);
      throw error;
    }
  },

  /**
   * Get user's organization memberships
   */
  getUserMemberships: async (userId: string): Promise<IOrganizationMember[]> => {
    try {
      const memberships = await OrganizationMember.find({ userId })
        .populate('organizationId', 'name description')
        .sort({ joinDate: -1 });

      return memberships;
    } catch (error) {
      logger.error('Get user memberships service error:', error);
      throw error;
    }
  },
};

export default organizationMemberService;
