'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../../../../components/admin-shell';
import { DashboardMetricsEditor } from '../../../../components/dashboard-metrics-editor';
import { DashboardSummaryCharts } from '../../../../components/dashboard-summary-charts';
import { LEDGER_STORAGE_EVENT, SALES_BILLS_STORAGE_KEY, readStoredArray, type SalesBillLike } from '../../../../lib/ledger-store';

type RecentInvoiceRow = SalesBillLike;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const formatTime = (value: string) => value;

const sortByRecent = (left: RecentInvoiceRow, right: RecentInvoiceRow) => {
  const leftStamp = new Date(`${left.date}T${left.time}:00`).getTime();
  const rightStamp = new Date(`${right.date}T${right.time}:00`).getTime();
  return rightStamp - leftStamp;
};

const buildRowsCsv = (rows: RecentInvoiceRow[]) => {
  const header = ['Invoice', 'Party', 'Date', 'Time', 'Payment Method', 'Total'];
  const lines = rows.map((row) => [row.invoiceNumber, row.customerName || 'Walk-in customer', row.date, row.time, row.paymentMethod, row.total.toFixed(2)]);
  return [header, ...lines]
    .map((cells) => cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
};

const downloadText = (fileName: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function AdminDashboardPage() {
  const [salesBills, setSalesBills] = useState<RecentInvoiceRow[]>([]);

  useEffect(() => {
    const refresh = () => {
      setSalesBills(readStoredArray<RecentInvoiceRow>(SALES_BILLS_STORAGE_KEY));
    };

    refresh();

    const onLedgerChange: EventListener = () => refresh();
    window.addEventListener('storage', onLedgerChange);
    window.addEventListener(LEDGER_STORAGE_EVENT, onLedgerChange);

    return () => {
      window.removeEventListener('storage', onLedgerChange);
      window.removeEventListener(LEDGER_STORAGE_EVENT, onLedgerChange);
    };
  }, []);

  const recentInvoices = useMemo(() => salesBills.slice().sort(sortByRecent).slice(0, 8), [salesBills]);

  const exportRecords = () => {
    const csv = buildRowsCsv(recentInvoices);
    downloadText(`recent-invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
  };

  return (
    <AdminShell active="dashboard" title="Dashboard">
      <DashboardMetricsEditor />

      <DashboardSummaryCharts />

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Recent Invoices</h2>
            <p className="text-xs text-slate-500">Real-time settlement activity and pending actions</p>
          </div>
          <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors" type="button" onClick={exportRecords}>
            Export Records
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-['Inter']">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Reference ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Party / Client</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Date</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length ? (
                recentInvoices.map((invoice) => (
                  <tr key={`${invoice.invoiceNumber}-${invoice.date}-${invoice.time}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-900">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{invoice.customerName || 'Walk-in customer'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(invoice.date)} {formatTime(invoice.time)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{invoice.total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tighter ${invoice.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {invoice.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
