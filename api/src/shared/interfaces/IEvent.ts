import { Document, Types } from 'mongoose';

export interface IEvent extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  title: string;
  description?: string;
  eventDate: Date;
  banner: string;
  startTime: string; // Store as string in HH:mm format
  endTime: string; // Store as string in HH:mm format
  checkInStartTime?: string; // Optional, HH:mm format
  checkInEndTime?: string; // Optional, HH:mm format
  checkOutStartTime?: string; // Optional, HH:mm format
  checkOutEndTime?: string; // Optional, HH:mm format
  location?: string;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  is_mandatory: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Virtual properties
  attendeeCount?: number;
}
