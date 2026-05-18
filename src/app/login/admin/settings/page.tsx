'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminShell } from '../../../../components/admin-shell';
import { LEDGER_STORAGE_EVENT } from '../../../../lib/ledger-store';
import { STAFF_ACCESS_META_KEY, STAFF_AUTH_EVENT } from '../../../../lib/staff-auth';

const ADMIN_SETTINGS_STORAGE_KEY = 'fs-communication:admin-settings';
const PRODUCTS_EVENT = 'products-storage-updated';

const BACKUP_KEYS = [
  'fs-communication:sales-bills',
  'fs-communication:purchases',
  'fs-communication:manual-payments',
  'fs-communication:products',
  'fs-communication:product-categories',
  'fs-communication:staff-accounts',
  'fs-communication:staff-session',
  'fs-communication:admin-session',
  STAFF_ACCESS_META_KEY,
  ADMIN_SETTINGS_STORAGE_KEY,
] as const;

type AdminSettings = {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  salesPrefix: string;
  purchasePrefix: string;
  paymentPrefix: string;
};

type BackupFile = {
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
};

const cardClass = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm';

const defaultSettings = (): AdminSettings => ({
  businessName: 'FS Communication',
  businessPhone: '',
  businessEmail: '',
  businessAddress: '',
  salesPrefix: 'INV',
  purchasePrefix: 'PUR',
  paymentPrefix: 'PAY',
});

const normalizePrefix = (value: string) => value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8);

const readSettings = (): AdminSettings => {
  if (typeof window === 'undefined') return defaultSettings();

  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;

    return {
      businessName: (parsed.businessName ?? 'FS Communication').trim() || 'FS Communication',
      businessPhone: (parsed.businessPhone ?? '').trim(),
      businessEmail: (parsed.businessEmail ?? '').trim(),
      businessAddress: (parsed.businessAddress ?? '').trim(),
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
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings());
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  const update = (key: keyof AdminSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const applySave = () => {
    setErrorText(null);
    const cleaned: AdminSettings = {
      businessName: settings.businessName.trim() || 'FS Communication',
      businessPhone: settings.businessPhone.trim(),
      businessEmail: settings.businessEmail.trim(),
      businessAddress: settings.businessAddress.trim(),
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
    if (typeof window === 'undefined') return;

    const data: Record<string, string> = {};
    BACKUP_KEYS.forEach((key) => {
      const value = window.localStorage.getItem(key);
      if (value !== null) data[key] = value;
    });

    const payload: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fs-communication-backup-${payload.exportedAt.slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice('Backup downloaded.');
    setErrorText(null);
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || typeof window === 'undefined') return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<BackupFile>;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.data !== 'object' || parsed.data === null) {
        throw new Error('Invalid backup file.');
      }

      for (const [key, value] of Object.entries(parsed.data)) {
        if (BACKUP_KEYS.includes(key as (typeof BACKUP_KEYS)[number]) && typeof value === 'string') {
          window.localStorage.setItem(key, value);
        }
      }

      setSettings(readSettings());
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event(LEDGER_STORAGE_EVENT));
      window.dispatchEvent(new Event(PRODUCTS_EVENT));
      window.dispatchEvent(new Event(STAFF_AUTH_EVENT));

      setNotice('Backup imported successfully.');
      setErrorText(null);
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
              <p className="mt-1 text-xs text-slate-500">Export or restore app data, including staff and product records.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportBackup}
                className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
              >
                Export backup
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
