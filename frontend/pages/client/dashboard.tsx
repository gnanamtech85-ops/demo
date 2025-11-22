try {
    // In a real app, this would filter by client ID
    const { data } = await api.get('/events');
    setEvents(data);
} catch (error) {
    console.error('Error fetching events');
} finally {
    setLoading(false);
}
    };

if (loading) return <div className="text-white text-center mt-20">Loading...</div>;

return (
    <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Client Portal</h1>

        <div className="grid gap-4">
            {events.map((event) => (
                <div key={event._id} className="bg-gray-900 p-6 rounded-lg flex justify-between items-center">
                    import {useEffect, useState} from 'react';
                    import api from '../../utils/api';
                    import Link from 'next/link';
                    import ShareModal from '../../components/ShareModal'; // Assuming ShareModal is in components

                    export default function ClientDashboard() {
    const [events, setEvents] = useState<any[]>([]);
                    const [loading, setLoading] = useState(true);
                    const [shareEvent, setShareEvent] = useState<any | null>(null);

    useEffect(() => {
                        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            // In a real app, this would filter by client ID
            const {data} = await api.get('/events');
                    setEvents(data);
        } catch (error) {
                        console.error('Error fetching events');
        } finally {
                        setLoading(false);
        }
    };

                    if (loading) return <div className="text-white text-center mt-20">Loading...</div>;

                    return (
                    <div className="min-h-screen bg-black text-white p-8">
                        <h1 className="text-3xl font-bold text-primary mb-8">Client Portal</h1>

                        <div className="grid gap-4">
                            {events.map((event) => (
                                <div key={event._id} className="bg-gray-900 p-6 rounded-lg flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold">{event.title}</h3>
                                        <p className="text-gray-400">Status: <span className={event.status === 'live' ? 'text-green-500' : 'text-gray-500'}>{event.status}</span></p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Link href={`/watch/${event._id}`} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700">
                                            View Stream
                                        </Link>
                                        <button
                                            onClick={() => setShareEvent(event)}
                                            className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700"
                                        >
                                            Share
                                        </button>
                                        {/* Add Download/Analytics links here */}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {shareEvent && (
                            <ShareModal
                                eventUrl={`${window.location.origin}/watch/${shareEvent._id}`}
                                eventName={shareEvent.title}
                                onClose={() => setShareEvent(null)}
                            />
                        )}
                    </div>
                    );
}
