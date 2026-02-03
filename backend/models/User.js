const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'client', 'viewer'], default: 'viewer' },
    googleDriveAccessToken: { type: String },
    googleDriveRefreshToken: { type: String },
    googleDriveEmail: { type: String },
    assignedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    assignedDrives: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SharedDrive' }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
