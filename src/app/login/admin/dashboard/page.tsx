import { unstable_noStore as noStore } from 'next/cache';
import DashboardPageClient from './page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardPage() {
  noStore();

  // Fetch the ledger snapshot via the server API route instead of importing server-only code
  let snapshot: Record<string, string> = {};
  try {
    const res = await fetch('/api/ledger-state', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      snapshot = json?.snapshot ?? {};
    } else {
      console.error('Ledger API returned non-OK status', res.status);
      snapshot = {};
    }
  } catch (err) {
    console.error('Error fetching ledger snapshot:', err);
    snapshot = {};
  }

  const initialSalesBills = JSON.parse(snapshot['fs-communication:sales-bills'] ?? '[]');
  const initialMetricOverrides = JSON.parse(snapshot['fs-communication:dashboard-metrics'] ?? '{}');

  return <DashboardPageClient initialSalesBills={initialSalesBills} initialMetricOverrides={initialMetricOverrides} />;
}
