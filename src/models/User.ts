import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: 'customer' | 'admin';
  isBlocked: boolean;
  phone?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isBlocked: { type: Boolean, default: false },
    phone: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema, 'users');
