# 🏨 Aurelia Grand Hotel — Run & Verify Guide

## Quick Start

### 1. Start the Landing Page + Guest Portal
```sh
cd "hotel web"
npm run dev          # → http://localhost:5173
```

### 2. Start the CRM Admin
```sh
cd "hotel web/erp/frontend"
npm run dev          # → http://localhost:5174
```

---

## 🔗 URL Map

| App | URL | Purpose |
|-----|-----|---------|
| Landing Page | http://localhost:5173 | Public marketing + booking widget |
| Guest Portal | http://localhost:5173/guest-portal | Guest self-service |
| CRM Admin | http://localhost:5174 | Staff / back-office |

---

## 👤 Test Accounts

### CRM Admin
- **Email:** admin@aurelia-demo.com
- **Password:** Password123!

### Guest Portal (Demo Reservations)

| Reservation ID | Email | Status |
|---------------|-------|--------|
| WEB-DEMO-001 | guest1@aurelia-demo.com | Confirmed (check-in today) |
| WEB-DEMO-002 | sophie@example.com | Pending |
| WEB-DEMO-003 | james@example.com | Checked In |
| WEB-DEMO-004 | yuki@example.com | Confirmed |

---

## ✅ Verification Checklist

### A. Suite Images (Landing Page)
1. Go to http://localhost:5173
2. Scroll to **"Room Collection"** / **Suites** section
3. ✅ 4 suite cards with real photographs should appear
4. ✅ Fallback SVG shows if CDN unreachable (no broken icons)

### B. Booking Creation (Landing → CRM)
1. On the landing page, click **Book Now** or click any suite → Book
2. Fill in guest details + dates and submit
3. Go to http://localhost:5174 → **Reservations**
4. ✅ Amber **"N new web bookings → Import"** button appears
5. ✅ Click it — booking appears in the table instantly
6. ✅ Status updates in CRM sync back to Guest Portal

### C. Guest Portal — Full Finance Flow
1. Go to http://localhost:5173/guest-portal
2. Login: `WEB-DEMO-001` / `guest1@aurelia-demo.com`
3. ✅ Dashboard shows: Reservation card, Balance Due (€1208), Finance KPIs
4. Click **Folio** tab → ✅ Room Charge + Tax line items visible
5. Click **Generate Invoice** → ✅ Invoice appears with Download PDF button
6. Click **Download PDF** → ✅ Invoice opens in new tab / print dialog
7. Click **Add-ons** tab → click **Add** on any add-on → ✅ Confirmation toast appears
8. Switch to Folio → ✅ Add-on charge + payment entry both appear
9. Click **Pay Balance Now** → enter amount + method → ✅ Balance reduces

### D. CRM Finance — Live Sync
1. Open http://localhost:5174 → **Finance**
2. ✅ Header shows: "● Live sync with Guest Portal"
3. ✅ KPI cards: Total Charges ≥ €5,140 · Payments ≥ €1,000
4. ✅ Folio tab: 9+ line items from all reservations
5. Click **Sync** → ✅ Picks up any new payments from Guest Portal
6. Click **Invoices** tab → ✅ INV-2026-001 visible
7. Click **Download** → ✅ PDF opens in new tab

### E. CRM Reservations — Import Flow
1. Open http://localhost:5174 → **Reservations**
2. ✅ All 4 demo reservations (WEB-DEMO-001 through 004) visible
3. ✅ Each shows: ID (monospaced), Guest name+email, Room, Dates, Nights, Total, Status
4. ✅ Status badges color-coded: Confirmed=blue, Pending=yellow, Checked In=green
5. Click **Manage** on any row → ✅ Modal opens with full details
6. Change status dropdown → Click **Save** → ✅ Status updates in CRM + localStorage
7. Go to Guest Portal → ✅ Status badge on dashboard has updated

### F. Polling / Auto-Sync
1. Open CRM Reservations in one browser tab
2. Make a new booking on landing page in another tab
3. Wait up to **15 seconds** OR click the refresh icon (⟳)
4. ✅ Amber import badge appears in CRM

---

## 🗄️ Data Architecture

```
localStorage["hotel_erp_v1"]
│
├── bookings[]          ← Created by landing page Suites widget
│                          Read by: Guest Portal login + CRM Reservations import
├── folioItems[]        ← Auto-created on booking + room service + add-ons
│   Type: room|tax|addon|service|beverage|payment|fee
├── invoices[]          ← Generated on demand (Guest Portal or CRM Finance)
├── payments[]          ← Recorded via Guest Portal "Pay Now" + add-on purchase
├── guestOrders[]       ← Room service orders (Guest Portal → CRM Front Desk)
├── guestComplaints[]   ← Complaints (Guest Portal → CRM Front Desk)
└── guestLostFound[]    ← Lost & Found reports (Guest Portal → CRM Housekeeping)
```

**Sync mechanism:** Both apps poll every 15 seconds + listen to `storage` events
(cross-tab updates are instant via `window.addEventListener('storage', ...)`).

---

## 🔄 Landing → CRM Booking Flow

```
Guest fills form on /        ──► addLandingBooking() writes to localStorage
                                    ├── Creates LandingBooking {status: 'Pending'}
                                    ├── Creates FolioItem: room charge
                                    └── Creates FolioItem: city tax (15%)

CRM Reservations page        ──► polls localStorage every 15s
                                    ├── Detects importedToCRM: false
                                    ├── Shows amber "Import" badge
                                    └── On click: converts to CRM Reservation

CRM Finance page             ──► reads sharedFolio from localStorage directly
                                    └── Shows all folio items across all bookings
```

---

## 🧪 What Was Fixed

| Problem | Fix Applied |
|---------|------------|
| Reservations not syncing | localStorage bridge upgraded with `importedToCRM` flag + auto-polling in CRM |
| Suite images broken | Switched to `picsum.photos` CDN (no hotlink block) + `onError` fallback on every `<img>` |
| Guest Portal missing finance | Full Folio/Invoice/Payment/Add-on UI with real shared localStorage data |
| Finance not in CRM | Finance page merges shared localStorage data on 15s poll + Sync button |
| No seed data | `seedDemoDataIfEmpty()` runs on both app startups |
| Status changes not syncing | `updateReservationStatus()` writes back to localStorage |
