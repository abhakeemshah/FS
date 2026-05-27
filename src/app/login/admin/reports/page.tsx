'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../../components/admin-shell';
import {
  LEDGER_STORAGE_EVENT,
  MANUAL_PAYMENTS_STORAGE_KEY,
  PURCHASES_STORAGE_KEY,
  SALES_BILLS_STORAGE_KEY,
  type LedgerPaymentRecord,
  type PurchaseRecordLike,
  type SalesBillLike,
} from '../../../../lib/ledger-store';
import { hasAdminSession, readStaffSession } from '../../../../lib/staff-auth';
import { useAppFeedback } from '../../../../components/app-feedback';
import { BUSINESS_PROFILE } from '../../../../lib/business-profile';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

type MovementRow = {
  id: string;
  kind: 'Sale' | 'Purchase' | 'Payment In' | 'Payment Out';
  reference: string;
  party: string;
  date: string;
  time: string;
  amount: number;
  actor: string;
  notes: string;
};

const formatDateTimeStamp = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00`).getTime();

const formatActor = (value?: string) => value?.trim() || 'Unknown';

const parseSnapshotArray = <T,>(snapshot: Record<string, string>, key: string): T[] => {
  try {
    const raw = snapshot[key];
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const buildDailySalesRows = (bills: SalesBillLike[]) => {
  const today = new Date().toISOString().slice(0, 10);
  return bills.filter((bill) => bill.date.slice(0, 10) === today);
};

const buildProfitSummary = (bills: SalesBillLike[], purchases: PurchaseRecordLike[], payments: LedgerPaymentRecord[]) => {
  const salesTotal = bills.reduce((sum, bill) => sum + (Number.isFinite(bill.total) ? bill.total : 0), 0);
  const purchaseTotal = purchases.reduce((sum, purchase) => sum + (Number.isFinite(purchase.total) ? purchase.total : 0), 0);
  const manualIncoming = payments.filter((payment) => payment.direction === 'Incoming').reduce((sum, payment) => sum + payment.amount, 0);
  const manualOutgoing = payments.filter((payment) => payment.direction === 'Outgoing').reduce((sum, payment) => sum + payment.amount, 0);

  return { salesTotal, purchaseTotal, manualIncoming, manualOutgoing, netProfit: salesTotal - purchaseTotal };
};

const buildReceivablesAgingRows = (bills: SalesBillLike[]) => {
  const sorted = bills.slice().sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  return sorted;
};

const buildMovementTimeline = (bills: SalesBillLike[], purchases: PurchaseRecordLike[], payments: LedgerPaymentRecord[]) => {
  return bills;
};

const buildPrintableReportsInvoice = (title: string, subtitle: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - ${escapeHtml(BUSINESS_PROFILE.shopName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background-color: #525659; display: flex; justify-content: center; padding: 20px; }
    .page { width: 21cm; min-height: 29.7cm; background: white; padding: 1.5cm; box-shadow: 0 0 10px rgba(0,0,0,.5); position: relative; }
    @page { size: A4; margin: 0; }
    @media print { body { background-color: white; padding: 0; display: block; } .page { width: auto; min-height: auto; box-shadow: none; padding: 1.5cm; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    .bg-navy { background-color: #000066; color: white; }
    .bg-lightgray { background-color: #e2e2e2; }
    .bg-darkgray { background-color: #888888; color: white; }
    .text-navy { color: #000066; }
    .header-section { display: flex; justify-content: space-between; margin-bottom: 25px; }
    .company-info h1 { font-family: 'Times New Roman', Times, serif; font-size: 38px; font-weight: normal; letter-spacing: 1px; margin-bottom: 8px; }
    .company-info p { font-size: 13px; margin-bottom: 4px; }
    .memo-info { text-align: right; padding-top: 15px; }
    .memo-info h2 { font-size: 18px; text-decoration: underline; letter-spacing: 2px; margin-bottom: 4px; }
    .memo-info h3 { font-size: 16px; letter-spacing: 5px; font-weight: bold; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 280px; gap: 15px; margin-bottom: 25px; }
    .recipient-box { border: 1px solid #999; }
    .recipient-box .title-bar { padding: 5px 10px; font-weight: bold; }
    .recipient-box .customer-name { font-size: 18px; padding: 10px; background: white; border-bottom: 1px solid #999; }
    .recipient-details { display: grid; grid-template-columns: 120px 1fr; gap: 5px; padding: 10px; }
    .recipient-details div { padding: 2px 0; }
    .invoice-meta { border-collapse: collapse; width: 100%; text-align: center; }
    .invoice-meta th, .invoice-meta td { border: 1px solid #999; padding: 6px; }
    .invoice-meta th { font-weight: normal; }
    .product-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #999; }
    .product-table th, .product-table td { padding: 6px 8px; text-align: right; border-bottom: 1px dashed #ccc; }
    .product-table th { font-style: italic; font-weight: normal; border-bottom: none; }
    .product-table th:nth-child(1), .product-table td:nth-child(1) { text-align: left; }
    .product-table tbody tr:last-child td { border-bottom: none; }
    .product-table tfoot td { font-style: italic; border-top: 1px solid #999; }
    .totals-section { display: flex; justify-content: space-between; margin-bottom: 24px; align-items: flex-start; }
    .total-pcs { font-size: 16px; font-weight: bold; font-style: italic; padding-left: 10px; }
    .total-pcs span { margin-left: 20px; font-size: 18px; }
    .financial-summary { width: 280px; border-collapse: collapse; }
    .financial-summary td { padding: 5px 10px; font-style: italic; }
    .financial-summary td:nth-child(2) { text-align: right; }
    .financial-summary tr { border-bottom: 1px dashed #999; }
    .financial-summary tr:last-child { border-bottom: none; font-weight: bold; font-size: 14px; }
    .signatures { display: flex; justify-content: space-between; padding: 0 20px; margin-bottom: 40px; }
    .sig-block { width: 250px; text-align: center; }
    .sig-block p { margin-bottom: 40px; font-style: italic; text-align: left; }
    .sig-line { border-top: 1px solid #000; padding-top: 5px; font-style: italic; }
    .page-num { text-align: right; font-style: italic; padding-right: 20px; }
  </style>
</head>
<body>
  <div class="page">
    <header class="header-section">
      <div class="company-info">
        <h1 class="text-navy">${escapeHtml(BUSINESS_PROFILE.shopName)}</h1>
        <p>Reports Export</p>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="memo-info">
        <h2>REPORT PDF</h2>
        <h3>ORIGINAL</h3>
      </div>
    </header>
    ${content}
    <div class="page-num">PAGE #: &nbsp; 1 / 1</div>
  </div>
</body>
</html>
`;

const buildMovementReportPrintable = (movements: MovementRow[], stats: { count: number; sales: number; purchases: number; payments: number }) => {
  const body = `
    <div class="info-grid">
      <div class="recipient-box">
        <div class="title-bar bg-navy">REPORT SUMMARY</div>
        <div class="customer-name text-navy">Movement Timeline</div>
        <div class="recipient-details bg-lightgray">
          <div>Total movements</div><div>${stats.count}</div>
          <div>Sales</div><div>${stats.sales}</div>
          <div>Purchases</div><div>${stats.purchases}</div>
          <div>Payments</div><div>${stats.payments}</div>
        </div>
      </div>
      <div>
        <table class="invoice-meta">
          <tr class="bg-lightgray"><th>Date</th><th>Time</th></tr>
          <tr><td colspan="2">${escapeHtml(new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()))}</td></tr>
        </table>
      </div>
    </div>
    <table class="product-table">
      <thead>
        <tr class="bg-navy">
          <th>Type</th>
          <th>Reference</th>
          <th>Party</th>
          <th>Date</th>
          <th>Time</th>
          <th>Amount</th>
          <th>By</th>
        </tr>
      </thead>
      <tbody>
        ${movements
          .slice(0, 24)
          .map(
            (movement) => `
            <tr>
              <td>${escapeHtml(movement.kind)}</td>
              <td>${escapeHtml(movement.reference)}</td>
              <td>${escapeHtml(movement.party)}</td>
              <td>${escapeHtml(movement.date)}</td>
              <td>${escapeHtml(movement.time)}</td>
              <td>${movement.kind === 'Purchase' || movement.kind === 'Payment Out' ? '-' : ''}${movement.amount.toFixed(2)}</td>
              <td>${escapeHtml(movement.actor)}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr class="bg-darkgray">
          <td>Total Row(s)</td>
          <td>${Math.min(movements.length, 24)}</td>
          <td colspan="5">Latest movements report</td>
        </tr>
      </tfoot>
    </table>
    <div class="signatures">
      <div class="sig-block"><p>Reviewed and approved.</p><div class="sig-line">Prepared By</div></div>
      <div class="sig-block"><p>&nbsp;</p><div class="sig-line">Authorized Signature</div></div>
    </div>
  `;

  return buildPrintableReportsInvoice('Movement Timeline', 'All report transactions', body);
};

const buildDailySalesPrintable = (rows: SalesBillLike[]) => {
  const today = new Date();
  const body = `
    <div class="info-grid">
      <div class="recipient-box">
        <div class="title-bar bg-navy">DAILY SALES REPORT</div>
        <div class="customer-name text-navy">Today sales activity</div>
        <div class="recipient-details bg-lightgray">
          <div>Invoices</div><div>${rows.length}</div>
          <div>Total sales</div><div>${rows.reduce((sum, bill) => sum + (Number.isFinite(bill.total) ? bill.total : 0), 0).toFixed(2)}</div>
          <div>Top invoice</div><div>${rows[0] ? escapeHtml(rows[0].invoiceNumber) : '—'}</div>
          <div>Latest invoice</div><div>${rows[rows.length - 1] ? escapeHtml(rows[rows.length - 1].invoiceNumber) : '—'}</div>
        </div>
      </div>
      <div>
        <table class="invoice-meta">
          <tr class="bg-lightgray"><th>Report Date</th><th>Records</th></tr>
          <tr><td>${escapeHtml(new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(today))}</td><td>${rows.length}</td></tr>
        </table>
      </div>
    </div>
    <table class="product-table">
      <thead>
        <tr class="bg-navy">
          <th>Invoice</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Time</th>
          <th>Payment</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (bill) => `
              <tr>
                <td>${escapeHtml(bill.invoiceNumber)}</td>
                <td>${escapeHtml(bill.customerName || 'Walk-in customer')}</td>
                <td>${escapeHtml(bill.date)}</td>
                <td>${escapeHtml(bill.time)}</td>
                <td>${escapeHtml(bill.paymentMethod)}</td>
                <td>${bill.total.toFixed(2)}</td>
              </tr>`,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr class="bg-darkgray">
          <td>Totals</td>
          <td>${rows.length}</td>
          <td colspan="3">Daily sales overview</td>
          <td>${rows.reduce((sum, bill) => sum + (Number.isFinite(bill.total) ? bill.total : 0), 0).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

  `;

  return buildPrintableReportsInvoice('Daily Sales Report', 'Today sales activity', body);
};

const buildProfitSummaryPrintable = (summary: { salesTotal: number; purchaseTotal: number; manualIncoming: number; manualOutgoing: number; netProfit: number }) => {
  const body = `
    <div class="info-grid">
      <div class="recipient-box">
        <div class="title-bar bg-navy">PROFIT SUMMARY</div>
        <div class="customer-name text-navy">Financial overview</div>
        <div class="recipient-details bg-lightgray">
          <div>Total sales</div><div>${summary.salesTotal.toFixed(2)}</div>
          <div>Total purchases</div><div>${summary.purchaseTotal.toFixed(2)}</div>
          <div>Manual incoming</div><div>${summary.manualIncoming.toFixed(2)}</div>
          <div>Manual outgoing</div><div>${summary.manualOutgoing.toFixed(2)}</div>
        </div>
      </div>
      <div>
        <table class="invoice-meta">
          <tr class="bg-lightgray"><th colspan="2">Net Profit</th></tr>
          <tr><td colspan="2">${summary.netProfit.toFixed(2)}</td></tr>
        </table>
      </div>
    </div>
    <table class="product-table">
      <thead>
        <tr class="bg-navy"><th>Metric</th><th>Value</th></tr>
      </thead>
      <tbody>
        <tr><td>Total sales</td><td>${summary.salesTotal.toFixed(2)}</td></tr>
        <tr><td>Total purchases</td><td>${summary.purchaseTotal.toFixed(2)}</td></tr>
        <tr><td>Manual incoming payments</td><td>${summary.manualIncoming.toFixed(2)}</td></tr>
        <tr><td>Manual outgoing payments</td><td>${summary.manualOutgoing.toFixed(2)}</td></tr>
        <tr><td>Net profit</td><td>${summary.netProfit.toFixed(2)}</td></tr>
      </tbody>
    </table>

  `;

  return buildPrintableReportsInvoice('Profit Summary', 'Financial report', body);
};

const buildReceivablesAgingPrintable = (rows: SalesBillLike[]) => {
  const today = new Date();
  const body = `
    <div class="info-grid">
      <div class="recipient-box">
        <div class="title-bar bg-navy">RECEIVABLES AGING</div>
        <div class="customer-name text-navy">Outstanding invoice age</div>
        <div class="recipient-details bg-lightgray">
          <div>Open invoices</div><div>${rows.length}</div>
          <div>Oldest invoice</div><div>${rows[rows.length - 1] ? escapeHtml(rows[rows.length - 1].invoiceNumber) : '—'}</div>
          <div>Newest invoice</div><div>${rows[0] ? escapeHtml(rows[0].invoiceNumber) : '—'}</div>
        </div>
      </div>
      <div>
        <table class="invoice-meta">
          <tr class="bg-lightgray"><th>As Of</th><th>Records</th></tr>
          <tr><td>${escapeHtml(new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(today))}</td><td>${rows.length}</td></tr>
        </table>
      </div>
    </div>
    <table class="product-table">
      <thead>
        <tr class="bg-navy"><th>Invoice</th><th>Customer</th><th>Date</th><th>Age Days</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${rows
          .map((bill) => {
            const ageDays = Math.max(0, Math.floor((today.getTime() - new Date(bill.date).getTime()) / 86400000));
            return `<tr><td>${escapeHtml(bill.invoiceNumber)}</td><td>${escapeHtml(bill.customerName || 'Walk-in customer')}</td><td>${escapeHtml(bill.date)}</td><td>${ageDays}</td><td>${bill.total.toFixed(2)}</td></tr>`;
          })
          .join('')}
      </tbody>
    </table>

  `;

  return buildPrintableReportsInvoice('Receivables Aging', 'Accounts receivable report', body);
};

const buildMovementTimeline = (bills: SalesBillLike[], purchases: PurchaseRecordLike[], payments: LedgerPaymentRecord[]) => {

  const saleRows: MovementRow[] = bills.map((bill) => ({
    id: bill.invoiceNumber,
    kind: 'Sale',
    reference: bill.invoiceNumber,
    party: bill.customerName || 'Walk-in customer',
    date: bill.date.slice(0, 10),
    time: bill.time || '00:00',
    amount: Number(bill.total) || 0,
    actor: formatActor(bill.recordedBy),
    notes: bill.paymentMethod ? `Payment: ${bill.paymentMethod}` : 'Sales invoice',
  }));

  const purchaseRows: MovementRow[] = purchases.map((purchase) => ({
    id: purchase.purchaseNumber,
    kind: 'Purchase',
    reference: purchase.purchaseNumber,
    party: purchase.supplierName || 'Supplier',
    date: purchase.purchaseDate.slice(0, 10),
    time: purchase.purchaseTime || '00:00',
    amount: Number(purchase.total) || 0,
    actor: formatActor(purchase.recordedBy),
    notes: [purchase.sourceName, purchase.purchaseReference, purchase.status].filter(Boolean).join(' · ') || 'Purchase entry',
  }));

  const paymentRows: MovementRow[] = payments.map((payment) => ({
    id: payment.paymentNumber,
    kind: payment.direction === 'Incoming' ? 'Payment In' : 'Payment Out',
    reference: payment.paymentNumber,
    party: payment.party || 'Party',
    date: payment.date.slice(0, 10),
    time: payment.time || '00:00',
    amount: Number(payment.amount) || 0,
    actor: formatActor(payment.recordedBy),
    notes: [payment.title, payment.notes].filter(Boolean).join(' · ') || 'Manual payment',
  }));

  return [...saleRows, ...purchaseRows, ...paymentRows].sort(
    (left, right) => formatDateTimeStamp(right.date, right.time) - formatDateTimeStamp(left.date, left.time),
  );
};

export default function AdminReportsPage() {
  const router = useRouter();
  const { withLoading } = useAppFeedback();
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('Printable Preview');
  const [previewFilename, setPreviewFilename] = useState('report-preview');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [salesBills, setSalesBills] = useState<SalesBillLike[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecordLike[]>([]);
  const [manualPayments, setManualPayments] = useState<LedgerPaymentRecord[]>([]);

  useEffect(() => {
    const updateAccess = () => {
      const allowed = hasAdminSession();
      setAccessState(allowed ? 'allowed' : 'denied');

      if (!allowed) {
        router.replace('/login');
      }
    };

    updateAccess();
    window.addEventListener('storage', updateAccess);
    window.addEventListener('staff-auth-updated', updateAccess as EventListener);

    return () => {
      window.removeEventListener('storage', updateAccess);
      window.removeEventListener('staff-auth-updated', updateAccess as EventListener);
    };
  }, [router]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch('/api/ledger-state', { cache: 'no-store', credentials: 'include' });
        if (!response.ok) return;
        const payload = (await response.json()) as { snapshot?: Record<string, string> };
        const snapshot = payload.snapshot ?? {};
        setSalesBills(parseSnapshotArray<SalesBillLike>(snapshot, SALES_BILLS_STORAGE_KEY));
        setPurchaseRecords(parseSnapshotArray<PurchaseRecordLike>(snapshot, PURCHASES_STORAGE_KEY));
        setManualPayments(parseSnapshotArray<LedgerPaymentRecord>(snapshot, MANUAL_PAYMENTS_STORAGE_KEY));
      } catch {
        // keep current state if the server snapshot is unavailable
      }
    };

    void refresh();
    const onLedgerChange = () => { void refresh(); };
    window.addEventListener('storage', onLedgerChange);
    window.addEventListener(LEDGER_STORAGE_EVENT, onLedgerChange);

    return () => {
      window.removeEventListener('storage', onLedgerChange);
      window.removeEventListener(LEDGER_STORAGE_EVENT, onLedgerChange);
    };
  }, []);

  const movements = useMemo(() => buildMovementTimeline(salesBills, purchaseRecords, manualPayments), [manualPayments, purchaseRecords, salesBills]);

  const movementStats = useMemo(() => {
    return movements.reduce(
      (acc, row) => ({
        count: acc.count + 1,
        sales: acc.sales + (row.kind === 'Sale' ? 1 : 0),
        purchases: acc.purchases + (row.kind === 'Purchase' ? 1 : 0),
        payments: acc.payments + (row.kind === 'Payment In' || row.kind === 'Payment Out' ? 1 : 0),
      }),
      { count: 0, sales: 0, purchases: 0, payments: 0 },
    );
  }, [movements]);

  const profitSummary = useMemo(() => buildProfitSummary(salesBills, purchaseRecords, manualPayments), [manualPayments, purchaseRecords, salesBills]);
  const receivablesRows = useMemo(() => buildReceivablesAgingRows(salesBills), [salesBills]);

  const openReportPreview = (html: string, title: string, filename: string) => {
    setPreviewHtml(html);
    setPreviewTitle(title);
    setPreviewFilename(filename);
    setIsPreviewOpen(true);
  };

  const downloadPreview = () => {
    if (!previewHtml || typeof window === 'undefined') return;

    const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${previewFilename}.html`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const printPreview = () => {
    const frameWindow = previewFrameRef.current?.contentWindow;
    if (!frameWindow) return;

    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      // ignore print failures if the preview frame is not ready yet
    }
  };

  if (accessState !== 'allowed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">No Access</p>
          <p className="mt-2 text-slate-600">This section is admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell active="reports" title="Reports">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reports Center</h2>
            <p className="text-xs text-slate-500">See sales, purchases, and payments in one chronological movement list.</p>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:grid-cols-4">
          <div>
            <div className="font-bold uppercase tracking-wide text-slate-500">Movements</div>
            <div className="mt-1 text-base font-extrabold text-slate-900">{movementStats.count}</div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wide text-slate-500">Sales</div>
            <div className="mt-1 text-base font-extrabold text-slate-900">{movementStats.sales}</div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wide text-slate-500">Purchases</div>
            <div className="mt-1 text-base font-extrabold text-slate-900">{movementStats.purchases}</div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wide text-slate-500">Payments</div>
            <div className="mt-1 text-base font-extrabold text-slate-900">{movementStats.payments}</div>
          </div>
        </div>

        <div className="border-b border-slate-200 px-4 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <button className="rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700" type="button" onClick={() => void withLoading(() => openReportPreview(buildDailySalesPrintable(buildDailySalesRows(salesBills)), 'Daily Sales Report', 'daily-sales-report'), { loadingLabel: 'Preparing sales preview...', successMessage: 'Sales preview opened' })}>Preview Daily Sales PDF</button>
            <button className="rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700" type="button" onClick={() => void withLoading(() => openReportPreview(buildProfitSummaryPrintable(profitSummary), 'Profit Summary', 'profit-summary-report'), { loadingLabel: 'Preparing profit preview...', successMessage: 'Profit preview opened' })}>Preview Profit Summary PDF</button>
            <button className="rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700" type="button" onClick={() => void withLoading(() => openReportPreview(buildReceivablesAgingPrintable(receivablesRows), 'Receivables Aging', 'receivables-aging-report'), { loadingLabel: 'Preparing receivables preview...', successMessage: 'Receivables preview opened' })}>Preview Receivables Aging PDF</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Type</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Reference</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Party</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Date / Time</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Amount</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">By</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length ? movements.map((movement) => (
                <tr key={`${movement.kind}-${movement.id}`} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{movement.kind}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{movement.reference}</div>
                    <div className="text-[11px] text-slate-500">{movement.kind === 'Sale' ? 'Sales invoice' : movement.kind === 'Purchase' ? 'Purchase entry' : 'Manual payment'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-700">{movement.party}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{movement.date}</div>
                    <div className="text-[11px] text-slate-500">{movement.time}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">{movement.kind === 'Purchase' || movement.kind === 'Payment Out' ? `-${movement.amount.toFixed(2)}` : movement.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-700">{movement.actor}</td>
                  <td className="px-4 py-3 text-slate-600">{movement.notes}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No movements yet. Sales, purchases, and payments will appear here in time order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isPreviewOpen && previewHtml ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewTitle}</h3>
                <p className="text-[11px] text-slate-500">Preview the report here, then print or download it.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={downloadPreview} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Download</button>
                <button type="button" onClick={printPreview} className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Print</button>
                <button type="button" onClick={() => { setIsPreviewOpen(false); setPreviewHtml(null); }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Close</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-3">
              <iframe
                ref={previewFrameRef}
                title={previewTitle}
                srcDoc={previewHtml}
                className="h-[78vh] w-full rounded-lg border border-slate-200 bg-white shadow-sm"
              />
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
