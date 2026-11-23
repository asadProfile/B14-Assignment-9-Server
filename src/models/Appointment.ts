import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAppointment extends Document {
  serviceId: Types.ObjectId;
  customerId: Types.ObjectId;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:00 AM - 11:00 AM"
  message?: string;
  servicePrice: number;
  paymentStatus: 'unpaid' | 'paid';
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentDate: { type: String, required: true },
    timeSlot: { type: String, required: true },
    message: { type: String, default: '' },
    servicePrice: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Prevent duplicate active booking for the same service, date, and timeSlot
AppointmentSchema.index(
  { serviceId: 1, appointmentDate: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'cancelled' } },
  }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema, 'appointments');
