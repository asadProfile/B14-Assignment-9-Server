import mongoose, { Schema } from 'mongoose';
const TransactionSchema = new Schema({
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd', lowercase: true },
    stripeSessionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['paid', 'failed'], default: 'paid' },
    createdAt: { type: Date, default: Date.now },
}, {
    timestamps: false,
    versionKey: false,
});
export const Transaction = mongoose.model('Transaction', TransactionSchema, 'transactions');
