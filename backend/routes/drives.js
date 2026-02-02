const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const SharedDrive = require('../models/SharedDrive');
const Photo = require('../models/Photo');
const User = require('../models/User');
const googleDriveService = require('../services/googleDriveService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Create new shared drive
router.post('/create', authenticateToken, requireAdmin, [
    body('driveLink').notEmpty().trim(),
    body('title').isLength({ min: 1, max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('allowedClients').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { driveLink, title, description, allowedClients = [] } = req.body;

        // Extract folder ID from Google Drive link
        let folderId;
        try {
            folderId = googleDriveService.extractFolderId(driveLink);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid Google Drive link format' });
        }

        // Check if folder is already shared
        const existingDrive = await SharedDrive.findOne({ driveFolderId: folderId });
        if (existingDrive) {
            return res.status(400).json({ message: 'This Google Drive folder is already shared' });
        }

        // Validate Google Drive access
        if (!req.user.googleDriveAccessToken) {
            return res.status(400).json({ message: 'Google Drive not connected. Please connect first.' });
        }

        try {
            // Get folder info and photos from Google Drive
            const driveData = await googleDriveService.getFolderPhotos(folderId, req.user.googleDriveAccessToken);
            
            if (!driveData.photos || driveData.photos.length === 0) {
                return res.status(400).json({ message: 'No photos found in the specified folder' });
            }

            // Create shared drive record
            const sharedDrive = new SharedDrive({
                driveLink,
                driveFolderId: folderId,
                driveFolderName: driveData.folder.name,
                sharedBy: req.user._id,
                allowedClients,
                title,
                description,
                totalPhotos: driveData.photos.length
            });

            await sharedDrive.save();

            // Create photo records
            const photoPromises = driveData.photos.map(async (photo, index) => {
                const photoDoc = new Photo({
                    driveFileId: photo.id,
                    sharedDriveId: sharedDrive._id,
                    name: photo.name,
                    originalName: photo.name,
                    mimeType: photo.mimeType,
                    size: parseInt(photo.size) || 0,
                    thumbnailUrl: `https://drive.google.com/thumbnail?id=${photo.id}&sz=w300-h300-c`,
                    webViewLink: photo.webViewLink,
                    downloadUrl: `https://www.googleapis.com/drive/v3/files/${photo.id}?alt=media&access_token=${req.user.googleDriveAccessToken}`,
                    webContentLink: photo.webContentLink,
                    createdTime: photo.createdTime,
                    modifiedTime: photo.modifiedTime,
                    order: index
                });
                return photoDoc.save();
            });

            await Promise.all(photoPromises);

            // Update users with assigned drive
            if (allowedClients.length > 0) {
                await User.updateMany(
                    { _id: { $in: allowedClients } },
                    { $addToSet: { assignedDrives: sharedDrive._id } }
                );
            }

            res.status(201).json({
                message: 'Shared drive created successfully',
                sharedDrive: {
                    id: sharedDrive._id,
                    title: sharedDrive.title,
                    description: sharedDrive.description,
                    totalPhotos: sharedDrive.totalPhotos,
                    folderName: driveData.folder.name,
                    createdAt: sharedDrive.createdAt
                }
            });

        } catch (error) {
            console.error('Google Drive API error:', error);
            res.status(400).json({ message: 'Failed to access Google Drive. Please check your permissions.' });
        }

    } catch (error) {
        console.error('Create shared drive error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all shared drives for admin
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'active' } = req.query;
        const skip = (page - 1) * limit;

        const query = { sharedBy: req.user._id };
        if (status !== 'all') {
            query.status = status;
        }

        const sharedDrives = await SharedDrive.find(query)
            .populate('sharedBy', 'username email')
            .populate('allowedClients', 'username email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await SharedDrive.countDocuments(query);

        res.json({
            sharedDrives,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get shared drives error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get shared drive details
router.get('/:driveId', authenticateToken, async (req, res) => {
    try {
        const sharedDrive = await SharedDrive.findById(req.params.driveId)
            .populate('sharedBy', 'username email')
            .populate('allowedClients', 'username email');

        if (!sharedDrive) {
            return res.status(404).json({ message: 'Shared drive not found' });
        }

        // Check access permissions
        const hasAccess = sharedDrive.sharedBy._id.equals(req.user._id) ||
            sharedDrive.allowedClients.some(client => client._id.equals(req.user._id)) ||
            req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get photos with user selections
        const photos = await Photo.find({ 
            sharedDriveId: sharedDrive._id,
            isVisible: true 
        })
        .populate('selectedBy', 'username email')
        .populate('likes.userId', 'username email')
        .sort({ order: 1 });

        const photosWithUserData = photos.map(photo => ({
            ...photo.toObject(),
            isSelectedByUser: photo.selectedBy.some(user => user._id.equals(req.user._id)),
            isLikedByUser: photo.likes.some(like => like.userId._id.equals(req.user._id)),
            totalLikes: photo.likes.length,
            totalSelections: photo.selectedBy.length
        }));

        res.json({
            sharedDrive,
            photos: photosWithUserData
        });

    } catch (error) {
        console.error('Get shared drive details error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update shared drive
router.put('/:driveId', authenticateToken, requireAdmin, [
    body('title').optional().isLength({ min: 1, max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('status').optional().isIn(['active', 'inactive', 'expired'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const sharedDrive = await SharedDrive.findById(req.params.driveId);

        if (!sharedDrive) {
            return res.status(404).json({ message: 'Shared drive not found' });
        }

        if (!sharedDrive.sharedBy.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only the creator can update this shared drive' });
        }

        const { title, description, status, allowedClients } = req.body;
        const updateData = {};

        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (status) updateData.status = status;
        if (allowedClients) updateData.allowedClients = allowedClients;

        const updatedDrive = await SharedDrive.findByIdAndUpdate(
            req.params.driveId,
            updateData,
            { new: true }
        ).populate('allowedClients', 'username email');

        // Update user assignments
        if (allowedClients) {
            // Remove drive from users who no longer have access
            await User.updateMany(
                { assignedDrives: updatedDrive._id, _id: { $nin: allowedClients } },
                { $pull: { assignedDrives: updatedDrive._id } }
            );

            // Add drive to new users
            await User.updateMany(
                { _id: { $in: allowedClients } },
                { $addToSet: { assignedDrives: updatedDrive._id } }
            );
        }

        res.json({
            message: 'Shared drive updated successfully',
            sharedDrive: updatedDrive
        });

    } catch (error) {
        console.error('Update shared drive error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete shared drive
router.delete('/:driveId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const sharedDrive = await SharedDrive.findById(req.params.driveId);

        if (!sharedDrive) {
            return res.status(404).json({ message: 'Shared drive not found' });
        }

        if (!sharedDrive.sharedBy.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only the creator can delete this shared drive' });
        }

        // Delete all photos
        await Photo.deleteMany({ sharedDriveId: sharedDrive._id });

        // Remove drive from users
        await User.updateMany(
            { assignedDrives: sharedDrive._id },
            { $pull: { assignedDrives: sharedDrive._id } }
        );

        // Delete the shared drive
        await SharedDrive.findByIdAndDelete(req.params.driveId);

        res.json({ message: 'Shared drive deleted successfully' });

    } catch (error) {
        console.error('Delete shared drive error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get client's shared drives
router.get('/client/drives', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'client') {
            return res.status(403).json({ message: 'Client access required' });
        }

        const sharedDrives = await SharedDrive.find({
            allowedClients: req.user._id,
            status: 'active'
        })
        .populate('sharedBy', 'username email')
        .sort({ createdAt: -1 });

        res.json({ sharedDrives });

    } catch (error) {
        console.error('Get client drives error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;