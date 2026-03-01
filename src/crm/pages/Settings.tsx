import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { useDataStore } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';
import { getSharedDataSync, updateComplaintStatus, updateLFStatus, updateOrderStatus } from '../store/guestStore';
import Modal from '../components/Modal';

const ROOM_TYPE_PRICES = {
    Standard: 120,
    Deluxe: 200,
    Suite: 350,
    Executive: 480,
};

const ROOM_AMENITIES = {
    Standard: ['Free Wi-Fi', 'Flat-screen TV', 'Air conditioning', 'Private bathroom', 'Daily housekeeping'],
    Deluxe: ['Free Wi-Fi', 'Flat-screen TV', 'Air conditioning', 'Minibar', 'City or garden view', 'Room service'],
    Suite: ['Free Wi-Fi', '65" Smart TV', 'Separate living area', 'Jacuzzi', 'Panoramic view', 'Butler service', 'Minibar'],
    Executive: ['Free Wi-Fi', 'Home theatre system', 'Private terrace', 'Private plunge pool', 'Personal concierge', 'Airport transfer', 'Turndown service'],
};

export default function Settings() {
    const { rooms, staff, addStaff, updateStaff } = useDataStore();
    const { addToast } = useToastStore();
    const sharedData = getSharedDataSync();
    const [tab, setTab] = useState<'hotel' | 'staff' | 'rooms' | 'portal'>('hotel');
    const [staffModal, setStaffModal] = useState(false);
    const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'front_desk' as const });
    const [editHotel, setEditHotel] = useState(false);
    const [hotelForm, setHotelForm] = useState({
        name: 'Aurelia Grand Hotel',
        address: 'Via della Seta 12, Florence, Italy',
        phone: '+39 055 123 4567',
        email: 'info@aureliagrand.com',
        checkInTime: '14:00',
        checkOutTime: '12:00',
        timezone: 'Europe/Rome',
        currency: 'EUR',
        taxRate: '10',
    });

    const floors = ['1', '2'] as const;
    const sharedOrders = sharedData.guestOrders;
    const sharedComplaints = sharedData.guestComplaints;
    const sharedLF = sharedData.guestLostFound;
    const sharedBookings = sharedData.bookings;

    const handleAddStaff = () => {
        if (!staffForm.name || !staffForm.email) { addToast('Name and email are required.', 'error'); return; }
        addStaff({ name: staffForm.name, email: staffForm.email, role: staffForm.role as any, active: true });
        addToast(`Staff member ${staffForm.name} added.`, 'success');
        setStaffForm({ name: '', email: '', role: 'front_desk' });
        setStaffModal(false);
    };

    return (
        <div>
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-brand-primary">Settings</h1>
                    <p className="mt-1 text-sm text-gray-500">Hotel configuration, staff management, room config, and guest portal management.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex gap-6">
                    {([['hotel', '🏨 Hotel Profile'], ['staff', '👥 Staff'], ['rooms', '🛏 Room Config'], ['portal', '🌐 Guest Portal']] as const).map(([t, label]) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-brand-primary'}`}>
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Hotel Profile */}
            {tab === 'hotel' && (
                <div className="max-w-2xl space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Hotel Profile</h3>
                            <button onClick={() => { setEditHotel(!editHotel); if (editHotel) addToast('Hotel profile saved.', 'success'); }}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm ${editHotel ? 'bg-brand-primary text-white hover:bg-brand-secondary' : 'bg-white text-brand-primary ring-1 ring-brand-primary/30 hover:bg-brand-surface'}`}>
                                {editHotel ? 'Save Changes' : 'Edit'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Hotel Name', key: 'name' as const },
                                { label: 'Phone', key: 'phone' as const },
                                { label: 'Address', key: 'address' as const },
                                { label: 'Email', key: 'email' as const },
                                { label: 'Check-in Time', key: 'checkInTime' as const },
                                { label: 'Check-out Time', key: 'checkOutTime' as const },
                                { label: 'Timezone', key: 'timezone' as const },
                                { label: 'Currency', key: 'currency' as const },
                                { label: 'Tax Rate (%)', key: 'taxRate' as const },
                            ].map(f => (
                                <div key={f.key} className={f.key === 'address' || f.key === 'name' ? 'col-span-2' : ''}>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{f.label}</label>
                                    {editHotel ? (
                                        <input type="text" value={hotelForm[f.key]}
                                            onChange={e => setHotelForm(s => ({ ...s, [f.key]: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                                    ) : (
                                        <p className="text-sm font-semibold text-gray-800">{hotelForm[f.key]}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Room Type Pricing</h3>
                        <div className="space-y-3">
                            {(Object.entries(ROOM_TYPE_PRICES) as [string, number][]).map(([type, price]) => (
                                <div key={type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{type}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {(ROOM_AMENITIES as any)[type].slice(0, 3).join(' · ')}
                                        </p>
                                    </div>
                                    <span className="font-mono font-bold text-brand-primary">€{price}/night</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Staff */}
            {tab === 'staff' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setStaffModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
                            <PlusIcon className="h-4 w-4" /> Add Staff Member
                        </button>
                    </div>
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>{['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                {staff.map((s, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                                        <td className="px-4 py-3 text-gray-500">{s.email}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-surface text-brand-primary uppercase tracking-widest">
                                                {s.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${s.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {s.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => { updateStaff(s.email, { active: !s.active }); addToast(`${s.name} ${s.active ? 'deactivated' : 'activated'}.`); }}
                                                className="text-xs font-bold text-brand-accent hover:text-brand-primary uppercase tracking-widest">
                                                {s.active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Rooms Config */}
            {tab === 'rooms' && (
                <div className="space-y-6">
                    {floors.map(floor => (
                        <div key={floor}>
                            <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">Floor {floor}</h3>
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>{['Room #', 'Type', 'Status', 'Price/Night', 'Capacity', 'Assigned To'].map(h => (
                                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                        {rooms.filter(r => r.floor === floor).map(r => (
                                            <tr key={r.number} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-mono font-bold text-brand-primary">#{r.number}</td>
                                                <td className="px-4 py-2">{r.type}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'occupied' ? 'bg-brand-surface text-brand-primary' : r.status === 'dirty' ? 'bg-red-50 text-red-700' : r.status === 'clean' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 font-mono">€{r.pricePerNight}</td>
                                                <td className="px-4 py-2 text-gray-600">{r.capacity} guests</td>
                                                <td className="px-4 py-2 text-gray-500 text-xs">{r.assignedTo || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Guest Portal Management */}
            {tab === 'portal' && (
                <div className="space-y-6">
                    {/* Web bookings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">
                            🌐 Website Bookings ({sharedBookings.length})
                        </h3>
                        {sharedBookings.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No bookings from the website yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>{['ID', 'Guest', 'Email', 'Room Type', 'Check-in', 'Check-out', 'Total', 'Status'].map(h => (
                                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-800">{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {sharedBookings.map(b => (
                                            <tr key={b.id}>
                                                <td className="px-3 py-2 font-mono text-xs text-brand-accent">{b.id}</td>
                                                <td className="px-3 py-2 font-semibold">{b.guest}</td>
                                                <td className="px-3 py-2 text-gray-500">{b.email}</td>
                                                <td className="px-3 py-2">{b.roomType}</td>
                                                <td className="px-3 py-2 font-mono text-xs">{b.checkIn}</td>
                                                <td className="px-3 py-2 font-mono text-xs">{b.checkOut}</td>
                                                <td className="px-3 py-2 font-mono font-bold">€{b.totalAmount.toFixed(0)}</td>
                                                <td className="px-3 py-2">
                                                    <span className="bg-yellow-50 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">Pending</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* F&B Orders */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">F&B Orders ({sharedOrders.length})</h3>
                        {sharedOrders.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No F&B orders from guests yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {sharedOrders.map(o => (
                                    <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                        <div>
                                            <p className="font-semibold text-gray-900">{o.guestName} <span className="text-gray-400 font-mono text-xs">· {o.reservationId}</span></p>
                                            <p className="text-xs text-gray-500">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
                                            <p className="text-xs text-gray-400">{o.createdAt}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-brand-primary">€{o.total.toFixed(2)}</span>
                                            <select value={o.status}
                                                onChange={e => { updateOrderStatus(o.id, e.target.value as any); addToast(`Order ${o.id} updated.`); window.location.reload(); }}
                                                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none">
                                                <option value="pending">Pending</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Complaints */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Guest Complaints ({sharedComplaints.length})</h3>
                        {sharedComplaints.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No guest complaints filed.</p>
                        ) : (
                            <div className="space-y-2">
                                {sharedComplaints.map(c => (
                                    <div key={c.id} className={`p-3 rounded-lg text-sm border ${c.status === 'resolved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900">{c.guestName} <span className="text-gray-400 font-mono text-xs">· {c.reservationId}</span></p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-red-600 mt-0.5">{c.category}</p>
                                                <p className="text-xs text-gray-700 mt-1">{c.description}</p>
                                                <p className="text-xs text-gray-400 mt-1">{c.createdAt}</p>
                                            </div>
                                            <select value={c.status}
                                                onChange={e => { updateComplaintStatus(c.id, e.target.value as any); addToast(`Complaint ${c.id} updated.`); window.location.reload(); }}
                                                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none">
                                                <option value="open">Open</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="resolved">Resolved</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Lost & Found */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Guest Lost & Found ({sharedLF.length})</h3>
                        {sharedLF.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No lost & found reports from guests.</p>
                        ) : (
                            <div className="space-y-2">
                                {sharedLF.map(l => (
                                    <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                        <div>
                                            <p className="font-semibold text-gray-900">{l.item}</p>
                                            <p className="text-xs text-gray-500">{l.guestName} · {l.reservationId} · {l.location}</p>
                                            <p className="text-xs text-gray-400">{l.createdAt}</p>
                                        </div>
                                        <select value={l.status}
                                            onChange={e => { updateLFStatus(l.id, e.target.value as any); addToast(`L&F item ${l.id} updated.`); window.location.reload(); }}
                                            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none">
                                            <option value="searching">Searching</option>
                                            <option value="found">Found</option>
                                            <option value="claimed">Claimed</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Staff Modal */}
            <Modal open={staffModal} onClose={() => setStaffModal(false)} title="Add Staff Member" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Full Name *</label>
                        <input type="text" value={staffForm.name} onChange={e => setStaffForm(s => ({ ...s, name: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Email *</label>
                        <input type="email" value={staffForm.email} onChange={e => setStaffForm(s => ({ ...s, email: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Role</label>
                        <select value={staffForm.role} onChange={e => setStaffForm(s => ({ ...s, role: e.target.value as any }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="front_desk">Front Desk</option>
                            <option value="housekeeping">Housekeeping</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="accountant">Accountant</option>
                            <option value="super_admin">Super Admin</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setStaffModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleAddStaff} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Add Staff</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
