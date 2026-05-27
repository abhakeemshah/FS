import { unstable_noStore as noStore } from 'next/cache';
import LandingPageClient from './page-client';
import { readCatalogSnapshot } from '../lib/catalog-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  noStore();
  return <LandingPageClient initialCatalogSnapshot={readCatalogSnapshot()} />;
}