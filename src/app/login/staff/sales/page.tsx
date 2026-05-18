'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	readStoredArray,
	writeStoredArray,
	getCurrentStaffModuleAccess,
	getStaffAccessLabel,
	SALES_BILLS_STORAGE_KEY,
	formatDate,
	formatTime,
	formatMoney,
	buildPrintableBill,
	type BillRecord,
	type StaffAccessLevel,
	type StaffModuleKey,
} from '../../../../lib/sales-utils';
import { LEDGER_STORAGE_EVENT } from '../../../../lib/ledger-store';
import { STAFF_AUTH_EVENT, STAFF_MODULE_KEYS, clearStaffSession, syncLocalStaffMetaWithServer } from '../../../../lib/staff-auth';

export default function StaffSalesPage() {
	const [bills, setBills] = useState<BillRecord[]>([]);
	const [accessReady, setAccessReady] = useState(false);
	const [salesAccess, setSalesAccess] = useState<StaffAccessLevel>('none');
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
			setSalesAccess(getCurrentStaffModuleAccess('sales'));
			setModuleAccess(
				Object.fromEntries(STAFF_MODULE_KEYS.map((moduleKey) => [moduleKey, getCurrentStaffModuleAccess(moduleKey)])) as Record<
					StaffModuleKey,
					StaffAccessLevel
				>,
			);
			setAccessReady(true);
		};

		void refreshAccess();

		const handleRefresh = () => {
			void refreshAccess();
		};

		window.addEventListener(STAFF_AUTH_EVENT, handleRefresh);
		window.addEventListener('storage', handleRefresh);
		window.addEventListener(LEDGER_STORAGE_EVENT, handleRefresh);

		return () => {
			window.removeEventListener(STAFF_AUTH_EVENT, handleRefresh);
			window.removeEventListener('storage', handleRefresh);
			window.removeEventListener(LEDGER_STORAGE_EVENT, handleRefresh);
		};
	}, []);

	useEffect(() => {
		const refreshBills = () => {
			const storedBills = readStoredArray<BillRecord>(SALES_BILLS_STORAGE_KEY);
			setBills(storedBills);
		};

		refreshBills();
		window.addEventListener(LEDGER_STORAGE_EVENT, refreshBills);
		window.addEventListener('storage', refreshBills);

		return () => {
			window.removeEventListener(LEDGER_STORAGE_EVENT, refreshBills);
			window.removeEventListener('storage', refreshBills);
		};
	}, []);

	const moduleCards = STAFF_MODULE_KEYS.filter((moduleKey) => moduleAccess[moduleKey] !== 'none').map((moduleKey) => ({
		key: moduleKey,
		label: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1),
		access: moduleAccess[moduleKey],
	}));

	const canEdit = salesAccess === 'edit';
	const handleNewInvoice = () => {
		window.location.href = '/login/staff/sales/editor';
	};

	const handleViewBill = (bill: BillRecord) => {
		const printWindow = window.open('', '_blank', 'width=980,height=1200');
		if (!printWindow) return;
		printWindow.document.open();
		printWindow.document.write(buildPrintableBill(bill));
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => printWindow.print(), 250);
	};

	const handleDeleteBill = (bill: BillRecord) => {
		if (!window.confirm(`Delete ${bill.invoiceNumber} for ${bill.customerName}?`)) return;
		setBills((current) => {
			const nextBills = current.filter((record) => record.billId !== bill.billId);
			writeStoredArray(SALES_BILLS_STORAGE_KEY, nextBills);
			return nextBills;
		});
	};

	if (!accessReady) {
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
	}

	if (salesAccess === 'none') {
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
								moduleCard.key === 'sales'
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
						<p className="text-sm font-extrabold tracking-tight text-slate-900">Sales Invoices</p>
						{/* Access level label removed to match admin UI */}
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
					{canEdit && (
						<div className="mb-4">
							<button type="button" onClick={handleNewInvoice} className="rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
								+ New Invoice
							</button>
						</div>
					)}

					<div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
						<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
							<h2 className="text-sm font-bold text-slate-900">Invoices ({bills.length})</h2>
						</div>

						{bills.length === 0 ? (
							<div className="px-4 py-8 text-center">
								<p className="text-slate-500">No invoices yet.</p>
							</div>
						) : (
							<table className="w-full text-sm">
								<thead className="bg-slate-50">
									<tr className="border-b border-slate-200">
										<th className="px-4 py-2 text-left font-semibold text-slate-700">Invoice #</th>
										<th className="px-4 py-2 text-left font-semibold text-slate-700">Date</th>
										<th className="px-4 py-2 text-left font-semibold text-slate-700">Items</th>
										<th className="px-4 py-2 text-right font-semibold text-slate-700">Total</th>
										{canEdit && <th className="px-4 py-2 text-center font-semibold text-slate-700">Actions</th>}
									</tr>
								</thead>
								<tbody>
									{bills.map((bill) => (
										<tr key={bill.billId} className="border-b border-slate-200 hover:bg-slate-50">
											<td className="px-4 py-2 font-mono text-blue-600">{bill.invoiceNumber}</td>
											<td className="px-4 py-2">{formatDate(bill.date)}</td>
											<td className="px-4 py-2">{bill.items.length} item(s)</td>
											<td className="px-4 py-2 text-right font-semibold">{formatMoney(bill.netTotal)}</td>
											{canEdit && (
												<td className="px-4 py-2 text-center">
													<button type="button" onClick={() => handleViewBill(bill)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">View</button>
													<span className="mx-2 text-slate-300">|</span>
													<button type="button" onClick={() => handleDeleteBill(bill)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
												</td>
											)}
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>

					{/* Staff view modals - align with admin modal styling */}
					{/* the admin uses rounded-2xl, border, shadow and larger max widths */}
					{false && null}
				</div>
			</main>
		</div>
	);
}
