import { unstable_noStore as noStore } from 'next/cache';
import { readLedgerSnapshot } from '../../../../lib/ledger-server';
import DashboardPageClient from './page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardPage() {
  noStore();
  const snapshot = await readLedgerSnapshot();

  const initialSalesBills = JSON.parse(snapshot['fs-communication:sales-bills'] ?? '[]');
  const initialMetricOverrides = JSON.parse(snapshot['fs-communication:dashboard-metrics'] ?? '{}');

  return <DashboardPageClient initialSalesBills={initialSalesBills} initialMetricOverrides={initialMetricOverrides} />;
}
