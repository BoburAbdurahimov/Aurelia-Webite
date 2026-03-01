# Google Sheets Integration — Setup Guide

This guide walks you through connecting the Aurelia Grand Hotel app (Guest Portal + CRM) to Google Sheets as the central database.

---

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it `aurelia-hotel` (or any name) → **Create**
4. Make sure the new project is selected in the top bar

## 2. Enable the Google Sheets API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Google Sheets API**
3. Click it → **Enable**

## 3. Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **Service Account**
3. Fill in:
   - **Name:** `aurelia-sheets`
   - **ID:** auto-generated (e.g. `aurelia-sheets@aurelia-hotel.iam.gserviceaccount.com`)
4. Click **Create and Continue** → skip optional steps → **Done**
5. Click on the newly created service account
6. Go to the **Keys** tab → **Add Key** → **Create new key**
7. Select **JSON** → **Create**
8. A JSON file will download — keep it safe, you'll need values from it

## 4. Create the Google Spreadsheet

1. Go to [Google Sheets](https://docs.google.com/spreadsheets/)
2. Create a **new blank spreadsheet**
3. Rename it to `Aurelia Hotel Database`
4. Create **10 tabs** (sheets) with these **exact names**:

| Tab Name | Purpose |
|----------|---------|
| `Bookings` | Guest reservations from the website |
| `GuestOrders` | Room service / F&B orders |
| `GuestComplaints` | Guest complaint tickets |
| `GuestLostFound` | Lost & found reports |
| `FolioItems` | Financial charges & credits |
| `Invoices` | Generated invoices |
| `Payments` | Payment records |
| `Rooms` | Hotel room inventory & status |
| `WorkOrders` | Maintenance work orders |
| `Staff` | CRM staff accounts |

> **Tip:** The default first tab is called "Sheet1" — rename it to `Bookings`, then click the **+** button at the bottom to add the remaining 9 tabs.

### Add Header Rows

Each tab needs a header row (Row 1). Add these headers:

**Bookings:**
```
id | guest | email | phone | checkIn | checkOut | roomType | pax | totalAmount | nights | channel | status | createdAt | notes | importedToCRM
```

**GuestOrders:**
```
id | reservationId | guestName | items | total | status | createdAt
```

**GuestComplaints:**
```
id | reservationId | guestName | category | description | status | createdAt
```

**GuestLostFound:**
```
id | reservationId | guestName | item | location | status | createdAt
```

**FolioItems:**
```
id | reservationId | date | description | amount | type | guestName
```

**Invoices:**
```
id | reservationId | guest | date | amount | status | lineItems
```

**Payments:**
```
id | reservationId | date | method | amount | status | ref | note | guestName
```

**Rooms:**
```
id | number | floor | type | status | pricePerNight | capacity | assignedTo
```

**WorkOrders:**
```
id | title | room | category | severity | status | assignedTo | createdAt | completedAt | description | cost
```

**Staff:**
```
id | name | email | role | active
```

> **Note:** Separate each column header into its own cell (one header per column). The app reads Row 1 as field names.

## 5. Share the Spreadsheet

1. Open your spreadsheet
2. Click **Share** (top right)
3. Paste the **Service Account email** (from step 3, e.g. `aurelia-sheets@aurelia-hotel.iam.gserviceaccount.com`)
4. Set permission to **Editor**
5. Uncheck "Notify people" → **Share**

## 6. Get the Spreadsheet ID

The spreadsheet ID is in the URL:

```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

Copy the long string between `/d/` and `/edit`.

## 7. Configure Environment Variables

### For Local Development

Create a `.env.local` file in the project root:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=aurelia-sheets@aurelia-hotel.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD...rest-of-key...\n-----END PRIVATE KEY-----\n"
```

> **Important:** The `GOOGLE_PRIVATE_KEY` value comes from the downloaded JSON key file (the `private_key` field). Keep the surrounding quotes and the `\n` line breaks exactly as they appear in the JSON.

### For Vercel Deployment

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add these three variables with the same values:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`

> **Tip for Vercel:** When pasting the private key in Vercel, you can paste the raw multi-line key (with actual line breaks instead of `\n`). Vercel handles multi-line values natively.

## 8. Deploy

```bash
# Local development
npm run dev

# Production build
npm run build

# Deploy to Vercel
vercel --prod
```

## 9. Verify

1. Open the Guest Portal → make a test booking
2. Check your Google Sheet — the `Bookings` tab should have a new row
3. Log into the CRM → the booking should appear in Reservations
4. Any changes in the CRM (room status, work orders, etc.) should write back to the sheet

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `403 Forbidden` from Sheets API | Ensure the spreadsheet is shared with the service account email as **Editor** |
| `404 Not Found` | Check the spreadsheet ID in `.env.local` is correct |
| Empty data on first load | Make sure the tab names match **exactly** (case-sensitive) |
| `DECODER_ERR` or key parsing error | Ensure `GOOGLE_PRIVATE_KEY` has proper `\n` formatting |
| API not enabled | Go to Cloud Console → APIs & Services → enable Google Sheets API |
| Data not syncing to CRM | Check browser console for fetch errors to `/api/sheets` |

---

## Architecture Overview

```
Guest Portal (browser)  ──┐
                          ├──→  /api/sheets (Vercel serverless)  ──→  Google Sheets API  ──→  Spreadsheet
CRM (browser)            ──┘         ↑
                              Uses Service Account
                              credentials (server-side only)
```

- **Credentials never reach the browser** — they stay in the Vercel serverless function
- Both Guest Portal and CRM call the same `/api/sheets` endpoint
- Data is cached in-memory on the frontend for performance, with periodic refresh
