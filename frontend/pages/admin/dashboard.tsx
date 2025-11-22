import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import Link from 'next/link';

interface Event {
    _id: string;
    title: string;
    status: string;
    streamKey: string;
    date: string;
}

export default function AdminDashboard() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const { data } = await api.get('/events');
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
            // router.push('/admin/login');
        } finally {
            setLoading(false);
        }
    };

    const createEvent = async () => {
        const title = prompt('Event Title:');
        if (!title) return;

        try {
            await api.post('/events', { title, isPublic: true });
            fetchEvents();
        } catch (error) {
            alert('Failed to create event');
        }
    };

    const deleteEvent = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/events/${id}`);
            fetchEvents();
        } catch (error) {
            alert('Failed to delete event');
        }
    };

    if (loading) return <div className="text-white text-center mt-20">Loading...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
                <button
                    onClick={createEvent}
                    className="px-4 py-2 bg-primary rounded hover:bg-red-700 transition"
                >
                    + Create Event
                </button>
            </div>

            <div className="grid gap-4">
                {events.map((event) => (
                    <div key={event._id} className="bg-gray-900 p-6 rounded-lg flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold">{event.title}</h3>
                            <p className="text-gray-400">Status: <span className={event.status === 'live' ? 'text-green-500' : 'text-gray-500'}>{event.status}</span></p>
                            <p className="text-xs text-gray-500 mt-1">Key: {event.streamKey}</p>
                        </div>
                        <div className="flex gap-3">
                            <Link href={`/watch/${event._id}`} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700">
                                Watch
                            </Link>
                            <button
                                onClick={() => deleteEvent(event._id)}
                                className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {events.length === 0 && <p className="text-gray-500 text-center">No events found.</p>}
            </div>
        </div>
    );
}
