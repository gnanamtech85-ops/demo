import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../../utils/api';
import ScoreboardControl from '../../../components/ScoreboardControl';
import Link from 'next/link';

export default function AdminEventDetails() {
    const router = useRouter();
    const { id } = router.query;
    const [event, setEvent] = useState<any>(null);

    useEffect(() => {
        if (id) fetchEvent();
    }, [id]);

    const fetchEvent = async () => {
        try {
            const { data } = await api.get(`/events/${id}`);
            setEvent(data);
        } catch (error) {
            console.error('Error fetching event');
        }
    };

    if (!event) return <div className="text-white text-center mt-20">Loading...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-white mb-4 inline-block">&larr; Back to Dashboard</Link>

            <h1 className="text-3xl font-bold text-primary mb-2">{event.title}</h1>
            <p className="text-gray-400 mb-8">Stream Key: {event.streamKey}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-900 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">Event Settings</h2>
                    <div className="space-y-2">
                        <p>Status: {event.status}</p>
                        <p>Public: {event.isPublic ? 'Yes' : 'No'}</p>
                        <p>DVR: {event.settings?.dvrEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                </div>

                <div className="bg-gray-900 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">Live Tools</h2>
                    <ScoreboardControl eventId={event._id} initialData={event.scoreboardData} />
                </div>
            </div>
        </div>
    );
}
