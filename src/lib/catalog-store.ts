export const CATALOG_CATEGORIES_STORAGE_KEY = 'fs-communication:product-categories';
export const CATALOG_PRODUCTS_STORAGE_KEY = 'fs-communication:products';
export const CATALOG_LISTS_STORAGE_KEY = 'fs-communication:product-lists';
export const CATALOG_SELECTED_LIST_KEY = 'fs-communication:selected-list';
export const LANDING_HERO_STORAGE_KEY = 'fs-communication:landing-hero';
export const LANDING_SECTION_VISIBILITY_STORAGE_KEY = 'fs-communication:landing-section-visibility';
export const CATALOG_STORAGE_EVENT = 'products-storage-updated';
export const CATALOG_HIDDEN_CATEGORIES_KEY = 'fs-communication:hidden-categories';

export type CatalogCategoryRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
};

export type CatalogProductRecord = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  bio: string;
  imageUrls: string[];
  price: number;
  costPrice: number;
  stock: number;
  status: 'active' | 'draft';
  showOnLanding: boolean;
  showOnExtraLanding: boolean;
  showOnSecondaryLanding: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LandingHeroSettingsRecord = {
  title: string;
  buttonText: string;
  buttonHref: string;
  imageUrl: string;
  backgroundColor: string;
  overlayOpacity: number;
};

export type LandingSectionVisibilityRecord = {
  hot: boolean;
  more: boolean;
};

export type CatalogListRecord = {
  id: string;
  name: string;
  productIds: string[];
  createdAt: string;
  // If false, this list is hidden on the landing page. Defaults to true when omitted.
  visibleOnLanding?: boolean;
};

export const defaultLandingHeroSettings: LandingHeroSettingsRecord = {
  title: 'Grab upto 50% Off On Selected Headphone',
  buttonText: 'Buy Now',
  buttonHref: '#grid',
  imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1600&q=80',
  backgroundColor: '#f4ede3',
  overlayOpacity: 82,
};

export function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function readStoredArray<T>(storageKey: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function readStoredValue<T>(storageKey: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStoredArray<T>(storageKey: string, value: T[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(storageKey, JSON.stringify(value));
  // Also write a changing timestamp to force a storage event in other tabs
  try {
    window.localStorage.setItem('fs-communication:last-updated', String(Date.now()));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CATALOG_STORAGE_EVENT));
}

export function writeStoredValue<T>(storageKey: string, value: T) {
  if (typeof window === 'undefined') return;


  window.localStorage.setItem(storageKey, JSON.stringify(value));
  // Also write a changing timestamp to force a storage event in other tabs
  try {
    window.localStorage.setItem('fs-communication:last-updated', String(Date.now()));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CATALOG_STORAGE_EVENT));
}
