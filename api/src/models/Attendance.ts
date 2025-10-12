import { Schema, model } from 'mongoose';
import { IAttendance } from '../shared/interfaces/IAttendance';

const attendanceSchema = new Schema<IAttendance>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present',
      required: true,
    },
    checkInMethod: {
      type: String,
      enum: ['qr_code', 'manual'],
      default: 'qr_code',
      required: true,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    userAgent: {
      type: String,
      maxlength: [1000, 'User agent cannot exceed 1000 characters'],
    },
    location: {
      type: String,
      maxlength: [255, 'Location cannot exceed 255 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure unique attendance record per event-user combination
attendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });

// Other indexes for efficient queries
attendanceSchema.index({ eventId: 1 });
attendanceSchema.index({ userId: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ checkInTime: 1 });
attendanceSchema.index({ checkOutTime: 1 });

// Compound indexes for common query patterns
attendanceSchema.index({ eventId: 1, status: 1 });
attendanceSchema.index({ userId: 1, status: 1 });
attendanceSchema.index({ eventId: 1, checkInTime: 1 });

// Virtual to calculate duration in minutes
attendanceSchema.virtual('duration').get(function () {
  if (!this.checkInTime || !this.checkOutTime) return null;
  return Math.round((this.checkOutTime.getTime() - this.checkInTime.getTime()) / (1000 * 60));
});

// Virtual to check if user is checked in
attendanceSchema.virtual('isCheckedIn').get(function () {
  return !!this.checkInTime;
});

// Virtual to check if user is checked out
attendanceSchema.virtual('isCheckedOut').get(function () {
  return !!this.checkOutTime;
});

// Pre-save middleware to validate check-in/check-out times
attendanceSchema.pre('save', function (next) {
  if (this.checkInTime && this.checkOutTime && this.checkOutTime <= this.checkInTime) {
    next(new Error('Check-out time must be after check-in time'));
    return;
  }
  next();
});

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);
