import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    findGuestReservation, addGuestOrder, addGuestComplaint, addGuestLostFound,
    getSharedData, getReservationFolio, getReservationInvoices, getReservationPayments,
    addGuestPayment, generateAndStoreInvoice, purchaseAddon,
    GUEST_ADDONS, findGuestBySocialAuth, getAllBookingsByEmail, saveSocialProfile,
    type LandingBooking, type GuestOrder, type GuestComplaint, type GuestLostFound,
    type FolioItem, type Invoice, type Payment,
} from '../guestStore';
import SocialAuthButtons from '../components/SocialAuthButtons';
import type { SocialUser } from '../lib/socialAuth';

// ── Menu ─────────────────────────────────────────────────────────────────────
const MENU = [
    { category: 'Breakfast', items: [{ name: 'Continental Breakfast', price: 18 }, { name: 'Full English Breakfast', price: 24 }, { name: 'Avocado Toast & Eggs', price: 16 }, { name: 'Fresh Fruit Platter', price: 12 }] },
    { category: 'Beverages', items: [{ name: 'Espresso', price: 4 }, { name: 'Cappuccino', price: 5 }, { name: 'Prosecco (Glass)', price: 9 }, { name: 'Brunello di Montalcino', price: 22 }, { name: 'Craft Beer', price: 7 }, { name: 'Still Water', price: 3 }] },
    { category: 'Lunch & Dinner', items: [{ name: 'Pasta al Tartufo', price: 32 }, { name: 'Bistecca Fiorentina', price: 58 }, { name: 'Risotto ai Funghi', price: 28 }, { name: 'Insalata di Mare', price: 26 }, { name: 'Tiramisu', price: 11 }] },
    { category: 'Room Service', items: [{ name: 'Late Checkout Tray', price: 15 }, { name: 'Pillow Menu', price: 0 }, { name: 'Extra Towels', price: 0 }, { name: 'Turndown Service', price: 10 }] },
];

const COMPLAINT_CATS = ['Room Quality', 'Noise', 'Cleanliness', 'Amenities', 'Service', 'Food Quality', 'Billing', 'Safety', 'Other'];
const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Cash'];

type Tab = 'home' | 'order' | 'folio' | 'invoices' | 'addons' | 'complaints' | 'lostfound';

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest ${color}`}>{children}</span>;
}

// ── Invoice PDF generator ────────────────────────────────────────────────────
function openInvoicePDF(inv: Invoice) {
    const total = inv.lineItems.reduce((s, i) => s + i.amount, 0);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${inv.id}</title>
<style>body{font-family:Georgia,serif;margin:0;padding:40px;color:#1a1a2e}
.logo{font-size:28px;font-weight:700}.meta{text-align:right;font-size:13px;color:#555}
hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
table{width:100%;border-collapse:collapse;font-size:14px}
th{background:#1e3a5f;color:white;padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase}
td{padding:10px 14px;border-bottom:1px solid #f0f0f0}
.total td{font-weight:bold;font-size:16px;background:#f9fafb}
.footer{margin-top:40px;text-align:center;font-size:12px;color:#888}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;color:white;background:${inv.status === 'paid' ? '#16a34a' : '#dc2626'}}</style></head>
<body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
<div><div class="logo">AURELIA GRAND HOTEL</div><div style="font-size:13px;color:#888;margin-top:4px">Via della Seta 12, Florence · +39 055 123 4567</div></div>
<div class="meta"><div style="font-size:20px;font-weight:700">INVOICE</div><div style="font-family:monospace;margin-top:4px">${inv.id}</div>
<div>Date: ${new Date().toLocaleDateString('en-GB')}</div><div class="badge" style="margin-top:6px">${inv.status}</div></div></div>
<hr/><div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;font-size:14px"><strong>Bill To:</strong> ${inv.guest}</div>
<table><thead><tr><th>Description</th><th style="text-align:right">Amount (€)</th></tr></thead><tbody>
${inv.lineItems.map(i => `<tr><td>${i.description}</td><td style="text-align:right;font-family:monospace">${i.amount > 0 ? '+' : ''}€${i.amount.toFixed(2)}</td></tr>`).join('')}
<tr class="total"><td><strong>TOTAL DUE</strong></td><td style="text-align:right;font-family:monospace"><strong>€${Math.max(0, total).toFixed(2)}</strong></td></tr>
</tbody></table>
<div class="footer">Thank you for staying at Aurelia Grand Hotel<br/>aureliagrand.com · finance@aureliagrand.com</div>
<script>window.onload=()=>window.print();</script></body></html>`;
    const win = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
    if (!win) alert('Allow pop-ups to download the invoice.');
}

// ─────────────────────────────────────────────────────────────────────────────
export default function GuestPortal() {
    const [reservation, setReservation] = useState<LandingBooking | null>(null);
    const [loginForm, setLoginForm] = useState({ reservationId: '', email: '' });
    const [loginError, setLoginError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Social auth state
    const [socialUser, setSocialUser] = useState<SocialUser | null>(null);
    const [socialBookings, setSocialBookings] = useState<LandingBooking[]>([]);
    const [showBookingPicker, setShowBookingPicker] = useState(false);
    const [socialAuthError, setSocialAuthError] = useState('');
    const [tab, setTab] = useState<Tab>('home');
    const [tick, setTick] = useState(0);   // force re-read from Google Sheets

    const refresh = useCallback(() => setTick(t => t + 1), []);

    // Live finance data (loaded async from Google Sheets)
    const [myFolio, setMyFolio] = useState<FolioItem[]>([]);
    const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
    const [myPayments, setMyPayments] = useState<Payment[]>([]);
    const [myOrders, setMyOrders] = useState<GuestOrder[]>([]);
    const [myComplaints, setMyComplaints] = useState<GuestComplaint[]>([]);
    const [myLF, setMyLF] = useState<GuestLostFound[]>([]);
    const [dataLoading, setDataLoading] = useState(false);

    // Load data from sheets when reservation or tick changes
    useEffect(() => {
        if (!reservation) return;
        let cancelled = false;
        setDataLoading(true);
        (async () => {
            try {
                const [folio, invoices, payments, allData] = await Promise.all([
                    getReservationFolio(reservation.id),
                    getReservationInvoices(reservation.id),
                    getReservationPayments(reservation.id),
                    getSharedData(),
                ]);
                if (cancelled) return;
                setMyFolio(folio);
                setMyInvoices(invoices);
                setMyPayments(payments);
                setMyOrders(allData.guestOrders.filter(o => o.reservationId === reservation.id));
                setMyComplaints(allData.guestComplaints.filter(c => c.reservationId === reservation.id));
                setMyLF(allData.guestLostFound.filter(l => l.reservationId === reservation.id));
            } catch (err) {
                console.error('Failed to load guest data:', err);
            } finally {
                if (!cancelled) setDataLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [reservation, tick]);

    const nights = reservation
        ? Math.max(1, Math.round((new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 86400000))
        : 0;

    const folioBalance = myFolio.reduce((s, f) => s + f.amount, 0);
    const totalPaid = myPayments.filter(p => p.status === 'settled').reduce((s, p) => s + p.amount, 0);
    const balanceDue = Math.max(0, folioBalance);

    // ── Cart
    const [cart, setCart] = useState<{ name: string; price: number; qty: number }[]>([]);
    const [orderSuccess, setOrderSuccess] = useState('');
    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    // ── Complaint
    const [compForm, setCompForm] = useState({ category: '', description: '' });
    const [compMsg, setCompMsg] = useState('');

    // ── L&F
    const [lfForm, setLfForm] = useState({ item: '', location: '' });
    const [lfMsg, setLfMsg] = useState('');

    // ── Payment
    const [payModal, setPayModal] = useState(false);
    const [payAmt, setPayAmt] = useState('');
    const [payMethod, setPayMethod] = useState('Credit Card');
    const [payNote, setPayNote] = useState('');
    const [payMsg, setPayMsg] = useState('');

    // ── Add-on
    const [addonMethod, setAddonMethod] = useState('Credit Card');
    const [addonMsg, setAddonMsg] = useState('');

    // Poll Google Sheets every 15s for status updates from admin
    useEffect(() => {
        const id = setInterval(refresh, 15000);
        return () => clearInterval(id);
    }, [refresh]);

    // After any tab-switch re-read data
    useEffect(() => { refresh(); }, [tab, refresh]);

    const handleLogin = async () => {
        setLoginError('');
        setIsSubmitting(true);
        try {
            const found = await findGuestReservation(loginForm.reservationId, loginForm.email);
            if (!found) { setLoginError('No reservation found with that ID and email. Please check and try again.'); }
            else { setReservation(found); }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSocialSuccess = useCallback(async (user: SocialUser) => {
        setSocialAuthError('');
        saveSocialProfile({
            provider: user.provider,
            providerId: user.providerId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
        });
        const bookings = await getAllBookingsByEmail(user.email);
        setSocialUser(user);
        if (bookings.length === 0) {
            setSocialBookings([]);
            setShowBookingPicker(true);
        } else if (bookings.length === 1) {
            setReservation(bookings[0]);
        } else {
            setSocialBookings(bookings);
            setShowBookingPicker(true);
        }
    }, []);

    const handleSocialError = useCallback((err: string) => {
        setSocialAuthError(err);
        setTimeout(() => setSocialAuthError(''), 5000);
    }, []);

    const addToCart = (name: string, price: number) =>
        setCart(prev => { const e = prev.find(i => i.name === name); return e ? prev.map(i => i.name === name ? { ...i, qty: i.qty + 1 } : i) : [...prev, { name, price, qty: 1 }]; });
    const removeFromCart = (name: string) => setCart(prev => prev.filter(i => i.name !== name));
    const adjustCart = (name: string, delta: number) =>
        setCart(prev => prev.map(i => i.name === name ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));

    const handleOrder = async () => {
        if (!reservation || !cart.length) return;
        await addGuestOrder({ reservationId: reservation.id, guestName: reservation.guest, items: cart, total: cartTotal, status: 'pending' });
        setCart([]); refresh();
        setOrderSuccess(`Order placed! €${cartTotal.toFixed(2)} will be added to your folio.`);
        setTimeout(() => setOrderSuccess(''), 5000);
    };

    const handleComplaint = async () => {
        if (!reservation || !compForm.category || !compForm.description) return;
        await addGuestComplaint({ reservationId: reservation.id, guestName: reservation.guest, category: compForm.category, description: compForm.description, status: 'open' });
        setCompForm({ category: '', description: '' }); refresh();
        setCompMsg('Complaint logged. Our team will respond within 30 minutes.');
        setTimeout(() => setCompMsg(''), 5000);
    };

    const handleLF = async () => {
        if (!reservation || !lfForm.item) return;
        await addGuestLostFound({ reservationId: reservation.id, guestName: reservation.guest, item: lfForm.item, location: lfForm.location || 'Unknown', status: 'searching' });
        setLfForm({ item: '', location: '' }); refresh();
        setLfMsg('Report submitted. Housekeeping will search immediately.');
        setTimeout(() => setLfMsg(''), 5000);
    };

    const handlePayment = async () => {
        const amt = parseFloat(payAmt);
        if (!reservation || !amt || amt <= 0) return;
        await addGuestPayment({ reservationId: reservation.id, date: new Date().toISOString().slice(0, 10), method: payMethod, amount: amt, status: 'settled', ref: `GUEST-${Date.now()}`, note: payNote || undefined });
        refresh(); setPayModal(false); setPayAmt(''); setPayNote('');
        setPayMsg(`Payment of €${amt.toFixed(2)} recorded via ${payMethod}.`);
        setTimeout(() => setPayMsg(''), 6000);
    };

    const handleGenerateInvoice = async () => {
        if (!reservation) return;
        await generateAndStoreInvoice(reservation.id, reservation.guest);
        refresh();
    };

    const handleAddon = async (addonId: string, price: number, name: string) => {
        if (!reservation) return;
        if (!confirm(`Purchase ${name} for €${price}? Will be charged to your folio.`)) return;
        await purchaseAddon(reservation.id, addonId, reservation.guest, addonMethod);
        refresh();
        setAddonMsg(`✓ ${name} added to your stay!`);
        setTimeout(() => setAddonMsg(''), 4000);
    };

    // ── Nav tabs definition
    const TABS: [Tab, string][] = [
        ['home', '🏠 My Stay'],
        ['folio', '📊 Folio'],
        ['invoices', '🧾 Invoices'],
        ['addons', '✨ Add-ons'],
        ['order', '🍾 Room Service'],
        ['complaints', '📢 Complaints'],
        ['lostfound', '🔍 Lost & Found'],
    ];


    // ── Booking picker (multi-reservation or social no-booking state) ──────────
    if (showBookingPicker) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2c5282] to-[#1a2f4f] flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Social user card */}
                    {socialUser && (
                        <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl p-4 mb-4">
                            {socialUser.avatar
                                ? <img src={socialUser.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white/30 object-cover" />
                                : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">{socialUser.firstName[0]}</div>
                            }
                            <div>
                                <p className="text-white font-semibold text-sm">{socialUser.firstName} {socialUser.lastName}</p>
                                <p className="text-blue-200 text-xs">{socialUser.email}</p>
                            </div>
                            <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-white/20 text-white font-bold uppercase tracking-widest">
                                {socialUser.provider.toUpperCase()}
                            </span>
                        </div>
                    )}

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
                        {socialBookings.length === 0 ? (
                            /* No bookings yet */
                            <div className="text-center space-y-4">
                                <div className="text-5xl mb-2">🏨</div>
                                <h2 className="text-xl font-bold text-white">Welcome, {socialUser?.firstName}!</h2>
                                <p className="text-blue-200 text-sm">
                                    We don't have any reservations linked to <span className="text-white font-semibold">{socialUser?.email}</span> yet.
                                </p>
                                <Link to="/#suites"
                                    className="block w-full py-3 rounded-xl bg-white text-[#1e3a5f] font-bold text-sm hover:bg-blue-50 transition-colors text-center shadow-lg">
                                    Browse Rooms & Book Now →
                                </Link>
                                <button onClick={() => { setShowBookingPicker(false); setSocialUser(null); }}
                                    className="text-blue-300 text-xs hover:text-white transition-colors">
                                    ← Try a different account
                                </button>
                            </div>
                        ) : (
                            /* Multiple bookings picker */
                            <div className="space-y-4">
                                <h2 className="text-lg font-bold text-white">Select Your Reservation</h2>
                                <p className="text-blue-200 text-xs">We found {socialBookings.length} reservations for your account.</p>
                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                    {socialBookings.map(b => (
                                        <button key={b.id} onClick={() => { setReservation(b); setShowBookingPicker(false); }}
                                            className="w-full text-left bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-white font-bold font-mono text-sm">{b.id}</p>
                                                    <p className="text-blue-200 text-xs mt-0.5">{b.roomType} · {b.checkIn} → {b.checkOut}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${b.status === 'Checked In' ? 'bg-green-400/30 text-green-200' :
                                                    b.status === 'Confirmed' ? 'bg-blue-300/30  text-blue-100' :
                                                        'bg-white/20 text-white/70'}`}>{b.status}</span>
                                            </div>
                                            <p className="text-blue-300/70 text-xs mt-1">€{b.totalAmount} · {b.nights} nights</p>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => { setShowBookingPicker(false); setSocialUser(null); }}
                                    className="text-blue-300 text-xs hover:text-white transition-colors block">
                                    ← Back
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── LOGIN SCREEN
    if (!reservation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2c5282] to-[#1a2f4f] flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center mb-4 border border-white/20">
                            <span className="text-2xl">🏛</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-1">AURELIA</h1>
                        <p className="text-blue-200 text-sm uppercase tracking-widest font-semibold">Guest Portal</p>
                        <p className="text-blue-300/70 text-xs mt-2">Access your reservation, folio & services</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl space-y-5">
                        {/* Social Auth Buttons */}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-200/70 mb-3 text-center">Sign in with</p>
                            <SocialAuthButtons onSuccess={handleSocialSuccess} onError={handleSocialError} dark />
                        </div>

                        {socialAuthError && (
                            <p className="text-red-300 text-xs bg-red-500/20 rounded-lg px-3 py-2 border border-red-400/30 text-center">
                                {socialAuthError}
                            </p>
                        )}

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 border-t border-white/20" />
                            <span className="text-white/40 text-xs font-semibold uppercase tracking-widest">or</span>
                            <div className="flex-1 border-t border-white/20" />
                        </div>

                        {/* Classic reservation ID login */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-200/70 text-center">Use reservation ID</p>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1.5">Reservation ID</label>
                                <input type="text" placeholder="e.g. WEB-DEMO-001" value={loginForm.reservationId}
                                    onChange={e => setLoginForm(s => ({ ...s, reservationId: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 text-sm font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1.5">Email Address</label>
                                <input type="email" placeholder="your@email.com" value={loginForm.email}
                                    onChange={e => setLoginForm(s => ({ ...s, email: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 text-sm" />
                            </div>
                            {loginError && <p className="text-red-300 text-xs bg-red-500/20 rounded-lg px-3 py-2 border border-red-400/30">{loginError}</p>}
                            <button onClick={handleLogin} disabled={isSubmitting} className="w-full py-3 rounded-xl bg-white text-[#1e3a5f] font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg disabled:opacity-75 disabled:cursor-not-allowed">
                                {isSubmitting ? 'Authenticating...' : 'Access My Stay →'}
                            </button>
                        </div>

                        <div className="pt-2 border-t border-white/10 text-center space-y-2">
                            <p className="text-blue-300/60 text-xs">Demo: ID <span className="font-mono text-blue-200">WEB-DEMO-001</span> · email <span className="font-mono text-blue-200">guest1@aurelia-demo.com</span></p>
                            <Link to="/" className="text-blue-300 text-xs hover:text-white block">← Back to Hotel Website</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── PORTAL (logged in)
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-[#1e3a5f] text-white py-4 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">AURELIA Guest Portal</h1>
                        <p className="text-blue-200 text-xs mt-0.5">Welcome, {reservation.guest.split(' ')[0]} · {reservation.roomType} · {reservation.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {balanceDue > 0 && (
                            <button onClick={() => setPayModal(true)}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
                                ⚡ Pay €{balanceDue.toFixed(0)} Now
                            </button>
                        )}
                        <button onClick={() => setReservation(null)} className="text-xs text-blue-200 hover:text-white border border-white/20 px-3 py-1.5 rounded-lg transition-colors">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Nav */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <nav className="flex gap-0 overflow-x-auto scrollbar-none">
                        {TABS.map(([t, label]) => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-3 sm:px-4 py-4 text-xs font-semibold tracking-wide border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* ── MY STAY ── */}
                {tab === 'home' && (
                    <div className="space-y-5">
                        {/* Reservation card */}
                        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2c5282] rounded-2xl text-white p-6 shadow-lg">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <p className="text-blue-200 text-xs uppercase tracking-widest mb-1 font-semibold">Reservation</p>
                                    <p className="text-2xl font-bold font-mono">{reservation.id}</p>
                                </div>
                                <Badge color="bg-green-400 text-green-900">{reservation.status}</Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                {[
                                    { label: 'Room Type', value: reservation.roomType },
                                    { label: 'Guests', value: `${reservation.pax} guest${reservation.pax > 1 ? 's' : ''}` },
                                    { label: 'Nights', value: `${nights} night${nights > 1 ? 's' : ''}` },
                                    { label: 'Check-in', value: reservation.checkIn },
                                    { label: 'Check-out', value: reservation.checkOut },
                                    { label: 'Room Rate', value: `€${(reservation.totalAmount / nights).toFixed(0)}/night` },
                                ].map(f => (
                                    <div key={f.label}>
                                        <p className="text-blue-300/70 text-xs uppercase tracking-widest">{f.label}</p>
                                        <p className="font-semibold mt-0.5">{f.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Finance KPIs */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Room Folio', value: `€${reservation.totalAmount.toFixed(0)}`, sub: `${nights} nights`, color: 'bg-white' },
                                { label: 'Paid So Far', value: `€${totalPaid.toFixed(0)}`, sub: `${myPayments.length} payment${myPayments.length !== 1 ? 's' : ''}`, color: 'bg-green-50 text-green-800' },
                                { label: 'Balance Due', value: `€${balanceDue.toFixed(0)}`, sub: balanceDue > 0 ? 'Outstanding' : 'Settled ✓', color: balanceDue > 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800' },
                            ].map(k => (
                                <div key={k.label} className={`rounded-xl border border-gray-200 p-4 text-center shadow-sm ${k.color}`}>
                                    <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">{k.label}</p>
                                    <p className="text-2xl font-bold font-mono">{k.value}</p>
                                    <p className="text-xs mt-0.5 opacity-60">{k.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Pay Now button (mobile) */}
                        {balanceDue > 0 && (
                            <button onClick={() => setPayModal(true)}
                                className="sm:hidden w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">
                                ⚡ Pay Balance €{balanceDue.toFixed(2)} Now
                            </button>
                        )}

                        {payMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-semibold">✓ {payMsg}</div>}

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {([
                                { tab: 'folio' as Tab, icon: '📊', label: 'View Folio' },
                                { tab: 'invoices' as Tab, icon: '🧾', label: 'Invoices' },
                                { tab: 'addons' as Tab, icon: '✨', label: 'Add-ons' },
                                { tab: 'order' as Tab, icon: '🍽️', label: 'Room Service' },
                            ]).map(a => (
                                <button key={a.tab} onClick={() => setTab(a.tab)}
                                    className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-[#1e3a5f] hover:shadow-md transition-all group">
                                    <span className="text-2xl mb-2 block">{a.icon}</span>
                                    <span className="text-xs font-semibold text-gray-700 group-hover:text-[#1e3a5f]">{a.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Notes */}
                        {reservation.notes && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                                <p className="font-bold mb-1">📝 Your Notes on File</p>
                                <p>{reservation.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── FOLIO ── */}
                {tab === 'folio' && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">My Folio</h2>
                            <button onClick={handleGenerateInvoice}
                                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                                Generate Invoice
                            </button>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>{['Date', 'Description', 'Type', 'Amount'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm">
                                    {myFolio.map(f => (
                                        <tr key={f.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{f.date}</td>
                                            <td className="px-4 py-3 text-gray-800">{f.description}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-widest ${f.type === 'payment' ? 'bg-green-100 text-green-700' :
                                                    f.type === 'tax' ? 'bg-gray-100 text-gray-600' :
                                                        f.type === 'room' ? 'bg-blue-50 text-blue-700' :
                                                            f.type === 'addon' ? 'bg-purple-50 text-purple-700' :
                                                                'bg-orange-50 text-orange-700'}`}>
                                                    {f.type}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 font-mono font-bold ${f.amount < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                {f.amount < 0 ? '-' : '+'}€{Math.abs(f.amount).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {myFolio.length === 0 && (
                                        <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-sm italic">No folio items yet.</td></tr>
                                    )}
                                </tbody>
                                {myFolio.length > 0 && (
                                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-sm font-bold text-right text-gray-700">Balance Due</td>
                                            <td className={`px-4 py-3 font-mono font-bold text-lg ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                €{balanceDue.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        {balanceDue > 0 && (
                            <button onClick={() => setPayModal(true)}
                                className="w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors shadow-sm">
                                ⚡ Pay Balance €{balanceDue.toFixed(2)} Now
                            </button>
                        )}
                        {payMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-semibold">✓ {payMsg}</div>}
                    </div>
                )}

                {/* ── INVOICES ── */}
                {tab === 'invoices' && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
                            <button onClick={handleGenerateInvoice}
                                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                                + Generate Invoice
                            </button>
                        </div>
                        {myInvoices.length === 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm italic shadow-sm">
                                No invoices yet. Click "Generate Invoice" to create one from your current folio.
                            </div>
                        )}
                        {myInvoices.map(inv => (
                            <div key={inv.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="font-mono text-xs text-gray-400 mb-0.5">{inv.id}</p>
                                        <p className="font-bold text-gray-900 text-lg">€{inv.amount.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500">{inv.date} · {inv.guest}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge color={inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                            {inv.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm border-t border-gray-100 pt-3 mb-4">
                                    {inv.lineItems.map((li, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span className="text-gray-600">{li.description}</span>
                                            <span className={`font-mono font-semibold ${li.amount < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                {li.amount < 0 ? '-' : '+'}€{Math.abs(li.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openInvoicePDF(inv)}
                                        className="flex-1 py-2 rounded-xl border border-[#1e3a5f] text-[#1e3a5f] font-bold text-sm hover:bg-[#1e3a5f]/5 transition-colors">
                                        ↓ Download PDF
                                    </button>
                                    {inv.status === 'outstanding' && (
                                        <button onClick={() => setPayModal(true)}
                                            className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">
                                            Pay Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── ADD-ONS ── */}
                {tab === 'addons' && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-bold text-gray-900">Enhance Your Stay</h2>
                        <p className="text-sm text-gray-500">Purchase add-ons instantly. They'll be added to your folio and visible in the admin system.</p>

                        {addonMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-semibold">✓ {addonMsg}</div>}

                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Payment Method</label>
                            <select value={addonMethod} onChange={e => setAddonMethod(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 bg-white">
                                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {GUEST_ADDONS.map(addon => (
                                <div key={addon.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <span className="text-3xl">{addon.icon}</span>
                                            <div>
                                                <p className="font-semibold text-gray-900">{addon.name}</p>
                                                <p className="text-sm font-bold text-[#1e3a5f] font-mono mt-0.5">€{addon.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleAddon(addon.id, addon.price, addon.name)}
                                            className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                                            Add
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── ROOM SERVICE ── */}
                {tab === 'order' && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Room Service Menu</h2>
                            {cart.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 font-semibold">{cart.reduce((s, i) => s + i.qty, 0)} items · <span className="text-[#1e3a5f] font-bold font-mono">€{cartTotal.toFixed(2)}</span></span>
                                    <button onClick={handleOrder} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                                        Place Order
                                    </button>
                                </div>
                            )}
                        </div>

                        {orderSuccess && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-semibold">✓ {orderSuccess}</div>}

                        {cart.length > 0 && (
                            <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-xl p-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-[#1e3a5f] mb-2">Cart</h4>
                                <div className="space-y-1.5">
                                    {cart.map(i => (
                                        <div key={i.name} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700">{i.qty}× {i.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[#1e3a5f] font-bold">€{(i.price * i.qty).toFixed(2)}</span>
                                                <button onClick={() => adjustCart(i.name, -1)} className="w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 text-xs font-bold text-gray-600">−</button>
                                                <button onClick={() => adjustCart(i.name, 1)} className="w-5 h-5 rounded-full bg-gray-100 hover:bg-green-100 text-xs font-bold text-gray-600">+</button>
                                                <button onClick={() => removeFromCart(i.name)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {MENU.map(section => (
                            <div key={section.category} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">{section.category}</h3>
                                <div className="space-y-3">
                                    {section.items.map(item => {
                                        const inCart = cart.find(c => c.name === item.name);
                                        return (
                                            <div key={item.name} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                                    <p className="text-xs text-gray-400">{item.price === 0 ? 'Complimentary' : `€${item.price.toFixed(2)}`}</p>
                                                </div>
                                                {inCart ? (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => adjustCart(item.name, -1)} className="h-7 w-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold">−</button>
                                                        <span className="font-bold text-[#1e3a5f] w-5 text-center text-sm">{inCart.qty}</span>
                                                        <button onClick={() => addToCart(item.name, item.price)} className="h-7 w-7 rounded-full bg-[#1e3a5f] hover:opacity-90 text-white text-sm font-bold">+</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => addToCart(item.name, item.price)}
                                                        className="px-3 py-1.5 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-lg text-xs font-bold hover:bg-[#1e3a5f]/20 transition-colors">
                                                        Add
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {myOrders.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">My Past Orders</h3>
                                <div className="space-y-3">
                                    {myOrders.map(o => (
                                        <div key={o.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-mono text-xs text-gray-500">{o.id}</span>
                                                <Badge color={o.status === 'delivered' ? 'bg-green-100 text-green-700' : o.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>{o.status}</Badge>
                                            </div>
                                            <p className="text-gray-700 text-xs">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
                                            <div className="flex justify-between mt-1"><span className="text-xs text-gray-400">{o.createdAt}</span><span className="font-mono font-bold text-[#1e3a5f]">€{o.total.toFixed(2)}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── COMPLAINTS ── */}
                {tab === 'complaints' && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-bold text-gray-900">File a Complaint</h2>
                        {compMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-semibold">✓ {compMsg}</div>}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Category *</label>
                                <div className="flex flex-wrap gap-2">
                                    {COMPLAINT_CATS.map(c => (
                                        <button key={c} onClick={() => setCompForm(s => ({ ...s, category: c }))}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${compForm.category === c ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Description *</label>
                                <textarea rows={4} value={compForm.description} onChange={e => setCompForm(s => ({ ...s, description: e.target.value }))}
                                    placeholder="Describe the issue..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 resize-none" />
                            </div>
                            <button onClick={handleComplaint} disabled={!compForm.category || !compForm.description}
                                className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity">
                                Submit Complaint
                            </button>
                        </div>
                        {myComplaints.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">My Complaints</h3>
                                <div className="space-y-3">
                                    {myComplaints.map(c => (
                                        <div key={c.id} className="p-4 bg-gray-50 rounded-xl text-sm">
                                            <div className="flex justify-between mb-1"><span className="font-semibold">{c.category}</span><Badge color={c.status === 'resolved' ? 'bg-green-100 text-green-700' : c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}>{c.status.replace('_', ' ')}</Badge></div>
                                            <p className="text-xs text-gray-600">{c.description}</p>
                                            <p className="text-xs text-gray-400 mt-1">{c.createdAt}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── LOST & FOUND ── */}
                {tab === 'lostfound' && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-bold text-gray-900">Lost & Found</h2>
                        {lfMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-semibold">✓ {lfMsg}</div>}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Item Description *</label>
                                <input type="text" value={lfForm.item} onChange={e => setLfForm(s => ({ ...s, item: e.target.value }))} placeholder="e.g. Black leather wallet" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Last seen location</label>
                                <input type="text" value={lfForm.location} onChange={e => setLfForm(s => ({ ...s, location: e.target.value }))} placeholder="e.g. Restaurant, Pool, Lobby..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
                            </div>
                            <button onClick={handleLF} disabled={!lfForm.item} className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity">
                                Report Lost Item
                            </button>
                        </div>
                        {myLF.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">My Reports</h3>
                                <div className="space-y-3">{myLF.map(l => (
                                    <div key={l.id} className="p-4 bg-gray-50 rounded-xl text-sm">
                                        <div className="flex justify-between mb-1"><span className="font-semibold">{l.item}</span><Badge color={l.status === 'claimed' ? 'bg-green-100 text-green-700' : l.status === 'found' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>{l.status}</Badge></div>
                                        <p className="text-xs text-gray-500">Last seen: {l.location}</p>
                                        <p className="text-xs text-gray-400 mt-1">{l.createdAt}</p>
                                    </div>
                                ))}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center py-6 text-xs text-gray-400 border-t border-gray-200 mt-8">
                Aurelia Grand Hotel · Guest Portal · Need help? Call <strong className="text-gray-700">+39 055 123 4567</strong>
            </div>

            {/* ── PAY NOW MODAL ── */}
            {payModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPayModal(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Make a Payment</h3>
                        <p className="text-sm text-gray-500">Balance due: <span className="font-bold text-red-600 font-mono">€{balanceDue.toFixed(2)}</span></p>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Amount (€)</label>
                            <input type="number" min="1" step="0.01" placeholder={balanceDue.toFixed(2)} value={payAmt} onChange={e => setPayAmt(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Payment Method</label>
                            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 bg-white">
                                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Note (optional)</label>
                            <input type="text" placeholder="e.g. Final payment" value={payNote} onChange={e => setPayNote(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30" />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setPayModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={handlePayment} disabled={!payAmt || parseFloat(payAmt) <= 0}
                                className="flex-1 py-3 rounded-xl bg-[#1e3a5f] text-white font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity">
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
