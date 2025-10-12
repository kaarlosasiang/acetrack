import { Document, Types } from 'mongoose';

export interface IOrganizationMember extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: 'org_admin' | 'member' | 'officer';
  joinDate: Date;
  status: 'active' | 'inactive' | 'pending';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
