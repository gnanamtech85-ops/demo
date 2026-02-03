const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
    driveFileId: { type: String, required: true, unique: true },
    sharedDriveId: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedDrive', required: true },
    name: { type: String, required: true },
    originalName: { type: String },
    mimeType: { type: String, required: true },
    size: { type: Number },
    thumbnailUrl: { type: String },
    webViewLink: { type: String },
    downloadUrl: { type: String },
    webContentLink: { type: String },
    createdTime: { type: Date },
    modifiedTime: { type: Date },
    selectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        likedAt: { type: Date, default: Date.now }
    }],
    views: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    metadata: {
        width: Number,
        height: Number,
        colorSpace: String,
        orientation: Number,
        camera: String,
        location: String
    }
}, { timestamps: true });

PhotoSchema.index({ sharedDriveId: 1, order: 1 });
PhotoSchema.index({ selectedBy: 1 });
PhotoSchema.index({ 'likes.userId': 1 });
PhotoSchema.index({ isVisible: 1 });

module.exports = mongoose.model('Photo', PhotoSchema);