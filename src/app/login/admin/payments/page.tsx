'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../../components/admin-shell';
import { hasAdminSession, readStaffSession } from '../../../../lib/staff-auth';
import {
	LEDGER_STORAGE_EVENT,
	MANUAL_PAYMENTS_STORAGE_KEY,
	PURCHASES_STORAGE_KEY,
	SALES_BILLS_STORAGE_KEY,
	mapPurchaseToPaymentRecord,
	mapSaleBillToPaymentRecord,
	readStoredArray,
	type LedgerPaymentRecord,
	type PurchaseRecordLike,
	type SalesBillLike,
} from '../../../../lib/ledger-store';

type AutoPaymentSource = 'Sale' | 'Purchase' | 'Manual';

type AutoPaymentRow = LedgerPaymentRecord & {
	sourceType: AutoPaymentSource;
	entryLabel: string;
	referenceLabel: string;
};

const formatMoney = (value: number) => value.toFixed(2);

const formatDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	}).format(new Date(value));

const toTimestamp = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00`).getTime();

export default function AdminPaymentsPage({ readOnly = false }: { readOnly?: boolean }) {
	const router = useRouter();
	const [isHydrated, setIsHydrated] = useState(false);
	const [selectedDate, setSelectedDate] = useState('');
	const [salesBills, setSalesBills] = useState<SalesBillLike[]>([]);
	const [purchases, setPurchases] = useState<PurchaseRecordLike[]>([]);
	const [manualPayments, setManualPayments] = useState<LedgerPaymentRecord[]>([]);

	useEffect(() => {
		const staff = readStaffSession();
		if (!staff && !hasAdminSession()) {
			router.push('/login');
		}
	}, [router]);

	useEffect(() => {
		const loadPayments = () => {
			setSalesBills(readStoredArray<SalesBillLike>(SALES_BILLS_STORAGE_KEY));
			setPurchases(readStoredArray<PurchaseRecordLike>(PURCHASES_STORAGE_KEY));
			setManualPayments(readStoredArray<LedgerPaymentRecord>(MANUAL_PAYMENTS_STORAGE_KEY));
			setIsHydrated(true);
		};

		loadPayments();
		window.addEventListener(LEDGER_STORAGE_EVENT, loadPayments);
		window.addEventListener('storage', loadPayments);
		window.addEventListener('focus', loadPayments);

		return () => {
			window.removeEventListener(LEDGER_STORAGE_EVENT, loadPayments);
			window.removeEventListener('storage', loadPayments);
			window.removeEventListener('focus', loadPayments);
		};
	}, []);

	const rows = useMemo<AutoPaymentRow[]>(() => {
		const mappedSales = salesBills.map((bill) => {
			const payment = mapSaleBillToPaymentRecord(bill);
			return {
				...payment,
				sourceType: 'Sale' as const,
				entryLabel: 'Sales invoice',
				referenceLabel: bill.invoiceNumber,
			};
		});

		const mappedPurchases = purchases.map((purchase) => {
			const payment = mapPurchaseToPaymentRecord(purchase);
			return {
				...payment,
				sourceType: 'Purchase' as const,
				entryLabel: 'Purchase bill',
				referenceLabel: purchase.purchaseNumber,
			};
		});

		const mappedManual = manualPayments.map((payment) => ({
			...payment,
			sourceType: 'Manual' as const,
			entryLabel: 'Manual entry',
			referenceLabel: payment.paymentNumber,
		}));

		return [...mappedSales, ...mappedPurchases, ...mappedManual].sort(
			(left, right) => toTimestamp(right.date, right.time) - toTimestamp(left.date, left.time),
		);
	}, [manualPayments, purchases, salesBills]);

	const totals = useMemo(() => {
		return rows.reduce(
			(accumulator, row) => {
				if (row.sourceType === 'Sale') {
					accumulator.incoming += row.amount;
				} else if (row.sourceType === 'Purchase') {
					accumulator.outgoing += row.amount;
				} else {
					accumulator.manual += row.amount;
				}
				return accumulator;
			},
			{ incoming: 0, outgoing: 0, manual: 0 },
		);
	}, [rows]);

	const visibleRows = useMemo(() => {
		if (!selectedDate) return rows;
		return rows.filter((r) => r.date === selectedDate);
	}, [rows, selectedDate]);

	const visibleTotals = useMemo(() => {
		return visibleRows.reduce(
			(accumulator, row) => {
				if (row.sourceType === 'Sale') accumulator.incoming += row.amount;
				else if (row.sourceType === 'Purchase') accumulator.outgoing += row.amount;
				else accumulator.manual += row.amount;
				return accumulator;
			},
			{ incoming: 0, outgoing: 0, manual: 0 },
		);
	}, [visibleRows]);

	useEffect(() => {
		// default to newest row's date once hydrated
		if (!isHydrated) return;
		if (!selectedDate && rows.length) setSelectedDate(rows[0].date);
	}, [isHydrated, rows, selectedDate]);

	return (
		<AdminShell active="payments" title="Payments">
				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
						<div>
							<h2 className="text-lg font-bold text-slate-900">Automatic Payments</h2>
							<p className="text-xs text-slate-500">Sales, purchases, and manual entries are tracked here by date.</p>
						</div>
						<div className="flex items-center gap-2">
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
								className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>
							<button
								type="button"
								onClick={() => setSelectedDate('')}
								className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
							>
								All dates
							</button>
						</div>
					</div>
					<div className="px-4 py-3">
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
								<div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Sales</div>
									<div className="text-sm font-bold text-slate-900">{formatMoney(visibleTotals.incoming)}</div>
							</div>
							<div className="rounded-xl border border-rose-200 bg-white px-4 py-3">
								<div className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">Purchases</div>
									<div className="text-sm font-bold text-slate-900">{formatMoney(visibleTotals.outgoing)}</div>
							</div>
							<div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
								<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Entries</div>
									<div className="text-sm font-bold text-slate-900">{visibleRows.length}</div>
							</div>
						</div>
							<p className="mt-2 text-[11px] text-slate-500">
								{selectedDate ? `Showing all transactions for ${formatDate(selectedDate)}.` : 'Choose a date to view all transactions for that day.'}
							</p>
					</div>

					<div className="px-4 py-4">
						{!isHydrated ? (
							<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm font-semibold text-slate-600">
								Loading automatic payment records...
							</div>
							) : rows.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
								<p className="text-sm font-semibold text-slate-700">No automatic payments yet.</p>
								<p className="mt-1 text-xs text-slate-500">Create sales invoices or purchase records and they will appear here by date.</p>
							</div>
							) : visibleRows.length === 0 ? (
								<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
									<p className="text-sm font-semibold text-slate-700">No transactions for this date.</p>
									<p className="mt-1 text-xs text-slate-500">Choose another day or clear the filter to see all transactions.</p>
								</div>
						) : (
							<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
								<div className="overflow-x-auto">
									<table className="w-full text-left text-xs">
										<thead className="border-b border-slate-200 bg-slate-50">
											<tr>
												<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Date</th>
												<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Type</th>
												<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Party</th>
												<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Reference</th>
												<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600 text-right">Amount</th>
												<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Notes</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100">
											{visibleRows.map((row) => (
												<tr key={`${row.sourceType}-${row.paymentNumber}`} className="transition-colors hover:bg-slate-50">
													<td className="px-4 py-3">
														<div className="font-semibold text-slate-800">{formatDate(row.date)}</div>
														<div className="text-[11px] text-slate-500">{row.time}</div>
													</td>
													<td className="px-4 py-3">
														<span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${row.sourceType === 'Sale' ? 'bg-emerald-100 text-emerald-700' : row.sourceType === 'Purchase' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
															{row.sourceType}
														</span>
													</td>
													<td className="px-4 py-3">
														<div className="font-semibold text-slate-800">{row.party}</div>
														<div className="text-[11px] text-slate-500">{row.entryLabel}</div>
													</td>
													<td className="px-4 py-3 font-medium text-slate-700">{row.referenceLabel}</td>
													<td className={`px-4 py-3 font-bold text-right ${row.sourceType === 'Purchase' ? 'text-rose-700' : 'text-emerald-700'}`}>
														{row.sourceType === 'Purchase' ? '-' : ''}{formatMoney(row.amount)}
													</td>
													<td className="px-4 py-3 text-[12px] text-slate-600">{row.notes || '—'}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				</section>
			</AdminShell>
	);
}