import { Router } from 'express';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import { Appointment } from '../models/Appointment.js';
import { Transaction } from '../models/Transaction.js';
import { verifyToken, verifyNotBlocked, verifyCustomer, verifyAdmin } from '../middlewares/auth.js';
const router = Router();
// GET /api/dashboard/customer - Customer Dashboard Stats
router.get('/customer', verifyToken, verifyNotBlocked, verifyCustomer, async (req, res) => {
    try {
        const customerId = req.user._id;
        const [totalAppointments, pendingAppointments, confirmedAppointments, cancelledAppointments, recentAppointments] = await Promise.all([
            Appointment.countDocuments({ customerId }),
            Appointment.countDocuments({ customerId, status: 'pending' }),
            Appointment.countDocuments({ customerId, status: 'confirmed' }),
            Appointment.countDocuments({ customerId, status: 'cancelled' }),
            Appointment.find({ customerId })
                .populate('serviceId', 'serviceName category price duration image')
                .sort({ createdAt: -1 })
                .limit(5),
        ]);
        res.json({
            success: true,
            stats: {
                totalAppointments,
                pendingAppointments,
                confirmedAppointments,
                cancelledAppointments,
            },
            recentAppointments,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch customer dashboard data.' });
    }
});
// GET /api/dashboard/admin - Admin Dashboard Stats
router.get('/admin', verifyToken, verifyNotBlocked, verifyAdmin, async (_req, res) => {
    try {
        const [totalCustomers, totalActiveServices, totalAppointments, pendingAppointments, confirmedAppointments, cancelledAppointments, successfulPayments, revenueResult, recentAppointments, recentTransactions,] = await Promise.all([
            User.countDocuments({ role: 'customer' }),
            Service.countDocuments({ status: 'active' }),
            Appointment.countDocuments(),
            Appointment.countDocuments({ status: 'pending' }),
            Appointment.countDocuments({ status: 'confirmed' }),
            Appointment.countDocuments({ status: 'cancelled' }),
            Transaction.countDocuments({ status: 'paid' }),
            Transaction.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
            ]),
            Appointment.find()
                .populate('serviceId', 'serviceName category price image')
                .populate('customerId', 'name email image')
                .sort({ createdAt: -1 })
                .limit(5),
            Transaction.find()
                .populate('customerId', 'name email')
                .populate({ path: 'appointmentId', populate: { path: 'serviceId', select: 'serviceName' } })
                .sort({ createdAt: -1 })
                .limit(5),
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
        res.json({
            success: true,
            stats: {
                totalCustomers,
                totalActiveServices,
                totalAppointments,
                pendingAppointments,
                confirmedAppointments,
                cancelledAppointments,
                successfulPayments,
                totalRevenue,
            },
            recentAppointments,
            recentTransactions,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch admin dashboard data.' });
    }
});
export default router;
