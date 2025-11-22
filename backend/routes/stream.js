const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Nginx-RTMP on_publish callback
// Verifies the stream key
router.post('/on_publish', async (req, res) => {
    const { name, pass } = req.body; // 'name' is the stream key in our setup if we push to rtmp://host/live/STREAM_KEY

    console.log(`Stream connection attempt: ${name}`);

    try {
        const event = await Event.findOne({ streamKey: name });
        if (!event) {
            console.log('Stream rejected: Invalid key');
            return res.status(403).send('Forbidden');
        }

        if (event.status === 'ended') {
            console.log('Stream rejected: Event ended');
            return res.status(403).send('Event Ended');
        }

        event.status = 'live';
        await event.save();

        // Notify clients via WebSocket
        const io = req.app.get('io');
        io.emit('stream-started', { eventId: event._id });

        res.status(200).send('OK');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error');
    }
});

// Nginx-RTMP on_done callback
router.post('/on_done', async (req, res) => {
    const { name } = req.body;

    try {
        const event = await Event.findOne({ streamKey: name });
        if (event) {
            event.status = 'ended'; // Or 'scheduled' if we want to allow reconnection
            await event.save();

            const io = req.app.get('io');
            io.emit('stream-ended', { eventId: event._id });
        }
        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send('Error');
    }
});

module.exports = router;
