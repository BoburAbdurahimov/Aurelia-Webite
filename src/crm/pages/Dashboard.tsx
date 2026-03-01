import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import {
    HomeIcon, UserGroupIcon, BanknotesIcon, WrenchScrewdriverIcon,
    SparklesIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ArrowUpRightIcon, ArrowDownRightIcon } from '@heroicons/react/20/solid';

// ─── Mini bar chart (pure CSS/SVG) ──────────────────────────────────────────
function BarChart({ data, color = '#1e3a5f' }: { data: { label: string; value: number }[]; color?: string }) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-1.5 h-28">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1 min-w-0">
                    <span className="text-[8px] text-gray-400 font-mono truncate">
                        {d.value > 999 ? `€${(d.value / 1000).toFixed(0)}k` : d.value}
                    </span>
                    <div
                        className="w-full rounded-t-sm transition-all duration-500 hover:opacity-80 cursor-default"
                        style={{ height: `${Math.max((d.value / max) * 80, 4)}px`, backgroundColor: color }}
                        title={`${d.label}: ${d.value}`}
                    />
                    <span className="text-[9px] text-gray-400 font-semibold truncate">{d.label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Donut chart (SVG) ───────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
    const total = segments.reduce((s, d) => s + d.value, 0) || 1;
    let offset = 0;
    const r = 36, cx = 44, cy = 44, circumference = 2 * Math.PI * r;
    return (
        <div className="flex items-center gap-4">
            <svg width="88" height="88" className="shrink-0">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="14" />
                {segments.map((seg, i) => {
                    const pct = seg.value / total;
                    const dash = pct * circumference;
                    const gap = circumference - dash;
                    const strokeOff = circumference * (1 - offset / total);
                    offset += seg.value;
                    return (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                            stroke={seg.color} strokeWidth="14"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={strokeOff}
                            style={{ transition: 'all 0.6s ease' }}
                        />
                    );
                })}
                <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e3a5f">
                    {total}
                </text>
            </svg>
            <div className="space-y-1.5">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-gray-600">{s.label}</span>
                        <span className="font-bold text-gray-800 ml-auto">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Stat KPI Card ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, change, up, icon: Icon }: {
    label: string; value: string; sub: string; change?: string; up?: boolean; icon: React.ElementType;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-brand-surface rounded-lg">
                    <Icon className="h-4 w-4 text-brand-primary" />
                </div>
                {change && (
                    <span className={`flex items-center text-xs font-semibold rounded-full px-2 py-0.5 ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {up ? <ArrowUpRightIcon className="h-3 w-3" /> : <ArrowDownRightIcon className="h-3 w-3" />}
                        {change}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-brand-primary font-mono">{value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
    );
}

import React, { useState, useEffect, useCallback } from 'react';

export default function Dashboard() {
    const navigate = useNavigate();
    const { rooms, reservations, incidents, guests, folioItems, payments, workOrders,
        guestOrders, guestComplaints, guestLostFound, syncFromShared } = useDataStore();
    const [dismissed, setDismissed] = useState<string[]>([]);

    // Live sync from shared localStorage every 30s
    const doSync = useCallback(() => { syncFromShared(); }, [syncFromShared]);
    useEffect(() => {
        doSync();
        const id = setInterval(doSync, 30000);
        const handler = () => doSync();
        window.addEventListener('storage', handler);
        return () => { clearInterval(id); window.removeEventListener('storage', handler); };
    }, [doSync]);

    // ── Computed Stats
    const totalRooms = rooms.length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const clean = rooms.filter(r => r.status === 'clean').length;
    const dirty = rooms.filter(r => r.status === 'dirty').length;
    const outOfOrder = rooms.filter(r => r.status === 'out_of_order').length;
    const occupancyRate = totalRooms > 0 ? ((occupied / totalRooms) * 100).toFixed(1) : '0.0';

    const totalRevenue = folioItems.filter(f => f.amount > 0).reduce((s, f) => s + f.amount, 0);
    const totalReceived = folioItems.filter(f => f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0);
    const outstanding = totalRevenue - totalReceived;

    const checkedInRes = reservations.filter(r => r.status === 'Checked In' || r.status === 'Confirmed');
    const pendingRes = reservations.filter(r => r.status === 'Pending');
    const openIncidents = incidents.filter(i => !i.resolved);

    // Guest portal live counts
    const openRequestsCount =
        guestOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length +
        guestComplaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
    const activeLFCount = guestLostFound.filter(l => l.status === 'searching').length;

    // Room type breakdown
    const roomTypeData = (['Standard', 'Deluxe', 'Suite', 'Executive'] as const).map(type => ({
        label: type,
        value: rooms.filter(r => r.type === type).length,
        color: type === 'Standard' ? '#64748b' : type === 'Deluxe' ? '#3b82f6' : type === 'Suite' ? '#8b5cf6' : '#f59e0b',
    }));

    // Room status breakdown
    const statusSegments = [
        { label: 'Occupied', value: occupied, color: '#1e3a5f' },
        { label: 'Clean', value: clean, color: '#16a34a' },
        { label: 'Dirty', value: dirty, color: '#dc2626' },
        { label: 'Out of Order', value: outOfOrder, color: '#9ca3af' },
    ].filter(s => s.value > 0);

    // By-floor occupancy
    const floor1Rooms = rooms.filter(r => r.floor === '1');
    const floor2Rooms = rooms.filter(r => r.floor === '2');
    const floor1Occ = floor1Rooms.filter(r => r.status === 'occupied').length;
    const floor2Occ = floor2Rooms.filter(r => r.status === 'occupied').length;

    // Revenue by type (from folio items)
    const chargeByType = [
        { label: 'Room', value: folioItems.filter(f => f.type === 'charge').reduce((s, f) => s + f.amount, 0) },
        { label: 'F&B', value: folioItems.filter(f => f.type === 'beverage').reduce((s, f) => s + f.amount, 0) },
        { label: 'Services', value: folioItems.filter(f => f.type === 'service').reduce((s, f) => s + f.amount, 0) },
        { label: 'Tax', value: folioItems.filter(f => f.type === 'tax').reduce((s, f) => s + f.amount, 0) },
    ];

    // Work orders summary
    const openWOs = workOrders.filter(w => w.status === 'open').length;
    const criticalWOs = workOrders.filter(w => w.severity === 'critical').length;

    // Urgent actions
    const urgentActions = [
        ...openIncidents.slice(0, 2).map(i => ({
            key: `inc-${i.id}`,
            label: `Room ${i.room} — ${i.type}`,
            color: 'bg-red-50 text-red-900 border-red-200',
            action: 'View',
            route: '/front-desk',
        })),
        ...criticalWOs > 0 ? [{
            key: 'crit-wo',
            label: `${criticalWOs} Critical Work Order${criticalWOs > 1 ? 's' : ''} Open`,
            color: 'bg-orange-50 text-orange-900 border-orange-200',
            action: 'Dispatch',
            route: '/maintenance',
        }] : [],
        ...pendingRes.slice(0, 1).map(r => ({
            key: `res-${r.id}`,
            label: `Pending Reservation: ${r.guest} (${r.id})`,
            color: 'bg-yellow-50 text-yellow-900 border-yellow-200',
            action: 'Review',
            route: '/reservations',
        })),
    ].filter(a => !dismissed.includes(a.key));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-brand-primary">Executive Overview</h1>
                <p className="text-sm text-gray-500 mt-1">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {totalRooms}-room hotel, 2 floors
                </p>
            </div>

            {/* ── KPI Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <KpiCard label="Occupancy Rate" value={`${occupancyRate}%`}
                    sub={`${occupied} / ${totalRooms} rooms`}
                    icon={HomeIcon} />
                <KpiCard label="Active Guests" value={String(guests.length)}
                    sub={`${checkedInRes.length} checked in`}
                    icon={UserGroupIcon} />
                <KpiCard label="Total Revenue" value={totalRevenue > 0 ? `€${totalRevenue.toLocaleString()}` : '€0'}
                    sub={`€${outstanding.toFixed(0)} outstanding`}
                    icon={BanknotesIcon} />
                <KpiCard label="Open Work Orders" value={String(openWOs)}
                    sub={`${criticalWOs} critical`}
                    icon={WrenchScrewdriverIcon} />
                <KpiCard label="Open Requests" value={String(openRequestsCount)}
                    sub="Orders & Complaints"
                    icon={SparklesIcon} />
                <KpiCard label="Lost & Found" value={String(activeLFCount)}
                    sub="Currently Searching"
                    icon={WrenchScrewdriverIcon} />
            </div>

            {/* ── Secondary KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-green-700 mb-1">Clean Rooms</p>
                    <p className="text-3xl font-bold text-green-800">{clean}</p>
                    <p className="text-xs text-green-600">{totalRooms - clean - outOfOrder} need attention</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-700 mb-1">Dirty Rooms</p>
                    <p className="text-3xl font-bold text-red-800">{dirty}</p>
                    <p className="text-xs text-red-600">Require housekeeping</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-yellow-700 mb-1">Pending Bookings</p>
                    <p className="text-3xl font-bold text-yellow-800">{pendingRes.length}</p>
                    <p className="text-xs text-yellow-600">Awaiting confirmation</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-1">Out of Order</p>
                    <p className="text-3xl font-bold text-gray-700">{outOfOrder}</p>
                    <p className="text-xs text-gray-500">Maintenance required</p>
                </div>
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Room Status Donut */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h4 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4 flex items-center gap-2">
                        <HomeIcon className="h-4 w-4" /> Room Status
                    </h4>
                    {totalRooms > 0 ? (
                        <DonutChart segments={statusSegments.length > 0 ? statusSegments : [{ label: 'All Clean', value: totalRooms, color: '#16a34a' }]} />
                    ) : (
                        <p className="text-sm text-gray-400 italic">No rooms yet.</p>
                    )}
                </div>

                {/* Revenue by Category */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h4 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4 flex items-center gap-2">
                        <BanknotesIcon className="h-4 w-4" /> Revenue Breakdown
                    </h4>
                    {totalRevenue > 0 ? (
                        <BarChart data={chargeByType} color="#1e3a5f" />
                    ) : (
                        <div className="flex items-center justify-center h-28 text-gray-400 text-sm italic">
                            No revenue yet. Start adding bookings.
                        </div>
                    )}
                </div>

                {/* Room Type Mix */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h4 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4 flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4" /> Room Mix
                    </h4>
                    <DonutChart segments={roomTypeData} />
                </div>
            </div>

            {/* ── Floor Occupancy ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[
                    { floor: '1', rooms: floor1Rooms, occ: floor1Occ },
                    { floor: '2', rooms: floor2Rooms, occ: floor2Occ },
                ].map(f => (
                    <div key={f.floor} className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold tracking-widest uppercase text-gray-500">Floor {f.floor} — {f.rooms.length} Rooms</h4>
                            <span className="text-xs font-semibold text-brand-primary">
                                {f.rooms.length > 0 ? ((f.occ / f.rooms.length) * 100).toFixed(0) : 0}% occupied
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                            <div
                                className="bg-brand-primary rounded-full h-2 transition-all duration-700"
                                style={{ width: `${f.rooms.length > 0 ? (f.occ / f.rooms.length) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                            {f.rooms.map(r => (
                                <div key={r.number}
                                    title={`#${r.number} — ${r.type} — ${r.status}`}
                                    className={`h-5 w-full rounded text-center text-[8px] leading-5 font-bold cursor-default transition-opacity hover:opacity-80
                                        ${r.status === 'occupied' ? 'bg-brand-primary text-white' :
                                            r.status === 'dirty' ? 'bg-red-400 text-white' :
                                                r.status === 'out_of_order' ? 'bg-gray-400 text-white' :
                                                    r.status === 'inspected' ? 'bg-blue-400 text-white' :
                                                        'bg-green-200 text-green-800'}`}
                                >
                                    {r.number.slice(-2)}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                            {['occupied', 'clean', 'dirty', 'inspected', 'out_of_order'].map(s => (
                                <span key={s} className="flex items-center gap-1">
                                    <span className={`h-2 w-2 rounded-full ${s === 'occupied' ? 'bg-brand-primary' : s === 'clean' ? 'bg-green-400' : s === 'dirty' ? 'bg-red-400' : s === 'inspected' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                                    {s.replace('_', ' ')}: {f.rooms.filter(r => r.status === s).length}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Bottom Row: Urgent Actions + Staff Activity ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Urgent Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h4 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-400" /> Urgent Actions
                    </h4>
                    {urgentActions.length === 0 ? (
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                            <span className="text-xl">✓</span>
                            <p className="text-sm text-green-700 font-semibold">All clear — no urgent actions!</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {urgentActions.map(a => (
                                <li key={a.key} className={`flex items-center justify-between text-sm p-3 rounded-lg border ${a.color}`}>
                                    <span className="font-semibold text-xs">{a.label}</span>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <button onClick={() => navigate(a.route)}
                                            className="text-xs tracking-wider uppercase underline font-bold">{a.action}</button>
                                        <button onClick={() => setDismissed(d => [...d, a.key])} className="text-gray-400 hover:text-gray-600">✕</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Quick Stats: Financials */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h4 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4 flex items-center gap-2">
                        <ArrowTrendingUpIcon className="h-4 w-4" /> Financial Summary
                    </h4>
                    <div className="space-y-3">
                        {[
                            { label: 'Total Charges Raised', value: `€${totalRevenue.toFixed(2)}`, color: 'text-gray-900' },
                            { label: 'Payments Received', value: `€${totalReceived.toFixed(2)}`, color: 'text-green-700' },
                            { label: 'Outstanding Balance', value: `€${outstanding.toFixed(2)}`, color: outstanding > 0 ? 'text-red-600' : 'text-green-700' },
                            { label: 'Active Reservations', value: String(checkedInRes.length + pendingRes.length), color: 'text-brand-primary' },
                            { label: 'Total Payments Processed', value: String(payments.length), color: 'text-gray-700' },
                        ].map(row => (
                            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 text-sm last:border-0">
                                <span className="text-gray-600">{row.label}</span>
                                <span className={`font-bold font-mono ${row.color}`}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => navigate('/finance')}
                        className="mt-4 w-full py-2 text-xs font-semibold uppercase tracking-widest text-brand-primary hover:bg-brand-surface border border-brand-primary/30 rounded-lg transition-colors">
                        Open Finance →
                    </button>
                </div>
            </div>
        </div>
    );
}
