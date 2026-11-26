import { Router } from 'express';
import Stripe from 'stripe';
import { Appointment } from '../models/Appointment.js';
import { Transaction } from '../models/Transaction.js';
import { verifyToken, verifyNotBlocked, verifyCustomer, verifyAdmin } from '../middlewares/auth.js';
const router = Router();
const getStripe = () => {
    const secret = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_setup';
    return new Stripe(secret, {
        apiVersion: '2025-01-27.acacia',
    });
};
// POST /api/payments/create-checkout-session - Customer only
router.post('/create-checkout-session', verifyToken, verifyNotBlocked, verifyCustomer, async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const customer = req.user;
        if (!appointmentId) {
            res.status(400).json({ success: false, message: 'Appointment ID is required.' });
            return;
        }
        const appointment = await Appointment.findById(appointmentId).populate('serviceId', 'serviceName category image');
        if (!appointment) {
            res.status(404).json({ success: false, message: 'Appointment not found.' });
            return;
        }
        // Authorization
        if (appointment.customerId.toString() !== customer._id.toString()) {
            res.status(403).json({ success: false, message: 'Forbidden: You cannot pay for another customer’s appointment.' });
            return;
        }
        // Rules: Customers cannot pay for cancelled or pending appointments
        if (appointment.status !== 'confirmed') {
            res.status(400).json({
                success: false,
                message: `Only confirmed appointments can be paid. This appointment is currently '${appointment.status}'.`,
            });
            return;
        }
        if (appointment.paymentStatus === 'paid') {
            res.status(400).json({ success: false, message: 'This appointment has already been paid.' });
            return;
        }
        const originHeader = req.headers.origin;
        const fallbackClientUrl = process.env.CLIENT_URL
            ? process.env.CLIENT_URL.split(',')[0].trim()
            : (process.env.VERCEL ? 'https://b14-a9-client-theta.vercel.app' : 'http://localhost:3000');
        const clientUrl = originHeader && originHeader.startsWith('http') ? originHeader : fallbackClientUrl;
        const service = appointment.serviceId;
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: customer.email,
            client_reference_id: appointment._id.toString(),
            metadata: {
                appointmentId: appointment._id.toString(),
                customerId: customer._id.toString(),
                serviceName: service.serviceName,
            },
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: Math.round(appointment.servicePrice * 100), // in cents
                        product_data: {
                            name: `SalonBook: ${service.serviceName}`,
                            description: `Appointment on ${appointment.appointmentDate} (${appointment.timeSlot})`,
                            images: service.image ? [service.image] : [],
                        },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/payment/cancel?appointment_id=${appointment._id.toString()}`,
        });
        res.json({
            success: true,
            url: session.url,
            sessionId: session.id,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create checkout session.' });
    }
});
// POST /api/payments/webhook - Stripe Webhook handler
// Note: Handled with express.raw middleware in index.ts for signature verification
export const stripeWebhookHandler = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripe();
    let event;
    try {
        if (webhookSecret && sig) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        }
        else {
            // In dev without secret, parse body as json
            event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }
    }
    catch (err) {
        console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const appointmentId = session.metadata?.appointmentId || session.client_reference_id;
        const customerId = session.metadata?.customerId;
        const amountTotal = (session.amount_total || 0) / 100;
        const currency = session.currency || 'usd';
        if (appointmentId) {
            try {
                const appointment = await Appointment.findById(appointmentId);
                if (appointment && appointment.paymentStatus !== 'paid') {
                    appointment.paymentStatus = 'paid';
                    await appointment.save();
                    // Save transaction record
                    await Transaction.findOneAndUpdate({ stripeSessionId: session.id }, {
                        appointmentId: appointment._id,
                        customerId: customerId || appointment.customerId,
                        amount: amountTotal || appointment.servicePrice,
                        currency,
                        stripeSessionId: session.id,
                        status: 'paid',
                    }, { upsert: true, new: true });
                    console.log(`✅ Appointment ${appointmentId} updated to PAID and transaction saved.`);
                }
            }
            catch (dbErr) {
                console.error('❌ Error updating appointment on webhook:', dbErr);
            }
        }
    }
    res.json({ received: true });
};
// POST /api/payments/sync-session - Verify & sync payment status from Stripe session (Success page fallback)
router.post('/sync-session', verifyToken, verifyNotBlocked, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({ success: false, message: 'Session ID is required.' });
            return;
        }
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session || session.payment_status !== 'paid') {
            res.status(400).json({ success: false, message: 'Payment has not been completed for this session.' });
            return;
        }
        const appointmentId = session.metadata?.appointmentId || session.client_reference_id;
        if (!appointmentId) {
            res.status(400).json({ success: false, message: 'No appointment linked to this session.' });
            return;
        }
        const appointment = await Appointment.findById(appointmentId).populate('serviceId', 'serviceName category price');
        if (!appointment) {
            res.status(404).json({ success: false, message: 'Appointment not found.' });
            return;
        }
        // Update appointment status to paid
        appointment.paymentStatus = 'paid';
        await appointment.save();
        // Upsert transaction record
        const transaction = await Transaction.findOneAndUpdate({ stripeSessionId: session.id }, {
            appointmentId: appointment._id,
            customerId: appointment.customerId,
            amount: (session.amount_total || 0) / 100 || appointment.servicePrice,
            currency: session.currency || 'usd',
            stripeSessionId: session.id,
            status: 'paid',
        }, { upsert: true, new: true });
        res.json({
            success: true,
            message: 'Payment confirmed and verified successfully!',
            appointment,
            transaction,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to sync session.' });
    }
});
// GET /api/payments/my-transactions - Customer only: View own payment history
router.get('/my-transactions', verifyToken, verifyNotBlocked, verifyCustomer, async (req, res) => {
    try {
        const customerId = req.user._id;
        const transactions = await Transaction.find({ customerId })
            .populate({
            path: 'appointmentId',
            populate: {
                path: 'serviceId',
                select: 'serviceName category price duration',
            },
        })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            count: transactions.length,
            data: transactions,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch your payment history.' });
    }
});
// GET /api/payments/transactions - Admin only: View all transactions
router.get('/transactions', verifyToken, verifyNotBlocked, verifyAdmin, async (_req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('customerId', 'name email image phone')
            .populate({
            path: 'appointmentId',
            populate: {
                path: 'serviceId',
                select: 'serviceName category price duration',
            },
        })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            count: transactions.length,
            data: transactions,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch transactions.' });
    }
});
export default router;
