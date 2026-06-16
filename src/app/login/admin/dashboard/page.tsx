import { unstable_noStore as noStore } from 'next/cache';
import { listInvoices } from '../../../../lib/services/invoice-service';
import DashboardPageClient from './page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardPage() {
  noStore();
  let invoices = [];
  try {
    invoices = await listInvoices({ limit: 50 });
  } catch (err) {
    console.error('Error fetching invoices:', err);
  }

  const serializedInvoices = JSON.parse(JSON.stringify(invoices));

  return <DashboardPageClient initialInvoices={serializedInvoices} />;
}
