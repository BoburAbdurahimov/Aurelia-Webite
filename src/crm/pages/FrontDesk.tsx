import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { FlagIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useDataStore, ROOM_NUMBERS } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';

const INCIDENT_TYPES = [
    'Noise Complaint', 'Water Leak', 'No Hot Water', 'A/C Not Working',
    'Lost Key', 'Room Service Issue', 'TV/Remote Not Working',
    'Elevator Issue', 'Safety Concern', 'Pest Reported', 'Damage to Property', 'Other',
];

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset uppercase tracking-widest whitespace-nowrap ${color}`}>
            {children}
        </span>
    );
}

export default function FrontDesk() {
    const {
        arrivals, departures, incidents, rooms,
        checkInArrival, addReservation, addIncident, resolveIncident, checkOutDeparture,
        guestOrders, guestComplaints, guestLostFound,
        updateGuestOrderStatus, updateGuestComplaintStatus, updateGuestLFStatus,
        syncFromShared,
    } = useDataStore();
    const { addToast } = useToastStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'arrivals' | 'departures' | 'incidents' | 'requests'>('arrivals');

    const freeRooms = rooms.filter(r => r.status !== 'occupied' && r.status !== 'out_of_order');

    // Poll shared localStorage every 10s to pick up guest portal activity
    const doSync = useCallback(() => { syncFromShared(); }, [syncFromShared]);
    useEffect(() => {
        doSync();
        const id = setInterval(doSync, 10000);
        const storHandler = () => doSync();
        window.addEventListener('storage', storHandler);
        return () => { clearInterval(id); window.removeEventListener('storage', storHandler); };
    }, [doSync]);

    const openRequestsCount =
        guestOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length +
        guestComplaints.filter(c => c.status === 'open' || c.status === 'in_progress').length +
        guestLostFound.filter(l => l.status === 'searching').length;

    // Walk-in form
    const [checkinModal, setCheckinModal] = useState(false);
    const [checkinForm, setCheckinForm] = useState({
        guest: '', email: '', phone: '', room: '', pax: '1', vip: false, nights: '1',
    });

    // Log incident form
    const [incidentModal, setIncidentModal] = useState(false);
    const [incidentForm, setIncidentForm] = useState({ room: '', type: '', priority: 'medium' as 'high' | 'medium' | 'low' });

    const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
    const openIncidents = incidents.filter(i => !i.resolved);

    const handleCheckin = () => {
        if (!checkinForm.guest || !checkinForm.room) { addToast('Guest name and room are required.', 'error'); return; }
        const selectedRoom = rooms.find(r => r.number === checkinForm.room);
        if (!selectedRoom || selectedRoom.status === 'occupied') {
            addToast('Selected room is not available.', 'error'); return;
        }
        addReservation({
            guest: checkinForm.guest,
            email: checkinForm.email,
            phone: checkinForm.phone,
            checkIn: new Date().toISOString().slice(0, 10),
            checkOut: new Date(Date.now() + parseInt(checkinForm.nights) * 86400000).toISOString().slice(0, 10),
            room: checkinForm.room,
            roomType: selectedRoom.type,
            pax: parseInt(checkinForm.pax),
            status: 'Checked In',
            paid: false,
            channel: 'Walk-in',
            totalAmount: selectedRoom.pricePerNight * parseInt(checkinForm.nights),
            notes: checkinForm.vip ? 'VIP Walk-in Guest' : '',
        });
        addToast(`Walk-in check-in for ${checkinForm.guest} — Room #${checkinForm.room} completed.`, 'success');
        setCheckinForm({ guest: '', email: '', phone: '', room: '', pax: '1', vip: false, nights: '1' });
        setCheckinModal(false);
    };

    const handleIncident = () => {
        if (!incidentForm.room || !incidentForm.type) { addToast('Room and incident type are required.', 'error'); return; }
        addIncident({ room: incidentForm.room, type: incidentForm.type, priority: incidentForm.priority, time: new Date().toTimeString().slice(0, 5) });
        addToast(`Incident logged for Room #${incidentForm.room}: ${incidentForm.type}.`, 'info');
        setIncidentForm({ room: '', type: '', priority: 'medium' });
        setIncidentModal(false);
    };

    const selectedCheckinRoom = checkinForm.room ? rooms.find(r => r.number === checkinForm.room) : null;

    return (
        <div>
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-brand-primary">Front Desk Operations</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex gap-3">
                    <button onClick={() => setIncidentModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-primary ring-1 ring-brand-primary/30 hover:bg-brand-surface transition-colors">
                        <FlagIcon className="h-4 w-4" /> Log Incident
                    </button>
                    <button onClick={() => setCheckinModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary transition-colors shadow-sm">
                        <PlusIcon className="h-4 w-4" /> Walk-in Check-in
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Arriving Today', value: arrivals.filter(a => a.status === 'arriving').length, sub: `${arrivals.filter(a => a.vip).length} VIP`, color: 'bg-green-50 text-green-800 border-green-200' },
                    { label: 'Departing Today', value: departures.filter(d => d.status === 'pending_checkout').length, sub: `${departures.filter(d => d.balance > 0).length} balance due`, color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
                    { label: 'Rooms Occupied', value: `${occupiedCount}/${rooms.length}`, sub: `${((occupiedCount / rooms.length) * 100).toFixed(1)}% occupancy`, color: 'bg-brand-surface text-brand-primary border-brand-accent/30' },
                    { label: 'Open Incidents', value: openIncidents.length, sub: `${openIncidents.filter(i => i.priority === 'high').length} high priority`, color: openIncidents.length > 0 ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200' },
                ].map(c => (
                    <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1 opacity-70">{c.label}</p>
                        <p className="text-3xl font-bold">{c.value}</p>
                        <p className="text-xs mt-1 opacity-60">{c.sub}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex gap-6">
                    {(['arrivals', 'departures', 'incidents', 'requests'] as const).map(t => (
                        <button key={t} onClick={() => setActiveTab(t)}
                            className={`pb-3 text-sm font-semibold tracking-wide capitalize border-b-2 transition-colors ${activeTab === t ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-brand-primary'}`}>
                            {t === 'requests' ? 'Guest Requests' : t}
                            {t === 'incidents' && openIncidents.length > 0 && (
                                <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{openIncidents.length}</span>
                            )}
                            {t === 'requests' && openRequestsCount > 0 && (
                                <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{openRequestsCount}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Arrivals */}
            {activeTab === 'arrivals' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Reservation', 'Guest', 'Room', 'ETA', 'Pax', 'Status', 'Action'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {arrivals.map(a => (
                                <tr key={a.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs text-brand-accent font-semibold">{a.id}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${a.vip ? 'bg-brand-accent text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                {a.guest.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{a.guest}</p>
                                                {a.vip && <p className="text-xs text-brand-accent font-semibold">★ VIP</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm font-bold text-brand-primary">#{a.room}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{a.eta}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{a.pax}</td>
                                    <td className="px-4 py-3">
                                        {a.status === 'checked_in'
                                            ? <Badge color="text-green-700 bg-green-50 ring-green-600/20">Checked In</Badge>
                                            : <Badge color="text-indigo-700 bg-indigo-50 ring-indigo-600/20">Arriving</Badge>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {a.status === 'arriving' ? (
                                            <button onClick={() => { checkInArrival(a.id); addToast(`${a.guest} checked in to Room #${a.room}.`, 'success'); }}
                                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-secondary transition-colors">
                                                Check In
                                            </button>
                                        ) : <span className="text-xs text-green-600 font-semibold">✓ Done</span>}
                                    </td>
                                </tr>
                            ))}
                            {arrivals.length === 0 && (
                                <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm italic">No arrivals today. Create a booking or walk-in check-in.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Departures */}
            {activeTab === 'departures' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Reservation', 'Guest', 'Room', 'Checkout By', 'Balance', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {departures.map(d => (
                                <tr key={d.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs text-brand-accent font-semibold">{d.id}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{d.guest}</td>
                                    <td className="px-4 py-3 font-mono text-sm font-bold text-brand-primary">#{d.room}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{d.checkout}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {d.balance > 0 ? <span className="text-red-600 font-bold">€{d.balance}</span>
                                            : <span className="text-green-600 font-semibold">Settled</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge color={d.status === 'checked_out' ? 'text-gray-600 bg-gray-100 ring-gray-500/10' : 'text-yellow-800 bg-yellow-50 ring-yellow-600/20'}>
                                            {d.status.replace('_', ' ')}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 flex items-center gap-2">
                                        {d.status !== 'checked_out' && (
                                            <button onClick={() => { checkOutDeparture(d.id); addToast(`${d.guest} checked out. Room #${d.room} marked dirty.`); }}
                                                className="inline-flex items-center px-3 py-1 rounded-lg border border-brand-primary/30 text-xs font-semibold text-brand-primary hover:bg-brand-surface transition-colors">
                                                Check Out
                                            </button>
                                        )}
                                        <button onClick={() => navigate('/finance')}
                                            className="text-xs font-bold text-brand-accent hover:text-brand-primary tracking-widest uppercase">Folio</button>
                                    </td>
                                </tr>
                            ))}
                            {departures.length === 0 && (
                                <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm italic">No departures scheduled today.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Incidents */}
            {activeTab === 'incidents' && (
                <div className="space-y-3">
                    {incidents.length === 0 && <p className="text-sm text-gray-400 italic py-8 text-center">No incidents logged. Hotel running smoothly!</p>}
                    {incidents.map(i => (
                        <div key={i.id} className={`flex items-center justify-between p-4 rounded-xl border ${i.resolved ? 'bg-gray-50 border-gray-200 opacity-60' : i.priority === 'high' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                            <div className="flex items-center gap-4">
                                <FlagIcon className={`h-5 w-5 shrink-0 ${i.priority === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                                <div>
                                    <p className="font-semibold text-sm text-gray-900">Room #{i.room} — {i.type}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{i.date} at {i.time}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge color={i.priority === 'high' ? 'text-red-700 bg-red-100 ring-red-600/20' : i.priority === 'medium' ? 'text-yellow-700 bg-yellow-50 ring-yellow-600/20' : 'text-gray-600 bg-gray-100 ring-gray-500/10'}>
                                    {i.priority}
                                </Badge>
                                {i.resolved
                                    ? <Badge color="text-green-700 bg-green-50 ring-green-600/20">Resolved</Badge>
                                    : <button onClick={() => { resolveIncident(i.id); addToast('Incident marked as resolved.', 'success'); }}
                                        className="text-xs font-semibold text-brand-primary hover:text-brand-accent tracking-wider uppercase border border-brand-primary/30 px-2.5 py-1 rounded-lg hover:bg-brand-surface transition-colors">
                                        Resolve
                                    </button>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Guest Requests Tab */}
            {activeTab === 'requests' && (
                <div className="space-y-6">
                    {openRequestsCount === 0 && guestOrders.length === 0 && guestComplaints.length === 0 && guestLostFound.length === 0 && (
                        <p className="text-sm text-gray-400 italic py-8 text-center">No guest requests yet. Requests from the Guest Portal will appear here automatically.</p>
                    )}

                    {/* Room Service Orders */}
                    {guestOrders.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">🍽️ Room Service Orders</h3>
                            <div className="space-y-2">
                                {guestOrders.map(o => (
                                    <div key={o.id} className={`flex items-start justify-between p-4 rounded-xl border ${o.status === 'delivered' || o.status === 'cancelled' ? 'bg-gray-50 border-gray-200 opacity-60'
                                            : o.status === 'confirmed' ? 'bg-blue-50 border-blue-200'
                                                : 'bg-amber-50 border-amber-200'}`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs font-bold text-brand-accent">{o.reservationId}</span>
                                                <span className="text-sm font-semibold text-gray-900">{o.guestName}</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${o.status === 'pending' ? 'bg-amber-200 text-amber-800'
                                                        : o.status === 'confirmed' ? 'bg-blue-200 text-blue-800'
                                                            : o.status === 'delivered' ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-200 text-gray-600'}`}>{o.status}</span>
                                            </div>
                                            <p className="text-xs text-gray-600">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{o.createdAt} · €{o.total.toFixed(2)}</p>
                                        </div>
                                        <div className="flex gap-2 ml-4 shrink-0">
                                            {o.status === 'pending' && (
                                                <button onClick={() => { updateGuestOrderStatus(o.id, 'confirmed'); addToast(`Order ${o.id} confirmed.`, 'success'); }}
                                                    className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition-colors">Confirm</button>
                                            )}
                                            {o.status === 'confirmed' && (
                                                <button onClick={() => { updateGuestOrderStatus(o.id, 'delivered'); addToast(`Order ${o.id} marked delivered.`, 'success'); }}
                                                    className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded-lg transition-colors">Delivered</button>
                                            )}
                                            {(o.status === 'pending' || o.status === 'confirmed') && (
                                                <button onClick={() => { updateGuestOrderStatus(o.id, 'cancelled'); addToast(`Order ${o.id} cancelled.`, 'info'); }}
                                                    className="text-xs font-bold text-gray-600 border border-gray-300 hover:bg-gray-100 px-2.5 py-1 rounded-lg transition-colors">Cancel</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Complaints */}
                    {guestComplaints.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">📢 Complaints</h3>
                            <div className="space-y-2">
                                {guestComplaints.map(c => (
                                    <div key={c.id} className={`flex items-start justify-between p-4 rounded-xl border ${c.status === 'resolved' ? 'bg-gray-50 border-gray-200 opacity-60'
                                            : c.status === 'in_progress' ? 'bg-blue-50 border-blue-200'
                                                : 'bg-red-50 border-red-200'}`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs font-bold text-brand-accent">{c.reservationId}</span>
                                                <span className="text-sm font-semibold text-gray-900">{c.guestName}</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${c.status === 'open' ? 'bg-red-200 text-red-800'
                                                        : c.status === 'in_progress' ? 'bg-blue-200 text-blue-800'
                                                            : 'bg-green-100 text-green-700'}`}>{c.status.replace('_', ' ')}</span>
                                            </div>
                                            <p className="text-xs font-semibold text-gray-700">{c.category}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{c.createdAt}</p>
                                        </div>
                                        <div className="flex gap-2 ml-4 shrink-0">
                                            {c.status === 'open' && (
                                                <button onClick={() => { updateGuestComplaintStatus(c.id, 'in_progress'); addToast('Complaint marked In Progress.', 'success'); }}
                                                    className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition-colors">In Progress</button>
                                            )}
                                            {c.status !== 'resolved' && (
                                                <button onClick={() => { updateGuestComplaintStatus(c.id, 'resolved'); addToast('Complaint resolved.', 'success'); }}
                                                    className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded-lg transition-colors">Resolve</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lost & Found */}
                    {guestLostFound.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">🔍 Lost & Found</h3>
                            <div className="space-y-2">
                                {guestLostFound.map(l => (
                                    <div key={l.id} className={`flex items-start justify-between p-4 rounded-xl border ${l.status === 'claimed' ? 'bg-gray-50 border-gray-200 opacity-60'
                                            : l.status === 'found' ? 'bg-green-50 border-green-200'
                                                : 'bg-yellow-50 border-yellow-200'}`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs font-bold text-brand-accent">{l.reservationId}</span>
                                                <span className="text-sm font-semibold text-gray-900">{l.guestName}</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${l.status === 'searching' ? 'bg-yellow-200 text-yellow-800'
                                                        : l.status === 'found' ? 'bg-green-200 text-green-800'
                                                            : 'bg-gray-200 text-gray-600'}`}>{l.status}</span>
                                            </div>
                                            <p className="text-xs font-semibold text-gray-700">{l.item}</p>
                                            <p className="text-xs text-gray-400">Last seen: {l.location}</p>
                                        </div>
                                        <div className="flex gap-2 ml-4 shrink-0">
                                            {l.status === 'searching' && (
                                                <button onClick={() => { updateGuestLFStatus(l.id, 'found'); addToast('Item marked as Found.', 'success'); }}
                                                    className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded-lg transition-colors">Found</button>
                                            )}
                                            {l.status === 'found' && (
                                                <button onClick={() => { updateGuestLFStatus(l.id, 'claimed'); addToast('Item returned to guest.', 'success'); }}
                                                    className="text-xs font-bold text-white bg-brand-primary hover:bg-brand-secondary px-2.5 py-1 rounded-lg transition-colors">Claimed</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal open={checkinModal} onClose={() => setCheckinModal(false)} title="Walk-in Check-in">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Guest Name *</label>
                            <input type="text" placeholder="Full name" value={checkinForm.guest}
                                onChange={e => setCheckinForm(s => ({ ...s, guest: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Email</label>
                            <input type="email" placeholder="email@example.com" value={checkinForm.email}
                                onChange={e => setCheckinForm(s => ({ ...s, email: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Phone</label>
                            <input type="tel" placeholder="+1 555-0000" value={checkinForm.phone}
                                onChange={e => setCheckinForm(s => ({ ...s, phone: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Room * ({freeRooms.length} free)</label>
                            <select value={checkinForm.room} onChange={e => setCheckinForm(s => ({ ...s, room: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                <option value="">— Select room —</option>
                                {(['Standard', 'Deluxe', 'Suite', 'Executive'] as const).map(type => (
                                    <optgroup key={type} label={type}>
                                        {freeRooms.filter(r => r.type === type).map(r => (
                                            <option key={r.number} value={r.number}>#{r.number} — Floor {r.floor} · €{r.pricePerNight}/nt</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Nights</label>
                            <input type="number" min="1" value={checkinForm.nights}
                                onChange={e => setCheckinForm(s => ({ ...s, nights: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Guests (Pax)</label>
                            <select value={checkinForm.pax} onChange={e => setCheckinForm(s => ({ ...s, pax: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={checkinForm.vip} onChange={e => setCheckinForm(s => ({ ...s, vip: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent" />
                        <span className="text-sm font-semibold text-gray-700">★ VIP Guest</span>
                    </label>
                    {selectedCheckinRoom && (
                        <div className="p-3 bg-brand-surface rounded-lg text-xs text-brand-primary ring-1 ring-brand-primary/20">
                            Room #{selectedCheckinRoom.number} · {selectedCheckinRoom.type} · Floor {selectedCheckinRoom.floor} ·
                            {' '}€{selectedCheckinRoom.pricePerNight}/night ·
                            Total: <strong>€{selectedCheckinRoom.pricePerNight * parseInt(checkinForm.nights || '1')}</strong>
                        </div>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setCheckinModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleCheckin} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Check In</button>
                    </div>
                </div>
            </Modal>

            {/* Log Incident Modal */}
            <Modal open={incidentModal} onClose={() => setIncidentModal(false)} title="Log Incident">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Room *</label>
                        <select value={incidentForm.room} onChange={e => setIncidentForm(s => ({ ...s, room: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="">— Select room —</option>
                            {ROOM_NUMBERS.map(n => <option key={n} value={n}>#{n}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Incident Type *</label>
                        <select value={incidentForm.type} onChange={e => setIncidentForm(s => ({ ...s, type: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="">— Select type —</option>
                            {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Priority</label>
                        <select value={incidentForm.priority} onChange={e => setIncidentForm(s => ({ ...s, priority: e.target.value as any }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="high">High — Immediate action needed</option>
                            <option value="medium">Medium — Address within 2 hours</option>
                            <option value="low">Low — Scheduled resolution</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setIncidentModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleIncident} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm">Log Incident</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
