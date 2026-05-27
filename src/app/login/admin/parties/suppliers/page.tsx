 'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readStaffSession, hasAdminSession } from '../../../../../lib/staff-auth';
import { AdminShell } from '../../../../../components/admin-shell';
import { AppModal } from '../../../../../components/app-modal';
import { LEDGER_STORAGE_EVENT, PURCHASES_STORAGE_KEY, readStoredArray } from '../../../../../lib/ledger-store';
import { BUSINESS_PROFILE } from '../../../../../lib/business-profile';

const parseSnapshotArray = <T,>(snapshot: Record<string, string>, key: string): T[] => {
	try {
		const raw = snapshot[key];
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
};

type PurchaseLineItem = {
	product: string;
	boxes: number;
	piecesPerBox: number;
	loosePieces: number;
	unitCost: number;
	totalUnits: number;
	lineTotal: number;
};

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
	items: PurchaseLineItem[];
	subtotal: number;
	totalUnits: number;
	total: number;
};

type SupplierSummary = {
	name: string;
	contact: string;
	sourceName: string;
	purchases: PurchaseRecord[];
	totalBought: number;
	totalUnits: number;
	lastBought: string;
};

type SupplierViewModalProps = {
	supplier: SupplierSummary;
	onClose: () => void;
};

const formatMoney = (value: number) => value.toFixed(2);

const formatDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	}).format(new Date(value));

const formatTime = (value: string) => value;

const sortByRecent = (left: { purchaseDate: string; purchaseTime: string }, right: { purchaseDate: string; purchaseTime: string }) => {
	const leftStamp = new Date(`${left.purchaseDate}T${left.purchaseTime}:00`).getTime();
	const rightStamp = new Date(`${right.purchaseDate}T${right.purchaseTime}:00`).getTime();
	return rightStamp - leftStamp;
};

const buildSupplierLedgerPrintable = (supplier: SupplierSummary) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Supplier Ledger - ${BUSINESS_PROFILE.shopName}</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background-color: #525659; display: flex; justify-content: center; padding: 20px; }
		.page { width: 21cm; min-height: 29.7cm; background: white; padding: 1.5cm; box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); }
		@page { size: A4; margin: 0; }
		@media print { body { background-color: white; padding: 0; display: block; } .page { width: auto; min-height: auto; box-shadow: none; padding: 1.5cm; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
		.bg-navy { background-color: #000066; color: white; }
		.bg-lightgray { background-color: #e2e2e2; }
		.bg-darkgray { background-color: #888888; color: white; }
		.text-navy { color: #000066; }
		.header-section { display: flex; justify-content: space-between; margin-bottom: 25px; }
		.company-info h1 { font-family: 'Times New Roman', Times, serif; font-size: 38px; font-weight: normal; letter-spacing: 1px; margin-bottom: 8px; }
		.company-info p { font-size: 13px; margin-bottom: 4px; }
		.memo-info { text-align: right; padding-top: 15px; }
		.memo-info h2 { font-size: 18px; text-decoration: underline; letter-spacing: 2px; margin-bottom: 4px; }
		.memo-info h3 { font-size: 16px; letter-spacing: 5px; font-weight: bold; margin-bottom: 12px; }
		.info-grid { display: grid; grid-template-columns: 1fr 280px; gap: 15px; margin-bottom: 25px; }
		.recipient-box { border: 1px solid #999; }
		.recipient-box .title-bar { padding: 5px 10px; font-weight: bold; }
		.recipient-box .customer-name { font-size: 18px; padding: 10px; background: white; border-bottom: 1px solid #999; }
		.recipient-details { display: grid; grid-template-columns: 90px 1fr; gap: 5px; padding: 10px; }
		.recipient-details div { padding: 2px 0; }
		.recipient-remarks { border-top: 1px solid #999; padding: 5px 10px; display: grid; grid-template-columns: 90px 1fr; }
		.invoice-meta { border-collapse: collapse; width: 100%; text-align: center; }
		.invoice-meta th, .invoice-meta td { border: 1px solid #999; padding: 6px; }
		.invoice-meta th { font-weight: normal; }
		.invoice-meta .spacer-row { height: 10px; border: none; }
		.product-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #999; }
		.product-table th, .product-table td { padding: 6px 10px; text-align: right; border-bottom: 1px dashed #ccc; }
		.product-table th { text-align: right; font-style: italic; font-weight: normal; border-bottom: none; }
		.product-table th:nth-child(1), .product-table td:nth-child(1) { text-align: left; }
		.product-table tbody tr:last-child td { border-bottom: none; }
		.product-table tfoot td { font-style: italic; border-top: 1px solid #999; }
		.totals-section { display: flex; justify-content: space-between; margin-bottom: 30px; align-items: flex-start; }
		.total-pcs { font-size: 16px; font-weight: bold; font-style: italic; padding-left: 10px; }
		.total-pcs span { margin-left: 20px; font-size: 18px; }
		.financial-summary { width: 280px; border-collapse: collapse; }
		.financial-summary td { padding: 5px 10px; font-style: italic; }
		.financial-summary td:nth-child(2) { text-align: right; }
		.financial-summary tr { border-bottom: 1px dashed #999; }
		.financial-summary tr:last-child { border-bottom: none; font-weight: bold; font-size: 14px; }
		.footer { margin-top: 18px; font-style: italic; text-align: center; }
	</style>
</head>
<body>
	<div class="page">
		<header class="header-section">
			<div class="company-info">
				<h1 class="text-navy">${BUSINESS_PROFILE.shopName}</h1>
				<p>${BUSINESS_PROFILE.address}</p>
				<p>Owner : ${BUSINESS_PROFILE.shopOwner}</p>
				<p>Phone : ${BUSINESS_PROFILE.contactNumber}</p>
				<p>Email : ${BUSINESS_PROFILE.email}</p>
			</div>
			<div class="memo-info">
				<h2>SUPPLIER LEDGER</h2>
				<h3>ORIGENAL</h3>
			</div>
		</header>

		<div class="info-grid">
			<div class="recipient-box">
				<div class="title-bar bg-navy">SUPPLIER</div>
				<div class="customer-name text-navy">${supplier.name}</div>
				<div class="recipient-details bg-lightgray">
					<div>Contact :</div>
					<div>${supplier.contact || '—'}</div>
					<div>Source :</div>
					<div>${supplier.sourceName || '—'}</div>
					<div>Purchases :</div>
					<div>${supplier.purchases.length}</div>
				</div>
				<div class="recipient-remarks bg-lightgray">
					<div>Bought</div>
					<div>${formatMoney(supplier.totalBought)}</div>
				</div>
			</div>
			<div>
				<table class="invoice-meta">
					<tr class="bg-lightgray">
						<th>Last Bought</th>
						<th>Summary</th>
					</tr>
					<tr>
						<td>${supplier.lastBought ? formatDate(supplier.lastBought) : '—'}</td>
						<td>${formatMoney(supplier.totalBought)}</td>
					</tr>
				</table>
			</div>
		</div>

		<table class="product-table">
			<thead>
				<tr class="bg-navy">
					<th>Purchase</th>
					<th>Date</th>
					<th>Time</th>
					<th>Total</th>
				</tr>
			</thead>
			<tbody>
				${supplier.purchases.map((purchase) => `
				<tr>
					<td>${purchase.purchaseNumber}</td>
					<td>${formatDate(purchase.purchaseDate)}</td>
					<td>${formatTime(purchase.purchaseTime)}</td>
					<td>${formatMoney(purchase.total)}</td>
				</tr>`).join('')}
			</tbody>
		</table>

		<div class="totals-section">
			<div class="total-pcs">Purchases <span>${supplier.purchases.length}</span></div>
			<table class="financial-summary">
				<tr><td>TOTAL BOUGHT</td><td>${formatMoney(supplier.totalBought)}</td></tr>
				<tr><td>TOTAL UNITS</td><td>${supplier.totalUnits}</td></tr>
			</table>
		</div>

		<div class="footer">${BUSINESS_PROFILE.shopName}</div>
	</div>
</body>
</html>`;

const openPrintableWindow = (html: string) => {
	const printWindow = window.open('', '_blank', 'width=980,height=1200');
	if (!printWindow) return;
	printWindow.document.open();
	printWindow.document.write(html);
	printWindow.document.close();
	printWindow.focus();
	setTimeout(() => printWindow.print(), 250);
};

function SupplierViewModal({ supplier, onClose }: SupplierViewModalProps) {
	return (
		<AppModal open={true} onClose={onClose} cardClassName="w-full max-w-5xl max-h-[calc(100vh-3rem)] overflow-hidden" overlayClassName="flex items-start justify-center overflow-y-auto py-6">
				<div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Supplier view</p>
						<h3 className="text-sm font-extrabold tracking-tight text-slate-900">{supplier.name}</h3>
						<p className="text-[11px] text-slate-500">{supplier.contact} · {supplier.sourceName}</p>
					</div>
					<div className="flex items-center gap-2">
						<button type="button" onClick={() => openPrintableWindow(buildSupplierLedgerPrintable(supplier))} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95">Print</button>
						<button type="button" onClick={onClose} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-rose-100 active:translate-y-0 active:scale-95">Close</button>
					</div>
				</div>

				<div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
					<div className="grid gap-3 sm:grid-cols-3 mb-3">
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
							<p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Purchases</p>
							<p className="mt-1 text-base font-extrabold text-slate-900">{supplier.purchases.length}</p>
						</div>
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
							<p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Items</p>
							<p className="mt-1 text-base font-extrabold text-slate-900">{supplier.totalUnits}</p>
						</div>
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
							<p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bought</p>
							<p className="mt-1 text-base font-extrabold text-slate-900">{formatMoney(supplier.totalBought)}</p>
						</div>
					</div>

					<div className="overflow-x-auto rounded-md border border-slate-200">
						<table className="w-full text-xs">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									<th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-600">Date</th>
									<th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-600">Product</th>
									<th className="px-3 py-2 text-center font-bold uppercase tracking-wide text-slate-600">Qty</th>
									<th className="px-3 py-2 text-right font-bold uppercase tracking-wide text-slate-600">Price</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{supplier.purchases
									.slice()
									.sort(sortByRecent)
									.flatMap((purchase) =>
										purchase.items.map((item, itemIndex) => (
											<tr key={`${purchase.purchaseNumber}-${itemIndex}`}>
												<td className="px-3 py-2 text-slate-600">{formatDate(purchase.purchaseDate)} · {formatTime(purchase.purchaseTime)}</td>
												<td className="px-3 py-2 font-medium text-slate-900">{item.product}</td>
												<td className="px-3 py-2 text-center text-slate-700">{item.totalUnits}</td>
												<td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(item.lineTotal)}</td>
											</tr>
										)),
									)}
							</tbody>
						</table>
					</div>
				</div>
			</AppModal>
	);
}

export default function SupplierPartiesPage() {
	const router = useRouter();

	useEffect(() => {
		const staff = readStaffSession();
		if (!staff && !hasAdminSession()) {
			router.push('/login');
		}
	}, [router]);

	const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
	const [viewSupplier, setViewSupplier] = useState<SupplierSummary | null>(null);
	const [expandedSupplierName, setExpandedSupplierName] = useState<string | null>(null);

	useEffect(() => {
		const refreshPurchaseRecords = async () => {
			try {
				const response = await fetch('/api/ledger-state', { cache: 'no-store', credentials: 'include' });
				if (!response.ok) return;
				const payload = (await response.json()) as { snapshot?: Record<string, string> };
				setPurchaseRecords(parseSnapshotArray<PurchaseRecord>(payload.snapshot ?? {}, PURCHASES_STORAGE_KEY).sort(sortByRecent));
			} catch {
				// keep current state if the server snapshot is unavailable
			}
		};

		const handleLedgerChange: EventListener = () => {
			void refreshPurchaseRecords();
		};

		void refreshPurchaseRecords();
		window.addEventListener('storage', handleLedgerChange);
		window.addEventListener(LEDGER_STORAGE_EVENT, handleLedgerChange);

		return () => {
			window.removeEventListener('storage', handleLedgerChange);
			window.removeEventListener(LEDGER_STORAGE_EVENT, handleLedgerChange);
		};
	}, []);

	const supplierSummaries = useMemo<SupplierSummary[]>(() => {
		const grouped = new Map<string, PurchaseRecord[]>();

		purchaseRecords.forEach((purchase) => {
			const key = purchase.supplierName.trim() || 'Supplier';
			grouped.set(key, [...(grouped.get(key) ?? []), purchase]);
		});

		return [...grouped.entries()]
			.map(([name, purchases]) => {
				const ordered = [...purchases].sort(sortByRecent);
				return {
					name,
					contact: ordered[0]?.supplierContact || 'No contact',
					sourceName: ordered[0]?.sourceName || 'Unknown source',
					purchases: ordered,
					totalBought: ordered.reduce((sum, purchase) => sum + purchase.total, 0),
					totalUnits: ordered.reduce((sum, purchase) => sum + purchase.totalUnits, 0),
					lastBought: ordered[0]?.purchaseDate || '',
				};
			})
			.sort((left, right) => right.totalBought - left.totalBought || right.purchases.length - left.purchases.length);
	}, [purchaseRecords]);

	const totalBought = supplierSummaries.reduce((sum, item) => sum + item.totalBought, 0);

	const openSupplierView = (supplier: SupplierSummary) => {
		setViewSupplier(supplier);
	};

	const closeSupplierView = () => {
		setViewSupplier(null);
	};

	const toggleSupplierSummary = (supplierName: string) => {
		setExpandedSupplierName((current) => (current === supplierName ? null : supplierName));
	};

	return (
		<AdminShell active="parties" title="Suppliers">
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
				<div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
					<div>
						<h2 className="text-lg font-bold text-slate-900">Suppliers</h2>
						<p className="text-xs text-slate-500">Same compact layout as customers with minimal supplier data.</p>
					</div>
				</div>

				<div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500 flex items-center justify-between">
					<span>{supplierSummaries.length} supplier{supplierSummaries.length === 1 ? '' : 's'} in the list</span>
					<span>Total bought {formatMoney(totalBought)}</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead className="bg-slate-50 border-b border-slate-200">
							<tr>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Supplier</th>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Purchases</th>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Items</th>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Bought</th>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{supplierSummaries.length ? (
								supplierSummaries.map((supplier) => (
									<Fragment key={supplier.name}>
										<tr className="hover:bg-slate-50 transition-colors">
											<td className="px-4 py-3">
												<div className="font-semibold text-slate-800">{supplier.name}</div>
												<div className="text-[11px] text-slate-500">Last: {supplier.lastBought ? formatDate(supplier.lastBought) : 'N/A'}</div>
											</td>
											<td className="px-4 py-3 font-semibold text-slate-700">{supplier.purchases.length}</td>
											<td className="px-4 py-3 font-semibold text-slate-700">{supplier.totalUnits}</td>
											<td className="px-4 py-3 font-bold text-slate-900">{formatMoney(supplier.totalBought)}</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap items-center gap-2">
													<button
														type="button"
														onClick={() => toggleSupplierSummary(supplier.name)}
														className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-rose-100 active:translate-y-0 active:scale-95"
													>
														{expandedSupplierName === supplier.name ? 'Hide' : 'Show'} items
													</button>
													<button
														type="button"
														onClick={() => openSupplierView(supplier)}
														className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95"
													>
														View
													</button>
												</div>
											</td>
										</tr>
										{expandedSupplierName === supplier.name ? (
											<tr>
												<td className="px-4 py-3" colSpan={5}>
													<div className="overflow-x-auto rounded-md border border-slate-200">
														<table className="w-full text-xs">
															<thead className="bg-slate-50 border-b border-slate-200">
																<tr>
																	<th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-600">Date</th>
																	<th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-600">Product</th>
																	<th className="px-3 py-2 text-center font-bold uppercase tracking-wide text-slate-600">Qty</th>
																	<th className="px-3 py-2 text-right font-bold uppercase tracking-wide text-slate-600">Price</th>
																</tr>
															</thead>
															<tbody className="divide-y divide-slate-100">
																{supplier.purchases
																	.slice()
																	.sort(sortByRecent)
																	.flatMap((purchase) =>
																		purchase.items.map((item, itemIndex) => (
																			<tr key={`${purchase.purchaseNumber}-${itemIndex}`}>
																				<td className="px-3 py-2 text-slate-600">{formatDate(purchase.purchaseDate)}</td>
																				<td className="px-3 py-2 font-medium text-slate-900">{item.product}</td>
																				<td className="px-3 py-2 text-center text-slate-700">{item.totalUnits}</td>
																				<td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(item.lineTotal)}</td>
																			</tr>
																		)),
																	)}
															</tbody>
														</table>
													</div>
												</td>
											</tr>
										) : null}
									</Fragment>
								))
							) : (
								<tr>
									<td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
										No supplier purchases yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			{viewSupplier ? <SupplierViewModal supplier={viewSupplier} onClose={closeSupplierView} /> : null}
		</AdminShell>
	);
}
