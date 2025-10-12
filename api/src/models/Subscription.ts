import { Schema, model } from 'mongoose';
import { ISubscription } from '../shared/interfaces/ISubscription';

const subscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    duration: {
      type: String,
      enum: ['6months', '1year', '2years'],
      required: [true, 'Subscription duration is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'pending',
      required: true,
    },
    paymentAmount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount must be positive'],
    },
    paymentMethod: {
      type: String,
      maxlength: [100, 'Payment method cannot exceed 100 characters'],
    },
    receiptFile: {
      type: String,
      maxlength: [255, 'Receipt file path cannot exceed 255 characters'],
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient queries
subscriptionSchema.index({ organizationId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ duration: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ verifiedBy: 1 });

// Compound indexes for common query patterns
subscriptionSchema.index({ organizationId: 1, status: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ duration: 1, status: 1 });

// Virtual to check if subscription is currently active
subscriptionSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now;
});

// Virtual to calculate days remaining
subscriptionSchema.virtual('daysRemaining').get(function () {
  const now = new Date();
  if (this.endDate <= now) return 0;
  return Math.ceil((this.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual to check if subscription is expiring soon (within 30 days)
subscriptionSchema.virtual('isExpiringSoon').get(function () {
  return this.isActive && this.daysRemaining <= 30 && this.daysRemaining > 0;
});

// Pre-save middleware to validate dates
subscriptionSchema.pre('save', function (next) {
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
    return;
  }
  next();
});

// Static method to find active subscriptions
subscriptionSchema.statics.findActiveSubscriptions = function () {
  const now = new Date();
  return this.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

// Static method to find expiring subscriptions
subscriptionSchema.statics.findExpiringSubscriptions = function (days: number = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return this.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now, $lte: futureDate },
  });
};

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
