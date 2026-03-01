import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/20/solid';
import { StarIcon } from '@heroicons/react/24/solid';
import Modal from '../components/Modal';
import { useDataStore } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';
import { getSharedData, getSharedDataSync, type LandingBooking } from '../store/guestStore';

const NATIONALITIES = ['Italian', 'British', 'French', 'German', 'American', 'Spanish', 'Japanese', 'Chinese', 'Australian', 'Brazilian', 'Russian', 'Other'];
const TAG_OPTIONS = ['VIP', 'Regular', 'Corporate', 'Loyalty Member', 'First Visit', 'Repeat', 'Wedding', 'Honeymoon', 'Business'];

export default function GuestCRM() {
    const { guests, addGuest, syncGuestsFromBookings } = useDataStore();
    const { addToast } = useToastStore();
    const [search, setSearch] = useState('');
    const [guestModal, setGuestModal] = useState(false);
    const [viewGuest, setViewGuest] = useState<typeof guests[0] | null>(null);
    const [viewGuestBookings, setViewGuestBookings] = useState<LandingBooking[]>([]);
    const [form, setForm] = useState({
        name: '', email: '', phone: '', nationality: 'Italian',
        vip: false, gdprConsent: false, tags: [] as string[],
    });

    // Auto-sync guests from shared bookings on mount + every 15s
    const doSync = useCallback(() => { syncGuestsFromBookings(); }, [syncGuestsFromBookings]);
    useEffect(() => {
        doSync();
        const id = setInterval(doSync, 15000);
        const handler = () => doSync();
        window.addEventListener('storage', handler);
        return () => { clearInterval(id); window.removeEventListener('storage', handler); };
    }, [doSync]);

    // When viewing a guest, load their booking history from shared storage
    const openGuestView = useCallback(async (g: typeof guests[0]) => {
        setViewGuest(g);
        if (g.email) {
            const shared = await getSharedData();
            setViewGuestBookings(shared.bookings.filter(b => b.email.toLowerCase() === g.email.toLowerCase()));
        } else {
            setViewGuestBookings([]);
        }
    }, []);

    const filtered = guests.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.email.toLowerCase().includes(search.toLowerCase()) ||
        g.phone.includes(search)
    );

    const toggleTag = (tag: string) => {
        setForm(s => ({
            ...s,
            tags: s.tags.includes(tag) ? s.tags.filter(t => t !== tag) : [...s.tags, tag],
        }));
    };

    const handleAdd = () => {
        if (!form.name) { addToast('Guest name is required.', 'error'); return; }
        if (!form.gdprConsent) { addToast('GDPR consent is required.', 'error'); return; }
        addGuest({ name: form.name, email: form.email, phone: form.phone, nationality: form.nationality, vip: form.vip, gdprConsent: form.gdprConsent, tags: form.tags });
        addToast(`Guest profile created for ${form.name}.`, 'success');
        setForm({ name: '', email: '', phone: '', nationality: 'Italian', vip: false, gdprConsent: false, tags: [] });
        setGuestModal(false);
    };

    const vipCount = guests.filter(g => g.vip).length;
    const totalSpend = guests.reduce((s, g) => s + g.totalSpend, 0);

    return (
        <div>
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-brand-primary">Guest CRM</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {guests.length} guest{guests.length !== 1 ? 's' : ''} · {vipCount} VIP · €{totalSpend.toFixed(0)} total spend
                    </p>
                </div>
                <button onClick={() => setGuestModal(true)}
                    className="mt-4 sm:mt-0 flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary transition-colors shadow-sm">
                    <PlusIcon className="h-4 w-4" /> New Guest
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Total Guests</p>
                    <p className="text-3xl font-bold text-brand-primary">{guests.length}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-yellow-600 mb-1">VIP Guests</p>
                    <p className="text-3xl font-bold text-yellow-800">{vipCount}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-1">Total Spend</p>
                    <p className="text-3xl font-bold text-green-800">€{totalSpend.toFixed(0)}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-4 max-w-sm">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    placeholder="Search by name, email, or phone..." />
            </div>

            {/* Guest Table */}
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>{['Guest', 'Contact', 'Nationality', 'Stays', 'Total Spend', 'Tags', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                        ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-sm">
                        {filtered.map(g => (
                            <tr key={g.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openGuestView(g)}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${g.vip ? 'bg-brand-accent text-white' : 'bg-gray-100 text-gray-600'}`}>
                                            {g.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{g.name}</p>
                                            {g.vip && (
                                                <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-semibold">
                                                    <StarIcon className="h-3 w-3" /> VIP
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-gray-700">{g.email || '—'}</p>
                                    <p className="text-xs text-gray-400">{g.phone || '—'}</p>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{g.nationality}</td>
                                <td className="px-4 py-3 font-mono font-bold text-brand-primary">{g.stays}</td>
                                <td className="px-4 py-3 font-mono font-bold text-gray-900">€{g.totalSpend.toFixed(0)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {g.tags.slice(0, 2).map(tag => (
                                            <span key={tag} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-surface text-brand-primary uppercase tracking-widest">{tag}</span>
                                        ))}
                                        {g.tags.length > 2 && <span className="text-[10px] text-gray-400">+{g.tags.length - 2}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">View</span>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm italic">
                                {guests.length === 0 ? 'No guests yet. Add the first guest or create a reservation.' : 'No guests match your search.'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Guest Modal */}
            <Modal open={guestModal} onClose={() => setGuestModal(false)} title="New Guest Profile">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Full Name *</label>
                            <input type="text" placeholder="Full name" value={form.name}
                                onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Email</label>
                            <input type="email" placeholder="guest@email.com" value={form.email}
                                onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Phone</label>
                            <input type="tel" placeholder="+1 555-0000" value={form.phone}
                                onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Nationality</label>
                            <select value={form.nationality} onChange={e => setForm(s => ({ ...s, nationality: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_OPTIONS.map(tag => (
                                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${form.tags.includes(tag) ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 pt-1">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={form.vip} onChange={e => setForm(s => ({ ...s, vip: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent" />
                            <span className="text-sm font-semibold text-gray-700">★ Mark as VIP Guest</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={form.gdprConsent} onChange={e => setForm(s => ({ ...s, gdprConsent: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent" />
                            <span className="text-sm text-gray-700">GDPR consent obtained *</span>
                        </label>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setGuestModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleAdd} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Save Guest</button>
                    </div>
                </div>
            </Modal>

            <Modal open={!!viewGuest} onClose={() => { setViewGuest(null); setViewGuestBookings([]); }} title={`Guest — ${viewGuest?.name}`}>
                {viewGuest && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-brand-surface rounded-xl ring-1 ring-brand-primary/10">
                            <div className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${viewGuest.vip ? 'bg-brand-accent text-white' : 'bg-brand-primary text-white'}`}>
                                {viewGuest.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-brand-primary">{viewGuest.name}</p>
                                {viewGuest.vip && <p className="text-xs text-yellow-600 font-semibold flex items-center gap-1"><StarIcon className="h-3 w-3" /> VIP Guest</p>}
                                <p className="text-xs text-gray-500 mt-0.5">ID #{viewGuest.id} · {viewGuest.nationality}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Email', value: viewGuest.email || '—' },
                                { label: 'Phone', value: viewGuest.phone || '—' },
                                { label: 'Nationality', value: viewGuest.nationality },
                                { label: 'Total Stays', value: String(viewGuest.stays) },
                                { label: 'Total Spend', value: `€${viewGuest.totalSpend.toFixed(2)}` },
                                { label: 'Last Stay', value: viewGuest.lastStay },
                                { label: 'GDPR Consent', value: viewGuest.gdprConsent ? '✓ Yes' : '✗ No' },
                            ].map(f => (
                                <div key={f.label} className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">{f.label}</p>
                                    <p className="font-semibold text-brand-primary text-sm">{f.value}</p>
                                </div>
                            ))}
                        </div>
                        {viewGuest.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {viewGuest.tags.map(tag => (
                                    <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-surface text-brand-primary ring-1 ring-brand-primary/20 uppercase tracking-widest">{tag}</span>
                                ))}
                            </div>
                        )}

                        {/* Booking History */}
                        {viewGuestBookings.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Booking History</p>
                                <div className="space-y-2 max-h-44 overflow-y-auto">
                                    {viewGuestBookings.map(b => (
                                        <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                            <div>
                                                <p className="font-mono text-xs font-bold text-brand-accent">{b.id}</p>
                                                <p className="text-xs text-gray-600 mt-0.5">{b.roomType} · {b.checkIn} → {b.checkOut} · {b.nights}n</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-gray-900">€{b.totalAmount}</p>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${b.status === 'Checked In' ? 'bg-green-100 text-green-700'
                                                    : b.status === 'Confirmed' ? 'bg-blue-100 text-blue-700'
                                                        : b.status === 'Checked Out' ? 'bg-gray-200 text-gray-600'
                                                            : 'bg-yellow-100 text-yellow-700'}`}>{b.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button onClick={() => { setViewGuest(null); setViewGuestBookings([]); }}
                            className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
