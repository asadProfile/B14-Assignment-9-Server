import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { verifyToken, verifyNotBlocked } from '../middlewares/auth.js';
const router = Router();
// Password validator: min 6 chars, 1 uppercase, 1 lowercase
const validatePassword = (password) => {
    const minLength = password.length >= 6;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    return minLength && hasUpper && hasLower;
};
const generateToken = (user) => {
    const secret = process.env.JWT_SECRET || 'salonbook_jwt_super_secret_key_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign({
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
    }, secret, { expiresIn: expiresIn });
};
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, image } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
            return;
        }
        if (!validatePassword(password)) {
            res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long and contain at least one uppercase and one lowercase letter.',
            });
            return;
        }
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email already registered. Please sign in.' });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            image: image || undefined,
            role: 'customer', // public registration can only create customer accounts
            isBlocked: false,
        });
        const token = generateToken(newUser);
        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                image: newUser.image,
                role: newUser.role,
                isBlocked: newUser.isBlocked,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Registration failed.' });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required.' });
            return;
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !user.password) {
            res.status(401).json({ success: false, message: 'Invalid email or password.' });
            return;
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid email or password.' });
            return;
        }
        if (user.isBlocked) {
            res.status(403).json({
                success: false,
                message: 'Your account has been suspended by an administrator.',
            });
            return;
        }
        const token = generateToken(user);
        res.json({
            success: true,
            message: 'Signed in successfully!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                isBlocked: user.isBlocked,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Login failed.' });
    }
});
// GET /api/auth/google/url - Get Google OAuth consent screen URL if credentials configured
router.get('/google/url', (_req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.trim() === '') {
        res.json({
            success: false,
            configured: false,
            message: 'Google OAuth credentials not configured on server.',
        });
        return;
    }
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
        redirect_uri: callbackUrl,
        client_id: clientId,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ].join(' '),
    };
    const qs = new URLSearchParams(options);
    res.json({
        success: true,
        configured: true,
        url: `${rootUrl}?${qs.toString()}`,
    });
});
// GET /api/auth/google/callback - Handle Google OAuth redirect callback
router.get('/google/callback', async (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
        res.redirect(`${clientUrl}/signin?error=Google+login+cancelled`);
        return;
    }
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId || '',
                client_secret: clientSecret || '',
                redirect_uri: callbackUrl,
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Failed to exchange Google OAuth code:', tokenData);
            res.redirect(`${clientUrl}/signin?error=Failed+to+exchange+Google+authorization+code`);
            return;
        }
        // Fetch user profile from Google
        const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const googleUser = await userinfoResponse.json();
        if (!googleUser.email) {
            res.redirect(`${clientUrl}/signin?error=Could+not+retrieve+email+from+Google`);
            return;
        }
        let user = await User.findOne({ email: googleUser.email.toLowerCase() });
        if (!user) {
            user = await User.create({
                name: googleUser.name || 'Google User',
                email: googleUser.email.toLowerCase(),
                image: googleUser.picture || undefined,
                role: 'customer',
                isBlocked: false,
            });
        }
        if (user.isBlocked) {
            res.redirect(`${clientUrl}/signin?error=Your+account+has+been+suspended`);
            return;
        }
        const token = generateToken(user);
        res.redirect(`${clientUrl}/signin?token=${token}`);
    }
    catch (err) {
        console.error('Error during Google OAuth callback:', err);
        res.redirect(`${clientUrl}/signin?error=Google+authentication+failed`);
    }
});
// POST /api/auth/google - Authenticate via Google ID token or profile payload
router.post('/google', async (req, res) => {
    try {
        let { email, name, image, credential } = req.body;
        // If Google ID token credential provided, verify via Google TokenInfo API
        if (credential) {
            try {
                const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
                const tokenInfo = await verifyRes.json();
                if (verifyRes.ok && tokenInfo.email) {
                    email = tokenInfo.email;
                    name = tokenInfo.name || name;
                    image = tokenInfo.picture || image;
                }
            }
            catch (e) {
                console.error('Error verifying Google ID token:', e);
            }
        }
        if (!email || !name) {
            res.status(400).json({ success: false, message: 'Google authentication details missing.' });
            return;
        }
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Create new customer account
            user = await User.create({
                name,
                email: email.toLowerCase(),
                image: image || undefined,
                role: 'customer',
                isBlocked: false,
            });
        }
        if (user.isBlocked) {
            res.status(403).json({
                success: false,
                message: 'Your account has been suspended by an administrator.',
            });
            return;
        }
        const token = generateToken(user);
        res.json({
            success: true,
            message: 'Google login successful!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                isBlocked: user.isBlocked,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Google login failed.' });
    }
});
// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
    const user = req.user;
    res.json({
        success: true,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            isBlocked: user.isBlocked,
            phone: user.phone,
        },
    });
});
// PUT /api/auth/profile
router.put('/profile', verifyToken, verifyNotBlocked, async (req, res) => {
    try {
        const { name, image, phone } = req.body;
        const user = req.user;
        if (name)
            user.name = name.trim();
        if (image)
            user.image = image.trim();
        if (phone !== undefined)
            user.phone = phone.trim();
        await user.save();
        res.json({
            success: true,
            message: 'Profile updated successfully!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                isBlocked: user.isBlocked,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update profile.' });
    }
});
export default router;
