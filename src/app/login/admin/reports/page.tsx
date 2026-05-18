'use client';

import { AdminShell } from '../../../../components/admin-shell';
import {
  MANUAL_PAYMENTS_STORAGE_KEY,
  PURCHASES_STORAGE_KEY,
  SALES_BILLS_STORAGE_KEY,
  readStoredArray,
  type LedgerPaymentRecord,
  type PurchaseRecordLike,
  type SalesBillLike,
} from '../../../../lib/ledger-store';

const downloadText = (fileName: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

const buildDailySalesCsv = () => {
  const bills = readStoredArray<SalesBillLike>(SALES_BILLS_STORAGE_KEY);
  const today = new Date().toISOString().slice(0, 10);
  const rows = bills.filter((bill) => bill.date.slice(0, 10) === today);

  return [
    ['Invoice', 'Customer', 'Date', 'Time', 'Payment Method', 'Total'],
    ...rows.map((bill) => [bill.invoiceNumber, bill.customerName || 'Walk-in customer', bill.date, bill.time, bill.paymentMethod, bill.total.toFixed(2)]),
  ]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
};

const buildProfitSummaryCsv = () => {
  const bills = readStoredArray<SalesBillLike>(SALES_BILLS_STORAGE_KEY);
  const purchases = readStoredArray<PurchaseRecordLike>(PURCHASES_STORAGE_KEY);
  const payments = readStoredArray<LedgerPaymentRecord>(MANUAL_PAYMENTS_STORAGE_KEY);

  const salesTotal = bills.reduce((sum, bill) => sum + (Number.isFinite(bill.total) ? bill.total : 0), 0);
  const purchaseTotal = purchases.reduce((sum, purchase) => sum + (Number.isFinite(purchase.total) ? purchase.total : 0), 0);
  const manualIncoming = payments.filter((payment) => payment.direction === 'Incoming').reduce((sum, payment) => sum + payment.amount, 0);
  const manualOutgoing = payments.filter((payment) => payment.direction === 'Outgoing').reduce((sum, payment) => sum + payment.amount, 0);

  return [
    ['Metric', 'Value'],
    ['Total sales', salesTotal.toFixed(2)],
    ['Total purchases', purchaseTotal.toFixed(2)],
    ['Manual incoming payments', manualIncoming.toFixed(2)],
    ['Manual outgoing payments', manualOutgoing.toFixed(2)],
    ['Net profit', (salesTotal - purchaseTotal).toFixed(2)],
  ]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
};

const buildReceivablesAgingCsv = () => {
  const bills = readStoredArray<SalesBillLike>(SALES_BILLS_STORAGE_KEY)
    .slice()
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  const today = new Date();

  return [
    ['Invoice', 'Customer', 'Date', 'Age Days', 'Total'],
    ...bills.map((bill) => {
      const ageDays = Math.max(0, Math.floor((today.getTime() - new Date(bill.date).getTime()) / 86400000));
      return [bill.invoiceNumber, bill.customerName || 'Walk-in customer', bill.date, ageDays, bill.total.toFixed(2)];
    }),
  ]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
};

export default function AdminReportsPage() {
  return (
    <AdminShell active="reports" title="Reports">
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-lg font-bold text-white">Reports Center</h2>
          <p className="text-xs text-blue-100">Generate daily, weekly, and monthly business reports.</p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700" type="button" onClick={() => downloadText(`daily-sales-${new Date().toISOString().slice(0, 10)}.csv`, buildDailySalesCsv())}>Daily Sales Report</button>
          <button className="rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700" type="button" onClick={() => downloadText(`profit-summary-${new Date().toISOString().slice(0, 10)}.csv`, buildProfitSummaryCsv())}>Profit Summary</button>
          <button className="rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700" type="button" onClick={() => downloadText(`receivables-aging-${new Date().toISOString().slice(0, 10)}.csv`, buildReceivablesAgingCsv())}>Receivables Aging</button>
        </div>
      </section>
    </AdminShell>
  );
}
