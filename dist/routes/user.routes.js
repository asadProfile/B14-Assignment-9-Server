import { Router } from 'express';
import { User } from '../models/User.js';
import { verifyToken, verifyNotBlocked, verifyAdmin } from '../middlewares/auth.js';
const router = Router();
// GET /api/users - Admin only: View all registered customers
router.get('/', verifyToken, verifyNotBlocked, verifyAdmin, async (_req, res) => {
    try {
        const customers = await User.find({ role: 'customer' })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            count: customers.length,
            data: customers,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch users.' });
    }
});
// PATCH /api/users/:id/block - Admin only: Block or Unblock user
router.patch('/:id/block', verifyToken, verifyNotBlocked, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isBlocked } = req.body;
        if (typeof isBlocked !== 'boolean') {
            res.status(400).json({ success: false, message: 'isBlocked must be a boolean.' });
            return;
        }
        const targetUser = await User.findById(id);
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'User not found.' });
            return;
        }
        // Safety: Admin cannot block another admin or themselves
        if (targetUser.role === 'admin') {
            res.status(400).json({ success: false, message: 'Cannot modify block status of an administrator.' });
            return;
        }
        targetUser.isBlocked = isBlocked;
        await targetUser.save();
        res.json({
            success: true,
            message: `User has been ${isBlocked ? 'blocked' : 'unblocked'} successfully.`,
            data: {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                isBlocked: targetUser.isBlocked,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update user block status.' });
    }
});
export default router;
