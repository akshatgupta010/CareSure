import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  role: 'reviewer' | 'admin';
  team: string;
  passwordHash: string;
  failedLogins: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['reviewer', 'admin'],
      default: 'reviewer',
    },
    team: {
      type: String,
      default: 'Claims Team',
    },
    passwordHash: {
      type: String,
      required: true,
    },
    failedLogins: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
