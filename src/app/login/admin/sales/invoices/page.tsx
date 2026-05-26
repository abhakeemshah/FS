 'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readStaffSession, hasAdminSession, canCurrentStaffAccessModule } from '../../../../../lib/staff-auth';
import Link from 'next/link';
import { AdminShell } from '../../../../../components/admin-shell';
import { AppModal } from '../../../../../components/app-modal';
import {
	readStoredArray,
	writeStoredArray,
	createBlankForm,
	createBillRecord,
	buildPrintableBill,
	emptyLineItem,
	SALES_BILLS_STORAGE_KEY,
	formatDate,
	formatTime,
	formatMoney,
	paymentMethodOptions,
	type BillFormState,
	type BillRecord,
	type DraftLineItem,
} from '../../../../../lib/sales-utils';

import {
	CATALOG_PRODUCTS_STORAGE_KEY,
	CATALOG_STORAGE_EVENT,
	readStoredArray as readCatalogStoredArray,
	type CatalogProductRecord,
} from '../../../../../lib/catalog-store';

export default function AdminSalesInvoicesPage({ readOnly = false }: { readOnly?: boolean }) {
	const router = useRouter();

	useEffect(() => {
		const staff = readStaffSession();
		// Only redirect to login when there is no admin session AND no staff session.
		// Previously this redirected staff users back to login when admin session was absent.
		if (!staff && !hasAdminSession()) {
			router.push('/login');
		}
	}, [router]);

	const [isMounted, setIsMounted] = useState(false);
	const canEdit = isMounted && (hasAdminSession() || canCurrentStaffAccessModule('sales', 'edit'));

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalPhase, setModalPhase] = useState<'opening' | 'open' | 'closing' | null>(null);
	const [form, setForm] = useState<BillFormState>(createBlankForm());
	const [bills, setBills] = useState<BillRecord[]>([]);
	const [isBillsHydrated, setIsBillsHydrated] = useState(false);
	const [error, setError] = useState('');
	const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
	const [viewBill, setViewBill] = useState<BillRecord | null>(null);
	const [previewHtml, setPreviewHtml] = useState<string | null>(null);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<BillRecord | null>(null);
	const paymentMenuRef = useRef<HTMLDivElement | null>(null);
	const paymentMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const feedbackReadyRef = useRef(false);

	const cancelPaymentMenuClose = () => {
		if (paymentMenuCloseTimer.current) {
			clearTimeout(paymentMenuCloseTimer.current);
			paymentMenuCloseTimer.current = null;
		}
	};

	const schedulePaymentMenuClose = () => {
		cancelPaymentMenuClose();
		paymentMenuCloseTimer.current = setTimeout(() => {
			setIsPaymentMenuOpen(false);
			paymentMenuCloseTimer.current = null;
		}, 120);
	};

	useEffect(() => {
		const storedBills = readStoredArray<BillRecord>(SALES_BILLS_STORAGE_KEY);
		const normalizedBills = storedBills.map((bill, index) => ({
			...bill,
			billId: bill.billId ?? `${bill.invoiceNumber}-${bill.date}-${bill.time}-${index}`,
		}));

		setBills(normalizedBills);
		setIsBillsHydrated(true);

		if (normalizedBills.some((bill, index) => bill.billId !== storedBills[index]?.billId)) {
			writeStoredArray(SALES_BILLS_STORAGE_KEY, normalizedBills, { silent: !feedbackReadyRef.current });
		}
	}, []);

	useEffect(() => {
		if ((!isModalOpen && !viewBill && !deleteTarget) || typeof document === 'undefined') return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isModalOpen, modalPhase, viewBill, deleteTarget]);

	useEffect(() => {
		if (!isModalOpen || !isPaymentMenuOpen) return;

		const handleOutsideClick = (event: MouseEvent) => {
			if (!paymentMenuRef.current) return;
			if (!paymentMenuRef.current.contains(event.target as Node)) {
				setIsPaymentMenuOpen(false);
			}
		};

		document.addEventListener('mousedown', handleOutsideClick);
		return () => document.removeEventListener('mousedown', handleOutsideClick);
	}, [isModalOpen, isPaymentMenuOpen]);

	useEffect(() => {
		if (modalPhase !== 'opening') return;
		const timer = window.setTimeout(() => setModalPhase('open'), 16);
		return () => window.clearTimeout(timer);
	}, [modalPhase]);

	useEffect(() => {
		if (modalPhase !== 'closing') return;
		const timer = window.setTimeout(() => {
			setIsModalOpen(false);
			setModalPhase(null);
		}, 220);
		return () => window.clearTimeout(timer);
	}, [modalPhase]);

	useEffect(() => {
		if (!isBillsHydrated) return;
		writeStoredArray(SALES_BILLS_STORAGE_KEY, bills, { silent: !feedbackReadyRef.current });
	}, [bills, isBillsHydrated]);

	useEffect(() => {
		feedbackReadyRef.current = true;
	}, []);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const load = () => {
			const list = readCatalogStoredArray<CatalogProductRecord>(CATALOG_PRODUCTS_STORAGE_KEY);
			setProducts(list);
		};
		load();
		const onStorage = () => load();
		window.addEventListener(CATALOG_STORAGE_EVENT, onStorage);
		return () => window.removeEventListener(CATALOG_STORAGE_EVENT, onStorage);
	}, []);

	const totals = useMemo(() => {
		const subtotal = form.lineItems.reduce((sum, item) => {
			const quantity = Number(item.quantity);
			const price = Number(item.price);
			return sum + (Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0);
		}, 0);
		const discount = form.lineItems.reduce((sum, item) => {
			const value = Number(item.discount);
			return sum + (Number.isFinite(value) && value > 0 ? value : 0);
		}, 0);
		const profit = form.lineItems.reduce((sum, item) => {
			const quantity = Number(item.quantity);
			const price = Number(item.price);
			const costPrice = Number(item.costPrice);
			const discountValue = Number(item.discount);
			const sellingSubtotal = Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0;
			const sellingTotal = Math.max(sellingSubtotal - (Number.isFinite(discountValue) ? discountValue : 0), 0);
			const actualCost = Number.isFinite(quantity) && Number.isFinite(costPrice) ? quantity * costPrice : 0;
			return sum + (sellingTotal - actualCost);
		}, 0);
		return {
			bills: bills.length,
			total: bills.reduce((sum, bill) => sum + bill.total, 0),
			subtotal,
			discount,
			profit,
			grandTotal: Math.max(subtotal - discount, 0),
		};
	}, [bills, form.lineItems]);

	const draftLineItem = {
		...emptyLineItem(),
		...(form.draftLineItem ?? {}),
	};

	const [products, setProducts] = useState<CatalogProductRecord[]>([]);
	const [productSuggestions, setProductSuggestions] = useState<CatalogProductRecord[]>([]);
	const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

	const updateDraftLineItem = (key: keyof DraftLineItem, value: string) => {
		setForm((current) => ({
			...current,
			draftLineItem: { ...current.draftLineItem, [key]: value },
		}));
	};

	const selectProductSuggestion = (p: CatalogProductRecord) => {
		updateDraftLineItem('product', p.name);
		updateDraftLineItem('price', String(p.price));
		updateDraftLineItem('costPrice', String(p.costPrice));
		updateDraftLineItem('quantity', '1');
		setIsProductDropdownOpen(false);
		setProductSuggestions([]);
	};

	const addLineItem = () => {
		setError('');
		setForm((current) => {
			const draft = current.draftLineItem ?? emptyLineItem();
			const product = draft.product.trim();
			const quantity = Number(draft.quantity);
			const price = Number(draft.price);
			const costPrice = Number(draft.costPrice);
			const discount = Number(draft.discount);
			const hasCompleteValues =
				product.length > 0 &&
				Number.isFinite(quantity) &&
				quantity > 0 &&
				Number.isFinite(price) &&
				price > 0 &&
				Number.isFinite(costPrice) &&
				costPrice >= 0 &&
				Number.isFinite(discount) &&
				discount >= 0;

			if (!hasCompleteValues) {
				setError('Fill product, quantity, price, and actual price before adding the item.');
				return current;
			}

			return {
				...current,
				lineItems: [
					...current.lineItems,
					{ product, quantity: draft.quantity.trim(), price: draft.price.trim(), costPrice: draft.costPrice.trim(), discount: draft.discount.trim() },
				],
				draftLineItem: emptyLineItem(),
			};
		});
	};

	const removeLineItem = (index: number) => {
		setForm((current) => ({
			...current,
			lineItems: current.lineItems.filter((_, i) => i !== index),
		}));
	};

	const openNewSale = () => {
		setError('');
		setForm(createBlankForm());
		setIsPaymentMenuOpen(false);
		setIsModalOpen(true);
		setModalPhase('opening');
	};

	const closeModal = () => {
		if (!isModalOpen || modalPhase === 'closing' || modalPhase === null) return;
		setModalPhase('closing');
		setIsPaymentMenuOpen(false);
		setError('');
	};

	const saveBill = () => {
		setError('');
		if (!form.customerName.trim()) {
			setError('Customer name is required.');
			return;
		}
		if (!form.customerContact.trim()) {
			setError('Customer contact is required.');
			return;
		}

		const cleanedItems = form.lineItems.map((item) => ({
			product: item.product.trim(),
			quantity: Number(item.quantity),
			price: Number(item.price),
			costPrice: Number(item.costPrice),
			discount: Number(item.discount),
		}));

		if (!cleanedItems.length) {
			setError('Add at least one product.');
			return;
		}
		if (cleanedItems.some((item) => !item.product)) {
			setError('Every product row needs a product name.');
			return;
		}
		if (cleanedItems.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
			setError('Every product row needs a valid quantity.');
			return;
		}
		if (cleanedItems.some((item) => !Number.isFinite(item.price) || item.price <= 0)) {
			setError('Every product row needs a valid price.');
			return;
		}
		if (cleanedItems.some((item) => !Number.isFinite(item.costPrice) || item.costPrice < 0)) {
			setError('Every product row needs a valid actual price.');
			return;
		}
		if (cleanedItems.some((item) => !Number.isFinite(item.discount) || item.discount < 0)) {
			setError('Every product row needs a valid discount.');
			return;
		}

		const bill = createBillRecord({
			...form,
			lineItems: cleanedItems.map((item) => ({
				product: item.product,
				quantity: String(item.quantity),
				price: String(item.price),
				costPrice: String(item.costPrice),
				discount: String(item.discount),
			})),
		});

		setBills((current) => [bill, ...current]);
		setIsPaymentMenuOpen(false);
		closeModal();
	};

	const exportBill = (bill: BillRecord) => {
		console.log('exportBill invoked for', bill?.invoiceNumber);
		try {
			if (typeof document !== 'undefined' && bill?.invoiceNumber) {
				document.body.setAttribute('data-last-export', String(bill.invoiceNumber));
			}
		} catch (e) {
			// ignore
		}
		// Show printable preview in a modal with iframe (user can Print or Open in new tab)
		try {
			const html = buildPrintableBill(bill);
			setPreviewHtml(html);
			setIsPreviewOpen(true);
			try { if (typeof document !== 'undefined') document.body.setAttribute('data-print-step', 'preview-opened'); } catch (e) {}
		} catch (e) {
			setError('Export failed: ' + String(e));
		}
	};

	const openViewBill = (bill: BillRecord) => {
		setIsPaymentMenuOpen(false);
		setViewBill(bill);
	};

	const closeViewBill = () => {
		setViewBill(null);
	};

	const askDeleteBill = (bill: BillRecord) => {
		setIsPaymentMenuOpen(false);
		setDeleteTarget(bill);
	};

	const cancelDeleteBill = () => {
		setDeleteTarget(null);
	};

	const confirmDeleteBill = () => {
		if (!deleteTarget) return;
		setBills((current) => current.filter((bill) => bill.billId !== deleteTarget.billId));
		setDeleteTarget(null);
	};

	const choosePaymentMethod = (method: string) => {
		setForm((current) => ({ ...current, paymentMethod: method }));
		setIsPaymentMenuOpen(false);
	};

	return (
		<AdminShell active="sales" title="Sales">
			<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
					<div>
						<h2 className="text-lg font-bold text-slate-900">Sales</h2>
						<p className="text-xs text-slate-500">Create a bill, keep it in the list, and export any entry as PDF.</p>
					</div>
					{canEdit ? (
						<button type="button" onClick={openNewSale} className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95">
							New Bill
						</button>
					) : null}
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead className="border-b border-slate-200 bg-slate-50">
							<tr>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Invoice</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Customer</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Items</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Total</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{bills.length ? bills.map((bill) => (
								<tr key={bill.billId} className="transition-colors hover:bg-slate-50">
									<td className="px-4 py-3">
										<div className="font-bold text-slate-900">{bill.invoiceNumber}</div>
										<div className="text-[11px] text-slate-500">{formatDate(bill.date)} · {formatTime(bill.time)}</div>
									</td>
									<td className="px-4 py-3">
										<div className="font-semibold text-slate-700">{bill.customerName}</div>
										<div className="text-[11px] text-slate-500">{bill.customerContact}</div>
									</td>
									<td className="px-4 py-3 text-slate-700">{bill.items.length} item{bill.items.length === 1 ? '' : 's'}</td>
									<td className="px-4 py-3 font-bold text-slate-900">{formatMoney(bill.total)}</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap items-center gap-2">
											{canEdit ? (
												<button type="button" onClick={() => askDeleteBill(bill)} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-rose-100 active:translate-y-0 active:scale-95">
													Delete
												</button>
											) : null}
											<button type="button" onClick={() => exportBill(bill)} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95">
												Export PDF
											</button>
										</div>
									</td>
								</tr>
							)) : (
								<tr>
									<td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
										No bills created yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			{isModalOpen && (
				<AppModal
					open={isModalOpen}
					onClose={closeModal}
					overlayClassName="items-start"
					cardClassName={`sales-new-sale-card flex max-h-[calc(100dvh-2rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-300 shadow-2xl transition-all duration-200 ease-out sm:max-h-[92vh] ${
						modalPhase === 'opening' ? 'translate-y-4 scale-[0.96] opacity-0' : modalPhase === 'closing' ? 'translate-y-3 scale-[0.97] opacity-0' : 'translate-y-0 scale-100 opacity-100'
					}`}
				>
						<div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
							<h3 className="text-sm font-extrabold tracking-tight text-slate-900">Create Customer Invoice</h3>
							<button type="button" onClick={closeModal} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-rose-100 active:translate-y-0 active:scale-95">
								Close
							</button>
						</div>
					<div className="flex-1 overflow-y-auto bg-white p-3 sm:p-4">
							<div className="space-y-4">
								<div className="space-y-2 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
									<h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">Customer Details</h4>
									<input disabled={readOnly} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" placeholder="Customer Name" value={form.customerName} onChange={(e) => setForm((c) => ({ ...c, customerName: e.target.value }))} />
									<input disabled={readOnly} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" placeholder="Customer Contact" value={form.customerContact} onChange={(e) => setForm((c) => ({ ...c, customerContact: e.target.value }))} />
									<div className="relative" ref={paymentMenuRef} onMouseEnter={() => { if (!readOnly) { cancelPaymentMenuClose(); setIsPaymentMenuOpen(true); } }} onMouseLeave={schedulePaymentMenuClose}>
										<button type="button" onClick={() => { cancelPaymentMenuClose(); setIsPaymentMenuOpen((c) => !c); }} disabled={readOnly} className="flex h-10 w-full items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3 text-left text-[13px] font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow focus:border-blue-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" aria-haspopup="listbox" aria-expanded={isPaymentMenuOpen}>
											<span>{form.paymentMethod}</span>
											<span className="pointer-events-none text-slate-500">{isPaymentMenuOpen ? '▴' : '▾'}</span>
										</button>
										{isPaymentMenuOpen && (
											<div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]" onMouseEnter={cancelPaymentMenuClose} onMouseLeave={schedulePaymentMenuClose}>
												<ul role="listbox" className="max-h-52 overflow-auto py-0.5">
													{paymentMethodOptions.map((method) => (
														<li key={method}>
															<button type="button" onClick={() => { cancelPaymentMenuClose(); choosePaymentMethod(method); }} disabled={readOnly} className={`w-full px-2.5 py-1.5 text-left text-[12px] leading-4 transition-colors ${form.paymentMethod === method ? 'bg-blue-600 font-semibold text-white' : 'text-slate-700 hover:bg-blue-50'}`} role="option" aria-selected={form.paymentMethod === method}>
																{method}
															</button>
														</li>
													))}
												</ul>
											</div>
										)}
									</div>
									<div className="space-y-2 rounded-2xl border border-slate-300 bg-blue-50/60 p-4 shadow-sm">
										<h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">Products</h4>
										<div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-white p-3">
											<div className="relative min-w-0 flex-1">
												<input
													className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
													placeholder="Product"
													value={draftLineItem.product}
													onChange={(e) => {
														updateDraftLineItem('product', e.target.value);
														const q = e.target.value.trim().toLowerCase();
														if (q.length) {
															setProductSuggestions(products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8));
															setIsProductDropdownOpen(true);
														} else {
															setProductSuggestions([]);
															setIsProductDropdownOpen(false);
														}
													}}
													onFocus={() => {
													setProductSuggestions(products.slice(0, 8));
													setIsProductDropdownOpen(true);
													}}
													onBlur={() => setTimeout(() => setIsProductDropdownOpen(false), 150)}
												/>
												{isProductDropdownOpen && productSuggestions.length > 0 ? (
													<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
														{productSuggestions.map((p) => (
															<button
																key={p.id}
																onMouseDown={(e) => {
																	e.preventDefault();
																	selectProductSuggestion(p);
																}}
																className="w-full px-3 py-2 text-left text-[13px] hover:bg-slate-50"
															>
																<div className="font-medium text-slate-800">{p.name}</div>
																<div className="text-xs text-slate-500">SKU: {p.sku} · {p.stock} in stock</div>
															</button>
														))}
													</div>
												) : null}
											</div>
											<input type="number" min="1" className="w-20 min-w-[4.5rem] h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" placeholder="Qty" value={draftLineItem.quantity} onChange={(e) => updateDraftLineItem('quantity', e.target.value)} />
											<input type="text" inputMode="decimal" className="w-28 min-w-[6.5rem] h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" placeholder="Price" value={draftLineItem.price} onChange={(e) => updateDraftLineItem('price', e.target.value)} />
											<input type="text" inputMode="decimal" className="w-28 min-w-[6.5rem] h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" placeholder="Cost" value={draftLineItem.costPrice} onChange={(e) => updateDraftLineItem('costPrice', e.target.value)} />
											<input type="number" min="0" step="0.01" className="w-24 min-w-[5.5rem] h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" placeholder="Discount" value={draftLineItem.discount} onChange={(e) => updateDraftLineItem('discount', e.target.value)} />
											{canEdit ? (
												<div className="ml-auto flex-shrink-0">
													<button type="button" onClick={addLineItem} className="h-10 rounded-xl border border-blue-600 bg-blue-600 px-3 text-[11px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-blue-700 active:translate-y-0 active:scale-95">Add</button>
												</div>
											) : null}
										</div>
										{form.lineItems.length > 0 && (
											<div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-300 bg-white">
												{form.lineItems.map((item, idx) => (
													<div key={idx} className="flex flex-wrap items-center gap-2 px-3 py-3">
														<div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium">{item.product}</div>
														<div className="w-20 min-w-[4.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium">{item.quantity}</div>
														<div className="w-28 min-w-[6.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium">{item.price}</div>
														<div className="w-28 min-w-[6.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium">{item.costPrice}</div>
														<div className="w-24 min-w-[5.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium">{item.discount}</div>
														{canEdit ? (
															<div className="flex-shrink-0">
																<button type="button" onClick={() => removeLineItem(idx)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 active:translate-y-0 active:scale-95">Remove</button>
															</div>
														) : null}
													</div>
												))}
											</div>
										)}
										<div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
											<span className="text-[9px] font-semibold uppercase text-slate-600">Amount</span>
											<span className="text-xl font-black text-slate-900">{totals.grandTotal.toFixed(2)}</span>
										</div>
										<div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
											<span className="text-[9px] font-semibold uppercase text-emerald-700">Profit</span>
											<span className="text-xl font-black text-emerald-900">{totals.profit.toFixed(2)}</span>
										</div>
										{error && <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">{error}</div>}
									</div>
								</div>
								<div className="sales-footer-surface sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-sm sm:px-4">
									<button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[11px] font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 active:translate-y-0 active:scale-95">Cancel</button>
									{canEdit ? (
										<button type="button" onClick={saveBill} className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-blue-700 active:translate-y-0 active:scale-95">Save Bill</button>
									) : null}
								</div>
							</div>
						</div>
				</AppModal>
			)}

			{viewBill && (
				<AppModal open={Boolean(viewBill)} onClose={closeViewBill} cardClassName="w-full max-w-3xl max-h-[86vh] overflow-hidden">
					<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
						<div>
							<h3 className="text-sm font-bold text-slate-900">Invoice View</h3>
							<p className="text-[11px] text-slate-500">Read-only bill details</p>
						</div>
						<button type="button" onClick={closeViewBill} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
							Close
						</button>
					</div>
					<div className="max-h-[calc(86vh-72px)] space-y-4 overflow-y-auto p-4">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="rounded-xl border border-slate-200 bg-white p-3">
								<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Invoice</div>
								<div className="mt-1 text-sm font-bold text-slate-900">{viewBill.invoiceNumber}</div>
								<div className="mt-1 text-xs text-slate-600">{formatDate(viewBill.date)} · {formatTime(viewBill.time)}</div>
							</div>
							<div className="rounded-xl border border-slate-200 bg-white p-3">
								<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Customer</div>
								<div className="mt-1 text-sm font-semibold text-slate-900">{viewBill.customerName}</div>
								<div className="text-xs text-slate-600">{viewBill.customerContact}</div>
								<div className="mt-1 text-xs text-slate-600">Payment: {viewBill.paymentMethod}</div>
							</div>
						</div>
						<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
							<table className="w-full text-left text-xs">
								<thead className="border-b border-slate-200 bg-slate-50">
									<tr>
										<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Product</th>
										<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Qty</th>
										<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Price</th>
										<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Discount</th>
										<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Total</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{viewBill.items.map((item, idx) => (
										<tr key={idx}>
											<td className="px-3 py-2 text-slate-800">{item.product}</td>
											<td className="px-3 py-2 text-slate-700">{item.quantity}</td>
											<td className="px-3 py-2 text-slate-700">{formatMoney(item.price)}</td>
											<td className="px-3 py-2 text-slate-700">{formatMoney(item.discount)}</td>
											<td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(item.total)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="ml-auto w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-slate-600">Subtotal</span>
								<span className="font-semibold text-slate-900">{formatMoney(viewBill.subtotal)}</span>
							</div>
							<div className="mt-1 flex items-center justify-between">
								<span className="text-slate-600">Discount</span>
								<span className="font-semibold text-slate-900">{formatMoney(viewBill.discount)}</span>
							</div>
							<div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
								<span className="font-bold text-slate-700">Amount</span>
								<span className="text-lg font-black text-slate-900">{formatMoney(viewBill.total)}</span>
							</div>
						</div>
					</div>
				</AppModal>
			)}

			{isPreviewOpen && previewHtml && (
				<AppModal open={isPreviewOpen} onClose={() => { setIsPreviewOpen(false); setPreviewHtml(null); }} cardClassName="w-full max-w-4xl max-h-[90vh] overflow-hidden">
					<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
						<div>
							<h3 className="text-sm font-bold text-slate-900">Printable Preview</h3>
							<p className="text-[11px] text-slate-500">Preview the printable layout. Use Print or Open in New Tab.</p>
						</div>
						<div className="flex items-center gap-2">
							<button type="button" onClick={() => {
								const w = window.open('', '_blank');
								if (!w) { setError('Popup blocked. Allow popups to open printable.'); return; }
								w.document.open(); w.document.write(previewHtml); w.document.close(); w.focus();
							}} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold">Open in New Tab</button>
							<button type="button" onClick={() => {
								const iframe = document.getElementById('print-preview-iframe') as HTMLIFrameElement | null;
								if (iframe && iframe.contentWindow) {
									try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (err) { setError('Print failed: ' + String(err)); }
								}
							}} className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Print</button>
							<button type="button" onClick={() => { setIsPreviewOpen(false); setPreviewHtml(null); }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Close</button>
						</div>
					</div>
					<div className="max-h-[calc(90vh-72px)] overflow-auto p-3 bg-white">
						<iframe id="print-preview-iframe" title="Printable Preview" srcDoc={previewHtml} style={{width:'100%',height:'70vh',border:'1px solid #e2e8f0',borderRadius:8}} />
					</div>
				</AppModal>
			)}

			{deleteTarget && (
				<AppModal open={Boolean(deleteTarget)} onClose={cancelDeleteBill} cardClassName="w-full max-w-sm">
					<div className="p-4">
						<h3 className="text-sm font-bold text-slate-900">Delete Invoice?</h3>
						<p className="mt-1 text-xs text-slate-600">
							Delete <span className="font-semibold text-slate-800">{deleteTarget.invoiceNumber}</span> for{' '}
							<span className="font-semibold text-slate-800">{deleteTarget.customerName}</span>?
						</p>
						<p className="mt-1 text-[11px] text-rose-700">This action cannot be undone.</p>
						<div className="mt-4 flex items-center justify-end gap-2">
							<button type="button" onClick={cancelDeleteBill} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
								Cancel
							</button>
							{canEdit ? (
								<button type="button" onClick={confirmDeleteBill} className="rounded-lg border border-rose-600 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
									Delete
								</button>
							) : null}
						</div>
					</div>
				</AppModal>
			)}
		</AdminShell>
	);
}
