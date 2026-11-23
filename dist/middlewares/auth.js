import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'salonbook_jwt_super_secret_key_2026';
        const decoded = jwt.verify(token, secret);
        const user = await User.findById(decoded.id);
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid token: User no longer exists.' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};
export const verifyNotBlocked = (req, res, next) => {
    if (req.user?.isBlocked) {
        res.status(403).json({
            success: false,
            message: 'Access denied: Your account has been suspended by an administrator.',
        });
        return;
    }
    next();
};
export const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
            success: false,
            message: 'Forbidden: Admin access required for this action.',
        });
        return;
    }
    next();
};
export const verifyCustomer = (req, res, next) => {
    if (!req.user || req.user.role !== 'customer') {
        res.status(403).json({
            success: false,
            message: 'Forbidden: Customer access only.',
        });
        return;
    }
    next();
};
