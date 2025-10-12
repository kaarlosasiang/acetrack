import { Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: 'present' | 'absent' | 'late';
  checkInMethod: 'qr_code' | 'manual';
  notes?: string;
  userAgent?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  duration?: number; // Duration in minutes
  isCheckedIn: boolean;
  isCheckedOut: boolean;
}
