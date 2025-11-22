import { useState } from 'react';
import api from '../utils/api';
import io from 'socket.io-client';

interface ScoreboardControlProps {
    eventId: string;
    initialData?: any;
}

export default function ScoreboardControl({ eventId, initialData }: ScoreboardControlProps) {
    const [score, setScore] = useState(initialData || {
        teamA: 'Team A',
        teamB: 'Team B',
        scoreA: 0,
        scoreB: 0
    });

    const updateScore = async (newScore: any) => {
        setScore(newScore);
        // Emit via Socket (or API which emits via Socket)
        // Here we use API to persist and emit
        try {
            await api.put(`/events/${eventId}`, { scoreboardData: newScore });

            // Also emit directly if we had a socket connection here, 
            // but better to let the backend handle it via the API call to ensure persistence
            const socket = io('http://localhost:5000');
            socket.emit('update-score', { eventId, score: newScore });
        } catch (error) {
            console.error('Failed to update score');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded mt-4">
            <h3 className="text-lg font-bold mb-2">Scoreboard Control</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <input
                        value={score.teamA}
                        onChange={(e) => updateScore({ ...score, teamA: e.target.value })}
                        className="bg-gray-700 text-white p-1 rounded w-full mb-2"
                    />
                    <div className="flex items-center gap-2">
                        <button onClick={() => updateScore({ ...score, scoreA: score.scoreA - 1 })} className="px-2 bg-red-600 rounded">-</button>
                        <span className="text-xl font-bold">{score.scoreA}</span>
                        <button onClick={() => updateScore({ ...score, scoreA: score.scoreA + 1 })} className="px-2 bg-green-600 rounded">+</button>
                    </div>
                </div>
                <div>
                    <input
                        value={score.teamB}
                        onChange={(e) => updateScore({ ...score, teamB: e.target.value })}
                        className="bg-gray-700 text-white p-1 rounded w-full mb-2"
                    />
                    <div className="flex items-center gap-2">
                        <button onClick={() => updateScore({ ...score, scoreB: score.scoreB - 1 })} className="px-2 bg-red-600 rounded">-</button>
                        <span className="text-xl font-bold">{score.scoreB}</span>
                        <button onClick={() => updateScore({ ...score, scoreB: score.scoreB + 1 })} className="px-2 bg-green-600 rounded">+</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
