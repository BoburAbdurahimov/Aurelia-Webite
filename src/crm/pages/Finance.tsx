import { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import { useDataStore, BEVERAGE_MENU } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';
import { getSharedData, type SharedFolioItem, type SharedInvoice, type SharedPayment } from '../store/guestStore';

type FinanceTab = 'folio' | 'invoices' | 'payments' | 'audit';

const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Voucher', 'Booking.com (Collect)'];

function generateInvoicePDF(guestName: string, invoiceId: string, items: { description: string; amount: number }[], status: string) {
    const total = items.reduce((s, i) => s + i.amount, 0);
    const statusColor = status === 'paid' ? '#16a34a' : '#dc2626';
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Invoice ${invoiceId}</title><style>body{font-family:Georgia,serif;margin:0;padding:40px;color:#1a1a2e}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}.hotel-name{font-size:28px;font-weight:700}.invoice-meta{text-align:right;font-size:13px;color:#555}.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;color:white;background:${statusColor};text-transform:uppercase;margin-top:4px}hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}.guest-block{background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;font-size:14px}table{width:100%;border-collapse:collapse;font-size:14px}th{background:#1e3a5f;color:white;text-align:left;padding:10px 14px;font-size:12px;text-transform:uppercase}td{padding:10px 14px;border-bottom:1px solid #f0f0f0}.total-row{font-weight:bold;font-size:16px;background:#f9fafb}.footer{margin-top:40px;text-align:center;font-size:12px;color:#888}</style></head><body><div class="header"><div><div class="hotel-name">AURELIA GRAND HOTEL</div><div style="font-size:13px;color:#888;margin-top:4px">Via della Seta 12, Florence, Italy · +39 055 123 4567</div></div><div class="invoice-meta"><div style="font-size:20px;font-weight:700">INVOICE</div><div style="font-size:13px;margin-top:4px;font-family:monospace">${invoiceId}</div><div>Date: ${new Date().toLocaleDateString('en-GB')}</div><div class="badge">${status}</div></div></div><div class="guest-block"><strong>Bill To:</strong> ${guestName}</div><table><thead><tr><th>Description</th><th style="text-align:right">Amount (€)</th></tr></thead><tbody>${items.map(i => `<tr><td>${i.description}</td><td style="text-align:right;font-family:monospace">${i.amount > 0 ? '+' : ''}€${i.amount.toFixed(2)}</td></tr>`).join('')}<tr class="total-row"><td><strong>TOTAL DUE</strong></td><td style="text-align:right;font-family:monospace"><strong>€${total.toFixed(2)}</strong></td></tr></tbody></table><div class="footer">Thank you for staying at Aurelia Grand Hotel<br/>aureliagrand.com · finance@aureliagrand.com</div><script>window.onload=()=>window.print();</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) alert('Please allow pop-ups to download the invoice.');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function Finance() {
    const {
        folioItems: crmFolioItems, payments: crmPayments, invoices: crmInvoices, guests, reservations,
        addPayment, addFolioItem, addInvoice, markInvoicePaid,
    } = useDataStore();
    const { addToast } = useToastStore();
    const [tab, setTab] = useState<FinanceTab>('folio');

    // ── Live shared data from Google Sheets (landing + guest portal)
    const [sharedFolio, setSharedFolio] = useState<SharedFolioItem[]>([]);
    const [sharedPayments, setSharedPayments] = useState<SharedPayment[]>([]);
    const [sharedInvoices, setSharedInvoices] = useState<SharedInvoice[]>([]);

    const loadShared = useCallback(async () => {
        const d = await getSharedData();
        setSharedFolio(d.folioItems || []);
        setSharedPayments(d.payments || []);
        setSharedInvoices(d.invoices || []);
    }, []);

    useEffect(() => {
        loadShared();
        const id = setInterval(loadShared, 15000);
        return () => { clearInterval(id); };
    }, [loadShared]);

    // Merged: shared storage wins; CRM-only items appended
    const folioItems = [
        ...sharedFolio,
        ...crmFolioItems.filter(f => !sharedFolio.some(sf => sf.id === f.id)),
    ];
    const payments = [
        ...sharedPayments,
        ...crmPayments.filter(p => !sharedPayments.some(sp => sp.id === p.id)),
    ];
    const invoices = [
        ...sharedInvoices,
        ...crmInvoices.filter(i => !sharedInvoices.some(si => si.id === i.id)),
    ];



    // Add Charge modal
    const [chargeModal, setChargeModal] = useState(false);
    const [chargeForm, setChargeForm] = useState({
        type: 'beverage' as 'charge' | 'beverage' | 'service' | 'tax',
        description: '',
        customDesc: '',
        amount: '',
        reservationId: '',
        guestName: '',
    });

    // Add Payment modal
    const [payModal, setPayModal] = useState(false);
    const [payForm, setPayForm] = useState({ amount: '', method: 'Credit Card', guestId: '', reservationId: '' });

    // Generate Invoice modal
    const [invModal, setInvModal] = useState(false);
    const [invForm, setInvForm] = useState({ guestName: '', reservationId: '' });

    // Night audit
    const [auditRan, setAuditRan] = useState(false);
    const today = new Date().toISOString().slice(0, 10);

    // ── Computed Stats
    const totalCharges = folioItems.filter(f => f.amount > 0).reduce((s, f) => s + f.amount, 0);
    const totalPaid = folioItems.filter(f => f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0);
    const balance = totalCharges - totalPaid;
    const taxTotal = folioItems.filter(f => f.type === 'tax').reduce((s, f) => s + f.amount, 0);

    // Add Charge handler
    const handleAddCharge = () => {
        const menuItem = chargeForm.type === 'beverage'
            ? BEVERAGE_MENU.find(m => m.name === chargeForm.description)
            : null;
        const desc = chargeForm.type !== 'beverage' && chargeForm.customDesc ? chargeForm.customDesc : chargeForm.description;
        const amt = menuItem ? menuItem.price : parseFloat(chargeForm.amount);
        if (!desc) { addToast('Please select or enter a description.', 'error'); return; }
        if (!amt || amt <= 0) { addToast('Please enter a valid amount.', 'error'); return; }

        addFolioItem({
            date: today,
            description: desc,
            amount: amt,
            type: chargeForm.type,
            reservationId: chargeForm.reservationId || undefined,
            guestName: chargeForm.guestName || undefined,
        });
        // Add tax (10%) on charges
        if (chargeForm.type !== 'tax') {
            addFolioItem({ date: today, description: `VAT 10% on ${desc}`, amount: parseFloat((amt * 0.1).toFixed(2)), type: 'tax', reservationId: chargeForm.reservationId || undefined });
        }
        addToast(`Charge €${amt.toFixed(2)} added${chargeForm.guestName ? ` for ${chargeForm.guestName}` : ''}.`, 'success');
        setChargeForm({ type: 'beverage', description: '', customDesc: '', amount: '', reservationId: '', guestName: '' });
        setChargeModal(false);
    };

    // Add Payment handler
    const handleAddPayment = () => {
        const amt = parseFloat(payForm.amount);
        if (!amt || amt <= 0) { addToast('Please enter a valid amount.', 'error'); return; }
        const guest = payForm.guestId ? guests.find(g => g.id === parseInt(payForm.guestId)) : undefined;
        const res = payForm.reservationId ? reservations.find(r => r.id === payForm.reservationId) : undefined;
        addPayment({
            date: today,
            method: payForm.method,
            amount: amt,
            status: 'settled',
            ref: `MANUAL-${Date.now()}`,
            guestId: guest?.id,
            guestName: guest?.name || res?.guest,
            reservationId: payForm.reservationId || undefined,
        });
        addToast(`Payment €${amt.toFixed(2)} via ${payForm.method} recorded.`, 'success');
        setPayForm({ amount: '', method: 'Credit Card', guestId: '', reservationId: '' });
        setPayModal(false);
    };

    // Generate Invoice
    const handleGenerateInvoice = () => {
        if (!invForm.guestName) { addToast('Guest name is required.', 'error'); return; }
        const lineItems = folioItems.map(f => ({ description: f.description, amount: f.amount }));
        if (lineItems.length === 0) { addToast('No folio items to invoice.', 'error'); return; }
        addInvoice({
            guest: invForm.guestName,
            amount: balance,
            date: today,
            status: balance <= 0 ? 'paid' : 'outstanding',
            reservationId: invForm.reservationId,
            lineItems,
        });
        addToast(`Invoice generated for ${invForm.guestName}.`, 'success');
        setInvForm({ guestName: '', reservationId: '' });
        setInvModal(false);
    };

    // Night Audit
    const handleNightAudit = () => {
        const checkedIn = reservations.filter(r => r.status === 'Checked In');
        checkedIn.forEach(res => {
            addFolioItem({
                date: today,
                description: `Night Audit — Room #${res.room} (${res.roomType}) · Auto-posted`,
                amount: res.totalAmount / Math.max(1, Math.round((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / 86400000)),
                type: 'charge',
                reservationId: res.id,
                guestName: res.guest,
            });
        });
        setAuditRan(true);
        addToast(`Night audit posted — ${checkedIn.length} room charge${checkedIn.length !== 1 ? 's' : ''} added.`, 'success');
    };

    const selectedChargeMenuItem = chargeForm.type === 'beverage'
        ? BEVERAGE_MENU.find(m => m.name === chargeForm.description)
        : null;

    return (
        <div>
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-brand-primary">Finance & Folio</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Charges, payments, invoices · <span className="text-green-600 font-semibold">● Live sync with Guest Portal</span>
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex gap-2 flex-wrap items-center">
                    <button onClick={loadShared} title="Reload from Guest Portal"
                        className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50 transition-colors">
                        <ArrowPathIcon className="h-4 w-4" /> Sync
                    </button>
                    <button onClick={() => setChargeModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-primary ring-1 ring-brand-primary/30 hover:bg-brand-surface transition-colors">
                        <PlusIcon className="h-4 w-4" /> Add Charge
                    </button>
                    <button onClick={() => setPayModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white hover:bg-brand-secondary transition-colors shadow-sm">
                        <PlusIcon className="h-4 w-4" /> Add Payment
                    </button>
                    <button onClick={() => setInvModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 transition-colors">
                        + Invoice
                    </button>
                </div>
            </div>


            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Charges', value: `€${totalCharges.toFixed(2)}`, color: 'text-gray-900 bg-white border-gray-200' },
                    { label: 'Payments Received', value: `€${totalPaid.toFixed(2)}`, color: 'text-green-800 bg-green-50 border-green-200' },
                    { label: 'Outstanding Balance', value: `€${balance.toFixed(2)}`, color: balance > 0 ? 'text-red-800 bg-red-50 border-red-200' : 'text-green-800 bg-green-50 border-green-200' },
                    { label: 'Tax Collected', value: `€${taxTotal.toFixed(2)}`, color: 'text-gray-700 bg-gray-50 border-gray-200' },
                ].map(c => (
                    <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">{c.label}</p>
                        <p className="text-2xl font-bold font-mono">{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex gap-6">
                    {([['folio', 'Folio'], ['payments', 'Payments'], ['invoices', 'Invoices'], ['audit', 'Night Audit']] as const).map(([t, label]) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-brand-primary'}`}>
                            {label}
                            {t === 'folio' && <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 font-mono px-1.5 py-0.5 rounded-full">{folioItems.length}</span>}
                            {t === 'invoices' && <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 font-mono px-1.5 py-0.5 rounded-full">{invoices.length}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Folio */}
            {tab === 'folio' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Date', 'Description', 'Guest / Res', 'Type', 'Amount'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-sm">
                            {[...folioItems].reverse().map(f => (
                                <tr key={f.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.date}</td>
                                    <td className="px-4 py-3 text-gray-900">{f.description}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {f.guestName && <span className="block font-semibold text-gray-700">{f.guestName}</span>}
                                        {f.reservationId && <span className="font-mono text-brand-accent">{f.reservationId}</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset uppercase tracking-widest
                                            ${f.type === 'charge' ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' :
                                                f.type === 'payment' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                    f.type === 'tax' ? 'bg-gray-100 text-gray-600 ring-gray-500/10' :
                                                        f.type === 'beverage' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                                                            'bg-purple-50 text-purple-700 ring-purple-600/20'}`}>
                                            {f.type}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 font-mono font-bold ${f.amount < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                        {f.amount < 0 ? '-' : '+'}€{Math.abs(f.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {folioItems.length === 0 && (
                                <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm italic">No folio items yet. Add charges or run night audit.</td></tr>
                            )}
                        </tbody>
                        {folioItems.length > 0 && (
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-right text-gray-700">Net Balance</td>
                                    <td className={`px-4 py-3 font-mono font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        €{balance.toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}

            {/* Payments */}
            {tab === 'payments' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Reference', 'Date', 'Method', 'Guest', 'Amount', 'Status'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-sm">
                            {[...payments].reverse().map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs text-brand-accent font-semibold">{p.id}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.date}</td>
                                    <td className="px-4 py-3 text-gray-700">{p.method}</td>
                                    <td className="px-4 py-3 text-gray-700">{p.guestName || '—'}</td>
                                    <td className="px-4 py-3 font-mono font-bold text-green-600">€{p.amount.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset bg-green-50 text-green-700 ring-green-600/20 uppercase tracking-widest">
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                                <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-sm italic">No payments recorded yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Invoices */}
            {tab === 'invoices' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>{['Invoice #', 'Guest', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-sm">
                            {invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs text-brand-accent font-semibold">{inv.id}</td>
                                    <td className="px-4 py-3 font-semibold text-gray-900">{inv.guest}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.date}</td>
                                    <td className="px-4 py-3 font-mono font-bold text-gray-900">€{inv.amount.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset uppercase tracking-widest ${inv.status === 'paid' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 flex items-center gap-3">
                                        <button onClick={() => generateInvoicePDF(inv.guest, inv.id, inv.lineItems || [{ description: 'Total Amount', amount: inv.amount }], inv.status)}
                                            className="text-xs font-semibold text-brand-accent hover:text-brand-primary uppercase tracking-widest">↓ PDF</button>
                                        {inv.status === 'outstanding' && (
                                            <button onClick={() => { markInvoicePaid(inv.id); addToast(`Invoice ${inv.id} marked as paid.`, 'success'); }}
                                                className="text-xs font-semibold text-green-600 hover:text-green-800 uppercase tracking-widest">Mark Paid</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-sm italic">No invoices generated yet. Use the "+ Invoice" button above.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Night Audit */}
            {tab === 'audit' && (
                <div className="max-w-2xl space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-brand-primary mb-2">Night Audit — {today}</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            The night audit posts one room-night charge for every checked-in reservation.
                            {reservations.filter(r => r.status === 'Checked In').length > 0
                                ? ` There are currently ${reservations.filter(r => r.status === 'Checked In').length} checked-in reservation(s) to post.`
                                : ' No guests currently checked in.'}
                        </p>
                        <div className="space-y-2 mb-6">
                            {reservations.filter(r => r.status === 'Checked In').map(r => {
                                const nights = Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000));
                                const nightly = (r.totalAmount / nights).toFixed(2);
                                return (
                                    <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                        <span className="font-semibold text-gray-900">{r.guest}</span>
                                        <span className="text-gray-500">Room #{r.room} ({r.roomType})</span>
                                        <span className="font-mono font-bold text-brand-primary">€{nightly}/nt</span>
                                    </div>
                                );
                            })}
                            {reservations.filter(r => r.status === 'Checked In').length === 0 && (
                                <p className="text-sm text-gray-400 italic">No guests to post charges for.</p>
                            )}
                        </div>
                        <button onClick={handleNightAudit}
                            disabled={reservations.filter(r => r.status === 'Checked In').length === 0}
                            className="w-full py-3 rounded-lg bg-brand-primary text-white font-semibold text-sm hover:bg-brand-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                            {auditRan ? '✓ Audit Posted — Run Again' : 'Run Night Audit'}
                        </button>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Today's Summary</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Folio items</span><span className="font-mono font-bold">{folioItems.length}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Total charges</span><span className="font-mono font-bold">€{totalCharges.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Payments in</span><span className="font-mono font-bold text-green-600">€{totalPaid.toFixed(2)}</span></div>
                            <div className="flex justify-between border-t pt-2"><span className="font-bold text-gray-900">Net balance</span><span className={`font-mono font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>€{balance.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Charge Modal ── */}
            <Modal open={chargeModal} onClose={() => setChargeModal(false)} title="Add Charge">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Charge Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {([['beverage', '🍾 F&B / Beverage'], ['service', '🛎 Hotel Service'], ['charge', '🛏 Room Charge'], ['tax', '% Tax']] as const).map(([t, label]) => (
                                <button key={t} onClick={() => setChargeForm(s => ({ ...s, type: t, description: '', customDesc: '', amount: '' }))}
                                    className={`py-2 rounded-lg border text-xs font-semibold transition-colors ${chargeForm.type === t ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Beverage: dropdown from menu */}
                    {chargeForm.type === 'beverage' && (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Item *</label>
                            <select value={chargeForm.description} onChange={e => setChargeForm(s => ({ ...s, description: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                <option value="">— Select item —</option>
                                {BEVERAGE_MENU.map(m => (
                                    <option key={m.name} value={m.name}>{m.name} · €{m.price}</option>
                                ))}
                            </select>
                            {selectedChargeMenuItem && (
                                <p className="mt-1 text-xs text-brand-primary font-semibold">Price: €{selectedChargeMenuItem.price.toFixed(2)} + 10% VAT = €{(selectedChargeMenuItem.price * 1.1).toFixed(2)}</p>
                            )}
                        </div>
                    )}

                    {/* Service / Charge / Tax: text input + manual amount */}
                    {(chargeForm.type === 'service' || chargeForm.type === 'charge' || chargeForm.type === 'tax') && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Description *</label>
                                <input type="text" placeholder="e.g. Late checkout fee" value={chargeForm.customDesc}
                                    onChange={e => setChargeForm(s => ({ ...s, customDesc: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Amount (€) *</label>
                                <input type="number" min="0.01" step="0.01" placeholder="0.00" value={chargeForm.amount}
                                    onChange={e => setChargeForm(s => ({ ...s, amount: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Guest Name (optional)</label>
                            <input type="text" placeholder="Guest name" value={chargeForm.guestName}
                                onChange={e => setChargeForm(s => ({ ...s, guestName: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Reservation (optional)</label>
                            <select value={chargeForm.reservationId} onChange={e => setChargeForm(s => ({ ...s, reservationId: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                                <option value="">— General —</option>
                                {reservations.filter(r => r.status === 'Checked In').map(r => (
                                    <option key={r.id} value={r.id}>{r.id} · {r.guest}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setChargeModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleAddCharge} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Add Charge</button>
                    </div>
                </div>
            </Modal>

            {/* ── Add Payment Modal ── */}
            <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Amount (€) *</label>
                        <input type="number" min="0.01" step="0.01" placeholder="0.00" value={payForm.amount}
                            onChange={e => setPayForm(s => ({ ...s, amount: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Payment Method</label>
                        <select value={payForm.method} onChange={e => setPayForm(s => ({ ...s, method: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Guest (optional)</label>
                        <select value={payForm.guestId} onChange={e => setPayForm(s => ({ ...s, guestId: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="">— No specific guest —</option>
                            {guests.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Reservation (optional)</label>
                        <select value={payForm.reservationId} onChange={e => setPayForm(s => ({ ...s, reservationId: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="">— General payment —</option>
                            {reservations.map(r => <option key={r.id} value={r.id}>{r.id} · {r.guest}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setPayModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleAddPayment} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Record Payment</button>
                    </div>
                </div>
            </Modal>

            {/* ── Generate Invoice Modal ── */}
            <Modal open={invModal} onClose={() => setInvModal(false)} title="Generate Invoice" size="sm">
                <div className="space-y-4">
                    <p className="text-xs text-gray-500">Generates an invoice from all current folio items (€{balance.toFixed(2)} net balance).</p>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Guest Name *</label>
                        <input type="text" placeholder="Name on invoice" value={invForm.guestName}
                            onChange={e => setInvForm(s => ({ ...s, guestName: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Reservation (optional)</label>
                        <select value={invForm.reservationId} onChange={e => setInvForm(s => ({ ...s, reservationId: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white">
                            <option value="">— General invoice —</option>
                            {reservations.map(r => <option key={r.id} value={r.id}>{r.id} · {r.guest}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button onClick={() => setInvModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleGenerateInvoice} className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm">Generate Invoice</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
