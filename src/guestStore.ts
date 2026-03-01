// ─────────────────────────────────────────────────────────────────────────────
// Shared Google Sheets bridge between Landing Page, Guest Portal, and ERP CRM.
// Both apps read/write from Google Sheets via /api/sheets so changes are
// visible everywhere. An in-memory cache keeps the UI fast while syncing.
// ─────────────────────────────────────────────────────────────────────────────

import { fetchSheet, appendRow, updateRow as apiUpdateRow } from './lib/sheetsApi';

// ── Order / Complaint / Lost & Found ─────────────────────────────────────────
export type GuestOrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';
export type LFStatus = 'searching' | 'found' | 'claimed';

export interface GuestOrderItem { name: string; price: number; qty: number; }

export interface GuestOrder {
    id: string;
    reservationId: string;
    guestName: string;
    items: GuestOrderItem[];
    total: number;
    status: GuestOrderStatus;
    createdAt: string;
}

export interface GuestComplaint {
    id: string;
    reservationId: string;
    guestName: string;
    category: string;
    description: string;
    status: ComplaintStatus;
    createdAt: string;
}

export interface GuestLostFound {
    id: string;
    reservationId: string;
    guestName: string;
    item: string;
    location: string;
    status: LFStatus;
    createdAt: string;
}

// ── Finance (shared between Guest Portal and CRM) ─────────────────────────────
export type FolioItemType = 'room' | 'tax' | 'addon' | 'discount' | 'fee' | 'payment' | 'service' | 'beverage' | 'charge';

export interface FolioItem {
    id: string;
    reservationId: string;
    date: string;
    description: string;
    amount: number;   // positive = charge, negative = credit/payment
    type: FolioItemType;
    guestName?: string;
}

export interface Invoice {
    id: string;
    reservationId: string;
    guest: string;
    date: string;
    amount: number;
    status: 'paid' | 'outstanding';
    lineItems: { description: string; amount: number }[];
}

export interface Payment {
    id: string;
    reservationId: string;
    date: string;
    method: string;
    amount: number;
    status: 'pending' | 'settled' | 'refunded';
    ref: string;
    note?: string;
    guestName?: string;
}

// ── Landing Booking ────────────────────────────────────────────────────────────
export interface LandingBooking {
    id: string;
    guest: string;
    email: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    roomType: string;
    pax: number;
    totalAmount: number;
    nights: number;
    channel: 'Website';
    status: 'Pending' | 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';
    createdAt: string;
    notes?: string;
    importedToCRM?: boolean;   // flag so CRM only imports once
}

// ── Root document ──────────────────────────────────────────────────────────────
export interface SharedHotelData {
    bookings: LandingBooking[];
    guestOrders: GuestOrder[];
    guestComplaints: GuestComplaint[];
    guestLostFound: GuestLostFound[];
    folioItems: FolioItem[];
    invoices: Invoice[];
    payments: Payment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache — keeps UI fast while syncing to Sheets in background
// ─────────────────────────────────────────────────────────────────────────────
let _cache: SharedHotelData | null = null;
let _loading = false;
let _loadPromise: Promise<SharedHotelData> | null = null;
const _listeners: Array<() => void> = [];

export function onDataChange(cb: () => void) { _listeners.push(cb); return () => { const i = _listeners.indexOf(cb); if (i >= 0) _listeners.splice(i, 1); }; }
function _notify() { _listeners.forEach(cb => cb()); }

// ─────────────────────────────────────────────────────────────────────────────
// Core read / write helpers — Google Sheets backed
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY: SharedHotelData = {
    bookings: [], guestOrders: [], guestComplaints: [], guestLostFound: [],
    folioItems: [], invoices: [], payments: [],
};

/** Load all shared data from Google Sheets (with in-memory caching) */
export async function getSharedData(): Promise<SharedHotelData> {
    if (_cache) return _cache;
    if (_loadPromise) return _loadPromise;

    _loading = true;
    _loadPromise = (async () => {
        try {
            const [bookings, guestOrders, guestComplaints, guestLostFound, folioItems, invoices, payments] = await Promise.all([
                fetchSheet<LandingBooking>('Bookings'),
                fetchSheet<GuestOrder>('GuestOrders'),
                fetchSheet<GuestComplaint>('GuestComplaints'),
                fetchSheet<GuestLostFound>('GuestLostFound'),
                fetchSheet<FolioItem>('FolioItems'),
                fetchSheet<Invoice>('Invoices'),
                fetchSheet<Payment>('Payments'),
            ]);
            _cache = { bookings, guestOrders, guestComplaints, guestLostFound, folioItems, invoices, payments };
            return _cache;
        } catch (err) {
            console.error('Failed to load data from Google Sheets, using empty state:', err);
            _cache = { ...EMPTY };
            return _cache;
        } finally {
            _loading = false;
            _loadPromise = null;
        }
    })();
    return _loadPromise;
}

/** Force a refresh from Google Sheets (clears cache) */
export async function refreshSharedData(): Promise<SharedHotelData> {
    _cache = null;
    return getSharedData();
}

/** Check if data is currently loading */
export function isLoading(): boolean { return _loading; }

/** Get cached data synchronously (returns empty if not yet loaded) */
export function getSharedDataSync(): SharedHotelData {
    return _cache || { ...EMPTY };
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking helpers
// ─────────────────────────────────────────────────────────────────────────────
export async function addLandingBooking(booking: Omit<LandingBooking, 'id' | 'createdAt'>): Promise<string> {
    const data = await getSharedData();
    const id = `WEB-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const baseAmount = booking.totalAmount;
    const taxAmount = Math.round(baseAmount * 0.15 * 100) / 100;

    const newBooking: LandingBooking = { ...booking, id, createdAt: today, importedToCRM: false };

    // Auto-create folio items
    const roomFolioId = `FI-${Date.now()}-1`;
    const taxFolioId = `FI-${Date.now()}-2`;
    const roomFolio: FolioItem = {
        id: roomFolioId, reservationId: id, date: today,
        description: `Room Charge — ${booking.roomType} × ${booking.nights} night${booking.nights > 1 ? 's' : ''}`,
        amount: baseAmount, type: 'room',
    };
    const taxFolio: FolioItem = {
        id: taxFolioId, reservationId: id, date: today,
        description: `City Tax & Fees (15%)`, amount: taxAmount, type: 'tax',
    };

    // Write to Google Sheets
    await Promise.all([
        appendRow('Bookings', newBooking as unknown as Record<string, unknown>),
        appendRow('FolioItems', roomFolio as unknown as Record<string, unknown>),
        appendRow('FolioItems', taxFolio as unknown as Record<string, unknown>),
    ]);

    // Update cache
    data.bookings.push(newBooking);
    data.folioItems.push(roomFolio, taxFolio);
    _notify();

    return id;
}

export async function findGuestReservation(reservationId: string, email: string): Promise<LandingBooking | null> {
    const data = await getSharedData();
    return data.bookings.find(
        b => b.id.toUpperCase() === reservationId.toUpperCase() &&
            b.email.toLowerCase() === email.toLowerCase()
    ) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Auth: find guest's most-recent booking by email (all providers)
// ─────────────────────────────────────────────────────────────────────────────
export interface SocialProfile {
    provider: string;
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    linkedAt: string;
}

const SOCIAL_PROFILES_KEY = 'hotel_social_profiles_v1';

export function saveSocialProfile(profile: Omit<SocialProfile, 'linkedAt'>): void {
    try {
        const raw = localStorage.getItem(SOCIAL_PROFILES_KEY);
        const profiles: SocialProfile[] = raw ? JSON.parse(raw) : [];
        const idx = profiles.findIndex(p => p.email.toLowerCase() === profile.email.toLowerCase());
        const entry: SocialProfile = { ...profile, linkedAt: new Date().toISOString() };
        if (idx >= 0) { profiles[idx] = entry; } else { profiles.push(entry); }
        localStorage.setItem(SOCIAL_PROFILES_KEY, JSON.stringify(profiles));
    } catch { /* non-fatal */ }
}

export function getSocialProfile(email: string): SocialProfile | null {
    try {
        const raw = localStorage.getItem(SOCIAL_PROFILES_KEY);
        if (!raw) return null;
        const profiles: SocialProfile[] = JSON.parse(raw);
        return profiles.find(p => p.email.toLowerCase() === email.toLowerCase()) || null;
    } catch { return null; }
}

/** Find the most recent active booking for a social-auth guest by email */
export async function findGuestBySocialAuth(email: string): Promise<LandingBooking | null> {
    const data = await getSharedData();
    const matches = data.bookings.filter(
        b => b.email.toLowerCase() === email.toLowerCase() && b.status !== 'Cancelled'
    );
    if (!matches.length) return null;
    return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** Get ALL bookings for a guest email */
export async function getAllBookingsByEmail(email: string): Promise<LandingBooking[]> {
    const data = await getSharedData();
    return data.bookings
        .filter(b => b.email.toLowerCase() === email.toLowerCase())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateBookingStatus(id: string, status: LandingBooking['status']): Promise<void> {
    const data = await getSharedData();
    data.bookings = data.bookings.map(b => b.id === id ? { ...b, status } : b);
    await apiUpdateRow('Bookings', id, { status });
    _notify();
}

// ─────────────────────────────────────────────────────────────────────────────
// Room service orders
// ─────────────────────────────────────────────────────────────────────────────
export async function addGuestOrder(order: Omit<GuestOrder, 'id' | 'createdAt'>): Promise<string> {
    const data = await getSharedData();
    const id = `ORD-${Date.now()}`;
    const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newOrder: GuestOrder = { ...order, id, createdAt: ts };

    const folioItem: FolioItem = {
        id: `FI-ORD-${Date.now()}`,
        reservationId: order.reservationId,
        date: new Date().toISOString().slice(0, 10),
        description: `Room Service — ${order.items.map(i => `${i.qty}× ${i.name}`).join(', ')}`,
        amount: order.total,
        type: 'service',
    };

    await Promise.all([
        appendRow('GuestOrders', newOrder as unknown as Record<string, unknown>),
        appendRow('FolioItems', folioItem as unknown as Record<string, unknown>),
    ]);

    data.guestOrders.push(newOrder);
    data.folioItems.push(folioItem);
    _notify();
    return id;
}

export async function updateOrderStatus(id: string, status: GuestOrderStatus): Promise<void> {
    const data = await getSharedData();
    data.guestOrders = data.guestOrders.map(o => o.id === id ? { ...o, status } : o);
    await apiUpdateRow('GuestOrders', id, { status });
    _notify();
}

// ─────────────────────────────────────────────────────────────────────────────
// Complaints & Lost+Found
// ─────────────────────────────────────────────────────────────────────────────
export async function addGuestComplaint(complaint: Omit<GuestComplaint, 'id' | 'createdAt'>): Promise<string> {
    const data = await getSharedData();
    const id = `COMP-${Date.now()}`;
    const newComplaint: GuestComplaint = { ...complaint, id, createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    await appendRow('GuestComplaints', newComplaint as unknown as Record<string, unknown>);
    data.guestComplaints.push(newComplaint);
    _notify();
    return id;
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus): Promise<void> {
    const data = await getSharedData();
    data.guestComplaints = data.guestComplaints.map(c => c.id === id ? { ...c, status } : c);
    await apiUpdateRow('GuestComplaints', id, { status });
    _notify();
}

export async function addGuestLostFound(item: Omit<GuestLostFound, 'id' | 'createdAt'>): Promise<string> {
    const data = await getSharedData();
    const id = `LF-${Date.now()}`;
    const newItem: GuestLostFound = { ...item, id, createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    await appendRow('GuestLostFound', newItem as unknown as Record<string, unknown>);
    data.guestLostFound.push(newItem);
    _notify();
    return id;
}

export async function updateLFStatus(id: string, status: LFStatus): Promise<void> {
    const data = await getSharedData();
    data.guestLostFound = data.guestLostFound.map(l => l.id === id ? { ...l, status } : l);
    await apiUpdateRow('GuestLostFound', id, { status });
    _notify();
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance helpers (used by both Guest Portal + CRM)
// ─────────────────────────────────────────────────────────────────────────────
export async function getReservationFolio(reservationId: string): Promise<FolioItem[]> {
    const data = await getSharedData();
    return data.folioItems.filter(f => f.reservationId === reservationId);
}

export async function getReservationInvoices(reservationId: string): Promise<Invoice[]> {
    const data = await getSharedData();
    return data.invoices.filter(i => i.reservationId === reservationId);
}

export async function getReservationPayments(reservationId: string): Promise<Payment[]> {
    const data = await getSharedData();
    return data.payments.filter(p => p.reservationId === reservationId);
}

export async function addFolioItem(item: Omit<FolioItem, 'id'>): Promise<string> {
    const data = await getSharedData();
    const id = `FI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: FolioItem = { ...item, id };
    await appendRow('FolioItems', newItem as unknown as Record<string, unknown>);
    data.folioItems.push(newItem);
    _notify();
    return id;
}

export async function addGuestPayment(payment: Omit<Payment, 'id'>): Promise<string> {
    const data = await getSharedData();
    const id = `PAY-${Date.now()}`;
    const newPayment: Payment = { ...payment, id };
    const paymentFolio: FolioItem = {
        id: `FI-PAY-${Date.now()}`,
        reservationId: payment.reservationId,
        date: payment.date,
        description: `Payment — ${payment.method}${payment.note ? ` (${payment.note})` : ''}`,
        amount: -payment.amount,
        type: 'payment',
    };

    await Promise.all([
        appendRow('Payments', newPayment as unknown as Record<string, unknown>),
        appendRow('FolioItems', paymentFolio as unknown as Record<string, unknown>),
    ]);

    data.payments.push(newPayment);
    data.folioItems.push(paymentFolio);
    _notify();
    return id;
}

export async function generateAndStoreInvoice(reservationId: string, guestName: string): Promise<Invoice> {
    const data = await getSharedData();
    const folioItems = data.folioItems.filter(f => f.reservationId === reservationId);
    const total = folioItems.reduce((s, f) => s + f.amount, 0);
    const inv: Invoice = {
        id: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        reservationId,
        guest: guestName,
        date: new Date().toISOString().slice(0, 10),
        amount: Math.max(0, total),
        status: total <= 0 ? 'paid' : 'outstanding',
        lineItems: folioItems.map(f => ({ description: f.description, amount: f.amount })),
    };

    // Remove old invoice for this reservation from cache
    const oldInv = data.invoices.find(i => i.reservationId === reservationId);
    data.invoices = data.invoices.filter(i => i.reservationId !== reservationId);
    data.invoices.push(inv);

    // Write to sheets: if old one exists, update it; otherwise append
    if (oldInv) {
        await apiUpdateRow('Invoices', oldInv.id, inv as unknown as Record<string, unknown>);
    } else {
        await appendRow('Invoices', inv as unknown as Record<string, unknown>);
    }
    _notify();
    return inv;
}

// ─────────────────────────────────────────────────────────────────────────────
// Add-ons (guest can purchase from portal)
// ─────────────────────────────────────────────────────────────────────────────
export const GUEST_ADDONS = [
    { id: 'breakfast', name: 'Daily Breakfast', price: 28, icon: '☕' },
    { id: 'transfer', name: 'Airport Transfer', price: 80, icon: '🚗' },
    { id: 'spa60', name: 'Spa Treatment (60 min)', price: 120, icon: '💆' },
    { id: 'late_out', name: 'Late Check-out (+4 hrs)', price: 50, icon: '🕓' },
    { id: 'early_in', name: 'Early Check-in (+4 hrs)', price: 50, icon: '🌅' },
    { id: 'champagne', name: 'Welcome Champagne', price: 45, icon: '🍾' },
    { id: 'laundry', name: 'Express Laundry', price: 25, icon: '👕' },
    { id: 'flowers', name: 'Floral Arrangement', price: 35, icon: '💐' },
];

export async function purchaseAddon(reservationId: string, addonId: string, _guestName: string, paymentMethod: string): Promise<string> {
    const addon = GUEST_ADDONS.find(a => a.id === addonId);
    if (!addon) throw new Error('Unknown addon');
    const data = await getSharedData();
    const today = new Date().toISOString().slice(0, 10);

    const chargeFolio: FolioItem = {
        id: `FI-ADDON-${Date.now()}`, reservationId, date: today,
        description: `Add-on: ${addon.name}`, amount: addon.price, type: 'addon',
    };

    const newPayment: Payment = {
        id: `PAY-${Date.now()}`, reservationId, date: today,
        method: paymentMethod, amount: addon.price,
        status: 'settled', ref: `ADDON-${addonId}`, note: addon.name,
    };

    const offsetFolio: FolioItem = {
        id: `FI-ADDON-PAY-${Date.now()}`, reservationId, date: today,
        description: `Payment — ${paymentMethod} (${addon.name})`,
        amount: -addon.price, type: 'payment',
    };

    await Promise.all([
        appendRow('FolioItems', chargeFolio as unknown as Record<string, unknown>),
        appendRow('Payments', newPayment as unknown as Record<string, unknown>),
        appendRow('FolioItems', offsetFolio as unknown as Record<string, unknown>),
    ]);

    data.folioItems.push(chargeFolio, offsetFolio);
    data.payments.push(newPayment);
    _notify();
    return newPayment.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed demo data (runs once if Bookings sheet is empty)
// ─────────────────────────────────────────────────────────────────────────────
export async function seedDemoDataIfEmpty(): Promise<void> {
    const data = await getSharedData();
    if (data.bookings.length > 0) return; // already seeded

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const in5days = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const in10days = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

    // Suppress unused variable warning
    void tomorrow;

    const seedBookings: LandingBooking[] = [
        { id: 'WEB-DEMO-001', guest: 'Marco Rossi', email: 'guest1@aurelia-demo.com', phone: '+39 333 111 2222', checkIn: today, checkOut: in3days, roomType: 'Suite', pax: 2, totalAmount: 1050, nights: 3, channel: 'Website', status: 'Confirmed', createdAt: yesterday, importedToCRM: false },
        { id: 'WEB-DEMO-002', guest: 'Sophie Laurent', email: 'sophie@example.com', phone: '+33 6 12 34 56 78', checkIn: in3days, checkOut: in5days, roomType: 'Deluxe', pax: 2, totalAmount: 460, nights: 2, channel: 'Website', status: 'Pending', createdAt: today, importedToCRM: false },
        { id: 'WEB-DEMO-003', guest: 'James Whitfield', email: 'james@example.com', phone: '+44 7700 900000', checkIn: yesterday, checkOut: in5days, roomType: 'Executive', pax: 2, totalAmount: 2880, nights: 6, channel: 'Website', status: 'Checked In', createdAt: yesterday, importedToCRM: false, notes: 'Anniversary stay. Pre-order champagne.' },
        { id: 'WEB-DEMO-004', guest: 'Yuki Tanaka', email: 'yuki@example.com', phone: '+81 90 1234 5678', checkIn: in5days, checkOut: in10days, roomType: 'Standard', pax: 1, totalAmount: 600, nights: 5, channel: 'Website', status: 'Confirmed', createdAt: today, importedToCRM: false },
    ];

    const seedFolioItems: FolioItem[] = [
        { id: 'FI-001-1', reservationId: 'WEB-DEMO-001', date: yesterday, description: 'Room Charge — Suite × 3 nights', amount: 1050, type: 'room' },
        { id: 'FI-001-2', reservationId: 'WEB-DEMO-001', date: yesterday, description: 'City Tax & Fees (15%)', amount: 157.50, type: 'tax' },
        { id: 'FI-003-1', reservationId: 'WEB-DEMO-003', date: yesterday, description: 'Room Charge — Executive Suite × 6 nights', amount: 2880, type: 'room' },
        { id: 'FI-003-2', reservationId: 'WEB-DEMO-003', date: yesterday, description: 'City Tax & Fees (15%)', amount: 432, type: 'tax' },
        { id: 'FI-003-3', reservationId: 'WEB-DEMO-003', date: today, description: 'Room Service — Bistecca Fiorentina × 2', amount: 116, type: 'service' },
        { id: 'FI-003-4', reservationId: 'WEB-DEMO-003', date: today, description: 'Minibar — Brunello di Montalcino', amount: 45, type: 'beverage' },
        { id: 'FI-003-5', reservationId: 'WEB-DEMO-003', date: today, description: 'Payment — Credit Card (Deposit)', amount: -1000, type: 'payment' },
        { id: 'FI-002-1', reservationId: 'WEB-DEMO-002', date: today, description: 'Room Charge — Deluxe × 2 nights', amount: 400, type: 'room' },
        { id: 'FI-002-2', reservationId: 'WEB-DEMO-002', date: today, description: 'City Tax & Fees (15%)', amount: 60, type: 'tax' },
    ];

    const seedInvoices: Invoice[] = [
        { id: 'INV-2026-001', reservationId: 'WEB-DEMO-003', guest: 'James Whitfield', date: today, amount: 2473, status: 'outstanding', lineItems: [{ description: 'Executive Suite × 6 nights', amount: 2880 }, { description: 'City Tax', amount: 432 }, { description: 'Room Service', amount: 161 }, { description: 'Payment — Deposit', amount: -1000 }] },
    ];

    const seedPayments: Payment[] = [
        { id: 'PAY-DEMO-001', reservationId: 'WEB-DEMO-003', date: yesterday, method: 'Credit Card', amount: 1000, status: 'settled', ref: 'CC-DEMO-REF', note: 'Initial deposit' },
    ];

    // Write all seed data to Google Sheets
    const { appendRows } = await import('./lib/sheetsApi');
    await Promise.all([
        appendRows('Bookings', seedBookings as unknown as Record<string, unknown>[]),
        appendRows('FolioItems', seedFolioItems as unknown as Record<string, unknown>[]),
        appendRows('Invoices', seedInvoices as unknown as Record<string, unknown>[]),
        appendRows('Payments', seedPayments as unknown as Record<string, unknown>[]),
    ]);

    // Update cache
    _cache = {
        bookings: seedBookings,
        guestOrders: [],
        guestComplaints: [],
        guestLostFound: [],
        folioItems: seedFolioItems,
        invoices: seedInvoices,
        payments: seedPayments,
    };
    _notify();
}

// ─────────────────────────────────────────────────────────────────────────────
// Backwards-compatible sync exports for CRM store
// These are kept for API compatibility but now use async pattern
// ─────────────────────────────────────────────────────────────────────────────
export function markBookingImported(id: string): void {
    // Update cache
    if (_cache) {
        _cache.bookings = _cache.bookings.map(b => b.id === id ? { ...b, importedToCRM: true } : b);
    }
    // Fire-and-forget to sheets
    apiUpdateRow('Bookings', id, { importedToCRM: true }).catch(console.error);
}

/** @deprecated – use setSharedData is no longer needed; mutations go directly to sheets */
export function setSharedData(_data: SharedHotelData): void {
    // No-op: individual mutations now write directly to Google Sheets
    // This stub is kept for backwards compatibility during migration
    console.warn('setSharedData() is deprecated. Mutations should use individual sheet operations.');
}
