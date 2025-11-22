import { useState } from 'react';
import api from '../utils/api';

interface ThemeSelectorProps {
    eventId: string;
    currentTheme?: string;
}

const THEMES = [
    { id: 'default', name: 'Default Dark', color: '#e50914' },
    { id: 'wedding', name: 'Wedding Classic', color: '#d4af37' },
    { id: 'sports', name: 'Sports Pro', color: '#0055ff' },
    { id: 'minimal', name: 'Minimal Clean', color: '#333333' },
];

export default function ThemeSelector({ eventId, currentTheme }: ThemeSelectorProps) {
    const [selectedTheme, setSelectedTheme] = useState(currentTheme || 'default');

    const updateTheme = async (themeId: string) => {
        setSelectedTheme(themeId);
        try {
            await api.put(`/events/${eventId}`, { settings: { theme: themeId } });
            alert('Theme updated');
        } catch (error) {
            console.error('Failed to update theme');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded mt-4">
            <h3 className="text-lg font-bold mb-2">Event Theme</h3>
            <div className="flex gap-2">
                {THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => updateTheme(theme.id)}
                        className={`px-4 py-2 rounded border ${selectedTheme === theme.id ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: theme.color }}
                    >
                        {theme.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
