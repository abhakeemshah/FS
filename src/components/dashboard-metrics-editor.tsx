'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppModal } from './app-modal';
import {
  LEDGER_STORAGE_EVENT,
  MANUAL_PAYMENTS_STORAGE_KEY,
  PURCHASES_STORAGE_KEY,
  SALES_BILLS_STORAGE_KEY,
  mapPurchaseToPaymentRecord,
  mapSaleBillToPaymentRecord,
  readStoredArray,
  type LedgerPaymentRecord,
  type PurchaseRecordLike,
  type SalesBillLike,
} from '../lib/ledger-store';

type MetricMood = 'positive' | 'negative' | 'neutral';

type Metric = {
  key: string;
  icon: string;
  label: string;
  tone: string;
  editable: boolean;
  mood: MetricMood;
};

type MetricValues = Record<string, string>;

const DASHBOARD_METRICS_STORAGE_KEY = 'fs-communication:dashboard-metrics';

const metricConfigs: Metric[] = [
  { key: 'total-receivables', icon: 'payments', label: 'Total receivables', tone: 'from-amber-50 to-amber-100 border-amber-200', editable: true, mood: 'neutral' },
  { key: 'total-payables', icon: 'request_quote', label: 'Total payables', tone: 'from-rose-50 to-rose-100 border-rose-200', editable: true, mood: 'negative' },
  { key: 'today-sales', icon: 'sell', label: "Today's sales", tone: 'from-blue-50 to-blue-100 border-blue-200', editable: false, mood: 'positive' },
  { key: 'today-expenses', icon: 'receipt_long', label: "Today's expenses", tone: 'from-orange-50 to-orange-100 border-orange-200', editable: true, mood: 'negative' },
  { key: 'net-profit', icon: 'monitoring', label: 'Net profit', tone: 'from-green-50 to-green-100 border-green-200', editable: false, mood: 'positive' },
  { key: 'daily-profit', icon: 'trending_up', label: 'Daily profit', tone: 'from-emerald-50 to-emerald-100 border-emerald-200', editable: false, mood: 'positive' },
  { key: 'monthly-profit', icon: 'calendar_month', label: 'Monthly profit', tone: 'from-teal-50 to-teal-100 border-teal-200', editable: false, mood: 'positive' },
  { key: 'recovery-today', icon: 'sync_alt', label: 'Recovery (today)', tone: 'from-cyan-50 to-cyan-100 border-cyan-200', editable: true, mood: 'positive' },
];

const editableMetricKeys = new Set(['total-receivables', 'total-payables', 'today-expenses', 'recovery-today']);

const createEmptyValues = (): MetricValues =>
  Object.fromEntries(metricConfigs.map((metric) => [metric.key, '0'])) as MetricValues;

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const normalizeDateKey = (value: string) => value.slice(0, 10);

const normalizeMonthKey = (value: string) => value.slice(0, 7);

function readMetricOverrides(): Partial<MetricValues> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(DASHBOARD_METRICS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Partial<MetricValues>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveMetricOverrides(value: Partial<MetricValues>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DASHBOARD_METRICS_STORAGE_KEY, JSON.stringify(value));
}

function buildLiveMetricValues(): MetricValues {
  if (typeof window === 'undefined') return createEmptyValues();

  const salesBills = readStoredArray<SalesBillLike>(SALES_BILLS_STORAGE_KEY);
  const purchaseRecords = readStoredArray<PurchaseRecordLike>(PURCHASES_STORAGE_KEY);
  const salesPayments = salesBills.map(mapSaleBillToPaymentRecord);
  const purchasePayments = purchaseRecords.map(mapPurchaseToPaymentRecord);

  const todayKey = normalizeDateKey(new Date().toISOString());
  const monthKey = normalizeMonthKey(new Date().toISOString());

  const salesTotal = salesBills.reduce((sum, bill) => sum + (Number.isFinite(bill.total) ? bill.total : 0), 0);
  const purchaseTotal = purchaseRecords.reduce((sum, record) => sum + (Number.isFinite(record.total) ? record.total : 0), 0);

  const todaySales = salesBills
    .filter((bill) => normalizeDateKey(bill.date) === todayKey)
    .reduce((sum, bill) => sum + (Number.isFinite(bill.total) ? bill.total : 0), 0);

  const todayExpenses = purchaseRecords
    .filter((record) => normalizeDateKey(record.purchaseDate) === todayKey)
    .reduce((sum, record) => sum + (Number.isFinite(record.total) ? record.total : 0), 0);

  const monthSales = salesBills
    .filter((bill) => normalizeMonthKey(bill.date) === monthKey)
    .reduce((sum, bill) => sum + (Number.isFinite(bill.total) ? bill.total : 0), 0);

  const monthExpenses = purchaseRecords
    .filter((record) => normalizeMonthKey(record.purchaseDate) === monthKey)
    .reduce((sum, record) => sum + (Number.isFinite(record.total) ? record.total : 0), 0);

  // Compute profit using bill items' costPrice when available. Be defensive: older bills may not have `items`.
  const computeActualCost = (bill: any) => {
    if (!bill || !Array.isArray(bill.items)) return 0;
    return bill.items.reduce((s: number, it: any) => {
      const qty = Number(it.quantity);
      const cost = Number(it.costPrice ?? it.actualPrice ?? 0);
      return s + (Number.isFinite(qty) && Number.isFinite(cost) ? qty * cost : 0);
    }, 0);
  };

  const computeSellingTotal = (bill: any) => {
    if (bill && Number.isFinite(bill.total)) return bill.total;
    if (!bill || !Array.isArray(bill.items)) return 0;
    return bill.items.reduce((s: number, it: any) => {
      const qty = Number(it.quantity);
      const price = Number(it.price ?? 0);
      const discount = Number(it.discount ?? 0);
      const subtotal = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
      const total = Math.max(subtotal - (Number.isFinite(discount) ? discount : 0), 0);
      return s + total;
    }, 0);
  };

  const salesProfitTotal = salesBills.reduce((sum, bill) => {
    const selling = computeSellingTotal(bill);
    const actual = computeActualCost(bill);
    return sum + (selling - actual);
  }, 0);

  const todaySalesProfit = salesBills
    .filter((bill) => normalizeDateKey(bill.date) === todayKey)
    .reduce((sum, bill) => {
      const selling = computeSellingTotal(bill);
      const actual = computeActualCost(bill);
      return sum + (selling - actual);
    }, 0);

  const monthSalesProfit = salesBills
    .filter((bill) => normalizeMonthKey(bill.date) === monthKey)
    .reduce((sum, bill) => {
      const selling = computeSellingTotal(bill);
      const actual = computeActualCost(bill);
      return sum + (selling - actual);
    }, 0);

  const overrides = readMetricOverrides();

  const liveValues: MetricValues = {
    'total-receivables': overrides['total-receivables'] ?? '0',
    'total-payables': overrides['total-payables'] ?? '0',
    'today-sales': formatNumber(todaySales),
    'today-expenses': overrides['today-expenses'] ?? '0',
    // Use sales profit (selling - actual cost) minus purchase expenses for profit metrics
    'net-profit': formatNumber(salesProfitTotal - purchaseTotal),
    'daily-profit': formatNumber(todaySalesProfit - todayExpenses),
    'monthly-profit': formatNumber(monthSalesProfit - monthExpenses),
    'recovery-today': overrides['recovery-today'] ?? '0',
  };

  return liveValues;
}

export function DashboardMetricsEditor() {
  const [values, setValues] = useState<MetricValues>(createEmptyValues());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [confirmPhase, setConfirmPhase] = useState<'opening' | 'open' | 'closing' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const metricsByKey = useMemo(() => Object.fromEntries(metricConfigs.map((metric) => [metric.key, metric])), []);

  const refreshValues = () => {
    setValues(buildLiveMetricValues());
  };

  const openConfirm = (key: string) => {
    setConfirmKey(key);
    setConfirmPhase('opening');
  };

  const closeConfirm = () => {
    if (!confirmKey) return;
    setConfirmPhase('closing');
  };

  useEffect(() => {
    refreshValues();

    const handleLiveUpdate: EventListener = () => refreshValues();
    window.addEventListener('storage', handleLiveUpdate);
    window.addEventListener(LEDGER_STORAGE_EVENT, handleLiveUpdate);

    return () => {
      window.removeEventListener('storage', handleLiveUpdate);
      window.removeEventListener(LEDGER_STORAGE_EVENT, handleLiveUpdate);
    };
  }, []);

  useEffect(() => {
    if (confirmPhase !== 'opening') return;

    const timer = window.setTimeout(() => setConfirmPhase('open'), 16);
    return () => window.clearTimeout(timer);
  }, [confirmPhase]);

  useEffect(() => {
    if (confirmPhase !== 'closing') return;

    const timer = window.setTimeout(() => {
      setConfirmKey(null);
      setEditingKey(null);
      setConfirmPhase(null);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [confirmPhase]);

  useEffect(() => {
    if (!confirmKey || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmKey]);

  const confirmSave = () => {
    if (!confirmKey) return;

    const nextOverrides: Partial<MetricValues> = {
      ...readMetricOverrides(),
      [confirmKey]: values[confirmKey] ?? '0',
    };

    saveMetricOverrides(nextOverrides);
    refreshValues();

    const metric = metricsByKey[confirmKey];
    closeConfirm();
    setToast(`${metric.label} saved`);
    window.setTimeout(() => setToast(null), 1500);
  };

  return (
    <>
      <section className="grid grid-cols-1 gap-3 m-0 md:grid-cols-2 lg:grid-cols-4">
        {metricConfigs.map((metric) => {
          const value = values[metric.key] ?? '0';
          const isEditing = editingKey === metric.key;

          return (
            <div
              key={metric.key}
              className={`group bg-gradient-to-br ${metric.tone} p-3 rounded-lg border flex flex-col justify-between shadow-sm transition-all duration-200 opacity-90 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(59,130,246,0.16)]`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-slate-600">{metric.icon}</span>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">{metric.label}</p>
              </div>

              {metric.editable ? (
                <div className="flex items-center gap-2">
                  <input
                    aria-label={metric.label}
                    value={value}
                    onChange={(event) => {
                      setEditingKey(metric.key);
                      setValues((prev) => ({ ...prev, [metric.key]: event.target.value }));
                    }}
                    onFocus={() => setEditingKey(metric.key)}
                    className={`w-full appearance-none border-0 bg-transparent px-0 py-1.5 font-extrabold leading-none font-['Manrope'] text-slate-900 outline-none ring-0 focus:outline-none focus:ring-0 ${metric.key === 'total-payables' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}
                    type="text"
                  />
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => openConfirm(metric.key)}
                      className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:opacity-90"
                    >
                      Save
                    </button>
                  ) : null}
                </div>
              ) : (
                <h3 className={`font-extrabold leading-none font-['Manrope'] text-slate-900 ${metric.key === 'total-payables' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}>{value}</h3>
              )}
            </div>
          );
        })}
      </section>

      {confirmKey ? (
        <AppModal
          open={Boolean(confirmKey)}
          onClose={closeConfirm}
          overlayClassName={`sales-new-sale-overlay transition-opacity duration-300 ease-out ${confirmPhase === 'closing' ? 'opacity-0' : 'opacity-100'}`}
          cardClassName={`max-w-sm overflow-hidden rounded-3xl border border-slate-200 shadow-2xl transition-all duration-300 ease-out ${
            confirmPhase === 'opening'
              ? 'scale-90 opacity-0 translate-y-4'
              : confirmPhase === 'closing'
                ? 'scale-95 opacity-0 translate-y-3'
                : 'scale-100 opacity-100 translate-y-0'
          }`}
        >
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
              Save changes
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-900">Confirm update</h4>
            <p className="mt-1 text-xs text-slate-600">Save changes to {metricsByKey[confirmKey].label}?</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-200"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmSave}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Yes
              </button>
            </div>
          </div>
        </AppModal>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}