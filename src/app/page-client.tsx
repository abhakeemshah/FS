"use client";

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BUSINESS_PROFILE } from '../lib/business-profile';
import {
  CATALOG_CATEGORIES_STORAGE_KEY,
  CATALOG_PRODUCTS_STORAGE_KEY,
  CATALOG_LISTS_STORAGE_KEY,
  CATALOG_STORAGE_EVENT,
  LANDING_HERO_STORAGE_KEY,
  LANDING_SECTION_VISIBILITY_STORAGE_KEY,
  defaultLandingHeroSettings,
  parseStoredArray,
  parseStoredValue,
  readStoredArray,
  readStoredValue,
  writeStoredArray,
  CATALOG_HIDDEN_CATEGORIES_KEY,
  type CatalogCategoryRecord,
  type CatalogProductRecord,
  type CatalogListRecord,
  type LandingSectionVisibilityRecord,
  type LandingHeroSettingsRecord,
} from '../lib/catalog-store';

type ProductCard = {
  name: string;
  price: string;
  image: string;
  hoverImage: string;
  caption: string;
  badge?: string;
};

// quickActions removed: filter buttons intentionally hidden from landing page
const colorOptions = ['#f39b93', '#4b5563', '#cbd5c1', '#d1d5db', '#94a3b8'];
const POPUP_ANIMATION_MS = 220;

const defaultLandingSectionVisibility: LandingSectionVisibilityRecord = {
  hot: true,
  more: true,
};

const normalizeLandingSectionVisibility = (value: Partial<LandingSectionVisibilityRecord> | null | undefined): LandingSectionVisibilityRecord => ({
  hot: value?.hot !== false,
  more: value?.more !== false,
});

const formatPrice = (value: string) => (value.endsWith('.00') ? value.slice(0, -3) : value);

const mapCatalogProductToCard = (product: CatalogProductRecord): ProductCard => ({
  name: product.name,
  price: product.price.toFixed(2),
  image: product.imageUrls[0] ?? '',
  hoverImage: product.imageUrls[1] ?? product.imageUrls[0] ?? '',
  caption: product.bio,
  badge: String(product.stock),
});

const isSeedProduct = (product: CatalogProductRecord) => product.id.startsWith('seed-prd-');
const isSeedList = (list: CatalogListRecord) => list.id.startsWith('seed-list-');

const mapStoredCategoryToLandingCategory = (
  category: CatalogCategoryRecord,
  fallbackCountLabel: string,
): { slug: string; name: string; image: string; countLabel: string } => ({
  slug: category.slug,
  name: category.name,
  image: category.imageUrl || '',
  countLabel: fallbackCountLabel,
});

const normalizeHeroSettings = (settings: Partial<LandingHeroSettingsRecord> | null | undefined): LandingHeroSettingsRecord => ({
  title: typeof settings?.title === 'string' && settings.title.trim() ? settings.title.trim() : defaultLandingHeroSettings.title,
  buttonText: typeof settings?.buttonText === 'string' && settings.buttonText.trim() ? settings.buttonText.trim() : defaultLandingHeroSettings.buttonText,
  buttonHref: typeof settings?.buttonHref === 'string' && settings.buttonHref.trim() ? settings.buttonHref.trim() : defaultLandingHeroSettings.buttonHref,
  imageUrl: typeof settings?.imageUrl === 'string' && settings.imageUrl.trim() ? settings.imageUrl.trim() : defaultLandingHeroSettings.imageUrl,
  backgroundColor:
    typeof settings?.backgroundColor === 'string' && settings.backgroundColor.trim()
      ? settings.backgroundColor.trim()
      : defaultLandingHeroSettings.backgroundColor,
  overlayOpacity: Number.isFinite(Number(settings?.overlayOpacity))
    ? Math.min(100, Math.max(0, Number(settings?.overlayOpacity)))
    : defaultLandingHeroSettings.overlayOpacity,
});

type CatalogSnapshot = Record<string, string>;

const buildLandingStateFromSnapshot = (snapshot: CatalogSnapshot) => {
  const products = parseStoredArray<CatalogProductRecord>(snapshot[CATALOG_PRODUCTS_STORAGE_KEY]).filter((product) => !isSeedProduct(product));
  const lists = parseStoredArray<CatalogListRecord>(snapshot[CATALOG_LISTS_STORAGE_KEY]).filter((list) => !isSeedList(list));
  const categories = parseStoredArray<CatalogCategoryRecord>(snapshot[CATALOG_CATEGORIES_STORAGE_KEY]);
  const hiddenCategories = parseStoredArray<string>(snapshot[CATALOG_HIDDEN_CATEGORIES_KEY]);
  const landingSectionVisibility = normalizeLandingSectionVisibility(
    parseStoredValue<Partial<LandingSectionVisibilityRecord>>(snapshot[LANDING_SECTION_VISIBILITY_STORAGE_KEY]),
  );
  const heroSettings = normalizeHeroSettings(parseStoredValue<Partial<LandingHeroSettingsRecord>>(snapshot[LANDING_HERO_STORAGE_KEY]));

  return {
    products,
    lists,
    categories,
    hiddenCategories,
    landingSectionVisibility,
    heroSettings,
    storedLandingProducts: products.filter((product) => product.showOnLanding).map(mapCatalogProductToCard),
    storedExtraLandingProducts: products.filter((product) => product.showOnExtraLanding).map(mapCatalogProductToCard),
  };
};

function HorizontalProductScroller({
  heading,
  products,
  onBuyProduct,
}: {
  heading: string;
  products: ProductCard[];
  onBuyProduct: (product: ProductCard) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [canScrollExtraLeft, setCanScrollExtraLeft] = useState(false);
  const [canScrollExtraRight, setCanScrollExtraRight] = useState(true);

  const updateScrollState = () => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  const scrollProducts = (direction: 'left' | 'right') => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>('[data-scroll-card]');
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 265;
    const gap = 12;
    const scrollAmount = cardWidth + gap;

    scroller.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    updateScrollState();

    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const handleScroll = () => updateScrollState();

    scroller.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [products.length]);

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{heading}</h2>
                <div className="relative w-full max-w-full min-w-0">
        {canScrollLeft ? (
          <button
            aria-label={`Scroll ${heading} left`}
            className="absolute left-3 top-[52%] z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-blue-950/70 text-white/85 shadow-lg shadow-blue-950/10 backdrop-blur-md transition-all hover:scale-105 hover:bg-blue-900/85 hover:text-white"
            type="button"
            onClick={() => scrollProducts('left')}
          >
            <span className="material-symbols-outlined text-[28px]">chevron_left</span>
          </button>
        ) : null}
        {canScrollRight ? (
          <button
            aria-label={`Scroll ${heading} right`}
            className="absolute right-3 top-[52%] z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-blue-950/70 text-white/85 shadow-lg shadow-blue-950/10 backdrop-blur-md transition-all hover:scale-105 hover:bg-blue-900/85 hover:text-white"
            type="button"
            onClick={() => scrollProducts('right')}
          >
            <span className="material-symbols-outlined text-[28px]">chevron_right</span>
          </button>
        ) : null}
        <div
          ref={scrollerRef}
          className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={updateScrollState}
        >
          <div className="flex flex-nowrap gap-3 pr-1 min-w-max snap-x snap-mandatory">
            {products.map((product, index) => (
              <article key={`${heading}-${product.name}-${index}`} data-scroll-card className="group w-[265px] shrink-0 rounded-[16px] border border-slate-100 bg-white p-2.5 shadow-[0_10px_22px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(37,99,235,0.10)] snap-start">
                <div className="group relative aspect-square overflow-hidden rounded-[12px] bg-slate-50">
                  <img alt={product.name} src={product.image} className="absolute inset-0 h-full w-full object-cover opacity-100 transition-all duration-500 group-hover:scale-105 group-hover:opacity-0" />
                  <img alt={`${product.name} alternate view`} src={product.hoverImage} className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" />
                </div>
                <div className="px-1 pt-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-[14px] font-extrabold leading-5 text-slate-900">{product.name}</h3>
                    <p className="shrink-0 text-[19px] font-extrabold leading-none text-slate-900">{formatPrice(product.price)}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{product.caption}</p>
                  <button
                    className="mt-2.5 rounded-full border border-blue-950 bg-blue-950 px-3.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-blue-900"
                    type="button"
                    onClick={() => onBuyProduct(product)}
                  >
                    Buy Product
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ initialCatalogSnapshot }: { initialCatalogSnapshot: CatalogSnapshot }) {
  const initialLandingState = buildLandingStateFromSnapshot(initialCatalogSnapshot);
  const [selectedProduct, setSelectedProduct] = useState<ProductCard | null>(null);
  const [selectedPopupImage, setSelectedPopupImage] = useState<string | null>(null);
  const [storedProducts, setStoredProducts] = useState<CatalogProductRecord[]>(initialLandingState.products);
  const [storedLists, setStoredLists] = useState<CatalogListRecord[]>(initialLandingState.lists);
  const [storedLandingProducts, setStoredLandingProducts] = useState<ProductCard[]>(initialLandingState.storedLandingProducts);
  const [storedExtraLandingProducts, setStoredExtraLandingProducts] = useState<ProductCard[]>(initialLandingState.storedExtraLandingProducts);
  const [landingSectionVisibility, setLandingSectionVisibility] = useState<LandingSectionVisibilityRecord>(initialLandingState.landingSectionVisibility);
  const [heroSettings, setHeroSettings] = useState<LandingHeroSettingsRecord>(initialLandingState.heroSettings);
  const [storedCategories, setStoredCategories] = useState<CatalogCategoryRecord[]>(initialLandingState.categories);
  const [storedHiddenCategories, setStoredHiddenCategories] = useState<string[]>(initialLandingState.hiddenCategories);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [canScrollExtraLeft, setCanScrollExtraLeft] = useState(false);
  const [canScrollExtraRight, setCanScrollExtraRight] = useState(true);
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hotRightNowScrollerRef = useRef<HTMLDivElement | null>(null);
  const extraLandingScrollerRef = useRef<HTMLDivElement | null>(null);
  const shopName = BUSINESS_PROFILE.shopName;

  const translations: Record<'en' | 'ur', Record<string, string>> = {
    en: {
      [shopName]: shopName,
      'Search Product': 'Search Product',
      'Login': 'Login',
      'Categories': 'Categories',
      'Deals': 'Deals',
      'What\'s New': 'What\'s New',
      'Delivery': 'Delivery',
      'English': 'English',
      'Urdu': 'اردو',
      'Popular Categories': 'Popular Categories',
      'Quick Links': 'Quick Links',
      'Contact': 'Contact',
      'Products': 'Products',
      'Support': 'Support',
      'Email': 'Email',
      'Phone': 'Phone',
      'Hours': 'Mon - Sat: 10:00 AM to 8:00 PM',
      'Shop Smarter': 'Shop Smarter. Sound Better.',
      'Premium audio': 'Premium audio products with trusted quality, fast service, and a shopping experience designed for comfort.',
      'What\'s Hot Right Now': 'What\'s Hot Right Now',
      'Buy Product': 'Buy Product',
      'Buy Now': 'Buy Now',
      'Click Buy Now': 'Click Buy Now to contact admin',
      'All rights': 'All rights reserved.',
    },
    ur: {
      [shopName]: 'ایف ایس کمیونیکیشن',
      'Search Product': 'مصنوعات تلاش کریں',
      'Login': 'لاگ ان',
      'Categories': 'زمرے',
      'Deals': 'ڈیلز',
      'What\'s New': 'نیا کیا ہے',
      'Delivery': 'ڈیلیوری',
      'English': 'English',
      'Urdu': 'اردو',
      'Popular Categories': 'مقبول زمرے',
      'Quick Links': 'فوری لنکس',
      'Contact': 'رابطہ',
      'Products': 'مصنوعات',
      'Support': 'معاونت',
      'Email': 'ای میل',
      'Phone': 'فون',
      'Hours': 'پیر - ہفتہ: صبح 10:00 سے شام 8:00 بجے تک',
      'Shop Smarter': 'ہوشیاری سے خریداری کریں۔ بہتر آواز۔',
      'Premium audio': 'قابل اعتماد معیار، تیز سروس اور آرام دہ شپنگ کا تجربہ کے ساتھ پریمیم آڈیو مصنوعات۔',
      'What\'s Hot Right Now': 'اب کیا گرم ہے',
      'Buy Product': 'مصنوع خریدیں',
      'Buy Now': 'ابھی خریدیں',
      'Click Buy Now': 'ایڈمن سے رابطہ کرنے کے لیے ابھی خریدیں پر کلک کریں',
      'All rights': 'تمام حقوق محفوظ ہیں۔',
    },
  };

  const t = (key: string): string => translations[language][key] || key;

  useEffect(() => {
    const savedLanguage = localStorage.getItem('landing-language') as 'en' | 'ur' | null;
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('landing-language', language);
  }, [language]);

  useEffect(() => {
    if (!selectedProduct || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;

    const frame = requestAnimationFrame(() => setIsPopupVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [selectedProduct]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const refreshLandingCategories = () => {
      setStoredCategories(readStoredArray<CatalogCategoryRecord>(CATALOG_CATEGORIES_STORAGE_KEY));
      setStoredHiddenCategories(readStoredArray<string>(CATALOG_HIDDEN_CATEGORIES_KEY));
    };

    const refreshLandingProducts = () => {
      const savedProducts = readStoredArray<CatalogProductRecord>(CATALOG_PRODUCTS_STORAGE_KEY).filter((product) => !isSeedProduct(product));
      const savedLists = readStoredArray<CatalogListRecord>(CATALOG_LISTS_STORAGE_KEY).filter((list) => !isSeedList(list));

      setLandingSectionVisibility(
        normalizeLandingSectionVisibility(
          readStoredValue<Partial<LandingSectionVisibilityRecord>>(LANDING_SECTION_VISIBILITY_STORAGE_KEY),
        ),
      );
      setStoredProducts(savedProducts);
      setStoredLists(savedLists);
      setStoredLandingProducts(savedProducts.filter((product) => product.showOnLanding).map(mapCatalogProductToCard));
      setStoredExtraLandingProducts(savedProducts.filter((product) => product.showOnExtraLanding).map(mapCatalogProductToCard));
    };

    window.addEventListener('storage', refreshLandingProducts);
    window.addEventListener(CATALOG_STORAGE_EVENT, refreshLandingProducts);
    window.addEventListener('products-storage-updated', refreshLandingProducts);
    window.addEventListener('storage', refreshLandingCategories);
    window.addEventListener(CATALOG_STORAGE_EVENT, refreshLandingCategories);

    return () => {
      window.removeEventListener('storage', refreshLandingProducts);
      window.removeEventListener(CATALOG_STORAGE_EVENT, refreshLandingProducts);
      window.removeEventListener('products-storage-updated', refreshLandingProducts);
      window.removeEventListener('storage', refreshLandingCategories);
      window.removeEventListener(CATALOG_STORAGE_EVENT, refreshLandingCategories);
    };
  }, []);

  useEffect(() => {
    const refreshHeroSettings = () => {
      const stored = readStoredValue<Partial<LandingHeroSettingsRecord>>(LANDING_HERO_STORAGE_KEY);
      setHeroSettings(normalizeHeroSettings(stored));
    };

    window.addEventListener('storage', refreshHeroSettings);
    window.addEventListener(CATALOG_STORAGE_EVENT, refreshHeroSettings);
    window.addEventListener('products-storage-updated', refreshHeroSettings);

    return () => {
      window.removeEventListener('storage', refreshHeroSettings);
      window.removeEventListener(CATALOG_STORAGE_EVENT, refreshHeroSettings);
      window.removeEventListener('products-storage-updated', refreshHeroSettings);
    };
  }, []);

  const openProductPopup = (product: ProductCard) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPopupVisible(false);
    setSelectedPopupImage(product.image);
    setSelectedProduct(product);
  };

  const closeProductPopup = () => {
    setIsPopupVisible(false);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setSelectedProduct(null);
      setSelectedPopupImage(null);
      closeTimerRef.current = null;
    }, POPUP_ANIMATION_MS);
  };

  const updateHotRightNowScrollState = () => {
    const scroller = hotRightNowScrollerRef.current;

    if (!scroller) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    const nextCanScrollLeft = scrollLeft > 4;
    const nextCanScrollRight = scrollLeft + clientWidth < scrollWidth - 4;

    setCanScrollLeft(nextCanScrollLeft);
    setCanScrollRight(nextCanScrollRight);
  };

  const scrollHotRightNow = (direction: 'left' | 'right') => {
    const scroller = hotRightNowScrollerRef.current;

    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>('[data-hot-item]');
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 265;
    const gap = 12;
    const scrollAmount = cardWidth + gap;

    scroller.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const updateExtraLandingScrollState = () => {
    const scroller = extraLandingScrollerRef.current;

    if (!scroller) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    const nextCanScrollLeft = scrollLeft > 4;
    const nextCanScrollRight = scrollLeft + clientWidth < scrollWidth - 4;

    setCanScrollExtraLeft(nextCanScrollLeft);
    setCanScrollExtraRight(nextCanScrollRight);
  };

  const scrollExtraLanding = (direction: 'left' | 'right') => {
    const scroller = extraLandingScrollerRef.current;

    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>('[data-extra-item]');
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 265;
    const gap = 12;
    const scrollAmount = cardWidth + gap;

    scroller.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    updateHotRightNowScrollState();

    const scroller = hotRightNowScrollerRef.current;

    if (!scroller) {
      return;
    }

    const handleScroll = () => updateHotRightNowScrollState();

    scroller.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateHotRightNowScrollState);

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHotRightNowScrollState);
    };
  }, []);

  const hotRightNowProducts = useMemo(() => storedLandingProducts, [storedLandingProducts]);
  const adminLandingLists = useMemo(
    () =>
      storedLists
        .filter((list) => list.visibleOnLanding !== false)
        .map((list) => ({
          ...list,
          // Show products for this list regardless of the product's global `status`.
          // This keeps list visibility independent from product activation state.
          products: storedProducts
            .filter((product) => list.productIds.includes(product.id))
            .map(mapCatalogProductToCard),
        }))
        .filter((list) => list.products.length > 0),
    [storedLists, storedProducts],
  );
  
    const landingCategoryCards = useMemo(() => {
    const hidden = new Set((storedHiddenCategories || []).map((s) => s.toLowerCase()));

    const mapBySlug = new Map<string, { slug: string; name: string; image: string; countLabel: string }>();

    // Show only categories configured by admin; no hardcoded demo category fallback.
    for (const category of storedCategories) {
      if (!category.slug) continue;
      const slugLower = category.slug.toLowerCase();
      if (hidden.has(slugLower)) continue;
      const productCount = storedProducts.filter((product) => product.categoryId === category.id).length;
      mapBySlug.set(slugLower, mapStoredCategoryToLandingCategory(category, `${productCount} item${productCount === 1 ? '' : 's'}`));
    }

    return Array.from(mapBySlug.values());
  }, [storedCategories, storedProducts, storedHiddenCategories]);

  return (
    <main className="min-h-screen w-full min-w-0 bg-[#d7c0ac] text-slate-900">
      <div className="flex min-h-screen w-full flex-col overflow-hidden bg-white">
        <div className="bg-blue-950 px-4 py-1 text-[10px] font-medium text-white/90 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2">
              <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[10px] font-bold uppercase tracking-[0.18em]">{BUSINESS_PROFILE.shopName}</span>
            </p>
            <div className="relative hidden sm:block">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="text-[10px] font-medium text-white/90 hover:text-white transition-colors"
                type="button"
              >
                {language === 'en' ? 'English' : 'اردو'} ▾
              </button>
              {isLanguageMenuOpen && (
                <div className="absolute right-0 top-5 mt-1 w-32 bg-white rounded-md shadow-lg z-50">
                  <button
                    onClick={() => {
                      setLanguage('en');
                      setIsLanguageMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-xs font-medium ${
                      language === 'en'
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-slate-900 hover:bg-slate-100'
                    } rounded-t-md transition-colors`}
                    type="button"
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      setLanguage('ur');
                      setIsLanguageMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-xs font-medium ${
                      language === 'ur'
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-slate-900 hover:bg-slate-100'
                    } rounded-b-md transition-colors`}
                    type="button"
                  >
                    اردو
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <header className="border-b border-slate-100 bg-white px-4 py-2 sm:px-6">
          <nav className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[1.05rem] font-extrabold tracking-tight text-blue-950">
              <span>{BUSINESS_PROFILE.shopName}</span>
            </div>

            <div className="hidden items-center gap-4 pl-5 text-[12px] font-medium text-slate-700 lg:flex">
              <a className="transition-colors hover:text-blue-700" href="#featured">{t('Categories')}</a>
              <a className="transition-colors hover:text-blue-700" href="#grid">{t('Deals')}</a>
              <a className="transition-colors hover:text-blue-700" href="#recent">{t('What\'s New')}</a>
              <a className="transition-colors hover:text-blue-700" href="#support">{t('Delivery')}</a>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <label className="relative hidden items-center md:flex">
                <span className="material-symbols-outlined absolute left-3 text-[15px] text-slate-400">search</span>
                <input
                  type="search"
                  placeholder={t('Search Product')}
                  className="h-9 w-[200px] rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-[12px] outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                />
              </label>
              <Link className="rounded-full border border-blue-950 bg-blue-950 px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-blue-900" href="/login">
                {t('Login')}
              </Link>
            </div>
          </nav>
        </header>

        <div className="flex-1 min-w-0 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-5" id="featured">
            <div className="min-w-0 space-y-5">
              <section className="relative overflow-hidden rounded-[18px] min-h-[420px] sm:min-h-[520px] lg:min-h-[680px] xl:min-h-[760px]" style={{ backgroundColor: heroSettings.backgroundColor }}>
                <img
                  alt="Featured headphones banner"
                  src={heroSettings.imageUrl}
                  className="absolute inset-0 z-0 h-full w-full object-cover object-right"
                />
                <div
                  className="absolute inset-0 z-10"
                  style={{
                    backgroundImage: `linear-gradient(90deg, rgba(11,25,48,${heroSettings.overlayOpacity / 100}) 0%, rgba(11,25,48,${Math.max(heroSettings.overlayOpacity - 20, 0) / 100}) 34%, rgba(11,25,48,0.18) 72%, rgba(11,25,48,0.05) 100%)`,
                  }}
                />
                <div className="relative z-20 flex min-h-[420px] items-center px-5 py-8 sm:min-h-[520px] sm:px-8 sm:py-10 lg:min-h-[680px] lg:px-10 lg:py-12 xl:min-h-[760px]">
                  <div className="max-w-[640px]">
                    <h1 className="max-w-[620px] text-[clamp(2.5rem,4.8vw,5.5rem)] font-extrabold leading-[0.9] tracking-tight text-white">
                      {heroSettings.title}
                    </h1>
                    <a className="mt-6 inline-flex rounded-full bg-blue-950 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-900 sm:mt-7" href={heroSettings.buttonHref}>
                      {heroSettings.buttonText}
                    </a>
                  </div>
                </div>
              </section>

              {/* Filter buttons removed per request */}

              {landingSectionVisibility.hot && hotRightNowProducts.length > 0 ? (
              <section id="grid" className="min-w-0 space-y-4 overflow-hidden max-w-full">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t('What\'s Hot Right Now')}</h2>
                <div className="relative w-full max-w-full min-w-0">
                  {canScrollLeft ? (
                    <button
                      aria-label="Scroll products left"
                      className="absolute left-3 top-[52%] z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-blue-950/70 text-white/85 shadow-lg shadow-blue-950/10 backdrop-blur-md transition-all hover:scale-105 hover:bg-blue-900/85 hover:text-white"
                      type="button"
                      onClick={() => scrollHotRightNow('left')}
                    >
                      <span className="material-symbols-outlined text-[28px]">chevron_left</span>
                    </button>
                  ) : null}
                  {canScrollRight ? (
                    <button
                      aria-label="Scroll products right"
                      className="absolute right-3 top-[52%] z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-blue-950/70 text-white/85 shadow-lg shadow-blue-950/10 backdrop-blur-md transition-all hover:scale-105 hover:bg-blue-900/85 hover:text-white"
                      type="button"
                      onClick={() => scrollHotRightNow('right')}
                    >
                      <span className="material-symbols-outlined text-[28px]">chevron_right</span>
                    </button>
                  ) : null}
                  <div
                    ref={hotRightNowScrollerRef}
                    className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    onScroll={updateHotRightNowScrollState}
                  >
                  <div className="flex flex-nowrap gap-3 pr-1 min-w-max snap-x snap-mandatory">
                    {hotRightNowProducts.map((product, index) => (
                      <article key={`hot-${product.name}-${index}`} data-hot-item className="group w-[265px] shrink-0 rounded-[16px] border border-slate-100 bg-white p-2.5 shadow-[0_10px_22px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(37,99,235,0.10)] snap-start">
                        <div className="group relative aspect-square overflow-hidden rounded-[12px] bg-slate-50">
                          <img alt={product.name} src={product.image} className="absolute inset-0 h-full w-full object-cover opacity-100 transition-all duration-500 group-hover:scale-105 group-hover:opacity-0" />
                          <img alt={`${product.name} alternate view`} src={product.hoverImage} className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" />
                        </div>
                        <div className="px-1 pt-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="line-clamp-2 text-[14px] font-extrabold leading-5 text-slate-900">{product.name}</h3>
                            <p className="shrink-0 text-[19px] font-extrabold leading-none text-slate-900">{formatPrice(product.price)}</p>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{product.caption}</p>
                          <button
                            className="mt-2.5 rounded-full border border-blue-950 bg-blue-950 px-3.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-blue-900"
                            type="button"
                            onClick={() => openProductPopup(product)}
                          >
                            {t('Buy Product')}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  </div>
                </div>
              </section>
              ) : null}

              {landingSectionVisibility.more && adminLandingLists.length > 0 ? (
              <section id="recent" className="min-w-0 space-y-4 overflow-hidden max-w-full">
                <div className="space-y-5">
                  {adminLandingLists.length ? (
                    adminLandingLists.map((list) => (
                      <HorizontalProductScroller
                        key={list.id}
                        heading={list.name}
                        products={list.products}
                        onBuyProduct={openProductPopup}
                      />
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">No admin lists available.</div>
                  )}
                </div>
              </section>
              ) : null}

              

            </div>

            <aside className="space-y-5" id="support">
              <div className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <h3 className="text-base font-extrabold text-slate-900">{t('Popular Categories')}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {landingCategoryCards.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/categories/${category.slug}`}
                      className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-900"
                    >
                      <img
                        src={category.image}
                        alt={category.name}
                        className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/35 to-transparent" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2.5 text-center">
                        <p className="text-[0.98rem] font-extrabold text-white">{category.name}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100">{category.countLabel}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                {landingCategoryCards.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No categories added yet.</p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>

        <footer className="border-t border-blue-900/20 bg-[linear-gradient(120deg,#0f1e3a_0%,#102f68_55%,#17408d_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">{BUSINESS_PROFILE.shopName}</p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{t('Shop Smarter')}</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-blue-100/95">{t('Premium audio')}</p>
            </div>

            <div>
              <p className="text-sm font-bold text-white">{t('Quick Links')}</p>
              <div className="mt-3 grid gap-2 text-sm text-blue-100">
                <a className="transition-colors hover:text-white" href="#grid">{t('Products')}</a>
                <a className="transition-colors hover:text-white" href="#featured">{t('Categories')}</a>
                <a className="transition-colors hover:text-white" href="#support">{t('Support')}</a>
                <Link className="transition-colors hover:text-white" href="/login">{t('Login')}</Link>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-white">{t('Contact')}</p>
              <div className="mt-3 grid gap-2 text-sm text-blue-100">
                <p>{t('Email')}: {BUSINESS_PROFILE.email}</p>
                <p>{t('Phone')}: {BUSINESS_PROFILE.contactNumber}</p>
                <p>{t('Hours')}</p>
              </div>
            </div>
          </div>

          <div className="mt-7 border-t border-white/15 pt-4 text-xs text-blue-100">
            <p>© {new Date().getFullYear()} Abdul Hakeem Shah. {t('All rights')} </p>
          </div>
        </footer>

        {selectedProduct && typeof document !== 'undefined'
          ? createPortal(
              <div
                className={`fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-slate-950/45 px-2 py-2 transition-opacity duration-200 sm:px-3 sm:py-4 ${isPopupVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={closeProductPopup}
              >
                <div
                  className={`flex w-[min(96vw,660px)] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_22px_52px_rgba(15,23,42,0.20)] transition-all duration-200 sm:w-[min(92vw,720px)] sm:rounded-[18px] lg:w-[min(82vw,780px)] ${isPopupVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.97] opacity-0'}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {(() => {
                    const catalogProduct = storedProducts.find((p) => p.name === selectedProduct.name);
                    const category = catalogProduct ? storedCategories.find((c) => c.id === catalogProduct.categoryId) : null;
                    const categoryName = category?.name || 'Product';
                    const productImages = (catalogProduct?.imageUrls ?? []).filter((url) => url?.trim());
                    
                    return (
                      <div className="grid grid-cols-[0.92fr_1.08fr] gap-0 overflow-hidden items-stretch">
                        <div className="bg-[#fafafa] p-3 sm:p-3 md:p-3.5 lg:p-4">
                          <div className="rounded-[14px] bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.05)] sm:rounded-[18px] sm:p-3.5 md:p-4">
                            <img alt={selectedProduct.name} src={selectedPopupImage ?? selectedProduct.image} className="h-[112px] w-full rounded-[12px] object-contain sm:h-[168px] sm:rounded-[14px] md:h-[188px] lg:h-[204px]" />
                          </div>

                          {productImages.length > 0 && (
                            <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:mt-2 sm:gap-2.5">
                              {productImages.map((imageUrl, index) => (
                                <button
                                  key={`popup-thumb-${selectedProduct.name}-${index}`}
                                  type="button"
                                  onClick={() => setSelectedPopupImage(imageUrl)}
                                  className={`overflow-hidden rounded-[11px] border bg-white p-1 transition-all sm:rounded-[12px] sm:p-1.5 ${selectedPopupImage === imageUrl ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-100 hover:border-blue-200 hover:ring-1 hover:ring-blue-100'}`}
                                >
                                  <img alt={`${selectedProduct.name} view ${index + 1}`} src={imageUrl} className="h-8 w-full object-contain sm:h-11.5 md:h-13" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex min-h-0 flex-col justify-between overflow-hidden bg-white p-3 sm:p-3 md:p-3.5 lg:p-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-slate-500">{categoryName}</p>
                                <h2 className="mt-1 text-[1.2rem] font-extrabold tracking-tight text-slate-900 sm:text-[1.4rem] md:text-[1.62rem]">{selectedProduct.name}</h2>
                              </div>
                            </div>

                            <p className="max-w-sm text-[9.5px] leading-5 text-slate-600 sm:text-[10.5px] sm:leading-6">
                              {selectedProduct.caption}
                            </p>

                            <div className="border-t border-slate-100 pt-3 sm:pt-4">
                              <p className="text-[1.42rem] font-extrabold text-blue-900 sm:text-[1.62rem] md:text-[1.82rem]">{formatPrice(selectedProduct.price)}</p>
                              <p className="mt-1.5 text-[8.5px] text-slate-500 sm:text-[9.5px]">Click Buy Now to contact admin</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-row gap-2 sm:mt-5">
                            <button className="flex-1 rounded-full bg-blue-950 px-5 py-2.5 text-[10px] font-bold text-white transition-colors hover:bg-blue-900 sm:px-6 sm:py-3 sm:text-[11px]" type="button">
                              Buy Now
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    </main>
  );
}
