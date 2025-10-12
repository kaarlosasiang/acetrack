import { Document, Types } from 'mongoose';

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    [key: string]: string | undefined;
  };
  adminUserId: Types.ObjectId;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  settings: {
    allowPublicJoin: boolean;
    requireApproval: boolean;
    maxMembers?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
