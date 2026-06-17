'use client';

import { useEffect, useState } from 'react';
import { LEDGER_STORAGE_EVENT, SALES_BILLS_STORAGE_KEY, fetchLedgerSnapshot, parseStoredArray, type SalesBillLike } from '../lib/ledger-store';

const fullYearMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const createEmptySeries = () => Array.from({ length: 12 }, () => 0);

const getMonthIndex = (value: string) => {
  const month = Number(value.slice(5, 7));
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month - 1 : 0;
};

const buildSeries = (records: SalesBillLike[]) => {
  const invoiceValues = createEmptySeries();
  const salesValues = createEmptySeries();

  records.forEach((record) => {
    const index = getMonthIndex(record.date);
    invoiceValues[index] += 1;
    salesValues[index] += Number.isFinite(record.total) ? record.total : 0;
  });

  return { invoiceValues, salesValues };
};

function YearlyBarChart({ values, barColor }: { values: number[]; barColor: string }) {
  const maxValue = Math.max(...values, 1);
  const chartHeight = 248;
  const chartWidth = 720;
  const innerLeft = 42;
  const innerRight = 14;
  const innerTop = 28;
  const innerBottom = 30;
  const plotWidth = chartWidth - innerLeft - innerRight;
  const plotHeight = chartHeight - innerTop - innerBottom;
  const bandWidth = plotWidth / values.length;
  const barWidth = Math.min(54, bandWidth * 0.86);

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[266px] w-full">
      <defs>
        <linearGradient id={`${barColor}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={barColor} stopOpacity="1" />
          <stop offset="100%" stopColor={barColor} stopOpacity="0.55" />
        </linearGradient>
        <filter id={`${barColor}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={barColor} floodOpacity="0.25" />
        </filter>
      </defs>
      {fullYearMonths.map((_, index) => (
        <text
          key={`number-${index + 1}`}
          x={innerLeft + bandWidth * index + bandWidth / 2}
          y="14"
          textAnchor="middle"
          fill="#334155"
          fontSize="14"
          fontWeight="700"
        >
          {index + 1}
        </text>
      ))}

      {[0, 1, 2, 3, 4].map((step) => {
        const y = innerTop + (plotHeight / 4) * step;
        const label = Math.round(maxValue - (maxValue / 4) * step);

        return (
          <g key={step}>
            <line x1={innerLeft} y1={y} x2={chartWidth - innerRight} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x="12" y={y + 4} fill="#64748b" fontSize="10" fontWeight="600">
              {label}
            </text>
          </g>
        );
      })}

      {values.map((value, index) => {
        const height = (value / maxValue) * plotHeight;
        const x = innerLeft + bandWidth * index + bandWidth / 2 - barWidth / 2;
        const y = innerTop + plotHeight - height;

        return (
          <g key={`${value}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={height} rx="14" fill={`url(#${barColor}-fill)`} filter={`url(#${barColor}-shadow)`} />
            <rect x={x} y={y} width={barWidth} height={Math.max(10, height * 0.16)} rx="14" fill="rgba(255,255,255,0.18)" />
          </g>
        );
      })}

      {fullYearMonths.map((month, index) => (
        <text
          key={month}
          x={innerLeft + bandWidth * index + bandWidth / 2}
          y={chartHeight - 4}
          textAnchor="middle"
          fill="#64748b"
          fontSize="14"
          fontWeight="700"
        >
          {month}
        </text>
      ))}
    </svg>
  );
}

function ChartCard({
  title,
  barColor,
  values,
  legend,
}: {
  title: string;
  barColor: string;
  values: number[];
  legend: Array<{ label: string; color: string }>;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="px-1 pt-1">
        <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
      </div>

      <div className="mt-1 flex-1">
        <YearlyBarChart values={values} barColor={barColor} />
      </div>

      <div className="mt-auto flex flex-wrap gap-2 px-1 pb-1 text-[11px]">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardSummaryCharts({ initialRecords = [] }: { initialRecords?: SalesBillLike[] }) {
  const [invoiceValues, setInvoiceValues] = useState<number[]>(createEmptySeries());
  const [salesValues, setSalesValues] = useState<number[]>(createEmptySeries());

  useEffect(() => {
    const refresh = async () => {
      const snapshot = await fetchLedgerSnapshot();
      const records = parseStoredArray<SalesBillLike>(snapshot[SALES_BILLS_STORAGE_KEY]);
      const { invoiceValues: nextInvoices, salesValues: nextSales } = buildSeries(records);
      setInvoiceValues(nextInvoices);
      setSalesValues(nextSales);
    };

    if (initialRecords.length) {
      const { invoiceValues: nextInvoices, salesValues: nextSales } = buildSeries(initialRecords);
      setInvoiceValues(nextInvoices);
      setSalesValues(nextSales);
    } else {
      void refresh();
    }

    const onStorage: EventListener = () => { void refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener(LEDGER_STORAGE_EVENT, onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LEDGER_STORAGE_EVENT, onStorage);
    };
  }, [initialRecords]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch">
      <ChartCard
        title="Invoices by Month"
        barColor="#60a5fa"
        values={invoiceValues}
        legend={[{ label: 'Invoices issued', color: '#60a5fa' }]}
      />
      <ChartCard
        title="Sales Performance"
        barColor="#34d399"
        values={salesValues}
        legend={[{ label: 'Sales volume', color: '#10b981' }]}
      />
    </div>
  );
}