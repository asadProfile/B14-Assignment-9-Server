import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedDatabase } from './scripts/seed.js';
import authRoutes from './routes/auth.routes.js';
import serviceRoutes from './routes/service.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import userRoutes from './routes/user.routes.js';
import paymentRoutes, { stripeWebhookHandler } from './routes/payment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import uploadRoutes from './routes/upload.routes.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
// CORS setup
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
            callback(null, true);
        }
        else {
            callback(null, true); // Permissive for preview/production domains
        }
    },
    credentials: true,
}));
// 1. Stripe Webhook endpoint MUST use raw body before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
// 2. Body parsers for regular endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 3. Static directory for file uploads
const uploadsDir = path.resolve('public', 'uploads');
app.use('/uploads', express.static(uploadsDir));
// Health check endpoint (supports both /health and /api/health)
app.get(['/health', '/api/health'], (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'SalonBook API',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting_or_disconnected',
        environment: process.env.VERCEL ? 'vercel-serverless' : (process.env.NODE_ENV || 'development'),
    });
});
// Root check endpoint (supports both / and /api)
app.get(['/', '/api'], (_req, res) => {
    res.json({
        name: 'SalonBook API',
        status: 'online',
        version: '1.0.0',
        documentation: '/health',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});
// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
// Global 404 handler for API routes
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Resource or API route not found.' });
});
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error.',
    });
});
// Start Server locally when not on Vercel
const startServer = async () => {
    try {
        await connectDB();
        await seedDatabase();
        app.listen(PORT, () => {
            console.log(`\n=================================================`);
            console.log(`🎉 SalonBook Server running at http://localhost:${PORT}`);
            console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`=================================================\n`);
        });
    }
    catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1);
    }
};
if (!process.env.VERCEL) {
    startServer();
}
export { app };
export default app;
