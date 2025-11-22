import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Player from '../../components/Player';
import api from '../../utils/api';
import io from 'socket.io-client';

let socket: any;

export default function WatchPage() {
    const router = useRouter();
    const { id } = router.query;
    const [event, setEvent] = useState<any>(null);
    const [score, setScore] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetchEvent();
            initSocket();
        }
        return () => {
            if (socket) socket.disconnect();
        };
    }, [id]);

    const fetchEvent = async () => {
        try {
            const { data } = await api.get(`/events/${id}`);
            setEvent(data);
        } catch (error) {
            console.error('Error fetching event');
        }
    };

    const initSocket = async () => {
        await fetch('/api/socket'); // Ensure socket server is ready (if using Next.js API routes, but we use custom server)
        socket = io('http://localhost:5000');

        socket.emit('join-event', id);

        socket.on('score-updated', (newScore: any) => {
            setScore(newScore);
        });

        socket.on('stream-ended', () => {
            alert('Stream Ended');
        });
    };

    if (!event) return <div className="text-white text-center mt-20">Loading Event...</div>;

    // Construct HLS URL (assuming local Nginx)
    // In production, this would be the CDN URL
    const streamUrl = `http://localhost:8080/hls/${event.streamKey}.m3u8`;

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-6xl mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">{event.title}</h1>

                <div className="relative">
                    <Player src={streamUrl} />

                    {/* Scoreboard Overlay */}
                    {score && (
                        <div className="absolute top-4 left-4 bg-black/70 p-4 rounded text-white">
                            <h3 className="font-bold text-xl">Scoreboard</h3>
                            <p>{score.teamA} vs {score.teamB}</p>
                            <p className="text-2xl font-bold">{score.scoreA} - {score.scoreB}</p>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-400">Description</h2>
                    <p className="text-gray-300 mt-2">{event.description || 'No description available.'}</p>
                </div>
            </div>
        </div>
    );
}
