const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');

// Middleware to check auth (mock for now, should import from middleware)
const verifyToken = (req, res, next) => {
    // In a real app, verify JWT here
    // req.user = decoded;
    next();
};

// Create Event
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, description, date, isPublic, password, settings } = req.body;
        const event = new Event({
            title,
            description,
            date,
            isPublic,
            password,
            settings,
            streamKey: uuidv4()
        });
        await event.save();
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Events (Admin/Client)
router.get('/', verifyToken, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Single Event (Viewer)
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Hide sensitive data for public
        const { streamKey, ...publicData } = event.toObject();
        res.json(publicData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Event
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Event
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
