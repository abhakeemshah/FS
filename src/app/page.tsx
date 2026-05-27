import { unstable_noStore as noStore } from 'next/cache';
import LandingPageClient from './page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  noStore();
  return <LandingPageClient />;
}