import mongoose, { Document, Schema } from 'mongoose';

export interface IService extends Document {
  serviceName: string;
  category: string;
  description: string;
  price: number;
  duration: number; // in minutes
  image: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    serviceName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: [0, 'Price must be a positive number'] },
    duration: { type: Number, required: true, min: [1, 'Duration must be at least 1 minute'] },
    image: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Index for search
ServiceSchema.index({ serviceName: 'text', description: 'text', category: 'text' });

export const Service = mongoose.model<IService>('Service', ServiceSchema, 'services');
