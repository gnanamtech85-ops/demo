import { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../utils/api';

interface LoginFormProps {
    role: 'admin' | 'client';
}

export default function LoginForm({ role }: LoginFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/auth/login', { username, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            if (data.user.role === role) {
                router.push(`/${role}/dashboard`);
            } else {
                setError('Unauthorized role');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="bg-gray-900 p-8 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-bold text-white mb-6 text-center capitalize">{role} Login</h2>
                {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-primary outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 bg-primary text-white rounded font-bold hover:bg-red-700 transition"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
