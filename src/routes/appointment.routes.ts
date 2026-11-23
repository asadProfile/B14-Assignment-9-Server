import { Router, Response } from 'express';
import { Appointment } from '../models/Appointment.js';
import { Service } from '../models/Service.js';
import { AuthRequest, verifyToken, verifyNotBlocked, verifyCustomer, verifyAdmin } from '../middlewares/auth.js';

const router = Router();

// POST /api/appointments - Customer creates an appointment request
router.post('/', verifyToken, verifyNotBlocked, verifyCustomer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceId, appointmentDate, timeSlot, message } = req.body;
    const customerId = req.user!._id;

    if (!serviceId || !appointmentDate || !timeSlot) {
      res.status(400).json({ success: false, message: 'Service, appointment date, and time slot are required.' });
      return;
    }

    // Check service existence and status
    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404).json({ success: false, message: 'Selected service does not exist.' });
      return;
    }

    if (service.status !== 'active') {
      res.status(400).json({ success: false, message: 'This service is currently inactive and cannot be booked.' });
      return;
    }

    // Check for duplicate active appointment on the same date and time slot
    const existingConflict = await Appointment.findOne({
      serviceId,
      appointmentDate,
      timeSlot,
      status: { $ne: 'cancelled' },
    });

    if (existingConflict) {
      res.status(409).json({
        success: false,
        message: 'This time slot is already booked for this service. Please choose another date or time slot.',
      });
      return;
    }

    const newAppointment = await Appointment.create({
      serviceId,
      customerId,
      appointmentDate,
      timeSlot,
      message: message || '',
      servicePrice: service.price,
      paymentStatus: 'unpaid',
      status: 'pending',
    });

    const populatedAppointment = await Appointment.findById(newAppointment._id)
      .populate('serviceId', 'serviceName category image duration price')
      .populate('customerId', 'name email image phone');

    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully!',
      data: populatedAppointment,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'This time slot is already booked for this service. Please choose another date or time slot.',
      });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to submit appointment request.' });
  }
});

// GET /api/appointments/my - Customer views own appointments
router.get('/my', verifyToken, verifyNotBlocked, verifyCustomer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.user!._id;
    const appointments = await Appointment.find({ customerId })
      .populate('serviceId', 'serviceName category image duration price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch your appointments.' });
  }
});

// GET /api/appointments/admin/all - Admin views all appointments with optional status filtering
router.get('/admin/all', verifyToken, verifyNotBlocked, verifyAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, paymentStatus } = req.query;
    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    const appointments = await Appointment.find(filter)
      .populate('serviceId', 'serviceName category image duration price')
      .populate('customerId', 'name email image phone isBlocked')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch appointments.' });
  }
});

// GET /api/appointments/:id - Customer (own) or Admin views single appointment
router.get('/:id', verifyToken, verifyNotBlocked, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate('serviceId', 'serviceName category image duration price')
      .populate('customerId', 'name email image phone');

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    // Role check: customer can only view own appointment
    if (req.user!.role === 'customer' && appointment.customerId._id.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot view another customer’s appointment.' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Invalid appointment ID.' });
  }
});

// PATCH /api/appointments/:id/cancel - Customer (pending only) or Admin (pending or confirmed)
router.patch('/:id/cancel', verifyToken, verifyNotBlocked, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    if (appointment.status === 'cancelled') {
      res.status(400).json({ success: false, message: 'This appointment is already cancelled.' });
      return;
    }

    // Customer rules
    if (req.user!.role === 'customer') {
      if (appointment.customerId.toString() !== req.user!._id.toString()) {
        res.status(403).json({ success: false, message: 'Forbidden: You cannot cancel another customer’s appointment.' });
        return;
      }
      if (appointment.status !== 'pending') {
        res.status(400).json({
          success: false,
          message: 'Customers can only cancel pending appointment requests. Confirmed appointments cannot be cancelled by customers.',
        });
        return;
      }
    }

    // Admin can cancel pending or confirmed appointments
    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to cancel appointment.' });
  }
});

// PATCH /api/appointments/:id/confirm - Admin only: Can only confirm pending appointments
router.patch('/:id/confirm', verifyToken, verifyNotBlocked, verifyAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    if (appointment.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Only pending appointments can be confirmed. This appointment is currently '${appointment.status}'.`,
      });
      return;
    }

    appointment.status = 'confirmed';
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment confirmed successfully!',
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to confirm appointment.' });
  }
});

export default router;
