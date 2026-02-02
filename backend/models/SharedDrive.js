const mongoose = require('mongoose');

const SharedDriveSchema = new mongoose.Schema({
    driveLink: { type: String, required: true, unique: true },
    driveFolderId: { type: String, required: true },
    driveFolderName: { type: String, required: true },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    allowedClients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    title: { type: String, required: true },
    description: { type: String },
    totalPhotos: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
    expiresAt: { type: Date },
    accessCode: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

SharedDriveSchema.index({ sharedBy: 1, status: 1 });
SharedDriveSchema.index({ allowedClients: 1 });

module.exports = mongoose.model('SharedDrive', SharedDriveSchema);