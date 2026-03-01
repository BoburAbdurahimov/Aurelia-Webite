import React, { useState, useEffect, useCallback } from 'react';
import {
    signInWithGoogle, signInWithFacebook, signInWithApple,
    confirmDemoSignIn, cancelDemoSignIn, getDemoUserForProvider,
    HAS_GOOGLE, HAS_FACEBOOK, HAS_APPLE,
    type SocialUser,
} from '../lib/socialAuth';

// ── Provider config ────────────────────────────────────────────────────────
const PROVIDERS = [
    {
        id: 'google' as const,
        label: 'Continue with Google',
        icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
        ),
        bg: 'bg-white hover:bg-gray-50',
        text: 'text-gray-700',
        border: 'border border-gray-200 shadow-sm',
        fn: signInWithGoogle,
        live: HAS_GOOGLE,
        accentColor: '#4285F4',
    },
    {
        id: 'facebook' as const,
        label: 'Continue with Facebook',
        icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        ),
        bg: 'bg-[#1877F2] hover:bg-[#166fe5]',
        text: 'text-white',
        border: '',
        fn: signInWithFacebook,
        live: HAS_FACEBOOK,
        accentColor: '#1877F2',
    },
    {
        id: 'apple' as const,
        label: 'Continue with Apple',
        icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
            </svg>
        ),
        bg: 'bg-black hover:bg-gray-900',
        text: 'text-white',
        border: '',
        fn: signInWithApple,
        live: HAS_APPLE,
        accentColor: '#000000',
    },
] as const;

// ── Demo OAuth Modal ────────────────────────────────────────────────────────
interface DemoModalProps {
    provider: 'google' | 'facebook' | 'apple';
    onClose: () => void;
    onConfirm: (email: string, firstName: string, lastName: string) => void;
}

function DemoModal({ provider, onClose, onConfirm }: DemoModalProps) {
    const defaults = getDemoUserForProvider(provider);
    const [email, setEmail] = useState(defaults.email);
    const [firstName, setFirstName] = useState(defaults.firstName);
    const [lastName, setLastName] = useState(defaults.lastName);

    const provConf = PROVIDERS.find(p => p.id === provider)!;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in">
                {/* Provider header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="w-8 h-8 flex items-center justify-center">{provConf.icon}</span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">DEMO MODE</p>
                            <p className="text-sm font-semibold text-gray-800">Sign in with {provider.charAt(0).toUpperCase() + provider.slice(1)}</p>
                        </div>
                    </div>
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3 border border-amber-200">
                        ⚠️ Demo simulation — add your <span className="font-mono">VITE_{provider.toUpperCase()}_{provider === 'apple' ? 'CLIENT' : provider === 'google' ? 'CLIENT' : 'APP'}_ID</span> to enable real OAuth.
                    </p>
                </div>
                <div className="px-6 py-5 space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">First Name</label>
                        <input value={firstName} onChange={e => setFirstName(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Last Name</label>
                        <input value={lastName} onChange={e => setLastName(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => { if (email && firstName) onConfirm(email, firstName, lastName); }}
                        disabled={!email || !firstName}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                        style={{ background: provConf.accentColor }}>
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main SocialAuthButtons ────────────────────────────────────────────────────
export interface SocialAuthButtonsProps {
    onSuccess: (user: SocialUser) => void;
    onError?: (err: string) => void;
    /** Compact = icon only row (for inline use). Default = full-width labelled buttons */
    compact?: boolean;
    /** Dark background variant (for the Guest Portal login screen) */
    dark?: boolean;
}

export default function SocialAuthButtons({ onSuccess, onError, compact = false, dark = false }: SocialAuthButtonsProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [demoProvider, setDemoProvider] = useState<'google' | 'facebook' | 'apple' | null>(null);

    // Listen for demo mode events from socialAuth.ts
    useEffect(() => {
        const handler = (e: Event) => {
            const p = (e as CustomEvent<{ provider: 'google' | 'facebook' | 'apple' }>).detail.provider;
            setDemoProvider(p);
        };
        window.addEventListener('social-auth-demo', handler);
        return () => window.removeEventListener('social-auth-demo', handler);
    }, []);

    const handleClick = useCallback(async (provider: typeof PROVIDERS[number]) => {
        setLoading(provider.id);
        try {
            const user = await provider.fn();
            setLoading(null);
            onSuccess(user);
        } catch (err) {
            setLoading(null);
            const msg = err instanceof Error ? err.message : 'Sign-in cancelled';
            if (msg !== 'Sign-in cancelled') onError?.(msg);
        }
    }, [onSuccess, onError]);

    const handleDemoConfirm = useCallback((email: string, firstName: string, lastName: string) => {
        setDemoProvider(null);
        confirmDemoSignIn(email, firstName, lastName);
    }, []);

    const handleDemoClose = useCallback(() => {
        setDemoProvider(null);
        setLoading(null);
        cancelDemoSignIn();
    }, []);

    if (compact) {
        // ── Compact pill row (used inside booking modal) ──────────────────────
        return (
            <>
                <div className="flex items-center gap-2">
                    {PROVIDERS.map(p => (
                        <button key={p.id} onClick={() => handleClick(p)} disabled={!!loading}
                            title={p.label}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all
                                ${dark ? 'bg-white/15 border-white/20 text-white hover:bg-white/25' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}
                                ${loading === p.id ? 'opacity-60 cursor-wait' : ''}`}>
                            {loading === p.id
                                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                : p.icon}
                            <span className="hidden sm:inline">{p.id.charAt(0).toUpperCase() + p.id.slice(1)}</span>
                        </button>
                    ))}
                </div>
                {demoProvider && (
                    <DemoModal provider={demoProvider} onClose={handleDemoClose} onConfirm={handleDemoConfirm} />
                )}
            </>
        );
    }

    // ── Full-width buttons (Guest Portal login) ──────────────────────────────
    return (
        <>
            <div className="space-y-3">
                {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => handleClick(p)} disabled={!!loading}
                        className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200
                            ${p.bg} ${p.text} ${p.border}
                            ${loading === p.id ? 'opacity-60 cursor-wait scale-95' : 'hover:scale-[1.01] active:scale-95'}
                            ${loading && loading !== p.id ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        {loading === p.id
                            ? <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : p.icon}
                        {p.label}
                        {!p.live && (
                            <span className="ml-auto text-[9px] font-bold uppercase tracking-widest opacity-40 bg-current/10 px-1.5 py-0.5 rounded">DEMO</span>
                        )}
                    </button>
                ))}
            </div>
            {demoProvider && (
                <DemoModal provider={demoProvider} onClose={handleDemoClose} onConfirm={handleDemoConfirm} />
            )}
        </>
    );
}
