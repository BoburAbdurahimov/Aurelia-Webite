// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — Google Sheets CRUD Proxy
// Keeps service-account credentials server-side; the browser only calls /api/sheets
// ─────────────────────────────────────────────────────────────────────────────
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly in development
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

// ── Auth ────────────────────────────────────────────────────────────────────
function getAuth() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!email || !key) throw new Error('Missing Google service account env vars');

    return new google.auth.GoogleAuth({
        credentials: {
            client_email: email,
            private_key: key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

function sheetId() {
    const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!id) throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
    return id;
}

const VALID_SHEETS = [
    'Bookings', 'GuestOrders', 'GuestComplaints', 'GuestLostFound',
    'FolioItems', 'Invoices', 'Payments', 'Rooms', 'WorkOrders', 'Staff',
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function rowToObj(headers: string[], row: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
}

function objToRow(headers: string[], obj: Record<string, unknown>): string[] {
    return headers.map(h => {
        const val = obj[h];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    });
}

// ── CORS helper ─────────────────────────────────────────────────────────────
function setCors(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Main handler ────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const auth = getAuth();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = sheetId();
        const sheetName = (req.query.sheet as string) || (req.body?.sheet as string);

        if (!sheetName || !VALID_SHEETS.includes(sheetName)) {
            return res.status(400).json({ error: `Invalid sheet. Use one of: ${VALID_SHEETS.join(', ')}` });
        }

        // ── GET — Read all rows ─────────────────────────────────────────────
        if (req.method === 'GET') {
            const result = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:ZZ`,
            });
            const rows = result.data.values || [];
            if (rows.length < 1) return res.json([]);
            const headers = rows[0];
            const data = rows.slice(1).map(r => rowToObj(headers, r));
            return res.json(data);
        }

        // ── POST — Append row(s) ────────────────────────────────────────────
        if (req.method === 'POST') {
            const { rows: inputRows } = req.body as { rows: Record<string, unknown>[] };
            if (!inputRows || !Array.isArray(inputRows) || inputRows.length === 0) {
                return res.status(400).json({ error: 'Body must have { sheet, rows: [...] }' });
            }

            // Get headers first
            const headerRes = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!1:1`,
            });
            const headers = headerRes.data.values?.[0];
            if (!headers) {
                return res.status(400).json({ error: `Sheet "${sheetName}" has no header row. Add column headers first.` });
            }

            const values = inputRows.map(r => objToRow(headers, r));
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A:ZZ`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                requestBody: { values },
            });
            return res.json({ ok: true, appended: inputRows.length });
        }

        // ── PUT — Update a single row by id ─────────────────────────────────
        if (req.method === 'PUT') {
            const { id, data: updateData } = req.body as { id: string; data: Record<string, unknown> };
            if (!id || !updateData) {
                return res.status(400).json({ error: 'Body must have { sheet, id, data: {...} }' });
            }

            const result = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:ZZ`,
            });
            const rows = result.data.values || [];
            if (rows.length < 2) return res.status(404).json({ error: 'No data rows found' });

            const headers = rows[0];
            const idCol = headers.indexOf('id');
            // For Rooms, use 'number' as the key; for Staff, use 'email'
            const keyCol = idCol >= 0 ? idCol : headers.indexOf('number') >= 0 ? headers.indexOf('number') : headers.indexOf('email');
            if (keyCol < 0) return res.status(400).json({ error: 'No id/number/email column found' });

            const rowIdx = rows.findIndex((r, i) => i > 0 && r[keyCol] === id);
            if (rowIdx < 0) return res.status(404).json({ error: `Row with key "${id}" not found` });

            // Merge existing row with updates
            const existing = rowToObj(headers, rows[rowIdx]);
            const merged = { ...existing, ...updateData };
            const newRow = objToRow(headers, merged);

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A${rowIdx + 1}:${String.fromCharCode(64 + headers.length)}${rowIdx + 1}`,
                valueInputOption: 'RAW',
                requestBody: { values: [newRow] },
            });
            return res.json({ ok: true });
        }

        // ── DELETE — Remove a row by id ─────────────────────────────────────
        if (req.method === 'DELETE') {
            const id = req.query.id as string;
            if (!id) return res.status(400).json({ error: 'Query param "id" is required' });

            const result = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:ZZ`,
            });
            const rows = result.data.values || [];
            if (rows.length < 2) return res.status(404).json({ error: 'No data rows' });

            const headers = rows[0];
            const idCol = headers.indexOf('id');
            const keyCol = idCol >= 0 ? idCol : headers.indexOf('number') >= 0 ? headers.indexOf('number') : headers.indexOf('email');
            if (keyCol < 0) return res.status(400).json({ error: 'No key column found' });

            const rowIdx = rows.findIndex((r, i) => i > 0 && r[keyCol] === id);
            if (rowIdx < 0) return res.status(404).json({ error: `Row "${id}" not found` });

            // Get the sheet's gid to use batchUpdate
            const meta = await sheets.spreadsheets.get({
                spreadsheetId,
                fields: 'sheets.properties',
            });
            const sheetMeta = meta.data.sheets?.find(s => s.properties?.title === sheetName);
            if (!sheetMeta?.properties?.sheetId && sheetMeta?.properties?.sheetId !== 0) {
                return res.status(500).json({ error: 'Could not find sheet gid' });
            }

            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheetMeta.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIdx,
                                endIndex: rowIdx + 1,
                            },
                        },
                    }],
                },
            });
            return res.json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: unknown) {
        console.error('Sheets API error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ error: message });
    }
}
