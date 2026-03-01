import { create } from 'zustand';

interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

// Demo credentials – replace with real API call
const DEMO_USERS: Record<string, { password: string; user: User }> = {
    'admin@aureliagrand.com': {
        password: 'admin123',
        user: { id: 1, email: 'admin@aureliagrand.com', firstName: 'Admin', lastName: 'System', role: 'super_admin' },
    },
    'desk@aureliagrand.com': {
        password: 'desk123',
        user: { id: 2, email: 'desk@aureliagrand.com', firstName: 'Sofia', lastName: 'Romano', role: 'front_desk' },
    },
    'hk@aureliagrand.com': {
        password: 'hk123',
        user: { id: 3, email: 'hk@aureliagrand.com', firstName: 'Marco', lastName: 'Ricci', role: 'housekeeping' },
    },
};

export const useAuthStore = create<AuthState>((set) => ({
    user: JSON.parse(localStorage.getItem('erp_user') || 'null'),
    token: localStorage.getItem('erp_token'),
    isAuthenticated: !!localStorage.getItem('erp_token'),

    login: async (email: string, password: string) => {
        const entry = DEMO_USERS[email];
        if (entry && entry.password === password) {
            const fakeToken = btoa(`${email}:${Date.now()}`);
            localStorage.setItem('erp_token', fakeToken);
            localStorage.setItem('erp_user', JSON.stringify(entry.user));
            set({ user: entry.user, token: fakeToken, isAuthenticated: true });
            return true;
        }
        return false;
    },

    logout: () => {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
        set({ user: null, token: null, isAuthenticated: false });
    },
}));
