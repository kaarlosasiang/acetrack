import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  course: string;
  year: number;
  profilePicture?: string;
  role: 'admin' | 'org_admin' | 'member';
  emailVerified: boolean;
  emailVerificationToken?: string | undefined;
  passwordResetToken?: string | undefined;
  passwordResetExpires?: Date | undefined;
  lastLogin?: Date;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): string;
  getFullName(): string;
}