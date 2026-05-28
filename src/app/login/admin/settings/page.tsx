'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../../components/admin-shell';
import { LEDGER_STORAGE_EVENT } from '../../../../lib/ledger-store';
import { STAFF_ACCESS_META_KEY, STAFF_AUTH_EVENT, hasAdminSession, readStaffSession } from '../../../../lib/staff-auth';
import { BUSINESS_PROFILE } from '../../../../lib/business-profile';
import {
  CATALOG_CATEGORIES_STORAGE_KEY,
  CATALOG_HIDDEN_CATEGORIES_KEY,
  CATALOG_LISTS_STORAGE_KEY,
  CATALOG_PRODUCTS_STORAGE_KEY,
  CATALOG_SELECTED_LIST_KEY,
  LANDING_HERO_STORAGE_KEY,
  LANDING_SECTION_VISIBILITY_STORAGE_KEY,
} from '../../../../lib/catalog-store';
import {
  MANUAL_PAYMENTS_STORAGE_KEY,
  PURCHASES_STORAGE_KEY,
  SALES_BILLS_STORAGE_KEY,
} from '../../../../lib/ledger-store';
import {
  ADMIN_SESSION_STORAGE_KEY,
  STAFF_ACCOUNTS_STORAGE_KEY,
  STAFF_SESSION_STORAGE_KEY,
} from '../../../../lib/staff-auth';
import { useAppFeedback } from '../../../../components/app-feedback';

const ADMIN_SETTINGS_STORAGE_KEY = 'fs-communication:admin-settings';
const DASHBOARD_METRICS_STORAGE_KEY = 'fs-communication:dashboard-metrics';
const ADMIN_SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';
const LANDING_LANGUAGE_KEY = 'landing-language';
const LAST_UPDATED_KEY = 'fs-communication:last-updated';
const PRODUCTS_EVENT = 'products-storage-updated';

type AdminSettings = {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  salesPrefix: string;
  purchasePrefix: string;
  paymentPrefix: string;
};

type BackupItem = {
  key: string;
  label: string;
  rawValue: string;
  parsedValue: unknown;
};

type BackupFile = {
  version: 2;
  exportedAt: string;
  generatedBy: string;
  notes: string;
  items: BackupItem[];
  rawStorage: Record<string, string>;
};

const cardClass = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm';

const defaultSettings = (): AdminSettings => ({
  businessName: BUSINESS_PROFILE.shopName,
  businessPhone: BUSINESS_PROFILE.contactNumber,
  businessEmail: BUSINESS_PROFILE.email,
  businessAddress: BUSINESS_PROFILE.address,
  salesPrefix: 'INV',
  purchasePrefix: 'PUR',
  paymentPrefix: 'PAY',
});

const normalizePrefix = (value: string) => value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8);
const legacyBusinessNames = new Set(['FS Communication', 'FS COMMUNICATION']);

const backupLabelMap: Record<string, string> = {
  [CATALOG_CATEGORIES_STORAGE_KEY]: 'Product categories',
  [CATALOG_PRODUCTS_STORAGE_KEY]: 'Products',
  [CATALOG_LISTS_STORAGE_KEY]: 'Product lists',
  [CATALOG_SELECTED_LIST_KEY]: 'Selected product list',
  [LANDING_HERO_STORAGE_KEY]: 'Landing hero content',
  [LANDING_SECTION_VISIBILITY_STORAGE_KEY]: 'Landing section visibility',
  [CATALOG_HIDDEN_CATEGORIES_KEY]: 'Hidden categories',
  [DASHBOARD_METRICS_STORAGE_KEY]: 'Dashboard metrics',
  [SALES_BILLS_STORAGE_KEY]: 'Sales invoices',
  [PURCHASES_STORAGE_KEY]: 'Purchases',
  [MANUAL_PAYMENTS_STORAGE_KEY]: 'Manual payments',
  [STAFF_ACCOUNTS_STORAGE_KEY]: 'Staff accounts',
  [STAFF_SESSION_STORAGE_KEY]: 'Staff session',
  [ADMIN_SESSION_STORAGE_KEY]: 'Admin session',
  [STAFF_ACCESS_META_KEY]: 'Staff access permissions',
  [ADMIN_SETTINGS_STORAGE_KEY]: 'Admin settings',
  [ADMIN_SIDEBAR_COLLAPSED_KEY]: 'Sidebar collapsed preference',
  [LANDING_LANGUAGE_KEY]: 'Landing language',
  [LAST_UPDATED_KEY]: 'Last updated marker',
};

const backupKeyOrder = [
  CATALOG_CATEGORIES_STORAGE_KEY,
  CATALOG_PRODUCTS_STORAGE_KEY,
  CATALOG_LISTS_STORAGE_KEY,
  CATALOG_SELECTED_LIST_KEY,
  LANDING_HERO_STORAGE_KEY,
  LANDING_SECTION_VISIBILITY_STORAGE_KEY,
  CATALOG_HIDDEN_CATEGORIES_KEY,
  DASHBOARD_METRICS_STORAGE_KEY,
  SALES_BILLS_STORAGE_KEY,
  PURCHASES_STORAGE_KEY,
  MANUAL_PAYMENTS_STORAGE_KEY,
  STAFF_ACCOUNTS_STORAGE_KEY,
  STAFF_SESSION_STORAGE_KEY,
  ADMIN_SESSION_STORAGE_KEY,
  STAFF_ACCESS_META_KEY,
  ADMIN_SETTINGS_STORAGE_KEY,
  ADMIN_SIDEBAR_COLLAPSED_KEY,
  LANDING_LANGUAGE_KEY,
  LAST_UPDATED_KEY,
] as const;

const describeBackupKey = (key: string) => backupLabelMap[key] ?? key;

const tryParseStoredValue = (rawValue: string) => {
  try {
    return JSON.parse(rawValue);
  } catch {
    try {
      const binary = window.atob(rawValue);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return rawValue;
    }
  }
};

const serializeBackupValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
};

const normalizeSettings = (parsed: Partial<AdminSettings> | null | undefined): AdminSettings => {
  const businessName = (parsed?.businessName ?? BUSINESS_PROFILE.shopName).trim();

  return {
    businessName: !businessName || legacyBusinessNames.has(businessName) ? BUSINESS_PROFILE.shopName : businessName,
    businessPhone: (parsed?.businessPhone ?? BUSINESS_PROFILE.contactNumber).trim() || BUSINESS_PROFILE.contactNumber,
    businessEmail: (parsed?.businessEmail ?? BUSINESS_PROFILE.email).trim() || BUSINESS_PROFILE.email,
    businessAddress: (parsed?.businessAddress ?? BUSINESS_PROFILE.address).trim() || BUSINESS_PROFILE.address,
    salesPrefix: normalizePrefix(parsed?.salesPrefix ?? 'INV') || 'INV',
    purchasePrefix: normalizePrefix(parsed?.purchasePrefix ?? 'PUR') || 'PUR',
    paymentPrefix: normalizePrefix(parsed?.paymentPrefix ?? 'PAY') || 'PAY',
  };
};

const loadSettings = async (): Promise<AdminSettings> => {
  try {
    const response = await fetch('/api/settings', { cache: 'no-store', credentials: 'include' });
    if (!response.ok) return defaultSettings();

    const data = (await response.json()) as { settings?: Partial<AdminSettings> | null };
    return normalizeSettings(data.settings ?? null);
  } catch {
    return defaultSettings();
  }
};

const saveSettings = async (settings: AdminSettings) => {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify({ settings }),
  });

  window.dispatchEvent(new Event('admin-settings-updated'));
  void fetch('/api/revalidate-site', { method: 'POST', cache: 'no-store', credentials: 'include' }).catch(() => null);
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { withLoading } = useAppFeedback();
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings());
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    const updateAccess = () => {
      const allowed = hasAdminSession();
      setAccessState(allowed ? 'allowed' : 'denied');

      if (!allowed) {
        router.replace('/login');
      }
    };

    updateAccess();
    window.addEventListener('storage', updateAccess);
    window.addEventListener(STAFF_AUTH_EVENT, updateAccess as EventListener);

    return () => {
      window.removeEventListener('storage', updateAccess);
      window.removeEventListener(STAFF_AUTH_EVENT, updateAccess as EventListener);
    };
  }, [router]);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  if (accessState !== 'allowed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">No Access</p>
          <p className="mt-2 text-slate-600">This section is admin only.</p>
        </div>
      </div>
    );
  }

  const update = (key: keyof AdminSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const applySave = () => {
    setErrorText(null);
    const cleaned: AdminSettings = {
      businessName: settings.businessName.trim() || BUSINESS_PROFILE.shopName,
      businessPhone: settings.businessPhone.trim() || BUSINESS_PROFILE.contactNumber,
      businessEmail: settings.businessEmail.trim() || BUSINESS_PROFILE.email,
      businessAddress: settings.businessAddress.trim() || BUSINESS_PROFILE.address,
      salesPrefix: normalizePrefix(settings.salesPrefix) || 'INV',
      purchasePrefix: normalizePrefix(settings.purchasePrefix) || 'PUR',
      paymentPrefix: normalizePrefix(settings.paymentPrefix) || 'PAY',
    };

    setSettings(cleaned);
    void saveSettings(cleaned);
    setNotice('Settings saved.');
  };

  const resetDefaults = () => {
    const defaults = defaultSettings();
    setSettings(defaults);
    void saveSettings(defaults);
    setNotice('Settings reset to defaults.');
    setErrorText(null);
  };
  

  return (
    <AdminShell active="settings" title="Settings">
      <div className="space-y-3">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
            <h2 className="text-lg font-bold text-white">Admin Settings</h2>
            <p className="text-xs text-blue-100">Only core controls that are not managed in Staff, Products, or other modules.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={applySave}
              className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={resetDefaults}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Reset defaults
            </button>
            {notice ? <p className="text-xs font-semibold text-emerald-700">{notice}</p> : null}
            {errorText ? <p className="text-xs font-semibold text-rose-700">{errorText}</p> : null}
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className={cardClass}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Business Identity</p>
            <div className="mt-3 grid gap-3">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">Business name</span>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(event) => update('businessName', event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">Phone</span>
                <input
                  type="text"
                  value={settings.businessPhone}
                  onChange={(event) => update('businessPhone', event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">Email</span>
                <input
                  type="email"
                  value={settings.businessEmail}
                  onChange={(event) => update('businessEmail', event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">Address</span>
                <textarea
                  value={settings.businessAddress}
                  onChange={(event) => update('businessAddress', event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Optional"
                />
              </label>
            </div>
          </div>

          <div className={cardClass}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Invoice Number Prefixes</p>
            <p className="mt-1 text-xs text-slate-500">Used for sales, purchases, and manual payments only.</p>
            <div className="mt-3 grid gap-3">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">Sales prefix</span>
                <input
                  type="text"
                  value={settings.salesPrefix}
                  onChange={(event) => update('salesPrefix', normalizePrefix(event.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold tracking-wide text-slate-800 outline-none focus:border-blue-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">Purchase prefix</span>
                <input
                  type="text"
                  value={settings.purchasePrefix}
                  onChange={(event) => update('purchasePrefix', normalizePrefix(event.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold tracking-wide text-slate-800 outline-none focus:border-blue-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">Payment prefix</span>
                <input
                  type="text"
                  value={settings.paymentPrefix}
                  onChange={(event) => update('paymentPrefix', normalizePrefix(event.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold tracking-wide text-slate-800 outline-none focus:border-blue-500"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Backup/import removed — site is online-only and server-authoritative */}
      </div>
    </AdminShell>
  );
}
