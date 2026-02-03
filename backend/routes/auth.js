const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const googleDriveService = require('../services/googleDriveService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// Register new user
router.post('/register', [
    body('username').isLength({ min: 3 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, role = 'client' } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });
        
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role
        });
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login user
router.post('/login', [
    body('username').notEmpty().trim(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        
        // Find user by username or email
        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        });
        
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                googleDriveConnected: !!user.googleDriveAccessToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google Drive OAuth - Get auth URL
router.post('/google/auth-url', async (req, res) => {
    try {
        const { token } = req.body;
        
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const authUrl = googleDriveService.getAuthUrl();
        res.json({ authUrl });
    } catch (error) {
        console.error('Google auth URL error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google Drive OAuth - Handle callback
router.post('/google/callback', [
    body('code').notEmpty(),
    body('token').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { code, token } = req.body;
        
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Exchange code for tokens
        const tokens = await googleDriveService.getTokens(code);
        
        // Get user info from Google
        const userInfo = await googleDriveService.getUserInfo(tokens.access_token);
        
        // Update user with Google Drive info
        await User.findByIdAndUpdate(user._id, {
            googleDriveAccessToken: tokens.access_token,
            googleDriveRefreshToken: tokens.refresh_token,
            googleDriveEmail: userInfo.email
        });
        
        res.json({
            message: 'Google Drive connected successfully',
            userInfo: {
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture
            }
        });
    } catch (error) {
        console.error('Google callback error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Refresh Google Drive token
router.post('/google/refresh', async (req, res) => {
    try {
        const { token } = req.body;
        
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user || !user.googleDriveRefreshToken) {
            return res.status(400).json({ message: 'Google Drive not connected' });
        }

        // Refresh access token
        const credentials = await googleDriveService.refreshAccessToken(user.googleDriveRefreshToken);
        
        // Update user with new access token
        await User.findByIdAndUpdate(user._id, {
            googleDriveAccessToken: credentials.access_token
        });
        
        res.json({ message: 'Token refreshed successfully' });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                googleDriveConnected: !!user.googleDriveAccessToken,
                googleDriveEmail: user.googleDriveEmail,
                assignedDrives: user.assignedDrives
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/profile', [
    body('username').optional().isLength({ min: 3 }).trim(),
    body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { username, email } = req.body;
        const updateData = {};
        
        if (username && username !== user.username) {
            // Check if username is already taken
            const existingUser = await User.findOne({ 
                username, 
                _id: { $ne: user._id } 
            });
            
            if (existingUser) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            
            updateData.username = username;
        }
        
        if (email && email !== user.email) {
            // Check if email is already taken
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: user._id } 
            });
            
            if (existingUser) {
                return res.status(400).json({ message: 'Email already taken' });
            }
            
            updateData.email = email;
        }

        await User.findByIdAndUpdate(user._id, updateData);
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
