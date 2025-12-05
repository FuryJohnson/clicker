import mongoose, { Schema, Document } from 'mongoose';

export interface UserFields {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends Document, UserFields {}

const UserSchema = new Schema<UserDocument>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      default: null,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      default: null,
    },
    clicks: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ clicks: -1 });

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
