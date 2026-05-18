'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../../../../components/admin-shell';
import { StaffAccountManager } from '../../../../components/staff-account-manager';
import {
	STAFF_AUTH_EVENT,
	readStaffAccounts,
	readStaffAccessMetaMap,
	writeStaffAccessMetaMap,
	createDefaultStaffAccessMeta,
	getStaffAccessMetaKey,
	type StaffAccount,
	type StaffAccessMeta,
	type StaffAccessMetaMap,
} from '../../../../lib/staff-auth';

const MODULE_KEYS = ['sales', 'purchases', 'payments', 'parties', 'reports'] as const;

type AccessLevel = 'none' | 'view' | 'edit';
type ModuleKey = (typeof MODULE_KEYS)[number];

type StaffAccessMeta = {
	role: 'cashier' | 'sales' | 'inventory' | 'supervisor';
	status: 'active' | 'suspended';
	permissions: Record<ModuleKey, AccessLevel>;
	lastUpdatedAt: string;
};

type StaffAccessMetaMap = Record<string, StaffAccessMeta>;

const cardClass = 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm';
const moduleGridClass = 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function defaultPermissions(): Record<ModuleKey, AccessLevel> {
	return {
		sales: 'view',
		purchases: 'view',
		payments: 'view',
		parties: 'none',
		reports: 'none',
	};
}

function createDefaultMeta(): StaffAccessMeta {
	return createDefaultStaffAccessMeta();
}

function readMetaMap(): StaffAccessMetaMap {
	return readStaffAccessMetaMap();
}

function saveMetaMap(value: StaffAccessMetaMap) {
	writeStaffAccessMetaMap(value);
}

const toLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatCreatedDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	}).format(new Date(value));

export default function AdminStaffPage() {
	const [accounts, setAccounts] = useState<StaffAccount[]>([]);
	const [metaMap, setMetaMap] = useState<StaffAccessMetaMap>({});
	const [searchText, setSearchText] = useState('');
	const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

	useEffect(() => {
		const refresh = () => {
			const staffAccounts = readStaffAccounts();
			const currentMeta = readMetaMap();

			const normalizedMeta: StaffAccessMetaMap = { ...currentMeta };
			
			// Remove entries for accounts that no longer exist
			Object.keys(normalizedMeta).forEach((key) => {
				const hasAccount = staffAccounts.some((account) => getStaffAccessMetaKey(account) === key || account.id === key);
				if (!hasAccount) {
					delete normalizedMeta[key];
				}
			});

			// Ensure all accounts have metadata
			staffAccounts.forEach((account) => {
				const accountKey = getStaffAccessMetaKey(account);
				if (!normalizedMeta[accountKey]) {
					normalizedMeta[accountKey] = currentMeta[accountKey] ?? currentMeta[account.id] ?? createDefaultMeta();
				}
			});

			const changed = JSON.stringify(normalizedMeta) !== JSON.stringify(currentMeta);
			if (changed) {
				saveMetaMap(normalizedMeta);
			}

			setAccounts(staffAccounts);
			setMetaMap(normalizedMeta);
		};

		refresh();

		const onChange: EventListener = () => refresh();
		window.addEventListener('storage', onChange);
		window.addEventListener(STAFF_AUTH_EVENT, onChange);

		return () => {
			window.removeEventListener('storage', onChange);
			window.removeEventListener(STAFF_AUTH_EVENT, onChange);
		};
	}, []);

	const updateMeta = (accountKey: string, updater: (existing: StaffAccessMeta) => StaffAccessMeta) => {
		setMetaMap((current) => {
			const existing = current[accountKey] ?? createDefaultMeta();
			const updated = updater(existing);
			const next = {
				...current,
				[accountKey]: {
					...updated,
					lastUpdatedAt: new Date().toISOString(),
				},
			};
			saveMetaMap(next);
			return next;
		});
	};

	const filteredAccounts = useMemo(() => {
		const q = searchText.trim().toLowerCase();
		if (!q) return accounts;
		return accounts.filter((account) => `${account.name} ${account.username}`.toLowerCase().includes(q));
	}, [accounts, searchText]);

	const activeCount = useMemo(
		() => accounts.filter((account) => (metaMap[account.id] ?? createDefaultMeta()).status === 'active').length,
		[accounts, metaMap],
	);

	const suspendedCount = useMemo(
		() => accounts.filter((account) => (metaMap[account.id] ?? createDefaultMeta()).status === 'suspended').length,
		[accounts, metaMap],
	);

	const forceLogout = (accountId: string) => {
		if (typeof window === 'undefined') return;
		try {
			const rawSession = window.localStorage.getItem(STAFF_SESSION_STORAGE_KEY);
			if (!rawSession) return;
			const session = JSON.parse(rawSession) as { id?: string };
			if (session?.id === accountId) {
				window.localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
				window.dispatchEvent(new Event(STAFF_AUTH_EVENT));
			}
		} catch {
			// noop
		}
	};

	const toggleExpand = (accountId: string) => {
		setExpandedAccountId((current) => (current === accountId ? null : accountId));
	};

	const deleteAccount = (accountId: string) => {
		if (typeof window === 'undefined') return;
		const confirmed = window.confirm('Delete this staff user? This action cannot be undone.');
		if (!confirmed) return;

		try {
			const rawAccounts = window.localStorage.getItem(STAFF_ACCOUNTS_STORAGE_KEY);
			const parsedAccounts = rawAccounts ? (JSON.parse(rawAccounts) as StaffAccount[]) : [];
			const filtered = parsedAccounts.filter((account) => account.id !== accountId);
			window.localStorage.setItem(STAFF_ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));

			setMetaMap((current) => {
				const next = { ...current };
				delete next[accountId];
				saveMetaMap(next);
				return next;
			});

			forceLogout(accountId);
			setExpandedAccountId((current) => (current === accountId ? null : current));
			window.dispatchEvent(new Event(STAFF_AUTH_EVENT));
		} catch {
			// noop
		}
	};

	return (
		<AdminShell active="staff" title="Staff">
			<div className="space-y-3">
				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700 p-4">
						<h2 className="text-lg font-bold text-white">Staff Management</h2>
					</div>
					<div className="grid gap-3 p-4 md:grid-cols-3">
						<div className={cardClass}>
							<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total staff</p>
							<p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{accounts.length}</p>
						</div>
						<div className={cardClass}>
							<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Active</p>
							<p className="mt-1 text-2xl font-extrabold tracking-tight text-emerald-700">{activeCount}</p>
						</div>
						<div className={cardClass}>
							<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Suspended</p>
							<p className="mt-1 text-2xl font-extrabold tracking-tight text-rose-700">{suspendedCount}</p>
						</div>
					</div>
				</section>

				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="p-4">
						<StaffAccountManager />
					</div>
				</section>

				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h3 className="text-sm font-bold text-slate-900">Access Controls</h3>
							<label htmlFor="staff-search" className="w-full max-w-xs">
								<span className="sr-only">Search staff</span>
								<input
									id="staff-search"
									type="text"
									value={searchText}
									onChange={(event) => setSearchText(event.target.value)}
									placeholder="Search by name or username"
									className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-blue-500"
								/>
							</label>
						</div>
					</div>
					<div className="space-y-3 p-4">
						<div className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-2 md:grid md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center md:gap-2">
							<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Name</p>
							<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Username</p>
							<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Created</p>
							<span />
						</div>
						{filteredAccounts.length ? (
							filteredAccounts.map((account) => {
								const accountKey = getStaffAccessMetaKey(account);
								const access = metaMap[accountKey] ?? metaMap[account.id] ?? createDefaultMeta();
								const isExpanded = expandedAccountId === account.id;

								return (
									<div key={account.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
										<div className={`grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center ${isExpanded ? 'border-b border-slate-200 pb-2' : ''}`}>
											<p className="text-sm font-bold text-slate-900">{account.name}</p>
											<p className="text-[12px] text-slate-700">{account.username}</p>
											<p className="text-[12px] text-slate-700">{formatCreatedDate(account.createdAt)}</p>
											<div className="md:justify-self-end">
												<button
													type="button"
													onClick={() => toggleExpand(account.id)}
													aria-expanded={isExpanded}
													aria-label={isExpanded ? 'Collapse access controls' : 'Expand access controls'}
													className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
												>
													<span className="material-symbols-outlined text-[16px] leading-none">{isExpanded ? 'expand_less' : 'expand_more'}</span>
												</button>
											</div>
										</div>

										{isExpanded ? (
											<div className="mt-3 space-y-2">
												<div className="flex flex-wrap items-center gap-2">
													<select
														value={access.role}
														onChange={(event) => {
															const role = event.target.value as StaffAccessMeta['role'];
															updateMeta(accountKey, (current) => ({ ...current, role }));
														}}
														className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
													>
														<option value="cashier">Cashier</option>
														<option value="sales">Sales</option>
														<option value="inventory">Inventory</option>
														<option value="supervisor">Supervisor</option>
													</select>

													<button
														type="button"
														onClick={() =>
															updateMeta(accountKey, (current) => ({
																...current,
																status: current.status === 'active' ? 'suspended' : 'active',
															}))
														}
														className={`rounded-md border px-2 py-1 text-xs font-bold transition ${
															access.status === 'active'
																? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
																: 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
														}`}
													>
														{access.status === 'active' ? 'Active' : 'Suspended'}
													</button>

													<button
														type="button"
														onClick={() => forceLogout(account.id)}
														className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
													>
														Force logout
													</button>

													<button
														type="button"
														onClick={() => deleteAccount(account.id)}
														className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
													>
														Delete user
													</button>
												</div>

												<p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Module Access</p>
												<div className={moduleGridClass}>
													{MODULE_KEYS.map((moduleKey) => (
														<label key={`${account.id}-${moduleKey}`} className="rounded-md border border-slate-300 bg-white p-2 text-xs">
															<span className="mb-1 block font-semibold text-slate-700">{toLabel(moduleKey)}</span>
															<select
																value={access.permissions[moduleKey]}
																onChange={(event) => {
																	const level = event.target.value as AccessLevel;
																	updateMeta(accountKey, (current) => ({
																		...current,
																		permissions: {
																			...current.permissions,
																			[moduleKey]: level,
																		},
																	}));
																}}
																className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
															>
																<option value="none">No access</option>
																<option value="view">View</option>
																<option value="edit">Edit</option>
															</select>
														</label>
													))}
												</div>
											</div>
										) : null}
									</div>
								);
							})
						) : (
							<div className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
								No matching staff accounts.
							</div>
						)}
					</div>
				</section>
			</div>
		</AdminShell>
	);
}
