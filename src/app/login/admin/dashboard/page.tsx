import { unstable_noStore as noStore } from 'next/cache';
import DashboardPageClient from './page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardPage() {
  noStore();

  // Fetch the ledger snapshot via the server API route instead of importing server-only code
  const res = await fetch('/api/ledger-state', { cache: 'no-store' });
  const json = await res.json().catch(() => ({ snapshot: {} }));
  const snapshot = json?.snapshot ?? {};

  const initialSalesBills = JSON.parse(snapshot['fs-communication:sales-bills'] ?? '[]');
  const initialMetricOverrides = JSON.parse(snapshot['fs-communication:dashboard-metrics'] ?? '{}');

  return <DashboardPageClient initialSalesBills={initialSalesBills} initialMetricOverrides={initialMetricOverrides} />;
}
