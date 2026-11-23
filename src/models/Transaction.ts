import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITransaction extends Document {
  appointmentId: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  currency: string;
  stripeSessionId: string;
  status: 'paid' | 'failed';
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd', lowercase: true },
    stripeSessionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['paid', 'failed'], default: 'paid' },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema, 'transactions');
