import { Schema, model } from 'mongoose';
import { IOrganization } from '../shared/interfaces/IOrganization';

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [200, 'Organization name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    logo: {
      type: String,
    },
    banner: {
      type: String,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
    },
    contactPhone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    website: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
        'Please enter a valid website URL',
      ],
    },
    socialLinks: {
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      instagram: { type: String, trim: true },
    },
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin user is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended'],
      default: 'pending',
    },
    settings: {
      allowPublicJoin: {
        type: Boolean,
        default: false,
      },
      requireApproval: {
        type: Boolean,
        default: true,
      },
      maxMembers: {
        type: Number,
        min: [1, 'Max members must be at least 1'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
organizationSchema.index({ name: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ adminUserId: 1 });
organizationSchema.index({ 'settings.allowPublicJoin': 1 });

export const Organization = model<IOrganization>('Organization', organizationSchema);
