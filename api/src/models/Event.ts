import { Schema, model } from 'mongoose';
import { IEvent } from '../shared/interfaces/IEvent';

const eventSchema = new Schema<IEvent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    banner: {
      type: String,
      required: [true, 'Event banner is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:mm format'],
    },
    checkInStartTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Check-in start time must be in HH:mm format'],
    },
    checkInEndTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Check-in end time must be in HH:mm format'],
    },
    checkOutStartTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Check-out start time must be in HH:mm format'],
    },
    checkOutEndTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Check-out end time must be in HH:mm format'],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [255, 'Location cannot exceed 255 characters'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
    },
    is_mandatory: {
      type: Boolean,
      default: false,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for attendee count (will be populated from attendance records)
eventSchema.virtual('attendeeCount', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'eventId',
  count: true,
  match: { status: 'present' },
});

// Indexes for efficient queries
eventSchema.index({ organizationId: 1 });
eventSchema.index({ eventDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ is_mandatory: 1 });
eventSchema.index({ deletedAt: 1 });

// Compound indexes for common query patterns
eventSchema.index({ organizationId: 1, status: 1 });
eventSchema.index({ organizationId: 1, eventDate: 1 });
eventSchema.index({ eventDate: 1, status: 1 });
eventSchema.index({ organizationId: 1, is_mandatory: 1 });
eventSchema.index({ deletedAt: 1, status: 1 });

// Text index for search functionality
eventSchema.index({ title: 'text', description: 'text', location: 'text' });

export const Event = model<IEvent>('Event', eventSchema);
