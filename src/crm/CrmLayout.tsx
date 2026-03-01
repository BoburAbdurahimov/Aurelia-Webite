import React, { useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
    BuildingOfficeIcon, CalendarDaysIcon, UsersIcon, WrenchScrewdriverIcon,
    SparklesIcon, ChartBarIcon, DocumentTextIcon, Cog6ToothIcon,
    BanknotesIcon, ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import ToastContainer from './components/ToastContainer';

const navigation = [
    { name: 'Dashboard', href: '/crm', icon: ChartBarIcon },
    { name: 'Reservations', href: '/crm/reservations', icon: CalendarDaysIcon },
    { name: 'Front Desk', href: '/crm/front-desk', icon: BuildingOfficeIcon },
    { name: 'Housekeeping', href: '/crm/housekeeping', icon: SparklesIcon },
    { name: 'Maintenance', href: '/crm/maintenance', icon: WrenchScrewdriverIcon },
    { name: 'Guests (CRM)', href: '/crm/guests', icon: UsersIcon },
    { name: 'Finance', href: '/crm/finance', icon: BanknotesIcon },
    { name: 'Reports', href: '/crm/reports', icon: DocumentTextIcon },
    { name: 'Settings', href: '/crm/settings', icon: Cog6ToothIcon },
];

function cn(...classes: string[]) { return classes.filter(Boolean).join(' '); }

function Sidebar() {
    const location = useLocation();
    const { user, logout } = useAuthStore();

    return (
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-brand-bg px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center mt-4">
                <a href="/" className="group">
                    <h1 className="text-xl font-sans tracking-tight font-bold text-brand-primary group-hover:text-brand-accent transition-colors">
                        AURELIA<span className="font-light text-brand-accent ml-1 group-hover:text-brand-primary">ERP</span>
                    </h1>
                    <p className="text-[9px] tracking-widest text-gray-400 uppercase group-hover:text-brand-accent">← Back to Website</p>
                </a>
            </div>
            <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                        <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => {
                                const isActive = location.pathname === item.href || (item.href === '/crm' && location.pathname === '/crm/');
                                return (
                                    <li key={item.name}>
                                        <Link to={item.href}
                                            className={cn(
                                                isActive ? 'bg-brand-surface text-brand-primary font-semibold' : 'text-gray-700 hover:text-brand-primary hover:bg-gray-50',
                                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 transition-colors'
                                            )}
                                        >
                                            <item.icon className={cn(isActive ? 'text-brand-primary' : 'text-gray-400 group-hover:text-brand-primary', 'h-5 w-5 shrink-0')} />
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                    <li className="mt-auto">
                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center font-bold text-brand-surface text-sm">
                                    {user?.firstName.charAt(0)}
                                </div>
                                <div className="text-sm font-semibold leading-6 text-gray-900">
                                    {user?.firstName}
                                </div>
                            </div>
                            <button onClick={logout} className="text-gray-400 hover:text-red-600 transition-colors" title="Sign out">
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </li>
                </ul>
            </nav>
        </div>
    );
}

export default function CrmLayout() {
    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const { sheetsLoaded, loadFromSheets } = useDataStore();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/crm/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Load CRM data from Google Sheets on mount
    useEffect(() => {
        if (isAuthenticated && !sheetsLoaded) {
            loadFromSheets();
        }
    }, [isAuthenticated, sheetsLoaded, loadFromSheets]);

    if (!isAuthenticated) return null;

    return (
        <div className="h-screen flex bg-brand-surface font-sans antialiased text-brand-primary">
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                <Sidebar />
            </div>
            <main className="flex-1 lg:pl-72 h-screen overflow-hidden flex flex-col">
                <header className="h-16 shrink-0 border-b border-gray-200 bg-white shadow-sm flex items-center px-4 sm:px-6 lg:px-8">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
                        {navigation.find(n => n.href === window.location.pathname)?.name || 'Control Panel'}
                    </h2>
                </header>
                <div className="flex-1 overflow-y-auto bg-brand-bg p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
            <ToastContainer />
        </div>
    );
}
