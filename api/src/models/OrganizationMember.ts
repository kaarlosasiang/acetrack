import { Schema, model } from 'mongoose';
import { IOrganizationMember } from '../shared/interfaces/IOrganizationMember';

const organizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    role: {
      type: String,
      enum: ['org_admin', 'member', 'officer'],
      default: 'member',
      required: true,
    },
    joinDate: {
      type: Date,
      required: [true, 'Join date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'pending',
      required: true,
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique organization-user combination (like SQL UNIQUE KEY)
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

// Individual indexes for efficient queries
organizationMemberSchema.index({ organizationId: 1 });
organizationMemberSchema.index({ userId: 1 });
organizationMemberSchema.index({ role: 1 });
organizationMemberSchema.index({ status: 1 });
organizationMemberSchema.index({ joinDate: 1 });

// Compound indexes for common query patterns
organizationMemberSchema.index({ organizationId: 1, status: 1 });
organizationMemberSchema.index({ userId: 1, status: 1 });
organizationMemberSchema.index({ organizationId: 1, role: 1 });

export const OrganizationMember = model<IOrganizationMember>(
  'OrganizationMember',
  organizationMemberSchema
);
