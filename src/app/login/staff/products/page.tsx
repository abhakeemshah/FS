import { unstable_noStore as noStore } from 'next/cache';
import { listProducts } from '../../../../lib/services/product-service';
import { listCategories } from '../../../../lib/services/category-service';
import { listProductLists } from '../../../../lib/services/product-list-service';
import { getLandingHero } from '../../../../lib/services/landing-hero-service';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import AdminProductsPageClient from '../../admin/products/page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffProductsPage() {
  noStore();

  const [products, categories, lists, hero] = await Promise.all([
    listProducts(),
    listCategories(),
    listProductLists(),
    getLandingHero(),
  ]);

  // Serialize Date objects to ISO strings for client component
  const serializedProducts = JSON.parse(JSON.stringify(products));
  const serializedCategories = JSON.parse(JSON.stringify(categories));
  const serializedLists = JSON.parse(JSON.stringify(lists));
  const serializedHero = hero ? JSON.parse(JSON.stringify(hero)) : null;

  return (
    <StaffPageFrame moduleKey="products">
      <AdminProductsPageClient
        readOnly
        initialProducts={serializedProducts}
        initialCategories={serializedCategories}
        initialLists={serializedLists}
        initialHero={serializedHero}
      />
    </StaffPageFrame>
  );
}
