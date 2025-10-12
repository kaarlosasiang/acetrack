import { Event } from '@/models/Event';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';
import { IEvent } from '@/shared/interfaces/IEvent';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import {
  CreateEventInput,
  DeleteEventInput,
  EventQueryInput,
  RestoreEventInput,
  UpdateEventInput,
} from '@/shared/validators/event.validator';
import { Types } from 'mongoose';

export interface EventResponse {
  events: IEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface EventWithDetails extends IEvent {
  organizationName?: string;
  creatorName?: string;
}

const eventService = {
  /**
   * Create a new event
   */
  createEvent: async (eventData: CreateEventInput, createdBy: string): Promise<IEvent> => {
    try {
      // Verify organization exists
      const organization = await Organization.findById(eventData.organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Verify user exists and has permission to create events for this organization
      const user = await User.findById(createdBy);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if user can create events for this organization
      if (user.role !== 'admin') {
        // For org_admin, verify they are admin of this organization
        if (user.role === 'org_admin') {
          const userOrganization = await Organization.findOne({ adminUserId: createdBy });
          if (!userOrganization || userOrganization._id.toString() !== eventData.organizationId) {
            throw new AppError(
              'Insufficient permissions to create events for this organization',
              403
            );
          }
        } else {
          throw new AppError('Insufficient permissions to create events', 403);
        }
      }

      // Validate event date is not in the past
      const eventDate = new Date(eventData.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        throw new AppError('Event date cannot be in the past', 400);
      }

      // Create event
      const event = new Event({
        ...eventData,
        organizationId: new Types.ObjectId(eventData.organizationId),
        createdBy: new Types.ObjectId(createdBy),
        eventDate,
      });

      await event.save();

      logger.info(`Event created: ${event._id} by user ${createdBy}`);

      return event;
    } catch (error) {
      logger.error('Create event service error:', error);
      throw error;
    }
  },

  /**
   * Get events with pagination and filtering
   */
  getEvents: async (
    query: EventQueryInput,
    userRole?: string,
    userId?: string
  ): Promise<EventResponse> => {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter: any = {};

      // Handle soft delete
      if (!query.includeDeleted) {
        filter.deletedAt = { $exists: false };
      }

      // Apply organization filter
      if (query.organizationId) {
        filter.organizationId = new Types.ObjectId(query.organizationId);
      }

      // Apply status filter
      if (query.status) {
        filter.status = query.status;
      }

      // Apply mandatory filter
      if (query.is_mandatory !== undefined) {
        filter.is_mandatory = query.is_mandatory;
      }

      // Apply date range filter
      if (query.dateFrom || query.dateTo) {
        filter.eventDate = {};
        if (query.dateFrom) {
          filter.eventDate.$gte = new Date(query.dateFrom);
        }
        if (query.dateTo) {
          filter.eventDate.$lte = new Date(query.dateTo);
        }
      }

      // Apply text search
      if (query.search) {
        filter.$text = { $search: query.search };
      }

      // Role-based access control
      if (userRole !== 'admin') {
        if (userRole === 'org_admin' && userId) {
          // Org admin can only see their organization's events
          const organization = await Organization.findOne({ adminUserId: userId });
          if (organization) {
            filter.organizationId = organization._id;
          } else {
            // User has no organization, return empty result
            return {
              events: [],
              pagination: { page, limit, total: 0, pages: 0 },
            };
          }
        } else if (userRole === 'member') {
          // Members can only see published events
          filter.status = 'published';
        }
      }

      // Get total count for pagination
      const total = await Event.countDocuments(filter);

      // Get events with organization and creator details
      const events = await Event.aggregate([
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
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creator',
          },
        },
        {
          $addFields: {
            organizationName: { $arrayElemAt: ['$organization.name', 0] },
            creatorName: {
              $concat: [
                { $arrayElemAt: ['$creator.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$creator.lastName', 0] },
              ],
            },
          },
        },
        { $project: { organization: 0, creator: 0 } },
        {
          $sort: query.search
            ? { score: { $meta: 'textScore' }, eventDate: -1 }
            : { eventDate: -1 },
        },
        { $skip: skip },
        { $limit: limit },
      ]);

      const pages = Math.ceil(total / limit);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error('Get events service error:', error);
      throw error;
    }
  },

  /**
   * Get event by ID
   */
  getEventById: async (
    eventId: string,
    userRole?: string,
    userId?: string,
    includeDeleted: boolean = false
  ): Promise<EventWithDetails> => {
    try {
      const filter: any = { _id: new Types.ObjectId(eventId) };

      if (!includeDeleted) {
        filter.deletedAt = { $exists: false };
      }

      const event = await Event.aggregate([
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
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creator',
          },
        },
        {
          $addFields: {
            organizationName: { $arrayElemAt: ['$organization.name', 0] },
            creatorName: {
              $concat: [
                { $arrayElemAt: ['$creator.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$creator.lastName', 0] },
              ],
            },
          },
        },
        { $project: { organization: 0, creator: 0 } },
      ]);

      if (!event || event.length === 0) {
        throw new AppError('Event not found', 404);
      }

      const eventData = event[0];

      // Role-based access control
      if (userRole !== 'admin') {
        if (userRole === 'org_admin' && userId) {
          const organization = await Organization.findOne({ adminUserId: userId });
          if (
            !organization ||
            organization._id.toString() !== eventData.organizationId.toString()
          ) {
            throw new AppError('Insufficient permissions to view this event', 403);
          }
        } else if (userRole === 'member') {
          // Members can only see published events
          if (eventData.status !== 'published') {
            throw new AppError('Event not found', 404);
          }
        }
      }

      return eventData;
    } catch (error) {
      logger.error('Get event by ID service error:', error);
      throw error;
    }
  },

  /**
   * Update event
   */
  updateEvent: async (
    eventId: string,
    updateData: UpdateEventInput,
    userId: string
  ): Promise<IEvent> => {
    try {
      const event = await Event.findOne({ _id: eventId, deletedAt: { $exists: false } });

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Check user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isAdmin = user.role === 'admin';
      let isOrgAdmin = false;
      let isCreator = false;

      if (user.role === 'org_admin') {
        const organization = await Organization.findOne({ adminUserId: userId });
        isOrgAdmin = !!(
          organization && organization._id.toString() === event.organizationId.toString()
        );
      }

      isCreator = event.createdBy.toString() === userId;

      if (!isAdmin && !isOrgAdmin && !isCreator) {
        throw new AppError('Insufficient permissions to update this event', 403);
      }

      // Validate event date if provided
      if (updateData.eventDate) {
        const eventDate = new Date(updateData.eventDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (eventDate < today) {
          throw new AppError('Event date cannot be in the past', 400);
        }
      }

      // Check if event is ongoing or completed - restrict certain updates
      if (['ongoing', 'completed'].includes(event.status)) {
        const restrictedFields = ['eventDate', 'startTime', 'endTime'];
        const hasRestrictedUpdate = restrictedFields.some(
          field => updateData[field as keyof UpdateEventInput]
        );

        if (hasRestrictedUpdate && !isAdmin) {
          throw new AppError('Cannot modify date/time of ongoing or completed events', 400);
        }
      }

      // Update event
      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedEvent) {
        throw new AppError('Failed to update event', 500);
      }

      logger.info(`Event updated: ${eventId} by user ${userId}`);

      return updatedEvent;
    } catch (error) {
      logger.error('Update event service error:', error);
      throw error;
    }
  },

  /**
   * Delete event (soft delete by default)
   */
  deleteEvent: async (
    eventId: string,
    deleteOptions: DeleteEventInput,
    userId: string
  ): Promise<void> => {
    try {
      const event = await Event.findOne({ _id: eventId, deletedAt: { $exists: false } });

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Check user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const isAdmin = user.role === 'admin';
      let isOrgAdmin = false;
      let isCreator = false;

      if (user.role === 'org_admin') {
        const organization = await Organization.findOne({ adminUserId: userId });
        isOrgAdmin = !!(
          organization && organization._id.toString() === event.organizationId.toString()
        );
      }

      isCreator = event.createdBy.toString() === userId;

      if (!isAdmin && !isOrgAdmin && !isCreator) {
        throw new AppError('Insufficient permissions to delete this event', 403);
      }

      // Check if event is ongoing or completed
      if (['ongoing', 'completed'].includes(event.status) && !isAdmin) {
        throw new AppError('Cannot delete ongoing or completed events', 400);
      }

      if (deleteOptions.permanently && isAdmin) {
        // Permanent delete (admin only)
        await Event.findByIdAndDelete(eventId);
        logger.info(`Event permanently deleted: ${eventId} by user ${userId}`);
      } else {
        // Soft delete
        await Event.findByIdAndUpdate(eventId, { deletedAt: new Date() });
        logger.info(`Event soft deleted: ${eventId} by user ${userId}`);
      }
    } catch (error) {
      logger.error('Delete event service error:', error);
      throw error;
    }
  },

  /**
   * Restore deleted event (admin only)
   */
  restoreEvent: async (restoreData: RestoreEventInput, userId: string): Promise<IEvent> => {
    try {
      const user = await User.findById(userId);
      if (!user || user.role !== 'admin') {
        throw new AppError('Only administrators can restore events', 403);
      }

      const event = await Event.findOne({
        _id: restoreData.eventId,
        deletedAt: { $exists: true },
      });

      if (!event) {
        throw new AppError('Deleted event not found', 404);
      }

      const restoredEvent = await Event.findByIdAndUpdate(
        restoreData.eventId,
        { $unset: { deletedAt: 1 } },
        { new: true }
      );

      if (!restoredEvent) {
        throw new AppError('Failed to restore event', 500);
      }

      logger.info(`Event restored: ${restoreData.eventId} by user ${userId}`);

      return restoredEvent;
    } catch (error) {
      logger.error('Restore event service error:', error);
      throw error;
    }
  },

  /**
   * Get upcoming events for an organization
   */
  getUpcomingEvents: async (organizationId: string, limit: number = 5): Promise<IEvent[]> => {
    try {
      const now = new Date();

      const upcomingEvents = await Event.find({
        organizationId: new Types.ObjectId(organizationId),
        eventDate: { $gte: now },
        status: 'published',
        deletedAt: { $exists: false },
      })
        .sort({ eventDate: 1 })
        .limit(limit)
        .populate('organizationId', 'name')
        .populate('createdBy', 'firstName lastName');

      return upcomingEvents;
    } catch (error) {
      logger.error('Get upcoming events service error:', error);
      throw error;
    }
  },

  /**
   * Get event statistics
   */
  getEventStats: async (organizationId?: string): Promise<any> => {
    try {
      const filter: any = { deletedAt: { $exists: false } };

      if (organizationId) {
        filter.organizationId = new Types.ObjectId(organizationId);
      }

      const stats = await Event.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
            ongoing: { $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            mandatory: { $sum: { $cond: ['$is_mandatory', 1, 0] } },
            optional: { $sum: { $cond: [{ $not: '$is_mandatory' }, 1, 0] } },
          },
        },
      ]);

      // Get upcoming events count
      const now = new Date();
      const upcomingCount = await Event.countDocuments({
        ...filter,
        eventDate: { $gte: now },
        status: 'published',
      });

      // Get past events count
      const pastCount = await Event.countDocuments({
        ...filter,
        eventDate: { $lt: now },
      });

      const result = stats[0] || {
        total: 0,
        draft: 0,
        published: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0,
        mandatory: 0,
        optional: 0,
      };

      return {
        ...result,
        upcoming: upcomingCount,
        past: pastCount,
      };
    } catch (error) {
      logger.error('Get event stats service error:', error);
      throw error;
    }
  },

  /**
   * Update event status
   */
  updateEventStatus: async (
    eventId: string,
    status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled',
    userId: string
  ): Promise<IEvent> => {
    try {
      const event = await Event.findOne({ _id: eventId, deletedAt: { $exists: false } });

      if (!event) {
        throw new AppError('Event not found', 404);
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
          organization && organization._id.toString() === event.organizationId.toString()
        );
      }

      if (!isAdmin && !isOrgAdmin) {
        throw new AppError('Insufficient permissions to update event status', 403);
      }

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        draft: ['published', 'cancelled'],
        published: ['ongoing', 'cancelled'],
        ongoing: ['completed', 'cancelled'],
        completed: [], // Completed events cannot change status
        cancelled: ['draft'], // Cancelled events can be restored to draft
      };

      const allowedTransitions = validTransitions[event.status] || [];
      if (!allowedTransitions.includes(status)) {
        throw new AppError(`Cannot change status from ${event.status} to ${status}`, 400);
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { status },
        { new: true, runValidators: true }
      );

      if (!updatedEvent) {
        throw new AppError('Failed to update event status', 500);
      }

      logger.info(
        `Event status updated: ${eventId} from ${event.status} to ${status} by user ${userId}`
      );

      return updatedEvent;
    } catch (error) {
      logger.error('Update event status service error:', error);
      throw error;
    }
  },
};

export default eventService;
