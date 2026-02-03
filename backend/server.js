require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Import routes
const authRoutes = require('./routes/auth');
const drivesRoutes = require('./routes/drives');
const photosRoutes = require('./routes/photos');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/google-drive-photos', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB Connected');
    console.log('Database: google-drive-photos');
})
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
});

// Attach io to app for use in routes
app.set('io', io);

// Socket.io authentication and rooms
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        const jwt = require('jsonwebtoken');
        const User = require('./models/User');
        const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return next(new Error('Authentication error'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.userId})`);

    // Join room for specific shared drive
    socket.on('joinDrive', (driveId) => {
        socket.join(`drive-${driveId}`);
        console.log(`User ${socket.user.username} joined drive ${driveId}`);
    });

    // Leave room for specific shared drive
    socket.on('leaveDrive', (driveId) => {
        socket.leave(`drive-${driveId}`);
        console.log(`User ${socket.user.username} left drive ${driveId}`);
    });

    // Real-time photo selection updates
    socket.on('photoSelectionUpdate', (data) => {
        socket.to(`drive-${data.driveId}`).emit('selectionUpdated', {
            photoId: data.photoId,
            userId: socket.userId,
            username: socket.user.username,
            selected: data.selected
        });
    });

    // Real-time photo like updates
    socket.on('photoLikeUpdate', (data) => {
        socket.to(`drive-${data.driveId}`).emit('likeUpdated', {
            photoId: data.photoId,
            userId: socket.userId,
            username: socket.user.username,
            liked: data.liked
        });
    });

    // Admin notifications
    socket.on('notifyAdmins', (data) => {
        socket.broadcast.to('admins').emit('adminNotification', {
            message: data.message,
            type: data.type || 'info',
            userId: socket.userId,
            username: socket.user.username,
            timestamp: new Date()
        });
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.username} (${socket.userId})`);
    });
});

// Make admins room for admin notifications
io.on('connection', (socket) => {
    if (socket.user.role === 'admin') {
        socket.join('admins');
        console.log(`Admin ${socket.user.username} joined admin room`);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/drives', drivesRoutes);
app.use('/api/photos', photosRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Google Drive Photo Sharing Platform API',
        version: '1.0.0',
        endpoints: {
            authentication: '/api/auth',
            sharedDrives: '/api/drives',
            photos: '/api/photos'
        },
        documentation: 'https://github.com/your-repo/google-drive-photo-sharing'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
            error: 'Validation Error',
            details: errors
        });
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }
    
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired'
        });
    }
    
    // MongoDB connection errors
    if (error.name === 'MongoNetworkError') {
        return res.status(500).json({
            error: 'Database connection error'
        });
    }
    
    // Default error
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log('===========================================');
    console.log('🚀 Google Drive Photo Sharing Backend');
    console.log('===========================================');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${process.env.MONGO_URI || 'mongodb://localhost:27017/google-drive-photos'}`);
    console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Using default'}`);
    console.log(`🔑 Google Drive API: ${process.env.GOOGLE_CLIENT_ID ? '✓ Configured' : '✗ Not configured'}`);
    console.log('===========================================');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});
