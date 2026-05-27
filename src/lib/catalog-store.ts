import { emitAppActionSuccess, type AppWriteOptions } from './app-feedback';

export const CATALOG_CATEGORIES_STORAGE_KEY = 'fs-communication:product-categories';
export const CATALOG_PRODUCTS_STORAGE_KEY = 'fs-communication:products';
export const CATALOG_LISTS_STORAGE_KEY = 'fs-communication:product-lists';
export const CATALOG_SELECTED_LIST_KEY = 'fs-communication:selected-list';
export const LANDING_HERO_STORAGE_KEY = 'fs-communication:landing-hero';
export const LANDING_SECTION_VISIBILITY_STORAGE_KEY = 'fs-communication:landing-section-visibility';
export const CATALOG_STORAGE_EVENT = 'products-storage-updated';
export const CATALOG_HIDDEN_CATEGORIES_KEY = 'fs-communication:hidden-categories';

const CATALOG_SYNC_KEYS = new Set([
  CATALOG_CATEGORIES_STORAGE_KEY,
  CATALOG_PRODUCTS_STORAGE_KEY,
  CATALOG_LISTS_STORAGE_KEY,
  CATALOG_SELECTED_LIST_KEY,
  LANDING_HERO_STORAGE_KEY,
  LANDING_SECTION_VISIBILITY_STORAGE_KEY,
  CATALOG_HIDDEN_CATEGORIES_KEY,
]);

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
  title: 'Explore Premium Mobile Accessories',
  buttonText: 'Shop Now',
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

export function parseStoredArray<T>(rawValue: string | null | undefined): T[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
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

export function parseStoredValue<T>(rawValue: string | null | undefined): T | null {
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function syncCatalogSnapshot(storageKey: string, value: string | null) {
  if (typeof window === 'undefined') return;
  if (!CATALOG_SYNC_KEYS.has(storageKey)) return;

  void fetch('/api/catalog-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify({ key: storageKey, value }),
  }).catch(() => null);
}
export function writeStoredArray<T>(storageKey: string, value: T[], options?: AppWriteOptions) {
  if (typeof window === 'undefined') return;

  const serialized = JSON.stringify(value);
  window.localStorage.setItem(storageKey, serialized);
  syncCatalogSnapshot(storageKey, serialized);
  // Also write a changing timestamp to force a storage event in other tabs
  try {
    window.localStorage.setItem('fs-communication:last-updated', String(Date.now()));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CATALOG_STORAGE_EVENT));
  if (!options?.silent) emitAppActionSuccess(storageKey);
}

export function writeStoredValue<T>(storageKey: string, value: T, options?: AppWriteOptions) {
  if (typeof window === 'undefined') return;


  const serialized = JSON.stringify(value);
  window.localStorage.setItem(storageKey, serialized);
  syncCatalogSnapshot(storageKey, serialized);
  // Also write a changing timestamp to force a storage event in other tabs
  try {
    window.localStorage.setItem('fs-communication:last-updated', String(Date.now()));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CATALOG_STORAGE_EVENT));
  if (!options?.silent) emitAppActionSuccess(storageKey);
}
