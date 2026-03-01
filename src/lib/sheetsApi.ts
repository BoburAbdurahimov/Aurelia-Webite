// ─────────────────────────────────────────────────────────────────────────────
// sheetsApi.ts — Thin fetch wrapper for the /api/sheets Vercel serverless route
// Used by both Guest Portal and CRM stores
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/api/sheets';

/**
 * Fetch all rows from a Google Sheet tab, parsed as typed objects.
 * JSON-encoded columns (like `items` or `lineItems`) are auto-parsed.
 */
export async function fetchSheet<T = Record<string, string>>(sheetName: string): Promise<T[]> {
    const res = await fetch(`${BASE}?sheet=${encodeURIComponent(sheetName)}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch sheet "${sheetName}"`);
    }
    const rows: Record<string, string>[] = await res.json();
    // Auto-parse numeric and JSON fields
    return rows.map(row => {
        const parsed: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
            if (val === '') { parsed[key] = val; continue; }
            // Try JSON parse (for arrays/objects)
            if ((val.startsWith('[') || val.startsWith('{')) && (val.endsWith(']') || val.endsWith('}'))) {
                try { parsed[key] = JSON.parse(val); continue; } catch { /* not JSON */ }
            }
            // Try number parse
            if (/^-?\d+(\.\d+)?$/.test(val)) { parsed[key] = Number(val); continue; }
            // Boolean
            if (val === 'true') { parsed[key] = true; continue; }
            if (val === 'false') { parsed[key] = false; continue; }
            parsed[key] = val;
        }
        return parsed as T;
    });
}

/**
 * Append one or more rows to a sheet tab.
 */
export async function appendRows(sheetName: string, rows: Record<string, unknown>[]): Promise<void> {
    const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: sheetName, rows }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to append to "${sheetName}"`);
    }
}

/**
 * Append a single row to a sheet tab.
 */
export async function appendRow(sheetName: string, data: Record<string, unknown>): Promise<void> {
    return appendRows(sheetName, [data]);
}

/**
 * Update a single row identified by its key (id, number, or email).
 */
export async function updateRow(sheetName: string, id: string, data: Record<string, unknown>): Promise<void> {
    const res = await fetch(BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: sheetName, id, data }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to update row "${id}" in "${sheetName}"`);
    }
}

/**
 * Delete a row by its key.
 */
export async function deleteRow(sheetName: string, id: string): Promise<void> {
    const res = await fetch(`${BASE}?sheet=${encodeURIComponent(sheetName)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to delete row "${id}" from "${sheetName}"`);
    }
}

// ─── Typed helpers for commonly used sheets ─────────────────────────────────

export type SheetName =
    | 'Bookings' | 'GuestOrders' | 'GuestComplaints' | 'GuestLostFound'
    | 'FolioItems' | 'Invoices' | 'Payments' | 'Rooms' | 'WorkOrders' | 'Staff';
