'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	getCurrentStaffModuleAccess,
	getStaffAccessLabel,
	type StaffAccessLevel,
	type StaffModuleKey,
} from '../../../../lib/sales-utils';
import { AppModal } from '../../../../components/app-modal';
import { LEDGER_STORAGE_EVENT, PURCHASES_STORAGE_KEY, readStoredArray, writeStoredArray } from '../../../../lib/ledger-store';
import { STAFF_AUTH_EVENT, STAFF_MODULE_KEYS, clearStaffSession, syncLocalStaffMetaWithServer } from '../../../../lib/staff-auth';

type PurchaseRecord = {
	purchaseNumber: string;
	createdAt: string;
	supplierName: string;
	supplierContact: string;
	sourceName: string;
	purchaseReference: string;
	purchaseDate: string;
	purchaseTime: string;
	paymentMethod: string;
	status: string;
	transportCost: number;
	notes: string;
	totalUnits: number;
	total: number;
};

const formatDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	}).format(new Date(value));

const formatMoney = (value: number) => value.toFixed(2);

export default function StaffPurchasesPage() {
	const router = useRouter();
	const [accessReady, setAccessReady] = useState(false);
	const [purchasesAccess, setPurchasesAccess] = useState<StaffAccessLevel>('none');
	const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
	const [viewPurchase, setViewPurchase] = useState<PurchaseRecord | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<PurchaseRecord | null>(null);
	const [moduleAccess, setModuleAccess] = useState<Record<StaffModuleKey, StaffAccessLevel>>({
		sales: 'none',
		purchases: 'none',
		payments: 'none',
		parties: 'none',
		reports: 'none',
	});

	useEffect(() => {
		const refreshAccess = async () => {
			await syncLocalStaffMetaWithServer();
			setPurchasesAccess(getCurrentStaffModuleAccess('purchases'));
			setModuleAccess(
				Object.fromEntries(STAFF_MODULE_KEYS.map((moduleKey) => [moduleKey, getCurrentStaffModuleAccess(moduleKey)])) as Record<
					StaffModuleKey,
					StaffAccessLevel
				>,
			);
			setAccessReady(true);
		};

		void refreshAccess();

		const refreshPurchases = () => {
			setPurchases(
				readStoredArray<PurchaseRecord>(PURCHASES_STORAGE_KEY).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
			);
		};

		refreshPurchases();

		const handleRefresh = () => {
			void refreshAccess();
		};

		const handlePurchaseRefresh = () => {
			refreshPurchases();
		};

		window.addEventListener(STAFF_AUTH_EVENT, handleRefresh);
		window.addEventListener('storage', handleRefresh);
		window.addEventListener(LEDGER_STORAGE_EVENT, handlePurchaseRefresh);
		window.addEventListener('storage', handlePurchaseRefresh);

		return () => {
			window.removeEventListener(STAFF_AUTH_EVENT, handleRefresh);
			window.removeEventListener('storage', handleRefresh);
			window.removeEventListener(LEDGER_STORAGE_EVENT, handlePurchaseRefresh);
			window.removeEventListener('storage', handlePurchaseRefresh);
		};
	}, []);

	const moduleCards = STAFF_MODULE_KEYS.filter((moduleKey) => moduleAccess[moduleKey] !== 'none').map((moduleKey) => ({
		key: moduleKey,
		label: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1),
		access: moduleAccess[moduleKey],
	}));
	const canEdit = purchasesAccess === 'edit';
	const handleNewPurchase = () => {
		router.push('/login/staff/purchases/editor');
	};

	const openPurchaseView = (purchase: PurchaseRecord) => {
		setDeleteTarget(null);
		setViewPurchase(purchase);
	};

	const closePurchaseView = () => {
		setViewPurchase(null);
	};

	const askDeletePurchase = (purchase: PurchaseRecord) => {
		setViewPurchase(null);
		setDeleteTarget(purchase);
	};

	const cancelDeletePurchase = () => {
		setDeleteTarget(null);
	};

	const confirmDeletePurchase = () => {
		if (!deleteTarget) return;
		const nextPurchases = purchases.filter((purchase) => purchase.purchaseNumber !== deleteTarget.purchaseNumber);
		setPurchases(nextPurchases);
		writeStoredArray(PURCHASES_STORAGE_KEY, nextPurchases);
		setDeleteTarget(null);
	};

	if (!accessReady) {
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
	}

	if (purchasesAccess === 'none') {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-center">
					<p className="text-2xl font-bold text-slate-900">No Access</p>
					<p className="mt-2 text-slate-600">You don't have access to this module.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Sidebar */}
			<aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-slate-200 bg-white p-3 text-xs shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
				<div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
					<h2 className="font-['Manrope'] text-xl font-black tracking-tighter text-slate-900">Staff Panel</h2>
					<p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">FS Communication</p>
				</div>
				<nav className="space-y-1">
					{moduleCards.map((moduleCard) => (
						<Link
							key={moduleCard.key}
							href={`/login/staff/${moduleCard.key}`}
							className={`mb-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 font-medium transition-all ${
								moduleCard.key === 'purchases'
									? 'border-blue-300 bg-blue-50 text-blue-700'
									: 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:border-blue-300'
							}`}
						>
							<span className="material-symbols-outlined text-[18px]">
								{moduleCard.key === 'sales'
									? 'receipt_long'
									: moduleCard.key === 'purchases'
										? 'shopping_cart'
										: moduleCard.key === 'payments'
											? 'account_balance_wallet'
											: moduleCard.key === 'parties'
												? 'groups'
												: 'analytics'}
							</span>
							<span className="flex-1">{moduleCard.label}</span>
							<span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
								{getStaffAccessLabel(moduleCard.access)}
							</span>
						</Link>
					))}
				</nav>
			</aside>

			{/* Main Content */}
			<main className="ml-56 min-h-screen">
				{/* Header */}
				<header className="sticky top-0 z-30 flex h-10 items-center justify-between border-b border-slate-200 bg-white px-5">
					<div>
						<p className="text-sm font-extrabold tracking-tight text-slate-900">Purchases</p>
						{/* Access Level label removed to match admin UI */}
						<p className="text-[11px] text-slate-500">{canEdit ? 'You can add, edit, and remove purchases.' : 'View-only access. Editing is disabled.'}</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								clearStaffSession();
								window.location.href = '/login';
							}}
							className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100"
						>
							Sign out
						</button>
					</div>
				</header>

				{/* Content */}
				<div className="mx-auto w-full max-w-[1400px] p-4">
					<div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-lg font-bold text-slate-900">Purchases module</p>
								<p className="text-sm text-slate-600">{canEdit ? 'Edit mode is active. You can open the editor or remove stored purchases.' : 'View mode is active.'}</p>
							</div>
							<button
								type="button"
								onClick={handleNewPurchase}
								disabled={!canEdit}
								className={`rounded-md px-3 py-2 text-xs font-bold transition ${canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}
							>
								+ New Purchase
							</button>
						</div>
						<div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
							<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
								<h2 className="text-sm font-bold text-slate-900">Stored Purchases ({purchases.length})</h2>
							</div>

							{purchases.length === 0 ? (
								<div className="px-4 py-8 text-center">
									<p className="text-slate-500">No purchase invoices have been saved yet.</p>
								</div>
							) : (
								<table className="w-full text-sm">
									<thead className="bg-slate-50">
										<tr className="border-b border-slate-200">
											<th className="px-4 py-2 text-left font-semibold text-slate-700">Purchase #</th>
											<th className="px-4 py-2 text-left font-semibold text-slate-700">Supplier</th>
											<th className="px-4 py-2 text-left font-semibold text-slate-700">Source</th>
											<th className="px-4 py-2 text-left font-semibold text-slate-700">Date</th>
											<th className="px-4 py-2 text-right font-semibold text-slate-700">Total</th>
											<th className="px-4 py-2 text-center font-semibold text-slate-700">Actions</th>
										</tr>
									</thead>
									<tbody>
										{purchases.map((purchase) => (
											<tr key={purchase.purchaseNumber} className="border-b border-slate-200 hover:bg-slate-50">
												<td className="px-4 py-2 font-mono text-blue-600">{purchase.purchaseNumber}</td>
												<td className="px-4 py-2">
													<div className="font-semibold text-slate-700">{purchase.supplierName}</div>
													<div className="text-[11px] text-slate-500">{purchase.purchaseReference || 'No reference'}</div>
												</td>
												<td className="px-4 py-2 text-slate-700">{purchase.sourceName}</td>
												<td className="px-4 py-2 text-slate-700">{formatDate(purchase.purchaseDate)}</td>
												<td className="px-4 py-2 text-right font-semibold">{formatMoney(purchase.total)}</td>
												<td className="px-4 py-2 text-center">
													<div className="flex items-center justify-center gap-2">
														<button type="button" onClick={() => openPurchaseView(purchase)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
															View
														</button>
														{canEdit ? (
															<button type="button" onClick={() => askDeletePurchase(purchase)} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
																Delete
															</button>
														) : null}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					</div>
				</div>

				{viewPurchase ? (
						<AppModal open={Boolean(viewPurchase)} onClose={closePurchaseView} cardClassName="w-full max-w-5xl max-h-[92vh] overflow-visible rounded-2xl border border-slate-300 shadow-2xl">
						<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
							<div>
								<h3 className="text-sm font-bold text-slate-900">Purchase View</h3>
								<p className="text-[11px] text-slate-500">Stored purchase record details</p>
							</div>
							<button type="button" onClick={closePurchaseView} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
								Close
							</button>
						</div>
						<div className="max-h-[calc(86vh-72px)] space-y-4 overflow-y-auto p-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="rounded-xl border border-slate-200 bg-white p-3">
									<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Purchase</div>
									<div className="mt-1 text-sm font-bold text-slate-900">{viewPurchase.purchaseNumber}</div>
									<div className="mt-1 text-xs text-slate-600">{formatDate(viewPurchase.purchaseDate)} · {viewPurchase.purchaseTime}</div>
								</div>
								<div className="rounded-xl border border-slate-200 bg-white p-3">
									<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Supplier</div>
									<div className="mt-1 text-sm font-semibold text-slate-900">{viewPurchase.supplierName}</div>
									<div className="text-xs text-slate-600">{viewPurchase.supplierContact || 'No contact'}</div>
									<div className="mt-1 text-xs text-slate-600">Source: {viewPurchase.sourceName}</div>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
									<div className="flex items-center justify-between"><span className="text-slate-600">Reference</span><span className="font-semibold text-slate-900">{viewPurchase.purchaseReference || 'N/A'}</span></div>
									<div className="mt-1 flex items-center justify-between"><span className="text-slate-600">Payment</span><span className="font-semibold text-slate-900">{viewPurchase.paymentMethod}</span></div>
									<div className="mt-1 flex items-center justify-between"><span className="text-slate-600">Status</span><span className="font-semibold text-slate-900">{viewPurchase.status}</span></div>
								</div>
								<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
									<div className="flex items-center justify-between"><span className="text-slate-600">Total Units</span><span className="font-semibold text-slate-900">{viewPurchase.totalUnits}</span></div>
									<div className="mt-1 flex items-center justify-between"><span className="text-slate-600">Transport</span><span className="font-semibold text-slate-900">{formatMoney(viewPurchase.transportCost)}</span></div>
									<div className="mt-1 flex items-center justify-between"><span className="text-slate-600">Grand Total</span><span className="font-bold text-slate-900">{formatMoney(viewPurchase.total)}</span></div>
								</div>
							</div>
							{viewPurchase.notes ? (
								<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
									<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</div>
									<div className="mt-1">{viewPurchase.notes}</div>
								</div>
							) : null}
						</div>
					</AppModal>
				) : null}

				{deleteTarget ? (
					<AppModal open={Boolean(deleteTarget)} onClose={cancelDeletePurchase} cardClassName="w-full max-w-sm rounded-2xl border border-slate-300 shadow-2xl">
						<div className="p-4">
							<h3 className="text-sm font-bold text-slate-900">Delete Purchase?</h3>
							<p className="mt-1 text-xs text-slate-600">
								Delete <span className="font-semibold text-slate-800">{deleteTarget.purchaseNumber}</span> for <span className="font-semibold text-slate-800">{deleteTarget.supplierName}</span>?
							</p>
							<p className="mt-1 text-[11px] text-rose-700">This action cannot be undone.</p>
							<div className="mt-4 flex items-center justify-end gap-2">
								<button type="button" onClick={cancelDeletePurchase} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
									Cancel
								</button>
								<button type="button" onClick={confirmDeletePurchase} className="rounded-lg border border-rose-600 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
									Delete
								</button>
							</div>
						</div>
					</AppModal>
				) : null}
			</main>
		</div>
	);
}
