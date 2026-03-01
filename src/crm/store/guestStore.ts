// ─────────────────────────────────────────────────────────────────────────────
// Shared Google Sheets bridge between Landing Page, Guest Portal, and ERP CRM.
// Re-exports types and provides functions that read/write from Google Sheets
// via the /api/sheets Vercel serverless proxy.
// ─────────────────────────────────────────────────────────────────────────────

import { fetchSheet, appendRow, updateRow as apiUpdateRow, appendRows } from '../../lib/sheetsApi';

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

export type FolioItemType = 'room' | 'tax' | 'addon' | 'discount' | 'fee' | 'payment' | 'service' | 'beverage' | 'charge';

export interface SharedFolioItem {
    id: string;
    reservationId: string;
    date: string;
    description: string;
    amount: number;
    type: FolioItemType;
    guestName?: string;
}

export interface SharedInvoice {
    id: string;
    reservationId: string;
    guest: string;
    date: string;
    amount: number;
    status: 'paid' | 'outstanding';
    lineItems: { description: string; amount: number }[];
}

export interface SharedPayment {
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
    importedToCRM?: boolean;
}

export interface SharedHotelData {
    bookings: LandingBooking[];
    guestOrders: GuestOrder[];
    guestComplaints: GuestComplaint[];
    guestLostFound: GuestLostFound[];
    folioItems: SharedFolioItem[];
    invoices: SharedInvoice[];
    payments: SharedPayment[];
}

// ─── In-memory cache ─────────────────────────────────────────────────────────
let _cache: SharedHotelData | null = null;
let _loadPromise: Promise<SharedHotelData> | null = null;

const EMPTY: SharedHotelData = {
    bookings: [], guestOrders: [], guestComplaints: [], guestLostFound: [],
    folioItems: [], invoices: [], payments: [],
};

export async function getSharedData(): Promise<SharedHotelData> {
    if (_cache) return _cache;
    if (_loadPromise) return _loadPromise;

    _loadPromise = (async () => {
        try {
            const [bookings, guestOrders, guestComplaints, guestLostFound, folioItems, invoices, payments] = await Promise.all([
                fetchSheet<LandingBooking>('Bookings'),
                fetchSheet<GuestOrder>('GuestOrders'),
                fetchSheet<GuestComplaint>('GuestComplaints'),
                fetchSheet<GuestLostFound>('GuestLostFound'),
                fetchSheet<SharedFolioItem>('FolioItems'),
                fetchSheet<SharedInvoice>('Invoices'),
                fetchSheet<SharedPayment>('Payments'),
            ]);
            _cache = { bookings, guestOrders, guestComplaints, guestLostFound, folioItems, invoices, payments };
            return _cache;
        } catch (err) {
            console.error('Failed to load from Google Sheets:', err);
            _cache = { ...EMPTY };
            return _cache;
        } finally {
            _loadPromise = null;
        }
    })();
    return _loadPromise;
}

/** Force refresh from sheets */
export async function refreshSharedData(): Promise<SharedHotelData> {
    _cache = null;
    return getSharedData();
}

/** Sync get (returns cached or empty) */
export function getSharedDataSync(): SharedHotelData {
    return _cache || { ...EMPTY };
}

/** @deprecated – no-op, kept for API compat */
export function setSharedData(_data: SharedHotelData): void {
    console.warn('setSharedData() is deprecated in Sheets mode');
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus): Promise<void> {
    if (_cache) {
        _cache.guestComplaints = _cache.guestComplaints.map(c => c.id === id ? { ...c, status } : c);
    }
    await apiUpdateRow('GuestComplaints', id, { status });
}

export async function updateLFStatus(id: string, status: LFStatus): Promise<void> {
    if (_cache) {
        _cache.guestLostFound = _cache.guestLostFound.map(l => l.id === id ? { ...l, status } : l);
    }
    await apiUpdateRow('GuestLostFound', id, { status });
}

export async function updateOrderStatus(id: string, status: GuestOrderStatus): Promise<void> {
    if (_cache) {
        _cache.guestOrders = _cache.guestOrders.map(o => o.id === id ? { ...o, status } : o);
    }
    await apiUpdateRow('GuestOrders', id, { status });
}

export function markBookingImported(id: string): void {
    if (_cache) {
        _cache.bookings = _cache.bookings.map(b => b.id === id ? { ...b, importedToCRM: true } : b);
    }
    apiUpdateRow('Bookings', id, { importedToCRM: true }).catch(console.error);
}

export async function addSharedFolioItem(item: Omit<SharedFolioItem, 'id'>): Promise<string> {
    const id = `FI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: SharedFolioItem = { ...item, id };
    await appendRow('FolioItems', newItem as unknown as Record<string, unknown>);
    if (_cache) _cache.folioItems.push(newItem);
    return id;
}

export async function addSharedPayment(payment: Omit<SharedPayment, 'id'>): Promise<string> {
    const id = `PAY-${Date.now()}`;
    const newPayment: SharedPayment = { ...payment, id };
    const paymentFolio: SharedFolioItem = {
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
    if (_cache) {
        _cache.payments.push(newPayment);
        _cache.folioItems.push(paymentFolio);
    }
    return id;
}

export async function generateSharedInvoice(reservationId: string, guestName: string): Promise<SharedInvoice> {
    const data = await getSharedData();
    const items = data.folioItems.filter(f => f.reservationId === reservationId);
    const total = items.reduce((s, f) => s + f.amount, 0);
    const inv: SharedInvoice = {
        id: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        reservationId, guest: guestName,
        date: new Date().toISOString().slice(0, 10),
        amount: Math.max(0, total),
        status: total <= 0 ? 'paid' : 'outstanding',
        lineItems: items.map(f => ({ description: f.description, amount: f.amount })),
    };
    const oldInv = data.invoices.find(i => i.reservationId === reservationId);
    data.invoices = data.invoices.filter(i => i.reservationId !== reservationId);
    data.invoices.push(inv);

    if (oldInv) {
        await apiUpdateRow('Invoices', oldInv.id, inv as unknown as Record<string, unknown>);
    } else {
        await appendRow('Invoices', inv as unknown as Record<string, unknown>);
    }
    return inv;
}

export async function seedDemoDataIfEmpty(): Promise<void> {
    const data = await getSharedData();
    if (data.bookings.length > 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const in5days = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const in10days = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

    const seedBookings: LandingBooking[] = [
        { id: 'WEB-DEMO-001', guest: 'Marco Rossi', email: 'guest1@aurelia-demo.com', phone: '+39 333 111 2222', checkIn: today, checkOut: in3days, roomType: 'Suite', pax: 2, totalAmount: 1050, nights: 3, channel: 'Website', status: 'Confirmed', createdAt: yesterday, importedToCRM: false },
        { id: 'WEB-DEMO-002', guest: 'Sophie Laurent', email: 'sophie@example.com', phone: '+33 6 12 34 56 78', checkIn: in3days, checkOut: in5days, roomType: 'Deluxe', pax: 2, totalAmount: 460, nights: 2, channel: 'Website', status: 'Pending', createdAt: today, importedToCRM: false },
        { id: 'WEB-DEMO-003', guest: 'James Whitfield', email: 'james@example.com', phone: '+44 7700 900000', checkIn: yesterday, checkOut: in5days, roomType: 'Executive', pax: 2, totalAmount: 2880, nights: 6, channel: 'Website', status: 'Checked In', createdAt: yesterday, importedToCRM: false, notes: 'Anniversary stay. Pre-order champagne.' },
        { id: 'WEB-DEMO-004', guest: 'Yuki Tanaka', email: 'yuki@example.com', phone: '+81 90 1234 5678', checkIn: in5days, checkOut: in10days, roomType: 'Standard', pax: 1, totalAmount: 600, nights: 5, channel: 'Website', status: 'Confirmed', createdAt: today, importedToCRM: false },
    ];

    const seedFolioItems: SharedFolioItem[] = [
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

    const seedInvoices: SharedInvoice[] = [
        { id: 'INV-2026-001', reservationId: 'WEB-DEMO-003', guest: 'James Whitfield', date: today, amount: 2473, status: 'outstanding', lineItems: [{ description: 'Executive Suite × 6 nights', amount: 2880 }, { description: 'City Tax', amount: 432 }, { description: 'Room Service', amount: 161 }, { description: 'Payment — Deposit', amount: -1000 }] },
    ];

    const seedPayments: SharedPayment[] = [
        { id: 'PAY-DEMO-001', reservationId: 'WEB-DEMO-003', date: yesterday, method: 'Credit Card', amount: 1000, status: 'settled', ref: 'CC-DEMO-REF', note: 'Initial deposit' },
    ];

    await Promise.all([
        appendRows('Bookings', seedBookings as unknown as Record<string, unknown>[]),
        appendRows('FolioItems', seedFolioItems as unknown as Record<string, unknown>[]),
        appendRows('Invoices', seedInvoices as unknown as Record<string, unknown>[]),
        appendRows('Payments', seedPayments as unknown as Record<string, unknown>[]),
    ]);

    _cache = {
        bookings: seedBookings,
        guestOrders: [],
        guestComplaints: [],
        guestLostFound: [],
        folioItems: seedFolioItems,
        invoices: seedInvoices,
        payments: seedPayments,
    };
}
