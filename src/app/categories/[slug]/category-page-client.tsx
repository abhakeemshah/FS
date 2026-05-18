"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoryDetails, type CategoryDetail, type CategoryProduct } from '../../../data/categories';
import { CATALOG_CATEGORIES_STORAGE_KEY, CATALOG_PRODUCTS_STORAGE_KEY, CATALOG_STORAGE_EVENT, CATALOG_HIDDEN_CATEGORIES_KEY, readStoredArray, type CatalogCategoryRecord, type CatalogProductRecord } from '../../../lib/catalog-store';

type CategoryViewProduct = CategoryProduct & {
  hoverImage: string;
};

type CategoryView = {
  slug: string;
  name: string;
  image: string;
  description: string;
  countLabel: string;
  products: CategoryViewProduct[];
};

type CategoryPageClientProps = {
  slug: string;
};

const formatPrice = (value: string) => (value.endsWith('.00') ? value.slice(0, -3) : value);

const toText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const mapDefaultCategory = (category: CategoryDetail): CategoryView => ({
  slug: category.slug,
  name: category.name,
  image: category.image,
  description: category.description,
  countLabel: category.countLabel,
  products: category.products.map((product) => ({
    ...product,
    hoverImage: product.hoverImage ?? product.image,
  })),
});

const mapStoredProduct = (product: CatalogProductRecord): CategoryViewProduct => ({
  name: product.name,
  price: product.price.toFixed(2),
  image: product.imageUrls.find((imageUrl) => Boolean(toText(imageUrl))) ?? '',
  hoverImage: product.imageUrls.slice(1).find((imageUrl) => Boolean(toText(imageUrl))) ?? product.imageUrls.find((imageUrl) => Boolean(toText(imageUrl))) ?? '',
  description: product.bio,
});

const buildCategoryView = (
  slug: string,
  storedCategories: CatalogCategoryRecord[],
  storedProducts: CatalogProductRecord[],
  hiddenCategorySlugs: string[] = [],
) => {
  const normalizedSlug = slug?.trim().toLowerCase() ?? '';

  if (!normalizedSlug) {
    return null;
  }

  // Check if this category is hidden
  if (hiddenCategorySlugs.map((s) => s.toLowerCase()).includes(normalizedSlug)) {
    return null;
  }

  const defaultCategory = categoryDetails.find((category) => category.slug.toLowerCase() === normalizedSlug);
  const storedCategory = storedCategories.find((category) => toText(category.slug).toLowerCase() === normalizedSlug);
  const products = storedProducts
    .filter((product) => toText(product.categoryId).toLowerCase() === normalizedSlug)
    .map(mapStoredProduct);

  if (storedCategory || defaultCategory || products.length) {
    const fallback = defaultCategory ? mapDefaultCategory(defaultCategory) : undefined;
    return {
      slug: storedCategory?.slug ?? defaultCategory?.slug ?? normalizedSlug,
      name: storedCategory?.name ?? defaultCategory?.name ?? normalizedSlug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
      image: storedCategory?.imageUrl ?? fallback?.image ?? products[0]?.image ?? '',
      description: defaultCategory?.description ?? `Products in ${storedCategory?.name ?? normalizedSlug}`,
      countLabel: fallback?.countLabel ?? `${products.length} items`,
      products: products,
    } satisfies CategoryView;
  }

  return null;
};

export default function CategoryPageClient({ slug }: CategoryPageClientProps) {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryView | null>(null);

  useEffect(() => {
    const refreshCategory = () => {
      const storedCategories = readStoredArray<CatalogCategoryRecord>(CATALOG_CATEGORIES_STORAGE_KEY);
      const storedProducts = readStoredArray<CatalogProductRecord>(CATALOG_PRODUCTS_STORAGE_KEY);
      const hiddenCategories = readStoredArray<string>(CATALOG_HIDDEN_CATEGORIES_KEY);
      setCategory(buildCategoryView(slug, storedCategories, storedProducts, hiddenCategories));
    };

    refreshCategory();

    window.addEventListener('storage', refreshCategory);
    window.addEventListener(CATALOG_STORAGE_EVENT, refreshCategory);

    return () => {
      window.removeEventListener('storage', refreshCategory);
      window.removeEventListener(CATALOG_STORAGE_EVENT, refreshCategory);
    };
  }, [slug]);

  const products = useMemo(() => category?.products ?? [], [category]);

  if (!category) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_45%,#f8fafc_100%)] px-4">
        <div className="max-w-md rounded-3xl border border-blue-100 bg-white p-8 text-center shadow-[0_12px_32px_rgba(30,64,175,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Category not found</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">This category has no products yet.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">The admin can create this category and add products with images and a bio, then it will show up here automatically.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-full bg-blue-950 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-900"
            >
              Back to Home
            </button>
            <Link href="/categories" className="rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-950 transition-colors hover:bg-blue-50">
              All Categories
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-blue-200/50 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="font-bold text-blue-900">
            FS Communication
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-800 hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </Link>
        </div>
      </nav>

      <main className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_45%,#f8fafc_100%)] pt-20">
        <section className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-[32px] border border-blue-200 bg-gradient-to-br from-blue-600 to-blue-900 shadow-[0_30px_60px_rgba(30,64,175,0.25)]">
              <div className="absolute inset-0">
                <img src={category.image} alt={category.name} className="h-full w-full object-cover opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 mix-blend-multiply" />
              </div>

              <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative grid items-center gap-8 px-6 py-16 md:grid-cols-2 md:px-12 md:py-20 lg:px-16 lg:py-24">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-100">✨ Category Spotlight</p>
                    <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">{category.name}</h1>
                  </div>
                  <p className="max-w-lg text-lg leading-8 text-blue-50">{category.description}</p>
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
                      <p className="text-sm font-bold text-white">{category.countLabel}</p>
                    </div>
                    <p className="text-sm font-semibold text-blue-100">Premium Products</p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-white/20 to-transparent blur-2xl" />
                  <div className="relative overflow-hidden rounded-3xl border-2 border-white/30 bg-white/10 backdrop-blur-sm">
                    <img src={category.image} alt={category.name} className="aspect-square h-full w-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Curated Selection</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Shop {category.name}</h2>
              </div>
              <div className="rounded-full border border-blue-200 bg-white px-4 py-2 shadow-sm">
                <p className="text-sm font-semibold text-slate-700">{products.length} Products</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <article
                  key={`${category.slug}-${product.name}`}
                  className="group/card flex flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_4px_20px_rgba(30,64,175,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(30,64,175,0.16)]"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
                    <div className="aspect-square overflow-hidden">
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110" />
                    </div>
                    <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-2 shadow-lg">
                      <p className="text-sm font-extrabold text-white">{formatPrice(product.price)}</p>
                    </div>
                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 shadow-sm backdrop-blur-sm">
                      <p className="text-xs font-bold text-blue-900">New</p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col space-y-3 p-5">
                    <div>
                      <h3 className="line-clamp-2 text-lg font-extrabold text-slate-900">{product.name}</h3>
                    </div>

                    <p className="line-clamp-2 flex-1 text-sm leading-6 text-slate-600">{product.description}</p>

                    <div className="flex gap-3 pt-2">
                      <button className="flex-1 rounded-full bg-blue-900 px-4 py-3 text-sm font-extrabold text-white transition-all duration-200 hover:bg-blue-800 hover:shadow-lg active:scale-95" type="button">
                        Buy Now
                      </button>
                      <button className="rounded-full border-2 border-blue-900 px-4 py-3 text-sm font-bold text-blue-900 transition-all duration-200 hover:bg-blue-50" type="button">
                        <span className="material-symbols-outlined text-[20px]">favorite</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-blue-200/50 bg-gradient-to-r from-blue-900 to-blue-950 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl text-center">
            <h3 className="text-3xl font-black tracking-tight text-white">Need Help Choosing?</h3>
            <p className="mt-3 text-lg text-blue-100">Our experts are here to guide you through our {category.name.toLowerCase()} collection</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <button className="rounded-full bg-white px-8 py-3 font-bold text-blue-900 transition-all hover:scale-105 hover:shadow-lg">
                Contact Support
              </button>
              <Link href="/" className="rounded-full border-2 border-white px-8 py-3 font-bold text-white transition-all hover:bg-white/10">
                Back to Shop
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
