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

const readSettings = (): AdminSettings => {
  if (typeof window === 'undefined') return defaultSettings();

  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;

    const businessName = (parsed.businessName ?? BUSINESS_PROFILE.shopName).trim();

    return {
      businessName: !businessName || legacyBusinessNames.has(businessName) ? BUSINESS_PROFILE.shopName : businessName,
      businessPhone: (parsed.businessPhone ?? BUSINESS_PROFILE.contactNumber).trim() || BUSINESS_PROFILE.contactNumber,
      businessEmail: (parsed.businessEmail ?? BUSINESS_PROFILE.email).trim() || BUSINESS_PROFILE.email,
      businessAddress: (parsed.businessAddress ?? BUSINESS_PROFILE.address).trim() || BUSINESS_PROFILE.address,
      salesPrefix: normalizePrefix(parsed.salesPrefix ?? 'INV') || 'INV',
      purchasePrefix: normalizePrefix(parsed.purchasePrefix ?? 'PUR') || 'PUR',
      paymentPrefix: normalizePrefix(parsed.paymentPrefix ?? 'PAY') || 'PAY',
    };
  } catch {
    return defaultSettings();
  }
};

const saveSettings = (settings: AdminSettings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
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
      const staffSession = readStaffSession();
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
    setSettings(readSettings());
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
    saveSettings(cleaned);
    setNotice('Settings saved.');
  };

  const resetDefaults = () => {
    const defaults = defaultSettings();
    setSettings(defaults);
    saveSettings(defaults);
    setNotice('Settings reset to defaults.');
    setErrorText(null);
  };

  const exportBackup = () => {
    void withLoading(
      async () => {
        if (typeof window === 'undefined') return;

        const keys = new Set<string>();
        for (let index = 0; index < window.localStorage.length; index += 1) {
          const key = window.localStorage.key(index);
          if (key) keys.add(key);
        }

        backupKeyOrder.forEach((key) => keys.add(key));

        const items = Array.from(keys)
          .sort((left, right) => {
            const leftIndex = backupKeyOrder.indexOf(left as (typeof backupKeyOrder)[number]);
            const rightIndex = backupKeyOrder.indexOf(right as (typeof backupKeyOrder)[number]);

            if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
            if (leftIndex === -1) return 1;
            if (rightIndex === -1) return -1;
            return leftIndex - rightIndex;
          })
          .map((key) => {
            const rawValue = window.localStorage.getItem(key) ?? '';

            return {
              key,
              label: describeBackupKey(key),
              rawValue,
              parsedValue: tryParseStoredValue(rawValue),
            } satisfies BackupItem;
          });

        const payload: BackupFile = {
          version: 2,
          exportedAt: new Date().toISOString(),
          generatedBy: 'FS Mobile Accessories Settings Backup',
          notes:
            'This file contains readable app data for products, sales, purchases, payments, staff, settings, and layout preferences. It can be restored even after a site crash.',
          items,
          rawStorage: Object.fromEntries(items.map((item) => [item.key, item.rawValue])),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `fs-communication-backup-${payload.exportedAt.slice(0, 10)}.json`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        setNotice('Full backup downloaded.');
        setErrorText(null);
      },
      { loadingLabel: 'Preparing backup...', successMessage: 'Backup downloaded' },
    );
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || typeof window === 'undefined') return;

    try {
      await withLoading(
        async () => {
          const text = await file.text();
          const parsed = JSON.parse(text) as Partial<BackupFile> & {
            data?: Record<string, string>;
          };

          const nextStorage = new Map<string, string>();

          if (parsed.rawStorage && typeof parsed.rawStorage === 'object') {
            for (const [key, value] of Object.entries(parsed.rawStorage)) {
              if (typeof value === 'string') {
                nextStorage.set(key, value);
              }
            }
          } else if (Array.isArray(parsed.items)) {
            for (const item of parsed.items) {
              if (item && typeof item.key === 'string') {
                nextStorage.set(item.key, typeof item.rawValue === 'string' ? item.rawValue : serializeBackupValue(item.parsedValue));
              }
            }
          } else if (parsed.data && typeof parsed.data === 'object') {
            for (const [key, value] of Object.entries(parsed.data)) {
              if (typeof value === 'string') {
                nextStorage.set(key, value);
              }
            }
          } else {
            throw new Error('Invalid backup file.');
          }

          nextStorage.forEach((value, key) => {
            window.localStorage.setItem(key, value);
          });

          setSettings(readSettings());
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event(LEDGER_STORAGE_EVENT));
          window.dispatchEvent(new Event(PRODUCTS_EVENT));
          window.dispatchEvent(new Event(STAFF_AUTH_EVENT));
          window.dispatchEvent(new Event('admin-settings-updated'));
          void fetch('/api/revalidate-site', { method: 'POST', cache: 'no-store', credentials: 'include' }).catch(() => null);

          setNotice('Backup imported successfully.');
          setErrorText(null);
        },
        { loadingLabel: 'Importing backup...', successMessage: 'Backup imported' },
      );
    } catch {
      setErrorText('Import failed. Use a valid backup file from this app.');
      setNotice(null);
    }
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

        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Data Backup</p>
              <p className="mt-1 text-xs text-slate-500">Export or restore all app data, including products, sales, purchases, payments, staff, settings, and layout preferences.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportBackup}
                className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
              >
                Export full backup
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Import backup
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={importBackup}
                className="hidden"
              />
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
