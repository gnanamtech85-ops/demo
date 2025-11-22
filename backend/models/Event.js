const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
    streamKey: { type: String, default: uuidv4, unique: true },
    isPublic: { type: Boolean, default: true },
    password: { type: String }, // For private events
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    settings: {
        dvrEnabled: { type: Boolean, default: true },
        chatEnabled: { type: Boolean, default: true },
        multiCamera: { type: Boolean, default: false },
        scoreboard: { type: Boolean, default: false }
    },
    recordings: [{ type: String }], // Paths to recorded files
    scoreboardData: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
