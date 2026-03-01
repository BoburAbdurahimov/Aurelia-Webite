import { create } from 'zustand';
import {
    getSharedData, markBookingImported, seedDemoDataIfEmpty,
    updateComplaintStatus as sharedUpdateComplaint,
    updateLFStatus as sharedUpdateLF,
    updateOrderStatus as sharedUpdateOrder,
    type LandingBooking, type GuestOrder, type GuestComplaint, type GuestLostFound,
} from './guestStore';
import { fetchSheet, appendRow, appendRows, updateRow as apiUpdateRow } from '../../lib/sheetsApi';

// Re-export guest portal types for use in CRM pages
export type { GuestOrder, GuestComplaint, GuestLostFound };

// ─── Types ──────────────────────────────────────────────────────────────────
export type WOStatus = 'open' | 'in_progress' | 'completed' | 'on_hold';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type RoomStatus = 'clean' | 'dirty' | 'inspected' | 'out_of_order' | 'occupied';
export type RoomType = 'Standard' | 'Deluxe' | 'Suite' | 'Executive';

export interface Room {
    number: string;
    floor: '1' | '2';
    type: RoomType;
    status: RoomStatus;
    assignedTo?: string;
    priority?: 'high' | 'medium' | 'low';
    pricePerNight: number;
    capacity: number; // max guests
}

export interface Reservation {
    id: string;
    guest: string;
    email: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    room: string;      // room number
    roomType: RoomType;
    pax: number;
    status: 'Confirmed' | 'Pending' | 'Checked In' | 'Checked Out' | 'Cancelled';
    paid: boolean;
    channel: string;
    totalAmount: number;
    notes?: string;
    createdAt: string;
}

export interface Arrival {
    id: string;       // reservation id
    guest: string;
    room: string;
    eta: string;
    pax: number;
    vip: boolean;
    status: 'arriving' | 'checked_in';
    flags: string[];
}

export interface Departure {
    id: string;
    guest: string;
    room: string;
    checkout: string;
    status: 'checked_out' | 'pending_checkout';
    balance: number;
}

export interface Incident {
    id: number;
    room: string;
    type: string;
    priority: 'high' | 'medium' | 'low';
    time: string;
    date: string;
    resolved: boolean;
}

export interface WorkOrder {
    id: string;
    category: string;
    description: string;
    room: string;
    severity: Severity;
    status: WOStatus;
    assignedTo: string;
    created: string;
    cost?: number;
}

export interface Asset {
    id: string;
    name: string;
    type: string;
    serial: string;
    lastService: string;
    nextService: string;
    status: string;
}

export interface LostFound {
    id: number;
    item: string;
    room: string;
    found: string;
    status: string;
    location: string;
}

export interface Guest {
    id: number;
    name: string;
    email: string;
    phone: string;
    nationality: string;
    stays: number;
    totalSpend: number;
    tags: string[];
    lastStay: string;
    vip: boolean;
    gdprConsent: boolean;
}

export interface FolioItem {
    id: string;
    reservationId?: string;
    guestName?: string;
    date: string;
    description: string;
    amount: number;  // positive = charge, negative = payment
    type: 'charge' | 'payment' | 'tax' | 'beverage' | 'service';
}

export interface Payment {
    id: string;
    reservationId?: string;
    date: string;
    method: string;
    amount: number;
    status: string;
    ref: string;
    guestId?: number;
    guestName?: string;
}

export interface Invoice {
    id: string;
    reservationId?: string;
    guest: string;
    amount: number;
    date: string;
    status: 'paid' | 'outstanding';
    lineItems?: { description: string; amount: number }[];
}

export interface StaffUser {
    name: string;
    email: string;
    role: string;
    active: boolean;
}

// ─── 50-Room Hotel Setup ─────────────────────────────────────────────────────
const ROOM_PRICES: Record<RoomType, number> = {
    Standard: 120,
    Deluxe: 200,
    Suite: 350,
    Executive: 480,
};

function buildRooms(): Room[] {
    const rooms: Room[] = [];
    const types: RoomType[] = ['Standard', 'Standard', 'Deluxe', 'Deluxe', 'Suite'];
    for (let i = 1; i <= 25; i++) {
        const num = `10${i < 10 ? '0' + i : i}`;
        const type = types[(i - 1) % 5];
        rooms.push({
            number: num, floor: '1', type, status: 'clean',
            pricePerNight: ROOM_PRICES[type],
            capacity: type === 'Suite' ? 4 : type === 'Deluxe' ? 3 : 2,
        });
    }
    for (let i = 1; i <= 25; i++) {
        const num = `20${i < 10 ? '0' + i : i}`;
        const type = types[(i - 1) % 5];
        const finalType: RoomType = i % 5 === 0 ? 'Executive' : type === 'Standard' && i > 20 ? 'Suite' : type;
        rooms.push({
            number: num, floor: '2', type: finalType, status: 'clean',
            pricePerNight: ROOM_PRICES[finalType],
            capacity: finalType === 'Executive' || finalType === 'Suite' ? 4 : finalType === 'Deluxe' ? 3 : 2,
        });
    }
    return rooms;
}

export const ALL_ROOMS: Room[] = buildRooms();
export const ROOM_NUMBERS = ALL_ROOMS.map(r => r.number);
export const ROOM_TYPES: RoomType[] = ['Standard', 'Deluxe', 'Suite', 'Executive'];
export const MAINTENANCE_CATEGORIES = ['Plumbing', 'HVAC', 'Electrical', 'Appliance', 'Carpentry', 'Painting', 'IT/Tech', 'General'];
export const MAINTENANCE_STAFF = ['Unassigned', 'Marco R.', 'Luigi F.', 'Ahmed K.', 'Pavel N.'];
export const BEVERAGE_MENU = [
    { name: 'Minibar – Soft Drinks', price: 8 },
    { name: 'Minibar – Beer', price: 12 },
    { name: 'Minibar – Wine (bottle)', price: 45 },
    { name: 'Room Service – Continental Breakfast', price: 28 },
    { name: 'Room Service – Full English Breakfast', price: 38 },
    { name: 'Room Service – Club Sandwich', price: 22 },
    { name: 'Room Service – Dinner Set Menu', price: 65 },
    { name: 'Spa Treatment – 60min Massage', price: 120 },
    { name: 'Laundry Service', price: 25 },
    { name: 'Airport Transfer', price: 80 },
    { name: 'Late Check-out (4 hrs)', price: 50 },
    { name: 'Early Check-in (4 hrs)', price: 50 },
];

// ─── Initial Data ───────────────────────────────────────────────────────────
const initialRooms: Room[] = ALL_ROOMS;
const initialGuests: Guest[] = [];
const initialArrivals: Arrival[] = [];
const initialDepartures: Departure[] = [];
const initialIncidents: Incident[] = [];
const initialWorkOrders: WorkOrder[] = [];
const initialAssets: Asset[] = [
    { id: 'AST-001', name: 'Main Elevator (Lobby)', type: 'Elevator', serial: 'OT-89423', lastService: '2026-01-15', nextService: '2026-04-15', status: 'operational' },
    { id: 'AST-002', name: 'Boiler System A', type: 'Boiler', serial: 'BY-5521X', lastService: '2025-12-01', nextService: '2026-06-01', status: 'operational' },
    { id: 'AST-003', name: 'Pool HVAC Unit', type: 'HVAC', serial: 'DK-9910-B', lastService: '2026-02-01', nextService: '2026-05-01', status: 'requires_attention' },
    { id: 'AST-004', name: 'Generator Backup', type: 'Generator', serial: 'GN-3310-A', lastService: '2026-01-20', nextService: '2026-07-20', status: 'operational' },
    { id: 'AST-005', name: 'Fire Suppression System', type: 'Safety', serial: 'FS-4412', lastService: '2026-02-10', nextService: '2026-08-10', status: 'operational' },
];
const initialLostFound: LostFound[] = [];
const initialFolioItems: FolioItem[] = [];
const initialPayments: Payment[] = [];
const initialInvoices: Invoice[] = [];
const initialStaff: StaffUser[] = [
    { name: 'Admin System', email: 'admin@aureliagrand.com', role: 'super_admin', active: true },
    { name: 'Sofia Romano', email: 'desk@aureliagrand.com', role: 'front_desk', active: true },
    { name: 'Marco Ricci', email: 'maintenance@aureliagrand.com', role: 'maintenance', active: true },
    { name: 'Ana P.', email: 'housekeeping@aureliagrand.com', role: 'housekeeping', active: true },
    { name: 'Elena Bianchi', email: 'finance@aureliagrand.com', role: 'accountant', active: true },
];

// ─── Counters ────────────────────────────────────────────────────────────────
let resCounter = 1000;
let woCounter = 1;
let incidentCounter = 1;
let lfCounter = 1;
let guestCounter = 1;
let paymentCounter = 1;
let folioCounter = 1;
let invoiceCounter = 1;

function today() { return new Date().toISOString().slice(0, 10); }

// ─── Map a LandingBooking → CRM Reservation ──────────────────────────────────
const ROOM_TYPE_TO_ROOM: Record<string, string> = {
    Standard: '101', Deluxe: '102', Suite: '105', Executive: '205',
};

function landingToReservation(b: LandingBooking): Reservation {
    const roomNumber = ROOM_TYPE_TO_ROOM[b.roomType] || '101';
    return {
        id: b.id,
        guest: b.guest,
        email: b.email,
        phone: b.phone || '',
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        room: roomNumber,
        roomType: (b.roomType as RoomType) || 'Standard',
        pax: b.pax,
        status: b.status as Reservation['status'],
        paid: false,
        channel: 'Website',
        totalAmount: b.totalAmount,
        notes: b.notes,
        createdAt: b.createdAt,
    };
}

// ─── Store Interface ─────────────────────────────────────────────────────────
interface DataState {
    reservations: Reservation[];
    arrivals: Arrival[];
    departures: Departure[];
    incidents: Incident[];
    workOrders: WorkOrder[];
    assets: Asset[];
    rooms: Room[];
    lostFound: LostFound[];
    guests: Guest[];
    folioItems: FolioItem[];
    payments: Payment[];
    invoices: Invoice[];
    staff: StaffUser[];

    // ── Guest Portal live data
    guestOrders: GuestOrder[];
    guestComplaints: GuestComplaint[];
    guestLostFound: GuestLostFound[];

    // ── Loading state
    sheetsLoaded: boolean;

    // Computed helpers
    getFreeRooms: () => Room[];
    getOccupiedCount: () => number;
    getTotalRevenue: () => number;

    // Reservations
    addReservation: (r: Omit<Reservation, 'id' | 'createdAt'>) => string;
    importLandingBookings: () => Promise<number>;
    updateReservationStatus: (id: string, status: Reservation['status']) => void;

    // Full live sync from Google Sheets → Zustand
    syncFromShared: () => Promise<number>;

    // Load CRM-specific data from Sheets (rooms, work orders, staff)
    loadFromSheets: () => Promise<void>;

    // FrontDesk
    checkInArrival: (id: string) => void;
    addArrival: (a: Omit<Arrival, 'id' | 'status' | 'flags'> & { reservationId: string }) => void;
    addIncident: (i: Omit<Incident, 'id' | 'resolved' | 'date'>) => void;
    resolveIncident: (id: number) => void;
    checkOutDeparture: (id: string) => void;

    // Maintenance
    addWorkOrder: (w: Omit<WorkOrder, 'id' | 'created'>) => void;
    updateWorkOrderStatus: (id: string, status: WOStatus) => void;

    // Housekeeping
    updateRoomStatus: (number: string, status: RoomStatus, assignedTo?: string, priority?: Room['priority']) => void;
    addLostFound: (item: Omit<LostFound, 'id'>) => void;
    claimLostFound: (id: number) => void;

    // Guests
    addGuest: (g: Omit<Guest, 'id' | 'stays' | 'totalSpend' | 'lastStay'>) => number;
    syncGuestsFromBookings: () => Promise<number>;

    // Finance
    addPayment: (p: Omit<Payment, 'id'>) => void;
    addFolioItem: (fi: Omit<FolioItem, 'id'>) => void;
    addInvoice: (inv: Omit<Invoice, 'id'>) => void;
    markInvoicePaid: (id: string) => void;

    // Guest portal order/complaint/LF status updates
    updateGuestOrderStatus: (id: string, status: GuestOrder['status']) => void;
    updateGuestComplaintStatus: (id: string, status: GuestComplaint['status']) => void;
    updateGuestLFStatus: (id: string, status: GuestLostFound['status']) => void;

    // Staff
    addStaff: (s: StaffUser) => void;
    updateStaff: (email: string, updates: Partial<StaffUser>) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
    reservations: [],
    arrivals: initialArrivals,
    departures: initialDepartures,
    incidents: initialIncidents,
    workOrders: initialWorkOrders,
    assets: initialAssets,
    rooms: initialRooms,
    lostFound: initialLostFound,
    guests: initialGuests,
    folioItems: initialFolioItems,
    payments: initialPayments,
    invoices: initialInvoices,
    staff: initialStaff,
    guestOrders: [],
    guestComplaints: [],
    guestLostFound: [],
    sheetsLoaded: false,

    // ── Computed Helpers
    getFreeRooms: () => get().rooms.filter(r => r.status !== 'occupied' && r.status !== 'out_of_order'),
    getOccupiedCount: () => get().rooms.filter(r => r.status === 'occupied').length,
    getTotalRevenue: () => get().folioItems.filter(fi => fi.amount > 0).reduce((s, fi) => s + fi.amount, 0),

    // ── Load CRM-specific data from Google Sheets ──────────────────────────
    loadFromSheets: async () => {
        try {
            // Seed demo data if empty (shares bookings etc.)
            await seedDemoDataIfEmpty();

            const [sheetRooms, sheetWorkOrders, sheetStaff, shared] = await Promise.all([
                fetchSheet<Room>('Rooms'),
                fetchSheet<WorkOrder>('WorkOrders'),
                fetchSheet<StaffUser>('Staff'),
                getSharedData(),
            ]);

            const reservations = shared.bookings.map(landingToReservation);

            // Seed rooms to sheet if empty
            if (sheetRooms.length === 0) {
                // Write initial rooms to Sheets
                appendRows('Rooms', ALL_ROOMS as unknown as Record<string, unknown>[]).catch(console.error);
            }

            // Seed staff to sheet if empty
            if (sheetStaff.length === 0) {
                appendRows('Staff', initialStaff as unknown as Record<string, unknown>[]).catch(console.error);
            }

            set({
                rooms: sheetRooms.length > 0 ? sheetRooms : ALL_ROOMS,
                workOrders: sheetWorkOrders.length > 0 ? sheetWorkOrders : [],
                staff: sheetStaff.length > 0 ? sheetStaff : initialStaff,
                reservations,
                guestOrders: shared.guestOrders || [],
                guestComplaints: shared.guestComplaints || [],
                guestLostFound: shared.guestLostFound || [],
                sheetsLoaded: true,
            });
        } catch (err) {
            console.error('Failed to load CRM data from Sheets:', err);
            set({ sheetsLoaded: true }); // still mark as loaded so UI doesn't hang
        }
    },

    // ── Reservations
    addReservation: (r) => {
        const id = `RES-${++resCounter}`;
        const newRes: Reservation = { ...r, id, createdAt: today() };
        set(s => ({
            reservations: [newRes, ...s.reservations],
            rooms: s.rooms.map(rm =>
                rm.number === r.room ? { ...rm, status: 'occupied' as RoomStatus } : rm
            ),
        }));
        // Write room status to sheets
        apiUpdateRow('Rooms', r.room, { status: 'occupied' }).catch(console.error);
        // Add to arrivals if check-in is today
        const todayStr = today();
        if (r.checkIn <= todayStr && r.status !== 'Checked Out') {
            const { addArrival: aa } = get();
            aa({ guest: r.guest, room: r.room, eta: 'Today', pax: r.pax, vip: false, reservationId: id });
        }
        return id;
    },

    updateReservationStatus: (id, status) => {
        set(s => ({
            reservations: s.reservations.map(r => r.id === id ? { ...r, status } : r),
        }));
        // Sync status back to Google Sheets
        apiUpdateRow('Bookings', id, { status: status as string }).catch(console.error);
    },

    // ── Master sync: pull everything from Google Sheets into Zustand ─────────
    syncFromShared: async () => {
        const shared = await getSharedData();
        const { reservations } = get();
        const existingIds = new Set(reservations.map(r => r.id));
        const newRes = shared.bookings
            .filter(b => !existingIds.has(b.id))
            .map(landingToReservation);

        newRes.forEach(r => markBookingImported(r.id));

        set({
            ...(newRes.length > 0 ? { reservations: [...newRes, ...reservations] } : {}),
            guestOrders: shared.guestOrders || [],
            guestComplaints: shared.guestComplaints || [],
            guestLostFound: shared.guestLostFound || [],
        });
        return newRes.length;
    },

    importLandingBookings: async () => {
        const shared = await getSharedData();
        const unimported = shared.bookings.filter(b => !b.importedToCRM);
        if (unimported.length === 0) return 0;
        const newReservations = unimported.map(landingToReservation);
        const { reservations } = get();
        const existingIds = new Set(reservations.map(r => r.id));
        const truly_new = newReservations.filter(r => !existingIds.has(r.id));
        if (truly_new.length === 0) {
            unimported.forEach(b => markBookingImported(b.id));
            return 0;
        }
        set(s => ({ reservations: [...truly_new, ...s.reservations] }));
        unimported.forEach(b => markBookingImported(b.id));
        return truly_new.length;
    },

    // ── FrontDesk
    checkInArrival: (id) => set(s => ({
        arrivals: s.arrivals.map(a => a.id === id ? { ...a, status: 'checked_in' as const } : a),
        reservations: s.reservations.map(r => r.id === id ? { ...r, status: 'Checked In' as const } : r),
        rooms: s.rooms.map(r => {
            const arr = s.arrivals.find(a => a.id === id);
            return arr && r.number === arr.room ? { ...r, status: 'occupied' as RoomStatus } : r;
        }),
    })),

    addArrival: ({ reservationId, ...a }) => set(s => ({
        arrivals: [{ ...a, id: reservationId, status: 'arriving' as const, flags: [] }, ...s.arrivals],
    })),

    addIncident: (i) => set(s => ({
        incidents: [{ ...i, id: ++incidentCounter, resolved: false, date: today() }, ...s.incidents],
    })),

    resolveIncident: (id) => set(s => ({
        incidents: s.incidents.map(i => i.id === id ? { ...i, resolved: true } : i),
    })),

    checkOutDeparture: (id) => set(s => {
        const dep = s.departures.find(d => d.id === id);
        if (dep) {
            // Update room status in Sheets
            apiUpdateRow('Rooms', dep.room, { status: 'dirty' }).catch(console.error);
        }
        return {
            departures: s.departures.map(d => d.id === id ? { ...d, status: 'checked_out' as const } : d),
            reservations: s.reservations.map(r => r.id === id ? { ...r, status: 'Checked Out' as const } : r),
            rooms: dep ? s.rooms.map(r => r.number === dep.room ? { ...r, status: 'dirty' as RoomStatus } : r) : s.rooms,
        };
    }),

    // ── Maintenance
    addWorkOrder: (w) => {
        const id = `WO-${String(woCounter++).padStart(4, '0')}`;
        const newWO: WorkOrder = { ...w, id, created: today() };
        set(s => ({ workOrders: [newWO, ...s.workOrders] }));
        appendRow('WorkOrders', newWO as unknown as Record<string, unknown>).catch(console.error);
    },

    updateWorkOrderStatus: (id, status) => {
        set(s => ({
            workOrders: s.workOrders.map(w => w.id === id ? { ...w, status } : w),
        }));
        apiUpdateRow('WorkOrders', id, { status }).catch(console.error);
    },

    // ── Housekeeping
    updateRoomStatus: (number, status, assignedTo, priority) => {
        set(s => ({
            rooms: s.rooms.map(r => r.number === number ? { ...r, status, ...(assignedTo !== undefined ? { assignedTo } : {}), ...(priority !== undefined ? { priority } : {}) } : r),
        }));
        const updates: Record<string, unknown> = { status };
        if (assignedTo !== undefined) updates.assignedTo = assignedTo;
        if (priority !== undefined) updates.priority = priority;
        apiUpdateRow('Rooms', number, updates).catch(console.error);
    },

    addLostFound: (item) => set(s => ({
        lostFound: [{ ...item, id: ++lfCounter }, ...s.lostFound],
    })),

    claimLostFound: (id) => set(s => ({
        lostFound: s.lostFound.map(l => l.id === id ? { ...l, status: 'Claimed', location: 'Returned to guest' } : l),
    })),

    // ── Guests
    addGuest: (g) => {
        const id = ++guestCounter;
        set(s => ({
            guests: [{ ...g, id, stays: 0, totalSpend: 0, lastStay: today() }, ...s.guests],
        }));
        return id;
    },

    // ── Finance
    addPayment: (p) => set(s => {
        const newPayment = { ...p, id: `PAY-${String(paymentCounter++).padStart(4, '0')}` };
        const paymentFolioItem: Omit<FolioItem, 'id'> = {
            date: p.date,
            description: `Payment – ${p.method}${p.guestName ? ` (${p.guestName})` : ''}`,
            amount: -p.amount,
            type: 'payment',
            guestName: p.guestName,
            reservationId: p.reservationId,
        };
        const updatedGuests = p.guestId
            ? s.guests.map(g => g.id === p.guestId ? { ...g, totalSpend: g.totalSpend + p.amount } : g)
            : s.guests;
        return {
            payments: [...s.payments, newPayment],
            folioItems: [...s.folioItems, { ...paymentFolioItem, id: `FI-${String(folioCounter++).padStart(4, '0')}` }],
            guests: updatedGuests,
        };
    }),

    addFolioItem: (fi) => set(s => ({
        folioItems: [...s.folioItems, { ...fi, id: `FI-${String(folioCounter++).padStart(4, '0')}` }],
    })),

    addInvoice: (inv) => set(s => ({
        invoices: [{ ...inv, id: `INV-${new Date().getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}` }, ...s.invoices],
    })),

    markInvoicePaid: (id) => set(s => ({
        invoices: s.invoices.map(inv => inv.id === id ? { ...inv, status: 'paid' as const } : inv),
    })),

    // ── Guest portal status updates (write to Sheets + update store)
    updateGuestOrderStatus: (id, status) => {
        sharedUpdateOrder(id, status);
        set(s => ({ guestOrders: s.guestOrders.map(o => o.id === id ? { ...o, status } : o) }));
    },
    updateGuestComplaintStatus: (id, status) => {
        sharedUpdateComplaint(id, status);
        set(s => ({ guestComplaints: s.guestComplaints.map(c => c.id === id ? { ...c, status } : c) }));
    },
    updateGuestLFStatus: (id, status) => {
        sharedUpdateLF(id, status);
        set(s => ({ guestLostFound: s.guestLostFound.map(l => l.id === id ? { ...l, status } : l) }));
    },

    // ── Auto-sync guests from shared bookings
    syncGuestsFromBookings: async () => {
        const shared = await getSharedData();
        const { guests } = get();
        const existingEmails = new Set(guests.map(g => g.email.toLowerCase()));
        const newGuests: typeof guests = [];
        shared.bookings.forEach(b => {
            if (!b.email || existingEmails.has(b.email.toLowerCase())) return;
            existingEmails.add(b.email.toLowerCase());
            newGuests.push({
                id: ++guestCounter,
                name: b.guest,
                email: b.email,
                phone: b.phone || '',
                nationality: 'Unknown',
                stays: shared.bookings.filter(bk => bk.email.toLowerCase() === b.email.toLowerCase()).length,
                totalSpend: shared.bookings
                    .filter(bk => bk.email.toLowerCase() === b.email.toLowerCase())
                    .reduce((sum, bk) => sum + bk.totalAmount, 0),
                tags: ['Website'],
                lastStay: b.checkIn,
                vip: false,
                gdprConsent: true,
            });
        });
        if (newGuests.length > 0) {
            set(s => ({ guests: [...newGuests, ...s.guests] }));
        }
        return newGuests.length;
    },

    // ── Staff
    addStaff: (s) => {
        set(state => ({ staff: [...state.staff, s] }));
        appendRow('Staff', s as unknown as Record<string, unknown>).catch(console.error);
    },
    updateStaff: (email, updates) => {
        set(s => ({
            staff: s.staff.map(u => u.email === email ? { ...u, ...updates } : u),
        }));
        apiUpdateRow('Staff', email, updates as Record<string, unknown>).catch(console.error);
    },
}));
