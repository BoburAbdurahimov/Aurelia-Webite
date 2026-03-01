import { useDataStore } from '../store/dataStore';
import { getSharedDataSync } from '../store/guestStore';
import {
    ChartBarIcon, BanknotesIcon, HomeIcon, UserGroupIcon,
    WrenchScrewdriverIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

// Simple SVG bar chart
function HBar({ label, value, max, color = '#1e3a5f' }: { label: string; value: number; max: number; color?: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="flex items-center gap-3 text-sm">
            <span className="w-28 text-xs text-gray-500 text-right shrink-0 truncate">{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div className="h-5 rounded-full transition-all duration-700 flex items-center pl-2"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}>
                    {pct > 20 && <span className="text-[10px] font-bold text-white font-mono">{value}</span>}
                </div>
            </div>
            {pct <= 20 && <span className="text-xs font-mono font-bold text-gray-700 w-10 text-left">{value}</span>}
        </div>
    );
}

// KPI card
function Kpi({ label, value, sub, color = 'bg-white' }: { label: string; value: string; sub: string; color?: string }) {
    return (
        <div className={`${color} rounded-xl border border-gray-200 p-5`}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold font-mono text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
    );
}

export default function Reports() {
    const { rooms, reservations, folioItems, payments, workOrders, guests, incidents } = useDataStore();
    const sharedData = getSharedDataSync();
    const today = new Date().toISOString().slice(0, 10);

    // ── Occupancy
    const totalRooms = rooms.length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const occupancyRate = totalRooms > 0 ? ((occupied / totalRooms) * 100).toFixed(1) : '0.0';
    // ── Room type stats
    const roomTypes = (['Standard', 'Deluxe', 'Suite', 'Executive'] as const).map(type => ({
        type,
        total: rooms.filter(r => r.type === type).length,
        occupied: rooms.filter(r => r.type === type && r.status === 'occupied').length,
        revenue: reservations.filter(r => r.roomType === type).reduce((s, r) => s + r.totalAmount, 0),
    }));

    // ── Revenue
    const totalCharges = folioItems.filter(f => f.amount > 0).reduce((s, f) => s + f.amount, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const roomRevenue = folioItems.filter(f => f.type === 'charge').reduce((s, f) => s + f.amount, 0);
    const fbRevenue = folioItems.filter(f => f.type === 'beverage').reduce((s, f) => s + f.amount, 0);
    const serviceRevenue = folioItems.filter(f => f.type === 'service').reduce((s, f) => s + f.amount, 0);
    const taxRevenue = folioItems.filter(f => f.type === 'tax').reduce((s, f) => s + f.amount, 0);

    // ── Guest stats
    const vipGuests = guests.filter(g => g.vip).length;
    const repeatGuests = guests.filter(g => g.stays > 1).length;
    const avgSpend = guests.length > 0 ? guests.reduce((s, g) => s + g.totalSpend, 0) / guests.length : 0;

    // ── Reservations by channel
    const channels = [...new Set(reservations.map(r => r.channel))];
    const channelData = channels.map(c => ({
        channel: c,
        count: reservations.filter(r => r.channel === c).length,
        revenue: reservations.filter(r => r.channel === c).reduce((s, r) => s + r.totalAmount, 0),
    }));

    // ── Maintenance
    const openWOs = workOrders.filter(w => w.status === 'open').length;
    const completedWOs = workOrders.filter(w => w.status === 'completed').length;
    const criticalWOs = workOrders.filter(w => w.severity === 'critical').length;
    const maintenanceCost = workOrders.filter(w => w.cost).reduce((s, w) => s + (w.cost || 0), 0);

    // ── Incidents
    const openIncidents = incidents.filter(i => !i.resolved).length;
    const resolvedIncidents = incidents.filter(i => i.resolved).length;

    // ── Online bookings from landing page
    const webBookings = sharedData.bookings.length;
    const webRevenue = sharedData.bookings.reduce((s, b) => s + b.totalAmount, 0);
    const guestOrders = sharedData.guestOrders.length;
    const guestComplaints = sharedData.guestComplaints.filter(c => c.status !== 'resolved').length;

    const handleExport = () => {
        const rows = [
            ['Metric', 'Value'],
            ['Occupancy Rate', `${occupancyRate}%`],
            ['Occupied Rooms', occupied],
            ['Total Rooms', totalRooms],
            ['Total Charges', `€${totalCharges.toFixed(2)}`],
            ['Total Received', `€${totalPaid.toFixed(2)}`],
            ['Outstanding', `€${(totalCharges - totalPaid).toFixed(2)}`],
            ['Reservations', reservations.length],
            ['Guests', guests.length],
            ['VIP Guests', vipGuests],
            ['Open Work Orders', openWOs],
            ['Maintenance Cost', `€${maintenanceCost}`],
            ['Open Incidents', openIncidents],
            ['Landing Page Bookings', webBookings],
            ['Guest F&B Orders', guestOrders],
            ['Guest Complaints', guestComplaints],
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${today}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const maxChannelCount = Math.max(...channelData.map(c => c.count), 1);

    return (
        <div>
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-brand-primary">Reports & Analytics</h1>
                    <p className="mt-1 text-sm text-gray-500">Hotel performance data · as of {today}</p>
                </div>
                <button onClick={handleExport}
                    className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-white text-brand-primary rounded-lg text-sm font-semibold ring-1 ring-brand-primary/30 hover:bg-brand-surface transition-colors">
                    <ArrowDownTrayIcon className="h-4 w-4" /> Export CSV
                </button>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Kpi label="Occupancy" value={`${occupancyRate}%`} sub={`${occupied}/${totalRooms} rooms`} color="bg-brand-surface" />
                <Kpi label="Total Revenue" value={`€${totalCharges.toFixed(0)}`} sub={`€${totalPaid.toFixed(0)} received`} />
                <Kpi label="Total Reservations" value={String(reservations.length)} sub={`${webBookings} via website`} />
                <Kpi label="Active Guests" value={String(guests.length)} sub={`${vipGuests} VIP · ${repeatGuests} repeat`} />
            </div>

            {/* Section: Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <BanknotesIcon className="h-4 w-4" /> Revenue by Category
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Room Charges', value: roomRevenue, color: '#1e3a5f' },
                            { label: 'F&B / Beverage', value: fbRevenue, color: '#d97706' },
                            { label: 'Hotel Services', value: serviceRevenue, color: '#7c3aed' },
                            { label: 'Tax Collected', value: taxRevenue, color: '#6b7280' },
                        ].map(item => (
                            <HBar key={item.label} label={item.label} value={Math.round(item.value)}
                                max={Math.max(roomRevenue, fbRevenue, serviceRevenue, taxRevenue, 1)} color={item.color} />
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                        <span className="text-gray-500">Grand Total</span>
                        <span className="font-bold font-mono text-brand-primary">€{totalCharges.toFixed(2)}</span>
                    </div>
                </div>

                {/* Room Type Performance */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <HomeIcon className="h-4 w-4" /> Room Type Performance
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="text-left pb-2">Type</th>
                                    <th className="text-center pb-2">Rooms</th>
                                    <th className="text-center pb-2">Occupied</th>
                                    <th className="text-right pb-2">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {roomTypes.map(rt => (
                                    <tr key={rt.type}>
                                        <td className="py-2.5 font-semibold text-gray-800">{rt.type}</td>
                                        <td className="py-2.5 text-center font-mono text-gray-600">{rt.total}</td>
                                        <td className="py-2.5 text-center">
                                            <span className={`font-mono font-bold ${rt.occupied > 0 ? 'text-brand-primary' : 'text-gray-400'}`}>{rt.occupied}</span>
                                        </td>
                                        <td className="py-2.5 text-right font-mono font-bold text-gray-800">€{rt.revenue.toFixed(0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Section: Channels, Maintenance, Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Booking Channels */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <ChartBarIcon className="h-4 w-4" /> Booking Channels
                    </h3>
                    {channelData.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No reservations yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {channelData.map(c => (
                                <HBar key={c.channel} label={c.channel} value={c.count} max={maxChannelCount} />
                            ))}
                        </div>
                    )}
                    {webBookings > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                            + {webBookings} web bookings · €{webRevenue.toFixed(0)} total
                        </div>
                    )}
                </div>

                {/* Maintenance */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="h-4 w-4" /> Maintenance
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Open', value: openWOs, color: '#6366f1' },
                            { label: 'Completed', value: completedWOs, color: '#16a34a' },
                            { label: 'Critical', value: criticalWOs, color: '#dc2626' },
                        ].map(item => (
                            <HBar key={item.label} label={item.label} value={item.value}
                                max={Math.max(openWOs, completedWOs, criticalWOs, 1)} color={item.color} />
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 text-sm flex justify-between">
                        <span className="text-gray-500">Maintenance spend</span>
                        <span className="font-mono font-bold text-gray-800">€{maintenanceCost}</span>
                    </div>
                </div>

                {/* Guest Satisfaction */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <UserGroupIcon className="h-4 w-4" /> Guest Activity
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Total Guests', value: guests.length },
                            { label: 'VIP Guests', value: vipGuests },
                            { label: 'Repeat Guests', value: repeatGuests },
                            { label: 'F&B Orders', value: guestOrders },
                            { label: 'Complaints', value: sharedData.guestComplaints.length },
                            { label: 'Incidents', value: incidents.length },
                            { label: 'Resolved', value: resolvedIncidents },
                        ].map(item => (
                            <div key={item.label} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                                <span className="text-gray-500">{item.label}</span>
                                <span className="font-bold font-mono text-gray-800">{item.value}</span>
                            </div>
                        ))}
                        {guests.length > 0 && (
                            <div className="pt-1 text-xs text-gray-400">
                                Avg spend per guest: €{avgSpend.toFixed(0)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Web Bookings & Guest Portal Activity */}
            {(webBookings > 0 || guestOrders > 0) && (
                <div className="bg-gradient-to-br from-brand-surface to-white rounded-xl border border-brand-primary/20 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-4">
                        🌐 Online Guest Portal Activity
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Web Bookings', value: webBookings },
                            { label: 'F&B Orders', value: sharedData.guestOrders.length },
                            { label: 'Complaints Filed', value: sharedData.guestComplaints.length },
                            { label: 'Lost & Found Reports', value: sharedData.guestLostFound.length },
                        ].map(k => (
                            <div key={k.label} className="text-center">
                                <p className="text-3xl font-bold font-mono text-brand-primary">{k.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
