const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Photo = require('../models/Photo');
const SharedDrive = require('../models/SharedDrive');
const User = require('../models/User');
const googleDriveService = require('../services/googleDriveService');
const downloadService = require('../services/downloadService');

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

// Get photos from a shared drive
router.get('/shared-drive/:driveId', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50, sortBy = 'order' } = req.query;
        const skip = (page - 1) * limit;

        // Check if user has access to this drive
        const sharedDrive = await SharedDrive.findById(req.params.driveId)
            .populate('sharedBy', 'username email')
            .populate('allowedClients', 'username email');

        if (!sharedDrive) {
            return res.status(404).json({ message: 'Shared drive not found' });
        }

        const hasAccess = sharedDrive.sharedBy._id.equals(req.user._id) ||
            sharedDrive.allowedClients.some(client => client._id.equals(req.user._id)) ||
            req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get photos
        const photos = await Photo.find({ 
            sharedDriveId: sharedDrive._id,
            isVisible: true 
        })
        .populate('selectedBy', 'username email')
        .populate('likes.userId', 'username email')
        .sort({ [sortBy]: 1 })
        .skip(skip)
        .limit(parseInt(limit));

        // Format photos with user-specific data
        const photosWithUserData = photos.map(photo => ({
            ...photo.toObject(),
            isSelectedByUser: photo.selectedBy.some(user => user._id.equals(req.user._id)),
            isLikedByUser: photo.likes.some(like => like.userId._id.equals(req.user._id)),
            totalLikes: photo.likes.length,
            totalSelections: photo.selectedBy.length,
            selectedByUsers: photo.selectedBy.map(user => user.username),
            likedByUsers: photo.likes.map(like => like.userId.username)
        }));

        const total = await Photo.countDocuments({ 
            sharedDriveId: sharedDrive._id,
            isVisible: true 
        });

        res.json({
            sharedDrive: {
                id: sharedDrive._id,
                title: sharedDrive.title,
                description: sharedDrive.description,
                folderName: sharedDrive.driveFolderName,
                sharedBy: sharedDrive.sharedBy,
                createdAt: sharedDrive.createdAt
            },
            photos: photosWithUserData,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get photos error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Select/Unselect photo
router.post('/:photoId/select', authenticateToken, async (req, res) => {
    try {
        const { select = true } = req.body;

        const photo = await Photo.findById(req.params.photoId)
            .populate('sharedDriveId');

        if (!photo) {
            return res.status(404).json({ message: 'Photo not found' });
        }

        // Check if user has access to this drive
        const sharedDrive = await SharedDrive.findById(photo.sharedDriveId._id);
        const hasAccess = sharedDrive.sharedBy.equals(req.user._id) ||
            sharedDrive.allowedClients.includes(req.user._id) ||
            req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (select) {
            // Add user to selectedBy if not already there
            if (!photo.selectedBy.includes(req.user._id)) {
                photo.selectedBy.push(req.user._id);
                await photo.save();

                // Emit real-time update
                const io = req.app.get('io');
                if (io) {
                    io.to(`drive-${sharedDrive._id}`).emit('photoSelected', {
                        photoId: photo._id,
                        userId: req.user._id,
                        username: req.user.username
                    });
                }
            }
        } else {
            // Remove user from selectedBy
            photo.selectedBy.pull(req.user._id);
            await photo.save();

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                io.to(`drive-${sharedDrive._id}`).emit('photoUnselected', {
                    photoId: photo._id,
                    userId: req.user._id,
                    username: req.user.username
                });
            }
        }

        res.json({
            message: `Photo ${select ? 'selected' : 'unselected'} successfully`,
            photo: {
                id: photo._id,
                name: photo.name,
                isSelectedByUser: select,
                totalSelections: photo.selectedBy.length
            }
        });

    } catch (error) {
        console.error('Select photo error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Like/Unlike photo
router.post('/:photoId/like', authenticateToken, async (req, res) => {
    try {
        const { like = true } = req.body;

        const photo = await Photo.findById(req.params.photoId)
            .populate('sharedDriveId');

        if (!photo) {
            return res.status(404).json({ message: 'Photo not found' });
        }

        // Check if user has access to this drive
        const sharedDrive = await SharedDrive.findById(photo.sharedDriveId._id);
        const hasAccess = sharedDrive.sharedBy.equals(req.user._id) ||
            sharedDrive.allowedClients.includes(req.user._id) ||
            req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const existingLikeIndex = photo.likes.findIndex(
            like => like.userId.equals(req.user._id)
        );

        if (like) {
            // Add like if not already liked
            if (existingLikeIndex === -1) {
                photo.likes.push({
                    userId: req.user._id,
                    likedAt: new Date()
                });
                await photo.save();

                // Emit real-time update
                const io = req.app.get('io');
                if (io) {
                    io.to(`drive-${sharedDrive._id}`).emit('photoLiked', {
                        photoId: photo._id,
                        userId: req.user._id,
                        username: req.user.username
                    });
                }
            }
        } else {
            // Remove like
            if (existingLikeIndex !== -1) {
                photo.likes.splice(existingLikeIndex, 1);
                await photo.save();

                // Emit real-time update
                const io = req.app.get('io');
                if (io) {
                    io.to(`drive-${sharedDrive._id}`).emit('photoUnliked', {
                        photoId: photo._id,
                        userId: req.user._id,
                        username: req.user.username
                    });
                }
            }
        }

        res.json({
            message: `Photo ${like ? 'liked' : 'unliked'} successfully`,
            photo: {
                id: photo._id,
                name: photo.name,
                isLikedByUser: like,
                totalLikes: photo.likes.length
            }
        });

    } catch (error) {
        console.error('Like photo error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk select photos
router.post('/bulk/select', authenticateToken, [
    body('photoIds').isArray().custom(value => value.length > 0),
    body('action').isIn(['select', 'unselect', 'like', 'unlike'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { photoIds, action } = req.body;

        // Check if user has access to all photos
        const photos = await Photo.find({ _id: { $in: photoIds } })
            .populate('sharedDriveId');

        const sharedDriveIds = [...new Set(photos.map(p => p.sharedDriveId._id.toString()))];
        
        for (const driveId of sharedDriveIds) {
            const sharedDrive = await SharedDrive.findById(driveId);
            const hasAccess = sharedDrive.sharedBy.equals(req.user._id) ||
                sharedDrive.allowedClients.includes(req.user._id) ||
                req.user.role === 'admin';

            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to some photos' });
            }
        }

        let updateQuery;
        let updateData;
        let message;

        switch (action) {
            case 'select':
                updateQuery = { _id: { $in: photoIds } };
                updateData = { $addToSet: { selectedBy: req.user._id } };
                message = 'Photos selected successfully';
                break;
            case 'unselect':
                updateQuery = { _id: { $in: photoIds } };
                updateData = { $pull: { selectedBy: req.user._id } };
                message = 'Photos unselected successfully';
                break;
            case 'like':
                updateQuery = { _id: { $in: photoIds } };
                updateData = { $addToSet: { likes: { userId: req.user._id, likedAt: new Date() } } };
                message = 'Photos liked successfully';
                break;
            case 'unlike':
                updateQuery = { _id: { $in: photoIds } };
                updateData = { $pull: { likes: { userId: req.user._id } } };
                message = 'Photos unliked successfully';
                break;
        }

        const result = await Photo.updateMany(updateQuery, updateData);

        // Emit real-time updates
        const io = req.app.get('io');
        if (io) {
            photoIds.forEach(photoId => {
                io.to(`photo-${photoId}`).emit('photoUpdated', {
                    photoId,
                    action,
                    userId: req.user._id,
                    username: req.user.username
                });
            });
        }

        res.json({
            message,
            modifiedCount: result.modifiedCount,
            photoIds
        });

    } catch (error) {
        console.error('Bulk action error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download selected photos as ZIP
router.post('/download/selected', authenticateToken, [
    body('photoIds').isArray().custom(value => value.length > 0)
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { photoIds } = req.body;

        // Check if user has access to all photos
        const photos = await Photo.find({ 
            _id: { $in: photoIds },
            isVisible: true 
        }).populate('sharedDriveId');

        if (photos.length === 0) {
            return res.status(404).json({ message: 'No photos found' });
        }

        // Check permissions for each drive
        for (const photo of photos) {
            const sharedDrive = await SharedDrive.findById(photo.sharedDriveId._id);
            const hasAccess = sharedDrive.sharedBy.equals(req.user._id) ||
                sharedDrive.allowedClients.includes(req.user._id) ||
                req.user.role === 'admin';

            if (!hasAccess) {
                return res.status(403).json({ message: `Access denied to photo: ${photo.name}` });
            }
        }

        // Check if user has Google Drive access
        if (!req.user.googleDriveAccessToken) {
            return res.status(400).json({ message: 'Google Drive not connected' });
        }

        // Create download result
        const downloadResult = await downloadService.createZipFromPhotos(photos, req.user.googleDriveAccessToken);

        // Set headers for file download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadResult.zipName}"`);
        res.setHeader('Content-Length', downloadResult.zipBlob.size);

        // Send the ZIP file
        res.send(downloadResult.zipBlob);

        // Log download activity
        console.log(`Download completed: ${req.user.username} downloaded ${photos.length} photos`);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's selections across all drives
router.get('/my-selections', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const selectedPhotos = await Photo.find({
            selectedBy: req.user._id,
            isVisible: true
        })
        .populate({
            path: 'sharedDriveId',
            populate: {
                path: 'sharedBy',
                select: 'username email'
            }
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Photo.countDocuments({
            selectedBy: req.user._id,
            isVisible: true
        });

        const formattedPhotos = selectedPhotos.map(photo => ({
            id: photo._id,
            name: photo.name,
            thumbnailUrl: photo.thumbnailUrl,
            webViewLink: photo.webViewLink,
            sharedDriveId: photo.sharedDriveId._id,
            sharedDriveTitle: photo.sharedDriveId.title,
            sharedBy: photo.sharedDriveId.sharedBy,
            selectedAt: photo.updatedAt,
            isLikedByUser: photo.likes.some(like => like.userId.equals(req.user._id)),
            totalLikes: photo.likes.length
        }));

        res.json({
            photos: formattedPhotos,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get selections error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get photo statistics (admin only)
router.get('/stats/:driveId', authenticateToken, async (req, res) => {
    try {
        const { driveId } = req.params;

        const sharedDrive = await SharedDrive.findById(driveId);
        if (!sharedDrive) {
            return res.status(404).json({ message: 'Shared drive not found' });
        }

        // Only admin can view stats
        if (req.user.role !== 'admin' && !sharedDrive.sharedBy.equals(req.user._id)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const stats = await Photo.aggregate([
            { $match: { sharedDriveId: sharedDrive._id } },
            {
                $group: {
                    _id: null,
                    totalPhotos: { $sum: 1 },
                    totalSelections: { $sum: { $size: '$selectedBy' } },
                    totalLikes: { $sum: { $size: '$likes' } },
                    photosWithSelections: {
                        $sum: {
                            $cond: [{ $gt: [{ $size: '$selectedBy' }, 0] }, 1, 0]
                        }
                    },
                    photosWithLikes: {
                        $sum: {
                            $cond: [{ $gt: [{ $size: '$likes' }, 0] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const userStats = await Photo.aggregate([
            { $match: { sharedDriveId: sharedDrive._id } },
            { $unwind: '$selectedBy' },
            {
                $group: {
                    _id: '$selectedBy',
                    selections: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    username: '$user.username',
                    email: '$user.email',
                    selections: 1
                }
            },
            { $sort: { selections: -1 } }
        ]);

        res.json({
            driveStats: stats[0] || {
                totalPhotos: 0,
                totalSelections: 0,
                totalLikes: 0,
                photosWithSelections: 0,
                photosWithLikes: 0
            },
            userStats
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;