import { Document, Types } from 'mongoose';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  duration: '6months' | '1year' | '2years';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  paymentAmount: number;
  paymentMethod?: string;
  receiptFile?: string;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isActive: boolean;
  daysRemaining: number;
  isExpiringSoon: boolean; // Within 30 days
}
