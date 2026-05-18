'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../../../../../components/admin-shell';
import { AppModal } from '../../../../../components/app-modal';
import { LEDGER_STORAGE_EVENT, PURCHASES_STORAGE_KEY, readStoredArray } from '../../../../../lib/ledger-store';

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

function SupplierViewModal({ supplier, onClose }: SupplierViewModalProps) {
	return (
		<AppModal open={true} onClose={onClose} cardClassName="w-full max-w-5xl max-h-[calc(100vh-3rem)] overflow-hidden" overlayClassName="flex items-start justify-center overflow-y-auto py-6">
				<div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Supplier view</p>
						<h3 className="text-sm font-extrabold tracking-tight text-slate-900">{supplier.name}</h3>
						<p className="text-[11px] text-slate-500">{supplier.contact} · {supplier.sourceName}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-rose-100 active:translate-y-0 active:scale-95"
					>
						Close
					</button>
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
	const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
	const [viewSupplier, setViewSupplier] = useState<SupplierSummary | null>(null);
	const [expandedSupplierName, setExpandedSupplierName] = useState<string | null>(null);

	useEffect(() => {
		const handleLedgerChange: EventListener = () => {
			setPurchaseRecords(readStoredArray<PurchaseRecord>(PURCHASES_STORAGE_KEY).sort(sortByRecent));
		};

		handleLedgerChange();
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
