import mongoose, { Schema } from 'mongoose';
const AppointmentSchema = new Schema({
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentDate: { type: String, required: true },
    timeSlot: { type: String, required: true },
    message: { type: String, default: '' },
    servicePrice: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
}, {
    timestamps: false,
    versionKey: false,
});
// Prevent duplicate active booking for the same service, date, and timeSlot
AppointmentSchema.index({ serviceId: 1, appointmentDate: 1, timeSlot: 1 }, {
    unique: true,
    partialFilterExpression: { status: { $ne: 'cancelled' } },
});
export const Appointment = mongoose.model('Appointment', AppointmentSchema, 'appointments');
