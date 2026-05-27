import { unstable_noStore as noStore } from 'next/cache';
import CategoriesPageClient from './page-client';
import { readCatalogSnapshot } from '../../lib/catalog-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CategoriesPageWrapper() {
  noStore();
  const snapshot = await readCatalogSnapshot();
  return <CategoriesPageClient initialCatalogSnapshot={snapshot} />;
}