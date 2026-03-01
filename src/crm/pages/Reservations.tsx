import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/20/solid';
import Modal from '../components/Modal';
import { useDataStore, type RoomType } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';
import { getSharedData } from '../store/guestStore';

type StatusFilter = 'All' | 'Confirmed' | 'Pending' | 'Checked In' | 'Checked Out' | 'Cancelled';

const STATUS_STYLE: Record<string, string> = {
    Confirmed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    Pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    'Checked In': 'bg-green-50 text-green-700 ring-green-600/20',
    'Checked Out': 'bg-gray-100 text-gray-600 ring-gray-500/10',
    Cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
};

const CHANNELS = ['Direct', 'Booking.com', 'Expedia', 'Corporate', 'Walk-in', 'Airbnb', 'Phone', 'Website'];

export default function Reservations() {
    const { reservations, rooms, addReservation, updateReservationStatus, importLandingBookings, syncFromShared } = useDataStore();
    const { addToast } = useToastStore();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [newModal, setNewModal] = useState(false);
    const [manageModal, setManageModal] = useState<typeof reservations[0] | null>(null);

    // Track how many web bookings await import
    const [pendingImport, setPendingImport] = useState(0);

    const checkAndSync = useCallback(async () => {
        try {
            const shared = await getSharedData();
            const notImported = shared.bookings.filter(b => !b.importedToCRM).length;
            setPendingImport(notImported);
            if (notImported > 0) {
                await syncFromShared();
                setPendingImport(0);
            }
        } catch { setPendingImport(0); }
    }, [syncFromShared]);

    // Run on mount + every 15 seconds
    useEffect(() => {
        checkAndSync();
        const interval = setInterval(checkAndSync, 15000);
        return () => clearInterval(interval);
    }, [checkAndSync]);

    const handleImport = async () => {
        const count = await importLandingBookings();
        setPendingImport(0);
        if (count > 0) {
            addToast(`✓ ${count} new web booking${count > 1 ? 's' : ''} imported from landing page.`, 'success');
        } else {
            addToast('All landing bookings are already in the system.', 'info' as any);
        }
    };



    const freeRooms = rooms.filter(r => r.status !== 'occupied' && r.status !== 'out_of_order');

    const [form, setForm] = useState({
        guest: '', email: '', phone: '', checkIn: '', checkOut: '', room: '',
        pax: '1', channel: 'Direct', notes: '', vip: false,
    });

    const selectedRoom = form.room ? rooms.find(r => r.number === form.room) : null;
    const nights = form.checkIn && form.checkOut
        ? Math.max(1, Math.round((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000))
        : 1;
    const totalAmount = selectedRoom ? selectedRoom.pricePerNight * nights : 0;

    const filtered = reservations.filter(r => {
        const matchSearch =
            r.guest.toLowerCase().includes(search.toLowerCase()) ||
            r.id.toLowerCase().includes(search.toLowerCase()) ||
            r.room.includes(search);
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleAdd = () => {
        if (!form.guest || !form.checkIn || !form.checkOut || !form.room) {
            addToast('Please fill in guest name, dates, and room.', 'error'); return;
        }
        if (!selectedRoom) { addToast('Please select a valid room.', 'error'); return; }
        if (new Date(form.checkOut) <= new Date(form.checkIn)) {
            addToast('Check-out must be after check-in.', 'error'); return;
        }
        addReservation({
            guest: form.guest,
            email: form.email,
            phone: form.phone,
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            room: form.room,
            roomType: selectedRoom.type as RoomType,
            pax: parseInt(form.pax),
            status: 'Confirmed',
            paid: false,
            channel: form.channel,
            totalAmount,
            notes: form.notes,
        });
        addToast(`Reservation for ${form.guest} confirmed — Room #${form.room} (${nights} night${nights > 1 ? 's' : ''}).`);
        setForm({ guest: '', email: '', phone: '', checkIn: '', checkOut: '', room: '', pax: '1', channel: 'Direct', notes: '', vip: false });
        setNewModal(false);
    };

    return (
        <div>
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-brand-primary">Reservations</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        All bookings · {reservations.length} total · {freeRooms.length} rooms available
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-2">
                    {pendingImport > 0 && (
                        <button onClick={handleImport}
                            className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors animate-pulse">
                            <ArrowPathIcon className="h-4 w-4" />
                            {pendingImport} new web booking{pendingImport > 1 ? 's' : ''} → Import
                        </button>
                    )}
                    <button onClick={() => setNewModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary transition-colors shadow-sm">
                        <PlusIcon className="h-4 w-4" /> New Booking
                    </button>
                </div>
            </div>

            {/* Summary badges */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {(['All', 'Confirmed', 'Pending', 'Checked In', 'Checked Out', 'Cancelled'] as StatusFilter[]).map(s => {
                    const count = s === 'All' ? reservations.length : reservations.filter(r => r.status === s).length;
                    return (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`rounded-lg border p-3 text-center transition-all ${statusFilter === s ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white border-gray-200 hover:border-brand-primary/50'}`}>
                            <p className={`text-2xl font-bold ${statusFilter === s ? 'text-white' : 'text-brand-primary'}`}>{count}</p>
                            <p className={`text-xs font-semibold mt-0.5 ${statusFilter === s ? 'text-white/80' : 'text-gray-500'}`}>{s}</p>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        placeholder="Search guest, ID, or room..." />
                </div>
                <button onClick={checkAndSync} title="Refresh from landing page"
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                </button>

            </div>

            {/* Table */}
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Paid', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-sm">
                        {filtered.map(res => (
                            <tr key={res.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setManageModal(res)}>
                                <td className="px-4 py-3 font-mono text-xs text-brand-accent font-semibold">
                                    {res.id}
                                    <span className="block text-[9px] text-gray-400 font-sans uppercase tracking-widest mt-0.5">{res.channel}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="font-semibold text-gray-900">{res.guest}</p>
                                    <p className="text-xs text-gray-400">{res.email}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-mono font-bold text-brand-primary">#{res.room}</span>
                                    <span className="block text-xs text-gray-400">{res.roomType}</span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">{res.checkIn}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">{res.checkOut}</td>
                                <td className="px-4 py-3 text-gray-700 font-mono">
                                    {res.checkIn && res.checkOut ? Math.max(1, Math.round((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / 86400000)) : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-gray-900">€{res.totalAmount.toFixed(0)}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${res.paid ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'}`}>
                                        {res.paid ? 'Paid' : 'Due'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-widest ring-1 ring-inset whitespace-nowrap ${STATUS_STYLE[res.status] || 'bg-gray-100 text-gray-600 ring-gray-500/10'}`}>
                                        {res.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">Manage</span>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={10} className="py-10 text-center text-gray-400 text-sm italic">
                                {reservations.length === 0 ? 'No reservations yet. Create the first booking or import from landing page!' : 'No reservations match your search.'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── New Booking Modal ── */}
            <Modal open={newModal} onClose={() => setNewModal(false)} title="New Reservation">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Guest Name *</label>
                            <input type="text" placeholder="Full name" value={form.guest}
                                onChange={e => setForm(s => ({ ...s, guest: e.target.value }))}
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
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Check-in *</label>
                            <input type="date" value={form.checkIn} min={new Date().toISOString().slice(0, 10)}
                                onChange={e => setForm(s => ({ ...s, checkIn: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Check-out *</label>
                            <input type="date" value={form.checkOut} min={form.checkIn || new Date().toISOString().slice(0, 10)}
                                onChange={e => setForm(s => ({ ...s, checkOut: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Room * ({freeRooms.length} available)</label>
                            <select value={form.room} onChange={e => setForm(s => ({ ...s, room: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                <option value="">— Select a room —</option>
                                {(['Standard', 'Deluxe', 'Suite', 'Executive'] as RoomType[]).map(type => (
                                    <optgroup key={type} label={`${type} Rooms`}>
                                        {freeRooms.filter(r => r.type === type).map(r => (
                                            <option key={r.number} value={r.number}>
                                                #{r.number} — Floor {r.floor} · {r.type} · €{r.pricePerNight}/night · Max {r.capacity} guests
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Guests</label>
                            <select value={form.pax} onChange={e => setForm(s => ({ ...s, pax: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Channel</label>
                            <select value={form.channel} onChange={e => setForm(s => ({ ...s, channel: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                {CHANNELS.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Notes</label>
                            <input type="text" placeholder="Special requests, VIP notes..." value={form.notes}
                                onChange={e => setForm(s => ({ ...s, notes: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                    </div>

                    {selectedRoom && form.checkIn && form.checkOut && (
                        <div className="p-3 bg-brand-surface rounded-lg text-sm ring-1 ring-brand-primary/20">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Room #{form.room} ({selectedRoom.type}) × {nights} night{nights > 1 ? 's' : ''}</span>
                                <span className="font-bold text-brand-primary">€{totalAmount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                                <span>€{selectedRoom.pricePerNight}/night · Max {selectedRoom.capacity} guests · Floor {selectedRoom.floor}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setNewModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={handleAdd} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
                            Confirm Booking {totalAmount > 0 ? `· €${totalAmount.toFixed(0)}` : ''}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Manage Modal ── */}
            <Modal open={!!manageModal} onClose={() => setManageModal(null)} title={`Reservation — ${manageModal?.id}`}>
                {manageModal && (
                    <div className="space-y-4">
                        {/* Source badge */}
                        {manageModal.channel === 'Website' && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 font-semibold border border-blue-200">
                                🌐 Web booking — imported from landing page
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Guest', value: manageModal.guest },
                                { label: 'Email', value: manageModal.email || '—' },
                                { label: 'Phone', value: manageModal.phone || '—' },
                                { label: 'Room', value: `#${manageModal.room} (${manageModal.roomType})` },
                                { label: 'Check-in', value: manageModal.checkIn },
                                { label: 'Check-out', value: manageModal.checkOut },
                                { label: 'Guests (Pax)', value: String(manageModal.pax) },
                                { label: 'Channel', value: manageModal.channel },
                                { label: 'Total Amount', value: `€${manageModal.totalAmount.toFixed(0)}` },
                                { label: 'Created', value: manageModal.createdAt },
                            ].map(f => (
                                <div key={f.label} className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">{f.label}</p>
                                    <p className="font-semibold text-brand-primary text-sm">{f.value}</p>
                                </div>
                            ))}
                        </div>
                        {manageModal.notes && (
                            <div className="p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800">
                                <strong>Notes:</strong> {manageModal.notes}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Update Status</label>
                            <select defaultValue={manageModal.status}
                                onChange={e => updateReservationStatus(manageModal.id, e.target.value as any)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                {(['Confirmed', 'Pending', 'Checked In', 'Checked Out', 'Cancelled'] as const).map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <button onClick={() => { addToast(`Reservation ${manageModal.id} updated.`); setManageModal(null); }}
                            className="w-full py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
                            Save Changes
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
