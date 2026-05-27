"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoryDetails, type CategoryDetail, type CategoryProduct } from '../../data/categories';
import { CATALOG_CATEGORIES_STORAGE_KEY, CATALOG_PRODUCTS_STORAGE_KEY, CATALOG_STORAGE_EVENT, CATALOG_HIDDEN_CATEGORIES_KEY, readStoredArray, type CatalogCategoryRecord, type CatalogProductRecord } from '../../lib/catalog-store';
import { BUSINESS_PROFILE } from '../../lib/business-profile';

export const dynamic = 'force-dynamic';

type CategoryViewProduct = CategoryProduct & {
  hoverImage: string;
};

type CategoryView = {
  slug: string;
  name: string;
  image: string;
  countLabel: string;
  products: CategoryViewProduct[];
};

const formatPrice = (value: string) => (value.endsWith('.00') ? value.slice(0, -3) : value);

const toText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const isValidStoredCategory = (category: CatalogCategoryRecord) => Boolean(toText(category.slug) && toText(category.name));

const isValidStoredProduct = (product: CatalogProductRecord) => Boolean(toText(product.categoryId) && toText(product.name));

const mapStoredProductToViewProduct = (product: CatalogProductRecord): CategoryViewProduct => ({
  name: product.name,
  price: product.price.toFixed(2),
  image: product.imageUrls.find((imageUrl) => Boolean(toText(imageUrl))) ?? '',
  hoverImage: product.imageUrls.slice(1).find((imageUrl) => Boolean(toText(imageUrl))) ?? product.imageUrls.find((imageUrl) => Boolean(toText(imageUrl))) ?? '',
  description: product.bio,
});

const createDefaultCategories = () =>
  categoryDetails.map<CategoryView>((category) => ({
    slug: category.slug,
    name: category.name,
    image: category.image,
    countLabel: category.countLabel,
    products: category.products.map((product) => ({
      ...product,
      hoverImage: product.hoverImage ?? product.image,
    })),
  }));

const mergeCatalog = (storedCategories: CatalogCategoryRecord[], storedProducts: CatalogProductRecord[], hiddenCategorySlugs: string[] = []) => {
  const hidden = new Set(hiddenCategorySlugs.map((s) => s.toLowerCase()));
  const productsByCategory = new Map<string, CategoryViewProduct[]>();

  for (const product of storedProducts.filter(isValidStoredProduct)) {
    const key = toText(product.categoryId).toLowerCase();
    const nextProducts = productsByCategory.get(key) ?? [];
    nextProducts.push(mapStoredProductToViewProduct(product));
    productsByCategory.set(key, nextProducts);
  }

  const views = new Map<string, CategoryView>();

  // Only add default categories if there are stored products; don't show demo products
  if (storedProducts.length === 0) {
    // No stored products, so don't add any default demo categories
    for (const category of storedCategories.filter(isValidStoredCategory)) {
      const key = toText(category.slug).toLowerCase();
      if (hidden.has(key)) continue;
      views.set(key, {
        slug: category.slug,
        name: category.name,
        image: category.imageUrl || '',
        countLabel: '0 items',
        products: [],
      });
    }
  } else {
    // Only add default categories with their stored products (not demo products)
    for (const category of categoryDetails) {
      if (hidden.has(category.slug.toLowerCase())) continue;
      views.set(category.slug.toLowerCase(), {
        slug: category.slug,
        name: category.name,
        image: category.image,
        countLabel: category.countLabel,
        products: [],
      });
    }

    for (const category of storedCategories.filter(isValidStoredCategory)) {
      const key = toText(category.slug).toLowerCase();
      if (hidden.has(key)) continue;
      const storedCategoryProducts = productsByCategory.get(key) ?? [];

      views.set(key, {
        slug: category.slug,
        name: category.name,
        image: category.imageUrl || views.get(key)?.image || '',
        countLabel: `${storedCategoryProducts.length} items`,
        products: storedCategoryProducts,
      });
    }

    for (const [key, products] of productsByCategory) {
      if (hidden.has(key)) continue;
      if (views.has(key)) {
        const existing = views.get(key)!;
        views.set(key, { ...existing, products, countLabel: `${products.length} items` });
        continue;
      }

      const representative = products[0];
      views.set(key, {
        slug: key,
        name: key
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        image: representative?.image ?? '',
        countLabel: `${products.length} items`,
        products,
      });
    }
  }

  return Array.from(views.values());
};

export default function CategoriesPage() {
  const router = useRouter();
  const [catalogCategories, setCatalogCategories] = useState<CategoryView[]>(createDefaultCategories);

  useEffect(() => {
    const refreshCatalog = () => {
      const storedCategories = readStoredArray<CatalogCategoryRecord>(CATALOG_CATEGORIES_STORAGE_KEY);
      const storedProducts = readStoredArray<CatalogProductRecord>(CATALOG_PRODUCTS_STORAGE_KEY);
      const hiddenCategories = readStoredArray<string>(CATALOG_HIDDEN_CATEGORIES_KEY);
      setCatalogCategories(mergeCatalog(storedCategories, storedProducts, hiddenCategories));
    };

    refreshCatalog();

    window.addEventListener('storage', refreshCatalog);
    window.addEventListener(CATALOG_STORAGE_EVENT, refreshCatalog);

    return () => {
      window.removeEventListener('storage', refreshCatalog);
      window.removeEventListener(CATALOG_STORAGE_EVENT, refreshCatalog);
    };
  }, []);

  const categoryCards = useMemo(() => catalogCategories, [catalogCategories]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_45%,#f8fafc_100%)]">
      <div className="bg-blue-950 px-4 py-1 text-[10px] font-medium text-white/90 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <p className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[10px] font-bold uppercase tracking-[0.18em]">{BUSINESS_PROFILE.shopName}</span>
            <span>Browse All Categories</span>
          </p>
          <p className="hidden sm:block">Eng ▾ · Location ▾</p>
        </div>
      </div>

      <header className="border-b border-slate-100 bg-white px-4 py-2 sm:px-6">
        <nav className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="flex items-center gap-2 text-[1.05rem] font-extrabold tracking-tight text-blue-950">
            <span>{BUSINESS_PROFILE.shopName}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-full border border-blue-950 bg-blue-950 px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-blue-900"
            >
              Back to Home
            </button>
          </div>
        </nav>
      </header>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Shop by Category</h1>
            <p className="mb-6 text-sm text-slate-600">Explore our collection of premium audio equipment</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
              {categoryCards.map((category) => (
                <a
                  key={category.slug}
                  href={`#${category.slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-blue-100 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(30,64,175,0.15)]"
                >
                  <div className="aspect-square overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-end justify-end p-3 sm:p-4">
                    <div className="text-right">
                      <h3 className="text-sm font-extrabold text-white sm:text-base">{category.name}</h3>
                      <p className="mt-0.5 text-xs text-blue-100">{category.countLabel}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {categoryCards.map((category) => (
              <section
                key={category.slug}
                id={category.slug}
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
              >
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 sm:h-40">
                  <img src={category.image} alt={category.name} className="h-full w-full object-cover opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-950/60 to-transparent" />
                  <div className="absolute inset-0 flex items-end p-5 sm:p-6">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">Category Spotlight</p>
                      <h2 className="text-2xl font-extrabold text-white">{category.name}</h2>
                      <p className="mt-1 text-sm text-blue-50/90">{category.countLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
                  <p className="max-w-3xl text-sm text-slate-600">
                    {category.products.length
                      ? `Hand-picked products in ${category.name}, including admin-created items when available.`
                      : `No products have been added to ${category.name} yet.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 sm:p-3">
                  {category.products.map((product) => (
                    <article
                      key={`${category.slug}-${product.name}`}
                      className="group overflow-hidden rounded-md border border-slate-100 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(30,64,175,0.1)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                        <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-300 group-hover:opacity-0" />
                        <img src={product.hoverImage} alt={`${product.name} alternate view`} className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </div>
                      <div className="space-y-0.5 p-2">
                        <h3 className="line-clamp-2 text-[11px] font-bold leading-4 text-slate-900">{product.name}</h3>
                        <p className="line-clamp-1 text-[9px] leading-4 text-slate-500">{product.description}</p>
                        <div className="flex items-center justify-between gap-1.5 pt-0.5">
                          <span className="text-xl font-extrabold text-blue-950">{formatPrice(product.price)}</span>
                          <button type="button" className="rounded-full bg-blue-950 px-3 py-1 text-[13px] font-bold text-white transition-colors hover:bg-blue-900">
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
