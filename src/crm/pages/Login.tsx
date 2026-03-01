import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Login() {
    const { isAuthenticated, login } = useAuthStore();
    const [email, setEmail] = useState('admin@aureliagrand.com');
    const [password, setPassword] = useState('admin123');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const ok = await login(email, password);
        setLoading(false);
        if (!ok) setError('Invalid credentials. Please try again.');
    };

    return (
        <div className="min-h-screen bg-brand-bg flex">
            {/* Left: branding panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-brand-primary flex-col items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }} />
                <div className="relative z-10 text-center">
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">AURELIA</h1>
                    <p className="text-brand-accent text-lg tracking-[0.4em] uppercase font-light mb-10">Grand Hotel</p>
                    <div className="w-px h-16 bg-brand-accent mx-auto mb-10 opacity-50" />
                    <p className="text-white/60 text-sm tracking-wider uppercase">Operations Portal</p>
                    <p className="text-white/40 text-xs mt-2">Internal Staff & Management System</p>
                </div>
                <div className="absolute bottom-8 left-0 right-0 text-center">
                    <p className="text-white/20 text-xs">Rome, Italy · Est. MCMXLVII</p>
                </div>
            </div>

            {/* Right: login form */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
                <div className="w-full max-w-md">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-brand-primary">Staff Sign In</h2>
                        <p className="text-gray-500 text-sm mt-2">Access the Aurelia Grand Hotel management dashboard.</p>
                    </div>

                    {/* Demo Credentials Info */}
                    <div className="mb-6 p-4 bg-brand-surface rounded-lg border border-amber-200 text-xs text-brand-primary">
                        <p className="font-semibold mb-1">Demo Credentials</p>
                        <p>Admin: <code className="bg-white px-1 rounded">admin@aureliagrand.com</code> / <code className="bg-white px-1 rounded">admin123</code></p>
                        <p className="mt-1">Desk: <code className="bg-white px-1 rounded">desk@aureliagrand.com</code> / <code className="bg-white px-1 rounded">desk123</code></p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold tracking-widest uppercase text-gray-600 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white text-brand-primary text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold tracking-widest uppercase text-gray-600 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white text-brand-primary text-sm pr-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPass ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-primary text-white py-3 rounded-lg font-semibold text-sm tracking-wider uppercase hover:bg-brand-secondary transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Signing in…' : 'Sign In to Portal'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-8">
                        This is a secure internal system. Unauthorized access is prohibited.
                    </p>
                    <div className="text-center mt-4">
                        <a href="https://aurelia-grand-hotel.vercel.app" className="text-xs text-brand-accent hover:underline">
                            ← Back to Hotel Website
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
