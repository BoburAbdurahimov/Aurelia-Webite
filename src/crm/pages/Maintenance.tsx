import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import { useDataStore, type WOStatus, type Severity, ROOM_NUMBERS, MAINTENANCE_CATEGORIES, MAINTENANCE_STAFF } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';

const SEVERITY: Record<Severity, string> = {
    critical: 'bg-red-100 text-red-800 ring-red-600/20',
    high: 'bg-orange-100 text-orange-800 ring-orange-600/20',
    medium: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
    low: 'bg-gray-100 text-gray-700 ring-gray-500/10',
};
const STATUS_STYLE: Record<WOStatus, string> = {
    open: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    in_progress: 'bg-brand-surface text-brand-primary ring-brand-primary/20',
    completed: 'bg-green-50 text-green-700 ring-green-600/20',
    on_hold: 'bg-gray-100 text-gray-500 ring-gray-500/10',
};

// Common areas not tied to a specific room
const COMMON_AREAS = ['Lobby', 'Restaurant', 'Pool Area', 'Gym', 'Parking', 'Conference Room', 'Spa', 'Elevator', 'Rooftop', 'Storage'];

export default function Maintenance() {
    const { workOrders, assets, rooms, addWorkOrder, updateWorkOrderStatus } = useDataStore();
    const { addToast } = useToastStore();
    const [view, setView] = useState<'workorders' | 'assets'>('workorders');
    const [filter, setFilter] = useState<WOStatus | 'all'>('all');
    const [woModal, setWoModal] = useState(false);
    const [form, setForm] = useState({
        category: '',
        description: '',
        roomType: 'room' as 'room' | 'common',
        room: '',
        commonArea: '',
        severity: 'medium' as Severity,
        assignedTo: 'Unassigned',
    });

    const filtered = filter === 'all' ? workOrders : workOrders.filter(w => w.status === filter);

    const handleAdd = () => {
        const location = form.roomType === 'room' ? form.room : form.commonArea;
        if (!form.category || !form.description || !location) {
            addToast('Category, description, and room/area are required.', 'error'); return;
        }
        addWorkOrder({
            category: form.category,
            description: form.description,
            room: location,
            severity: form.severity,
            status: 'open',
            assignedTo: form.assignedTo,
            cost: undefined,
        });
        addToast(`Work order created for ${form.roomType === 'room' ? `Room #${location}` : location}.`);
        setForm({ category: '', description: '', roomType: 'room', room: '', commonArea: '', severity: 'medium', assignedTo: 'Unassigned' });
        setWoModal(false);
    };

    const totalCost = workOrders.filter(w => w.status === 'completed' && w.cost).reduce((s, w) => s + (w.cost || 0), 0);

    return (
        <div>
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-brand-primary">Maintenance & Engineering</h1>
                    <p className="mt-1 text-sm text-gray-500">Work orders, asset registry, and preventive maintenance.</p>
                </div>
                <button onClick={() => setWoModal(true)}
                    className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
                    <PlusIcon className="h-4 w-4" /> New Work Order
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[
                    { label: 'Open', value: workOrders.filter(w => w.status === 'open').length, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                    { label: 'In Progress', value: workOrders.filter(w => w.status === 'in_progress').length, color: 'text-brand-primary bg-brand-surface border-brand-accent/30' },
                    { label: 'Critical', value: workOrders.filter(w => w.severity === 'critical').length, color: 'text-red-700 bg-red-50 border-red-200' },
                    { label: 'Completed', value: workOrders.filter(w => w.status === 'completed').length, color: 'text-green-700 bg-green-50 border-green-200' },
                    { label: 'Total Cost', value: `€${totalCost}`, color: 'text-gray-700 bg-gray-50 border-gray-200' },
                ].map(c => (
                    <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1 opacity-70">{c.label}</p>
                        <p className="text-2xl font-bold">{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex gap-6">
                    {([['workorders', 'Work Orders'], ['assets', 'Asset Registry']] as const).map(([t, label]) => (
                        <button key={t} onClick={() => setView(t)}
                            className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-colors ${view === t ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-brand-primary'}`}>
                            {label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Work Orders */}
            {view === 'workorders' && (
                <>
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {(['all', 'open', 'in_progress', 'completed', 'on_hold'] as const).map(s => (
                            <button key={s} onClick={() => setFilter(s)}
                                className={`px-3 py-1.5 text-xs rounded-full border font-semibold transition-colors ${filter === s ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                                {s.replace('_', ' ')}
                                <span className="ml-1.5 font-mono">({s === 'all' ? workOrders.length : workOrders.filter(w => w.status === s).length})</span>
                            </button>
                        ))}
                    </div>
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>{['ID', 'Category', 'Description', 'Room/Area', 'Severity', 'Status', 'Assigned', 'Cost', 'Update'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                {filtered.map(w => (
                                    <tr key={w.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs text-brand-accent font-semibold">{w.id}</td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1.5">
                                                <WrenchScrewdriverIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                {w.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={w.description}>{w.description}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-brand-primary font-semibold">{w.room}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset uppercase tracking-widest ${SEVERITY[w.severity]}`}>{w.severity}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset capitalize ${STATUS_STYLE[w.status]}`}>{w.status.replace('_', ' ')}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">{w.assignedTo}</td>
                                        <td className="px-4 py-3 font-mono text-gray-700">{w.cost !== undefined ? `€${w.cost}` : '—'}</td>
                                        <td className="px-4 py-3">
                                            <select value={w.status}
                                                onChange={e => { updateWorkOrderStatus(w.id, e.target.value as WOStatus); addToast(`${w.id} updated.`); }}
                                                className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-accent text-gray-700 bg-white">
                                                <option value="open">Open</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                                <option value="on_hold">On Hold</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={9} className="py-10 text-center text-gray-400 text-sm italic">
                                        {workOrders.length === 0 ? 'No work orders yet. Create the first one.' : 'No work orders match this filter.'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Assets */}
            {view === 'assets' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Asset', 'Type', 'Serial No.', 'Last Service', 'Next Service', 'Status'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-sm">
                            {assets.map(a => (
                                <tr key={a.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-semibold text-gray-900">{a.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{a.type}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.serial}</td>
                                    <td className="px-4 py-3 text-gray-500">{a.lastService}</td>
                                    <td className="px-4 py-3 text-gray-500">{a.nextService}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset capitalize ${a.status === 'operational' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'}`}>
                                            {a.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* New Work Order Modal */}
            <Modal open={woModal} onClose={() => setWoModal(false)} title="New Work Order">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Category *</label>
                        <select value={form.category} onChange={e => setForm(s => ({ ...s, category: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="">— Select category —</option>
                            {MAINTENANCE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Description *</label>
                        <input type="text" placeholder="Brief description of the issue" value={form.description}
                            onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                    </div>

                    {/* Location: room vs common area */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Location Type</label>
                        <div className="flex gap-2 mb-3">
                            {(['room', 'common'] as const).map(t => (
                                <button key={t} onClick={() => setForm(s => ({ ...s, roomType: t }))}
                                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${form.roomType === t ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                                    {t === 'room' ? '🛏 Guest Room' : '🏨 Common Area'}
                                </button>
                            ))}
                        </div>
                        {form.roomType === 'room' ? (
                            <select value={form.room} onChange={e => setForm(s => ({ ...s, room: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                <option value="">— Select room —</option>
                                <optgroup label="Floor 1 (101–125)">
                                    {ROOM_NUMBERS.filter(n => n.startsWith('1')).map(n => {
                                        const room = rooms.find(r => r.number === n);
                                        return <option key={n} value={n}>#{n} — {room?.type} · {room?.status}</option>;
                                    })}
                                </optgroup>
                                <optgroup label="Floor 2 (201–225)">
                                    {ROOM_NUMBERS.filter(n => n.startsWith('2')).map(n => {
                                        const room = rooms.find(r => r.number === n);
                                        return <option key={n} value={n}>#{n} — {room?.type} · {room?.status}</option>;
                                    })}
                                </optgroup>
                            </select>
                        ) : (
                            <select value={form.commonArea} onChange={e => setForm(s => ({ ...s, commonArea: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                <option value="">— Select area —</option>
                                {COMMON_AREAS.map(a => <option key={a}>{a}</option>)}
                            </select>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Severity</label>
                            <select value={form.severity} onChange={e => setForm(s => ({ ...s, severity: e.target.value as Severity }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Assign To</label>
                            <select value={form.assignedTo} onChange={e => setForm(s => ({ ...s, assignedTo: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                {MAINTENANCE_STAFF.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setWoModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleAdd} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Create Work Order</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
