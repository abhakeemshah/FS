'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../../../../../components/admin-shell';
import { AppModal } from '../../../../../components/app-modal';
import { LEDGER_STORAGE_EVENT, SALES_BILLS_STORAGE_KEY, readStoredArray } from '../../../../../lib/ledger-store';

type SalesLineItem = {
	product: string;
	quantity: number;
	price?: number;
	discount: number;
};

type SalesBillRecord = {
	invoiceNumber: string;
	date: string;
	time: string;
	customerName: string;
	customerContact: string;
	paymentMethod: string;
	items: SalesLineItem[];
	subtotal: number;
	discount: number;
	total: number;
};

type CustomerSummary = {
	name: string;
	contact: string;
	invoices: SalesBillRecord[];
	totalSpent: number;
	totalItems: number;
	lastPurchase: string;
};

type CustomerViewModalProps = {
	customer: CustomerSummary;
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

const sortByRecent = (left: { date: string; time: string }, right: { date: string; time: string }) => {
	const leftStamp = new Date(`${left.date}T${left.time}:00`).getTime();
	const rightStamp = new Date(`${right.date}T${right.time}:00`).getTime();
	return rightStamp - leftStamp;
};

function CustomerViewModal({ customer, onClose }: CustomerViewModalProps) {
	return (
		<AppModal
			open={true}
			onClose={onClose}
			cardClassName="w-full max-w-5xl max-h-[calc(100vh-3rem)] overflow-hidden"
			overlayClassName="flex items-start justify-center overflow-y-auto py-6"
		>
			<div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
				<div>
					<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Customer view</p>
					<h3 className="mt-1 text-sm font-extrabold tracking-tight text-slate-900">{customer.name}</h3>
					<p className="text-xs text-slate-500">{customer.contact}</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-rose-100 active:translate-y-0 active:scale-95"
				>
					Close
				</button>
			</div>

			<div className="max-h-[calc(100vh-8rem)] overflow-y-auto bg-white p-4">
				<div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
					<div className="space-y-4 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-xl border border-blue-200 bg-white p-3">
								<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Invoices</p>
								<p className="mt-1 text-2xl font-semibold text-slate-900">{customer.invoices.length}</p>
							</div>
							<div className="rounded-xl border border-blue-200 bg-white p-3">
								<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Spent</p>
								<p className="mt-1 text-2xl font-semibold text-slate-900">{formatMoney(customer.totalSpent)}</p>
							</div>
							<div className="rounded-xl border border-blue-200 bg-white p-3">
								<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Items</p>
								<p className="mt-1 text-2xl font-semibold text-slate-900">{customer.totalItems}</p>
							</div>
						</div>

						<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
							<div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
								<p className="text-xs font-bold uppercase tracking-wide text-blue-700">Invoices</p>
								<p className="text-xs text-slate-500">{customer.invoices.length} total</p>
							</div>
							<div className="divide-y divide-slate-100">
								{customer.invoices.map((invoice, index) => (
									<div key={invoice.invoiceNumber} className={`flex items-center justify-between gap-3 px-4 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}`}>
										<div>
											<p className="text-sm font-medium text-slate-900">{formatDate(invoice.date)}</p>
											<p className="text-xs text-slate-500">{formatTime(invoice.time)}</p>
										</div>
										<p className="text-sm font-semibold text-slate-900">{formatMoney(invoice.total)}</p>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
						<div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Purchased items</p>
								<h4 className="mt-1 text-base font-extrabold text-slate-900">Item timeline</h4>
							</div>
							<p className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{customer.lastPurchase ? formatDate(customer.lastPurchase) : 'No date'}</p>
						</div>

						<div className="mt-3 space-y-3">
							{customer.invoices.map((invoice, invoiceIndex) => (
								<div key={invoice.invoiceNumber} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
									<div className={`flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 ${invoiceIndex % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}`}>
										<div>
											<p className="text-sm font-medium text-slate-900">{formatDate(invoice.date)}</p>
											<p className="text-xs text-slate-500">{formatTime(invoice.time)}</p>
										</div>
										<p className="text-sm font-semibold text-slate-900">{formatMoney(invoice.total)}</p>
									</div>
									<div className="grid gap-2 p-3 sm:grid-cols-2">
										{invoice.items.map((item, itemIndex) => (
											<div key={`${invoice.invoiceNumber}-${itemIndex}`} className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
												<div className="flex items-center justify-between gap-3">
													<span className="text-sm font-medium text-slate-800">{item.product}</span>
													<span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-blue-700">Qty {item.quantity}</span>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</AppModal>
	);
}

export default function CustomerPartiesPage() {
	const [customerBills, setCustomerBills] = useState<SalesBillRecord[]>([]);
	const [viewCustomer, setViewCustomer] = useState<CustomerSummary | null>(null);
	const [expandedCustomerName, setExpandedCustomerName] = useState<string | null>(null);

	useEffect(() => {
		const handleLedgerChange: EventListener = () => {
			setCustomerBills(readStoredArray<SalesBillRecord>(SALES_BILLS_STORAGE_KEY).sort(sortByRecent));
		};

		handleLedgerChange();
		window.addEventListener('storage', handleLedgerChange);
		window.addEventListener(LEDGER_STORAGE_EVENT, handleLedgerChange);

		return () => {
			window.removeEventListener('storage', handleLedgerChange);
			window.removeEventListener(LEDGER_STORAGE_EVENT, handleLedgerChange);
		};
	}, []);

	const customerSummaries = useMemo<CustomerSummary[]>(() => {
		const grouped = new Map<string, SalesBillRecord[]>();

		customerBills.forEach((bill) => {
			const key = bill.customerName.trim() || 'Customer';
			grouped.set(key, [...(grouped.get(key) ?? []), bill]);
		});

		return [...grouped.entries()]
			.map(([name, invoices]) => {
				const ordered = [...invoices].sort(sortByRecent);
				return {
					name,
					contact: ordered[0]?.customerContact || 'No contact',
					invoices: ordered,
					totalSpent: ordered.reduce((sum, invoice) => sum + invoice.total, 0),
					totalItems: ordered.reduce((sum, invoice) => sum + invoice.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
					lastPurchase: ordered[0]?.date || '',
				};
			})
			.sort((left, right) => right.totalSpent - left.totalSpent || right.invoices.length - left.invoices.length);
	}, [customerBills]);

	const totalSpent = customerSummaries.reduce((sum, item) => sum + item.totalSpent, 0);

	const openCustomerView = (customer: CustomerSummary) => {
		setViewCustomer(customer);
	};

	const closeCustomerView = () => {
		setViewCustomer(null);
	};

	const toggleCustomerSummary = (customerName: string) => {
		setExpandedCustomerName((current) => (current === customerName ? null : customerName));
	};

	return (
		<AdminShell active="parties" title="Customers">
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
				<div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
					<div>
						<h2 className="text-lg font-bold text-slate-900">Customers</h2>
						<p className="text-xs text-slate-500">Same list style as sales with customer totals and purchase history.</p>
					</div>
				</div>

				<div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500 flex items-center justify-between">
					<span>{customerSummaries.length} customer{customerSummaries.length === 1 ? '' : 's'} in the list</span>
					<span>Total spent {formatMoney(totalSpent)}</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead className="bg-slate-50 border-b border-slate-200">
							<tr>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Customer</th>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Invoices</th>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Items</th>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Spent</th>
								<th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wide">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{customerSummaries.length ? (
								customerSummaries.map((customer) => (
									<Fragment key={customer.name}>
										<tr className="hover:bg-slate-50 transition-colors">
											<td className="px-4 py-3">
												<div className="font-semibold text-slate-800">{customer.name}</div>
												<div className="text-[11px] text-slate-500">Last: {customer.lastPurchase ? formatDate(customer.lastPurchase) : 'N/A'}</div>
											</td>
											<td className="px-4 py-3 font-semibold text-slate-700">{customer.invoices.length}</td>
											<td className="px-4 py-3 font-semibold text-slate-700">{customer.totalItems}</td>
											<td className="px-4 py-3 font-bold text-slate-900">{formatMoney(customer.totalSpent)}</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap items-center gap-2">
													<button type="button" onClick={() => toggleCustomerSummary(customer.name)} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-rose-100 active:translate-y-0 active:scale-95">
														{expandedCustomerName === customer.name ? 'Hide' : 'Show'} items
													</button>
													<button type="button" onClick={() => openCustomerView(customer)} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95">
														View
													</button>
												</div>
											</td>
										</tr>
										{expandedCustomerName === customer.name ? (
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
																{customer.invoices
																	.slice()
																	.sort(sortByRecent)
																	.flatMap((invoice) =>
																		invoice.items.map((item, itemIndex) => (
																			<tr key={`${invoice.invoiceNumber}-${itemIndex}`}>
																				<td className="px-3 py-2 text-slate-600">{formatDate(invoice.date)}</td>
																				<td className="px-3 py-2 font-medium text-slate-900">{item.product}</td>
																				<td className="px-3 py-2 text-center text-slate-700">{item.quantity}</td>
																				<td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(Number(item.price ?? 0))}</td>
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
										No customer invoices yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			{viewCustomer ? <CustomerViewModal customer={viewCustomer} onClose={closeCustomerView} /> : null}
		</AdminShell>
	);
}
