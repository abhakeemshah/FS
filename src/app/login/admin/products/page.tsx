import { unstable_noStore as noStore } from 'next/cache';
import { readCatalogSnapshot } from '../../../../lib/catalog-server';
import AdminProductsPageClient from './page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminProductsPage() {
  noStore();
  return <AdminProductsPageClient initialCatalogSnapshot={readCatalogSnapshot()} />;
}