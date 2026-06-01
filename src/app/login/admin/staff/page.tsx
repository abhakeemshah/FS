'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../../components/admin-shell';
import { AppModal } from '../../../../components/app-modal';
import { StaffConfirmModal } from '../../../../components/staff-confirm-modal';
import { StaffAccountManager } from '../../../../components/staff-account-manager';
import {
	STAFF_AUTH_EVENT,
	STAFF_MODULE_KEYS,
	clearStaffSession,
	createDefaultStaffAccessMeta,
	deleteStaffAccountOnServer,
	fetchStaffAccessMetaById,
	fetchStaffAccounts,
	readStaffSession,
	updateStaffPasswordOnServer,
	hasAdminSession,
	writeStaffAccessMetaMap,
	type StaffAccount,
	type StaffAccessMeta,
	type StaffAccessMetaMap,
	type StaffModuleKey,
} from '../../../../lib/staff-auth';

type AccessLevel = 'none' | 'view' | 'edit';
type ModuleKey = StaffModuleKey;

const cardClass = 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm';
const moduleGridClass = 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function defaultPermissions(): Record<ModuleKey, AccessLevel> {
	return {
		dashboard: 'view',
		sales: 'view',
		products: 'none',
		purchases: 'view',
		payments: 'view',
		parties: 'none',
		reports: 'none',
		settings: 'none',
	};
}

function createDefaultMeta(): StaffAccessMeta {
	return createDefaultStaffAccessMeta();
}

function readMetaMap(): StaffAccessMetaMap {
	return readStaffAccessMetaMap();
}

function saveMetaMap(value: StaffAccessMetaMap, silent = false) {
	writeStaffAccessMetaMap(value, { silent });
}

const toLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatCreatedDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	}).format(new Date(value));

export default function AdminStaffPage() {
	const router = useRouter();
	const [adminReady, setAdminReady] = useState(false);
	const [accounts, setAccounts] = useState<StaffAccount[]>([]);
	const [metaMap, setMetaMap] = useState<Record<string, StaffAccessMeta>>({});
	const [searchText, setSearchText] = useState('');
	const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
	const feedbackReadyRef = useRef(false);


	useEffect(() => {
		const updateAccess = () => {
			const allowed = hasAdminSession();
			setAdminReady(allowed);
			if (!allowed) {
						router.replace('/access');
			}
		};

		updateAccess();
		const refresh = async () => {
			const staffAccounts = await fetchStaffAccounts();
			const nextMeta: Record<string, StaffAccessMeta> = {};

			await Promise.all(
				staffAccounts.map(async (account) => {
					const remoteMeta = await fetchStaffAccessMetaById(account.id);
					const meta = remoteMeta ?? createDefaultMeta();
					nextMeta[account.id] = meta;
					nextMeta[account.username.trim().toLowerCase()] = meta;
				}),
			);

			setAccounts(staffAccounts);
			setMetaMap(nextMeta);
		};

		void refresh();

		const onChange: EventListener = () => { void refresh(); };
		window.addEventListener('storage', onChange);
		window.addEventListener(STAFF_AUTH_EVENT, onChange);
		window.addEventListener('staff-auth-updated', updateAccess as EventListener);
		feedbackReadyRef.current = true;

		return () => {
			window.removeEventListener('storage', onChange);
			window.removeEventListener(STAFF_AUTH_EVENT, onChange);
			window.removeEventListener('staff-auth-updated', updateAccess as EventListener);
		};
	}, [router]);

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
		const session = readStaffSession();
		if (session?.id === accountId) {
			clearStaffSession();
			window.dispatchEvent(new Event(STAFF_AUTH_EVENT));
		}
	};

	const toggleExpand = (accountId: string) => {
		setExpandedAccountId((current) => (current === accountId ? null : accountId));
	};

	const deleteAccount = (accountId: string) => {
		openConfirm('Delete user', 'Delete this staff user? This action cannot be undone.', () => {
			if (typeof window === 'undefined') return;
			try {
				void deleteStaffAccountOnServer(accountId);

				setMetaMap((current) => {
					const nextMeta = { ...current };
					delete nextMeta[accountId];
					saveMetaMap(nextMeta);
					return nextMeta;
				});

				forceLogout(accountId);
				setExpandedAccountId((current) => (current === accountId ? null : current));
				window.dispatchEvent(new Event('storage'));
			} catch {
				// noop
			}
		});
	};



	// Modal-based change password
	const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
	const [passwordTargetId, setPasswordTargetId] = useState<string | null>(null);
	const [newPasswordInput, setNewPasswordInput] = useState('');

	const openChangePassword = (accountId: string) => {
		setPasswordTargetId(accountId);
		setNewPasswordInput('');
		setIsChangePasswordOpen(true);
	};

	const saveNewPassword = () => {
		if (!passwordTargetId) return;
		if (!newPasswordInput || newPasswordInput.length < 4) {
			window.alert('Password must be at least 4 characters.');
			return;
		}

		try {
			void updateStaffPasswordOnServer(passwordTargetId, newPasswordInput);
			// force logout the user if currently logged in
			forceLogout(passwordTargetId);
			window.dispatchEvent(new Event('storage'));
			setIsChangePasswordOpen(false);
			setPasswordTargetId(null);
			setNewPasswordInput('');
			window.alert('Password updated.');
		} catch {
			// noop
		}
	};

	// Generic confirmation modal state
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [confirmTitle, setConfirmTitle] = useState('Confirm');
	const [confirmMessage, setConfirmMessage] = useState('Are you sure?');
	const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

	const openConfirm = (title: string, message: string, action: () => void) => {
		setConfirmTitle(title);
		setConfirmMessage(message);
		setConfirmAction(() => action);
		setIsConfirmOpen(true);
	};

	const handleConfirm = () => {
		try {
			confirmAction?.();
		} finally {
			setIsConfirmOpen(false);
			setConfirmAction(null);
		}
	};

	if (!adminReady) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
				<div>
					<p className="text-2xl font-bold text-slate-900">No Access</p>
					<p className="mt-2 text-slate-600">This section is admin only.</p>
				</div>
			</div>
		);
	}

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

				{isChangePasswordOpen ? (
					<AppModal open={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} cardClassName="w-full max-w-md">
						<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
							<h3 className="text-sm font-bold text-slate-900">Change Password</h3>
						</div>
						<div className="space-y-3 p-4">
							<label className="text-xs font-semibold text-slate-600">New password
								<input type="password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500" placeholder="Minimum 4 characters" />
							</label>
							<div className="flex items-center justify-end gap-2">
								<button type="button" onClick={() => setIsChangePasswordOpen(false)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Cancel</button>
								<button type="button" onClick={() => openConfirm('Change password', 'Save new password for this user?', saveNewPassword)} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white">Save</button>
							</div>
						</div>
					</AppModal>
				) : null}

					{isConfirmOpen ? (
						<StaffConfirmModal open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} cardClassName="w-full">
							<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
								<h3 className="text-sm font-bold text-slate-900">{confirmTitle}</h3>
							</div>
							<div className="space-y-3 p-4">
								<p className="text-sm text-slate-700">{confirmMessage}</p>
								<div className="flex items-center justify-end gap-2">
									<button type="button" onClick={() => setIsConfirmOpen(false)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Cancel</button>
									<button type="button" onClick={handleConfirm} className="rounded-md border border-rose-600 bg-rose-600 px-3 py-2 text-xs font-bold text-white">Confirm</button>
								</div>
							</div>
						</StaffConfirmModal>
					) : null}

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
													<div className="flex items-center gap-3">
														<span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Role: {toLabel(access.role)}</span>

														<button
															type="button"
															onClick={() =>
																openConfirm(
																	access.status === 'active' ? 'Suspend user' : 'Activate user',
																	access.status === 'active' ? 'Suspend this staff user?' : 'Activate this staff user?',
																	() => updateMeta(accountKey, (current) => ({ ...current, status: current.status === 'active' ? 'suspended' : 'active' }))
																)
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
															onClick={() => openConfirm('Force logout', 'Force logout this user now?', () => forceLogout(account.id))}
															className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
														>
															Force logout
														</button>

														<button
															type="button"
															onClick={() => openChangePassword(account.id)}
															className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
														>
															Change password
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
														{STAFF_MODULE_KEYS.map((moduleKey) => (
															<label key={`${account.id}-${moduleKey}`} className="rounded-md border border-slate-300 bg-white p-2 text-xs">
																<span className="mb-1 block font-semibold text-slate-700">{toLabel(moduleKey)}</span>
																<select
																	value={access.permissions[moduleKey]}
																	onChange={(event) => {
																		const level = event.target.value as AccessLevel;
																		openConfirm('Change permission', `Change access for ${toLabel(moduleKey)} to ${toLabel(level)}?`, () =>
																			updateMeta(accountKey, (current) => ({
																				...current,
																				permissions: {
																					...current.permissions,
																					[moduleKey]: level,
																				},
																			})),
																		);
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
