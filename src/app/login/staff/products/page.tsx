import { unstable_noStore as noStore } from 'next/cache';
import { readCatalogSnapshot } from '../../../../lib/catalog-server';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import AdminProductsPageClient from '../../admin/products/page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffProductsPage() {
  noStore();
  const snapshot = await readCatalogSnapshot();

  return (
    <StaffPageFrame moduleKey="products">
      <AdminProductsPageClient readOnly initialCatalogSnapshot={snapshot} />
    </StaffPageFrame>
  );
}
