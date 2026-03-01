import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import Modal from '../components/Modal';
import { useDataStore, type RoomStatus, ROOM_NUMBERS } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';

const STATUS_CONFIG: Record<RoomStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
    clean: { label: 'Clean', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-200' },
    dirty: { label: 'Dirty', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
    inspected: { label: 'Inspected', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' },
    out_of_order: { label: 'Out of Order', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', border: 'border-gray-300' },
    occupied: { label: 'Occupied', bg: 'bg-brand-surface', text: 'text-brand-primary', dot: 'bg-brand-accent', border: 'border-brand-accent/30' },
};

const HOUSEKEEPING_STAFF = ['Maria K.', 'Ana P.', 'Sofia R.', 'Unassigned'];

export default function Housekeeping() {
    const { rooms, lostFound, updateRoomStatus, addLostFound, claimLostFound } = useDataStore();
    const { addToast } = useToastStore();
    const [view, setView] = useState<'board' | 'tasks' | 'lost_found'>('board');
    const [filter, setFilter] = useState<RoomStatus | 'all'>('all');
    const [lfModal, setLfModal] = useState(false);
    const [lfForm, setLfForm] = useState({ item: '', room: '', location: '' });

    // Status-change popover
    const [statusModal, setStatusModal] = useState<{ room: string } | null>(null);
    const [newStatus, setNewStatus] = useState<RoomStatus>('clean');
    const [assignedTo, setAssignedTo] = useState('Unassigned');
    const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

    const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter);
    const floors = ['1', '2'] as const;

    const counts = {
        clean: rooms.filter(r => r.status === 'clean').length,
        dirty: rooms.filter(r => r.status === 'dirty').length,
        inspected: rooms.filter(r => r.status === 'inspected').length,
        out_of_order: rooms.filter(r => r.status === 'out_of_order').length,
        occupied: rooms.filter(r => r.status === 'occupied').length,
    };

    const handleAddLF = () => {
        if (!lfForm.item || !lfForm.room) { addToast('Item name and room are required.', 'error'); return; }
        addLostFound({ item: lfForm.item, room: lfForm.room, location: lfForm.location || 'Front Desk', found: new Date().toISOString().slice(0, 10), status: 'In Storage' });
        addToast(`Lost & Found: "${lfForm.item}" recorded.`);
        setLfForm({ item: '', room: '', location: '' });
        setLfModal(false);
    };

    const openStatusModal = (roomNum: string) => {
        const room = rooms.find(r => r.number === roomNum);
        if (!room) return;
        setNewStatus(room.status);
        setAssignedTo(room.assignedTo || 'Unassigned');
        setPriority(room.priority || 'medium');
        setStatusModal({ room: roomNum });
    };

    const handleStatusChange = () => {
        if (!statusModal) return;
        updateRoomStatus(
            statusModal.room,
            newStatus,
            assignedTo === 'Unassigned' ? undefined : assignedTo,
            newStatus === 'dirty' ? priority : undefined,
        );
        addToast(`Room #${statusModal.room} → ${STATUS_CONFIG[newStatus].label}.`);
        setStatusModal(null);
    };

    return (
        <div>
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-brand-primary">Housekeeping</h1>
                    <p className="mt-1 text-sm text-gray-500">{rooms.length} rooms across 2 floors · Room status board and lost & found</p>
                </div>
                <button onClick={() => setLfModal(true)}
                    className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-white text-brand-primary rounded-lg text-sm font-semibold ring-1 ring-brand-primary/20 hover:bg-brand-surface transition-colors">
                    <PlusIcon className="h-4 w-4" /> Add Lost & Found
                </button>
            </div>

            {/* Status summary */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={() => setFilter('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all ${filter === 'all' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    All Rooms <span className="font-mono">{rooms.length}</span>
                </button>
                {(Object.entries(STATUS_CONFIG) as [RoomStatus, typeof STATUS_CONFIG[RoomStatus]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all ${filter === key ? `${cfg.bg} ${cfg.text} ${cfg.border} scale-105 shadow-sm` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        {cfg.label} <span className="font-mono">{counts[key]}</span>
                    </button>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex gap-6">
                    {(['board', 'tasks', 'lost_found'] as const).map(t => (
                        <button key={t} onClick={() => setView(t)}
                            className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-colors ${view === t ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-brand-primary'}`}>
                            {t === 'board' ? 'Room Board' : t === 'tasks' ? `Tasks (${counts.dirty})` : 'Lost & Found'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Room Board */}
            {view === 'board' && (
                <div className="space-y-8">
                    {floors.map(floor => {
                        const floorRooms = filtered.filter(r => r.floor === floor);
                        if (floorRooms.length === 0) return null;
                        return (
                            <div key={floor}>
                                <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">
                                    Floor {floor} — {floorRooms.length} rooms shown
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                    {floorRooms.map(room => {
                                        const cfg = STATUS_CONFIG[room.status];
                                        return (
                                            <button key={room.number} onClick={() => openStatusModal(room.number)}
                                                className={`rounded-xl border p-3 text-left transition-all hover:shadow-md hover:scale-[1.02] ${cfg.bg} ${cfg.border}`}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="font-mono font-bold text-sm text-gray-900">#{room.number}</span>
                                                    <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                                                </div>
                                                <p className="text-[10px] text-gray-500 mb-0.5">{room.type}</p>
                                                <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
                                                {room.assignedTo && (
                                                    <p className="text-[10px] text-gray-400 mt-1 truncate">→ {room.assignedTo}</p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && <p className="text-sm text-gray-400 italic text-center py-8">No rooms match this filter.</p>}
                </div>
            )}

            {/* Tasks View */}
            {view === 'tasks' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Room', 'Type', 'Task', 'Priority', 'Assigned To', 'Floor', 'Action'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {rooms.filter(r => r.status === 'dirty').map(r => (
                                <tr key={r.number} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono font-bold text-sm text-brand-primary">#{r.number}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{r.type}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">Full Turndown</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.priority === 'high' ? 'bg-red-100 text-red-700' : r.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {r.priority || 'low'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{r.assignedTo || <span className="text-gray-400 italic">Unassigned</span>}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">Floor {r.floor}</td>
                                    <td className="px-4 py-3 flex gap-2">
                                        <button onClick={() => { updateRoomStatus(r.number, 'clean'); addToast(`Room #${r.number} marked Clean.`); }}
                                            className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition-colors">✓ Clean</button>
                                        <button onClick={() => { updateRoomStatus(r.number, 'inspected'); addToast(`Room #${r.number} marked Inspected.`); }}
                                            className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors">✓ Inspect</button>
                                    </td>
                                </tr>
                            ))}
                            {rooms.filter(r => r.status === 'dirty').length === 0 && (
                                <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm italic">All rooms are clean ✓</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Lost & Found */}
            {view === 'lost_found' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Item', 'Found in Room', 'Date Found', 'Storage Location', 'Status', 'Action'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {lostFound.map(l => (
                                <tr key={l.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{l.item}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-brand-accent">#{l.room}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{l.found}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{l.location}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${l.status === 'Claimed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'}`}>
                                            {l.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {l.status !== 'Claimed' && (
                                            <button onClick={() => { claimLostFound(l.id); addToast(`"${l.item}" marked as claimed.`); }}
                                                className="text-xs font-bold text-brand-accent hover:text-brand-primary tracking-widest uppercase">Mark Claimed</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {lostFound.length === 0 && (
                                <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-sm italic">No lost & found items recorded.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Status Change Modal */}
            <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title={`Update Room #${statusModal?.room}`} size="sm">
                {statusModal && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">New Status</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.entries(STATUS_CONFIG) as [RoomStatus, typeof STATUS_CONFIG[RoomStatus]][]).map(([key, cfg]) => (
                                    <button key={key} onClick={() => setNewStatus(key)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${newStatus === key ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-1 ring-current` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                                        {cfg.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {newStatus === 'dirty' && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Assign To</label>
                                    <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                        {HOUSEKEEPING_STAFF.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Priority</label>
                                    <select value={priority} onChange={e => setPriority(e.target.value as any)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setStatusModal(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleStatusChange} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Update Status</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Add Lost & Found Modal */}
            <Modal open={lfModal} onClose={() => setLfModal(false)} title="Add Lost & Found Item" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Item Description *</label>
                        <input type="text" placeholder="e.g. Black leather wallet" value={lfForm.item}
                            onChange={e => setLfForm(s => ({ ...s, item: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Found in Room *</label>
                        <select value={lfForm.room} onChange={e => setLfForm(s => ({ ...s, room: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="">— Select room —</option>
                            {ROOM_NUMBERS.map(n => <option key={n} value={n}>#{n}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Storage Location</label>
                        <input type="text" placeholder="e.g. Safe Room A-4" value={lfForm.location}
                            onChange={e => setLfForm(s => ({ ...s, location: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setLfModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleAddLF} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Save Item</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
