'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminShell } from '../../../../components/admin-shell';
import { AppModal } from '../../../../components/app-modal';
import { PURCHASES_STORAGE_KEY, readStoredArray, writeStoredArray } from '../../../../lib/ledger-store';

type PurchaseDraftLineItem = {
	product: string;
	boxes: string;
	piecesPerBox: string;
	loosePieces: string;
	unitCost: string;
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

type PurchaseFormState = {
	supplierName: string;
	supplierContact: string;
	sourceName: string;
	purchaseReference: string;
	purchaseDate: string;
	purchaseTime: string;
	paymentMethod: string;
	status: string;
	transportCost: string;
	notes: string;
	draftLineItem: PurchaseDraftLineItem;
	lineItems: PurchaseDraftLineItem[];
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

const paymentMethodOptions = ['Cash', 'Bank Transfer', 'Cheque', 'Mobile Wallet'];
const sourceOptions = ['Local Market', 'Distributor', 'Factory', 'Wholesale Shop', 'Online Vendor'];
const statusOptions = ['Received', 'Partially Received', 'Pending'];

let purchaseSequence = 1;

const formatDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	}).format(new Date(value));

const formatTime = (value: string) => value;

const formatMoney = (value: number) => value.toFixed(2);

const formatDateInputValue = (value: Date) => value.toISOString().slice(0, 10);

const formatTimeInputValue = (value: Date) => value.toTimeString().slice(0, 5);

const emptyDraftLineItem = (): PurchaseDraftLineItem => ({
	product: '',
	boxes: '0',
	piecesPerBox: '1',
	loosePieces: '0',
	unitCost: '',
});

const createBlankForm = (): PurchaseFormState => {
	const now = new Date();

	return {
		supplierName: '',
		supplierContact: '',
		sourceName: sourceOptions[0],
		purchaseReference: '',
		purchaseDate: formatDateInputValue(now),
		purchaseTime: formatTimeInputValue(now),
		paymentMethod: paymentMethodOptions[0],
		status: statusOptions[0],
		transportCost: '0',
		notes: '',
		draftLineItem: emptyDraftLineItem(),
		lineItems: [],
	};
};

const escapeHtml = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

const createPurchaseRecord = (form: PurchaseFormState): PurchaseRecord => {
	const items = form.lineItems.map((item) => {
		const boxes = Number(item.boxes);
		const piecesPerBox = Number(item.piecesPerBox);
		const loosePieces = Number(item.loosePieces);
		const unitCost = Number(item.unitCost);
		const totalUnits = Math.max((Number.isFinite(boxes) ? boxes : 0) * (Number.isFinite(piecesPerBox) ? piecesPerBox : 0) + (Number.isFinite(loosePieces) ? loosePieces : 0), 0);
		const lineTotal = Math.max(totalUnits * (Number.isFinite(unitCost) ? unitCost : 0), 0);

		return {
			product: item.product.trim(),
			boxes: Number.isFinite(boxes) ? boxes : 0,
			piecesPerBox: Number.isFinite(piecesPerBox) ? piecesPerBox : 0,
			loosePieces: Number.isFinite(loosePieces) ? loosePieces : 0,
			unitCost: Number.isFinite(unitCost) ? unitCost : 0,
			totalUnits,
			lineTotal,
		};
	});

	const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
	const totalUnits = items.reduce((sum, item) => sum + item.totalUnits, 0);
	const transportCost = Number(form.transportCost);
	const total = Math.max(subtotal + (Number.isFinite(transportCost) ? transportCost : 0), 0);

	return {
		purchaseNumber: `PUR-${String(purchaseSequence++).padStart(3, '0')}`,
		createdAt: new Date().toISOString(),
		supplierName: form.supplierName.trim(),
		supplierContact: form.supplierContact.trim(),
		sourceName: form.sourceName.trim(),
		purchaseReference: form.purchaseReference.trim(),
		purchaseDate: form.purchaseDate,
		purchaseTime: form.purchaseTime,
		paymentMethod: form.paymentMethod,
		status: form.status,
		transportCost: Number.isFinite(transportCost) ? transportCost : 0,
		notes: form.notes.trim(),
		items,
		subtotal,
		totalUnits,
		total,
	};
};

const calculateDraftPurchaseTotals = (form: PurchaseFormState) => {
	const lineSubtotal = form.lineItems.reduce((sum, item) => {
		const boxes = Number(item.boxes);
		const piecesPerBox = Number(item.piecesPerBox);
		const loosePieces = Number(item.loosePieces);
		const unitCost = Number(item.unitCost);
		const totalUnits = (Number.isFinite(boxes) ? boxes : 0) * (Number.isFinite(piecesPerBox) ? piecesPerBox : 0) + (Number.isFinite(loosePieces) ? loosePieces : 0);
		const lineTotal = Math.max(totalUnits * (Number.isFinite(unitCost) ? unitCost : 0), 0);

		return sum + lineTotal;
	}, 0);

	const totalUnits = form.lineItems.reduce((sum, item) => {
		const boxes = Number(item.boxes);
		const piecesPerBox = Number(item.piecesPerBox);
		const loosePieces = Number(item.loosePieces);
		return sum + ((Number.isFinite(boxes) ? boxes : 0) * (Number.isFinite(piecesPerBox) ? piecesPerBox : 0) + (Number.isFinite(loosePieces) ? loosePieces : 0));
	}, 0);

	const transportCost = Number(form.transportCost);

	return {
		totalUnits,
		subtotal: lineSubtotal,
		total: Math.max(lineSubtotal + (Number.isFinite(transportCost) ? transportCost : 0), 0),
	};
};

const buildPrintablePurchase = (purchase: PurchaseRecord) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${escapeHtml(purchase.purchaseNumber)} - Purchase Invoice</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
		h1 { margin: 0; font-size: 22px; }
		.header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
		.meta, .summary { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
		.meta { min-width: 260px; }
		table { width: 100%; border-collapse: collapse; margin-top: 16px; }
		th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 13px; }
		th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
		.summary { margin-top: 16px; margin-left: auto; width: 300px; }
		.row { display: flex; justify-content: space-between; margin-top: 8px; }
		.total { border-top: 1px solid #cbd5e1; margin-top: 10px; padding-top: 10px; font-weight: 700; }
		.note { margin-top: 12px; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 12px; color: #475569; font-size: 13px; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<h1>Purchase Invoice</h1>
			<div>Invoice: ${escapeHtml(purchase.purchaseNumber)}</div>
			<div>Reference: ${escapeHtml(purchase.purchaseReference || 'N/A')}</div>
			<div>Date: ${escapeHtml(formatDate(purchase.purchaseDate))} ${escapeHtml(formatTime(purchase.purchaseTime))}</div>
		</div>
		<div class="meta">
			<div><strong>Supplier:</strong> ${escapeHtml(purchase.supplierName)}</div>
			<div><strong>Contact:</strong> ${escapeHtml(purchase.supplierContact || 'N/A')}</div>
			<div><strong>Source:</strong> ${escapeHtml(purchase.sourceName)}</div>
			<div><strong>Payment:</strong> ${escapeHtml(purchase.paymentMethod)}</div>
			<div><strong>Status:</strong> ${escapeHtml(purchase.status)}</div>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th>Product</th>
				<th>Boxes</th>
				<th>Pieces / Box</th>
				<th>Loose</th>
				<th>Total Units</th>
				<th>Unit Cost</th>
				<th>Line Total</th>
			</tr>
		</thead>
		<tbody>
			${purchase.items
				.map(
					(item) => `
					<tr>
						<td>${escapeHtml(item.product)}</td>
						<td>${item.boxes}</td>
						<td>${item.piecesPerBox}</td>
						<td>${item.loosePieces}</td>
						<td>${item.totalUnits}</td>
						<td>${formatMoney(item.unitCost)}</td>
						<td>${formatMoney(item.lineTotal)}</td>
					</tr>`,
				)
				.join('')}
		</tbody>
	</table>

	<div class="summary">
		<div class="row"><span>Total Units</span><span>${purchase.totalUnits}</span></div>
		<div class="row"><span>Subtotal</span><span>${formatMoney(purchase.subtotal)}</span></div>
		<div class="row"><span>Transport</span><span>${formatMoney(purchase.transportCost)}</span></div>
		<div class="row total"><span>Grand Total</span><span>${formatMoney(purchase.total)}</span></div>
	</div>

	${purchase.notes ? `<div class="note"><strong>Notes:</strong> ${escapeHtml(purchase.notes)}</div>` : ''}
</body>
</html>`;

export default function AdminPurchasesPage() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalPhase, setModalPhase] = useState<'opening' | 'open' | 'closing' | null>(null);
	const [form, setForm] = useState<PurchaseFormState>(createBlankForm());
	const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
	const [hasLoadedPurchases, setHasLoadedPurchases] = useState(false);
	const [error, setError] = useState('');
	const [viewPurchase, setViewPurchase] = useState<PurchaseRecord | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<PurchaseRecord | null>(null);
	const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
	const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
	const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
	const sourceMenuRef = useRef<HTMLDivElement | null>(null);
	const paymentMenuRef = useRef<HTMLDivElement | null>(null);
	const statusMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if ((!isModalOpen && modalPhase === null && !viewPurchase && !deleteTarget) || typeof document === 'undefined') return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isModalOpen, modalPhase, viewPurchase, deleteTarget]);

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
		if (!isModalOpen) return;

		const handleOutsideClick = (event: MouseEvent) => {
			const targetNode = event.target as Node;
			if (sourceMenuRef.current && !sourceMenuRef.current.contains(targetNode)) {
				setIsSourceMenuOpen(false);
			}
			if (paymentMenuRef.current && !paymentMenuRef.current.contains(targetNode)) {
				setIsPaymentMenuOpen(false);
			}
			if (statusMenuRef.current && !statusMenuRef.current.contains(targetNode)) {
				setIsStatusMenuOpen(false);
			}
		};

		document.addEventListener('mousedown', handleOutsideClick);
		return () => document.removeEventListener('mousedown', handleOutsideClick);
	}, [isModalOpen]);

	useEffect(() => {
		const storedPurchases = readStoredArray<PurchaseRecord>(PURCHASES_STORAGE_KEY);
		setPurchases(storedPurchases);
		setHasLoadedPurchases(true);

		const highestSequence = storedPurchases.reduce((highest, purchase) => {
			const match = purchase.purchaseNumber.match(/^PUR-(\d+)$/);
			if (!match) return highest;

			const value = Number(match[1]);
			return Number.isFinite(value) ? Math.max(highest, value) : highest;
		}, 0);

		purchaseSequence = highestSequence + 1;
	}, []);

	useEffect(() => {
		if (!hasLoadedPurchases) return;
		writeStoredArray(PURCHASES_STORAGE_KEY, purchases);
	}, [hasLoadedPurchases, purchases]);

	const draftTotals = useMemo(() => calculateDraftPurchaseTotals(form), [form]);

	const draftLineItem = {
		...emptyDraftLineItem(),
		...(form.draftLineItem ?? {}),
	};

	const updateDraftLineItem = (key: keyof PurchaseDraftLineItem, value: string) => {
		setForm((current) => ({
			...current,
			draftLineItem: {
				...current.draftLineItem,
				[key]: value,
			},
		}));
	};

	const addLineItem = () => {
		setError('');
		setForm((current) => {
			const draft = current.draftLineItem ?? emptyDraftLineItem();
			const product = draft.product.trim();
			const boxes = Number(draft.boxes);
			const piecesPerBox = Number(draft.piecesPerBox);
			const loosePieces = Number(draft.loosePieces);
			const unitCost = Number(draft.unitCost);
			const totalUnits = (Number.isFinite(boxes) ? boxes : 0) * (Number.isFinite(piecesPerBox) ? piecesPerBox : 0) + (Number.isFinite(loosePieces) ? loosePieces : 0);
			const isValid =
				product.length > 0 &&
				Number.isFinite(boxes) &&
				boxes >= 0 &&
				Number.isFinite(piecesPerBox) &&
				piecesPerBox > 0 &&
				Number.isFinite(loosePieces) &&
				loosePieces >= 0 &&
				Number.isFinite(unitCost) &&
				unitCost > 0 &&
				totalUnits > 0;

			if (!isValid) {
				setError('Fill product, boxes, pieces, loose quantity, and unit cost before adding the item.');
				return current;
			}

			return {
				...current,
				lineItems: [
					...current.lineItems,
					{
						product,
						boxes: String(boxes),
						piecesPerBox: String(piecesPerBox),
						loosePieces: String(loosePieces),
						unitCost: String(unitCost),
					},
				],
				draftLineItem: emptyDraftLineItem(),
			};
		});
	};

	const removeLineItem = (index: number) => {
		setForm((current) => ({
			...current,
			lineItems: current.lineItems.filter((_, lineIndex) => lineIndex !== index),
		}));
	};

	const openNewPurchase = () => {
		setError('');
		setForm(createBlankForm());
		setIsSourceMenuOpen(false);
		setIsPaymentMenuOpen(false);
		setIsStatusMenuOpen(false);
		setIsModalOpen(true);
		setModalPhase('opening');
	};

	const closeModal = () => {
		if (!isModalOpen || modalPhase === 'closing' || modalPhase === null) return;
		setModalPhase('closing');
		setIsSourceMenuOpen(false);
		setIsPaymentMenuOpen(false);
		setIsStatusMenuOpen(false);
		setError('');
	};

	const savePurchase = () => {
		setError('');

		if (!form.supplierName.trim()) {
			setError('Supplier name is required.');
			return;
		}

		if (!form.sourceName.trim()) {
			setError('Source name is required.');
			return;
		}

		const cleanedItems = form.lineItems.map((item) => ({
			product: item.product.trim(),
			boxes: Number(item.boxes),
			piecesPerBox: Number(item.piecesPerBox),
			loosePieces: Number(item.loosePieces),
			unitCost: Number(item.unitCost),
		}));

		if (!cleanedItems.length) {
			setError('Add at least one product line.');
			return;
		}

		if (cleanedItems.some((item) => !item.product)) {
			setError('Every product row needs a product name.');
			return;
		}

		if (cleanedItems.some((item) => !Number.isFinite(item.boxes) || item.boxes < 0)) {
			setError('Every product row needs a valid box count.');
			return;
		}

		if (cleanedItems.some((item) => !Number.isFinite(item.piecesPerBox) || item.piecesPerBox <= 0)) {
			setError('Every product row needs a valid pieces-per-box value.');
			return;
		}

		if (cleanedItems.some((item) => !Number.isFinite(item.loosePieces) || item.loosePieces < 0)) {
			setError('Every product row needs a valid loose quantity.');
			return;
		}

		if (cleanedItems.some((item) => !Number.isFinite(item.unitCost) || item.unitCost <= 0)) {
			setError('Every product row needs a valid unit cost.');
			return;
		}

		const purchase = createPurchaseRecord({
			...form,
			lineItems: cleanedItems.map((item) => ({
				product: item.product,
				boxes: String(item.boxes),
				piecesPerBox: String(item.piecesPerBox),
				loosePieces: String(item.loosePieces),
				unitCost: String(item.unitCost),
			})),
		});

		setPurchases((current) => [purchase, ...current]);
		closeModal();
	};

	const exportPurchase = (purchase: PurchaseRecord) => {
		const printWindow = window.open('', '_blank', 'width=980,height=1200');

		if (!printWindow) {
			setError('Popup blocked. Allow popups to export the invoice.');
			return;
		}

		printWindow.document.open();
		printWindow.document.write(buildPrintablePurchase(purchase));
		printWindow.document.close();
		printWindow.focus();
		printWindow.onafterprint = () => printWindow.close();
		setTimeout(() => printWindow.print(), 250);
	};

	const askDeletePurchase = (purchase: PurchaseRecord) => {
		setDeleteTarget(purchase);
	};

	const cancelDeletePurchase = () => {
		setDeleteTarget(null);
	};

	const confirmDeletePurchase = () => {
		if (!deleteTarget) return;
		setPurchases((current) => current.filter((purchase) => purchase.purchaseNumber !== deleteTarget.purchaseNumber));
		setDeleteTarget(null);
	};

	const openViewPurchase = (purchase: PurchaseRecord) => {
		setViewPurchase(purchase);
	};

	const closeViewPurchase = () => {
		setViewPurchase(null);
	};

	const chooseSource = (value: string) => {
		setForm((current) => ({ ...current, sourceName: value }));
		setIsSourceMenuOpen(false);
	};

	const choosePaymentMethod = (value: string) => {
		setForm((current) => ({ ...current, paymentMethod: value }));
		setIsPaymentMenuOpen(false);
	};

	const chooseStatus = (value: string) => {
		setForm((current) => ({ ...current, status: value }));
		setIsStatusMenuOpen(false);
	};

	return (
		<AdminShell active="purchases" title="Purchases">
			<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
					<div>
						<h2 className="text-lg font-bold text-slate-900">Purchase Tracker</h2>
						<p className="text-xs text-slate-500">Track supplier buys, quantities, box counts, pricing, and export.</p>
					</div>
					<button
						type="button"
						onClick={openNewPurchase}
						className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95"
					>
						New Purchase
					</button>
				</div>

				<div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500 flex items-center justify-between">
					<span>{purchases.length} purchase{purchases.length === 1 ? '' : 's'} in the list</span>
					<span>Total value {formatMoney(purchases.reduce((sum, purchase) => sum + purchase.total, 0))}</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead className="border-b border-slate-200 bg-slate-50">
							<tr>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Purchase</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Supplier</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Source</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Quantity</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Total</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Status</th>
								<th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{purchases.length ? (
								purchases.map((purchase) => (
									<tr key={purchase.purchaseNumber} className="transition-colors hover:bg-slate-50">
										<td className="px-4 py-3">
											<div className="font-bold text-slate-900">{purchase.purchaseNumber}</div>
											<div className="text-[11px] text-slate-500">{formatDate(purchase.purchaseDate)} · {formatTime(purchase.purchaseTime)}</div>
										</td>
										<td className="px-4 py-3">
											<div className="font-semibold text-slate-700">{purchase.supplierName}</div>
											<div className="text-[11px] text-slate-500">{purchase.purchaseReference || 'No reference'}</div>
										</td>
										<td className="px-4 py-3 text-slate-700">{purchase.sourceName}</td>
										<td className="px-4 py-3 text-slate-700">{purchase.totalUnits} units</td>
										<td className="px-4 py-3 font-bold text-slate-900">{formatMoney(purchase.total)}</td>
										<td className="px-4 py-3">
											<span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tighter ${purchase.status === 'Received' ? 'bg-slate-900 text-white' : purchase.status === 'Partially Received' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
												{purchase.status}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap items-center gap-2">
												<button type="button" onClick={() => openViewPurchase(purchase)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-slate-50 active:translate-y-0 active:scale-95">View</button>
												<button type="button" onClick={() => exportPurchase(purchase)} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95">Export PDF</button>
												<button type="button" onClick={() => askDeletePurchase(purchase)} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-rose-100 active:translate-y-0 active:scale-95">Delete</button>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={7}>
										No purchase invoices yet. Click New Purchase to track the first buy-in.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			<AppModal open={isModalOpen && modalPhase !== 'closing'} onClose={closeModal} overlayClassName={`transition-opacity duration-200 ease-out ${modalPhase === 'closing' ? 'opacity-0' : 'opacity-100'}`} overlayStyle={{ zIndex: 2147483647 }} cardClassName={`purchases-modal-card sales-new-sale-card w-full max-w-5xl max-h-[92vh] overflow-hidden transition-all duration-200 ease-out ${modalPhase === 'opening' ? 'translate-y-4 scale-[0.96] opacity-0' : modalPhase === 'closing' ? 'translate-y-3 scale-[0.97] opacity-0' : 'translate-y-0 scale-100 opacity-100'}`}>
						<div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
							<div>
								<h3 className="text-sm font-extrabold tracking-tight text-slate-900">Create Purchase Invoice</h3>
							</div>
							<button type="button" onClick={closeModal} className="rounded-lg border border-rose-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-200 active:translate-y-0 active:scale-95">Close</button>
						</div>

						<div className="max-h-[calc(92vh-120px)] overflow-y-auto bg-white p-4">
							<div className="space-y-4">
								<div className="space-y-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
									<h4 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Supplier & Source</h4>
									<div className="grid gap-3 sm:grid-cols-2">
										<label className="space-y-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Supplier Name</span>
											<input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={form.supplierName} onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))} placeholder="Supplier or vendor name" />
										</label>
										<label className="space-y-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Supplier Contact</span>
											<input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={form.supplierContact} onChange={(event) => setForm((current) => ({ ...current, supplierContact: event.target.value }))} placeholder="Phone or email" />
										</label>
									</div>
									<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										<label className="space-y-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Source</span>
											<div className="relative" ref={sourceMenuRef}>
												<button type="button" onClick={() => setIsSourceMenuOpen((current) => !current)} className="w-full rounded-lg border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3 py-2 text-left text-xs font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" aria-haspopup="listbox" aria-expanded={isSourceMenuOpen}>
													<span>{form.sourceName}</span>
													<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{isSourceMenuOpen ? '▴' : '▾'}</span>
												</button>
												{isSourceMenuOpen ? (
													<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-blue-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]">
														<ul role="listbox" className="max-h-60 overflow-auto py-1">
															{sourceOptions.map((item) => {
																const isActive = form.sourceName === item;
																return (
																	<li key={item}>
																		<button type="button" onClick={() => chooseSource(item)} className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${isActive ? 'bg-blue-600 font-semibold text-white' : 'text-slate-700 hover:bg-blue-50'}`} role="option" aria-selected={isActive}>
																			{item}
																		</button>
																	</li>
																);
															})}
														</ul>
													</div>
												) : null}
											</div>
										</label>
										<label className="space-y-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Reference No.</span>
											<input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={form.purchaseReference} onChange={(event) => setForm((current) => ({ ...current, purchaseReference: event.target.value }))} placeholder="Supplier invoice or PO number" />
										</label>
									</div>
								</div>

								<div className="space-y-3 rounded-2xl border border-slate-300 bg-blue-50/60 p-4 shadow-sm">
									<h4 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Invoice Details</h4>
									<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
										<label className="space-y-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Purchase Date</span>
											<input type="date" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={form.purchaseDate} onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))} />
										</label>
										<label className="space-y-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Purchase Time</span>
											<input type="time" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={form.purchaseTime} onChange={(event) => setForm((current) => ({ ...current, purchaseTime: event.target.value }))} />
										</label>
										<label className="space-y-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Payment Method</span>
											<div className="relative" ref={paymentMenuRef}>
												<button type="button" onClick={() => setIsPaymentMenuOpen((current) => !current)} className="w-full rounded-lg border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3 py-2 text-left text-xs font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" aria-haspopup="listbox" aria-expanded={isPaymentMenuOpen}>
													<span>{form.paymentMethod}</span>
													<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{isPaymentMenuOpen ? '▴' : '▾'}</span>
												</button>
												{isPaymentMenuOpen ? (
													<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-blue-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]">
														<ul role="listbox" className="max-h-60 overflow-auto py-1">
															{paymentMethodOptions.map((item) => {
																const isActive = form.paymentMethod === item;
																return (
																	<li key={item}>
																		<button type="button" onClick={() => choosePaymentMethod(item)} className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${isActive ? 'bg-blue-600 font-semibold text-white' : 'text-slate-700 hover:bg-blue-50'}`} role="option" aria-selected={isActive}>
																			{item}
																		</button>
																	</li>
																);
															})}
														</ul>
													</div>
												) : null}
											</div>
										</label>
										<label className="space-y-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
											<div className="relative" ref={statusMenuRef}>
												<button type="button" onClick={() => setIsStatusMenuOpen((current) => !current)} className="w-full rounded-lg border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3 py-2 text-left text-xs font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" aria-haspopup="listbox" aria-expanded={isStatusMenuOpen}>
													<span>{form.status}</span>
													<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{isStatusMenuOpen ? '▴' : '▾'}</span>
												</button>
												{isStatusMenuOpen ? (
													<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-blue-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]">
														<ul role="listbox" className="max-h-60 overflow-auto py-1">
															{statusOptions.map((item) => {
																const isActive = form.status === item;
																return (
																	<li key={item}>
																		<button type="button" onClick={() => chooseStatus(item)} className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${isActive ? 'bg-blue-600 font-semibold text-white' : 'text-slate-700 hover:bg-blue-50'}`} role="option" aria-selected={isActive}>
																			{item}
																		</button>
																	</li>
																);
															})}
														</ul>
													</div>
												) : null}
											</div>
										</label>
										<label className="space-y-1 lg:col-span-4">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Transport Cost</span>
											<input type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={form.transportCost} onChange={(event) => setForm((current) => ({ ...current, transportCost: event.target.value }))} placeholder="Delivery, transport, or handling cost" />
										</label>
										<label className="space-y-1 lg:col-span-4">
										</label>
									</div>
								</div>

								<div className="space-y-3 rounded-2xl border border-slate-300 bg-blue-50/60 p-4 shadow-sm">
									<div className="flex items-center justify-between gap-3">
										<h4 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Purchased Items</h4>
									</div>

									<div className="rounded-xl border border-blue-200 bg-white p-3">
										<div className="grid gap-2 sm:grid-cols-[1.35fr_0.55fr_0.7fr_0.65fr_0.75fr_auto]">
											<label className="space-y-1">
												<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Product</span>
												<input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" value={draftLineItem.product} onChange={(event) => updateDraftLineItem('product', event.target.value)} placeholder="Product bought" />
											</label>
											<label className="space-y-1">
												<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Boxes</span>
												<input type="number" min="0" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" value={draftLineItem.boxes} onChange={(event) => updateDraftLineItem('boxes', event.target.value)} />
											</label>
											<label className="space-y-1">
												<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pieces / Box</span>
												<input type="number" min="1" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" value={draftLineItem.piecesPerBox} onChange={(event) => updateDraftLineItem('piecesPerBox', event.target.value)} />
											</label>
											<label className="space-y-1">
												<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Loose Qty</span>
												<input type="number" min="0" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" value={draftLineItem.loosePieces} onChange={(event) => updateDraftLineItem('loosePieces', event.target.value)} />
											</label>
											<label className="space-y-1">
												<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unit Cost</span>
												<input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" value={draftLineItem.unitCost} onChange={(event) => updateDraftLineItem('unitCost', event.target.value)} />
											</label>
											<div className="flex items-end">
												<button type="button" onClick={addLineItem} className="w-full rounded-lg border border-blue-600 bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-blue-700 active:translate-y-0 active:scale-95">Add Item</button>
											</div>
										</div>
									</div>

									{form.lineItems.length ? (
										<div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-300 bg-white">
											{form.lineItems.map((item, index) => (
												<div key={index} className="px-3 py-3">
													<div className="grid gap-2 sm:grid-cols-[1.35fr_0.55fr_0.7fr_0.65fr_0.75fr_auto]">
														<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">{item.product}</div>
														<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">{item.boxes}</div>
														<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">{item.piecesPerBox}</div>
														<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">{item.loosePieces}</div>
														<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">{item.unitCost}</div>
														<button type="button" onClick={() => removeLineItem(index)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 active:translate-y-0 active:scale-95">Remove</button>
													</div>
												</div>
											))}
										</div>
									) : null}

									<div className="grid gap-3 sm:grid-cols-2">
										<div className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Units</span>
											<span className="text-2xl font-black tracking-tight text-slate-900">{draftTotals.totalUnits}</span>
										</div>
										<div className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Grand Total</span>
											<span className="text-2xl font-black tracking-tight text-slate-900">{formatMoney(draftTotals.total)}</span>
										</div>
									</div>

									<label className="space-y-1">
										<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
										<textarea className="min-h-[92px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Any delivery remarks, damage notes, or payment details" />
									</label>

									{error ? <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div> : null}
								</div>
							</div>

							<div className="purchases-modal-footer-surface sticky bottom-0 border-t border-slate-200 px-4 py-3">
								<div className="flex items-center justify-end gap-2">
									<div className="flex items-center gap-2">
										<button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 active:translate-y-0 active:scale-95">Cancel</button>
										<button type="button" onClick={savePurchase} className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-blue-700 active:translate-y-0 active:scale-95">Save Purchase</button>
									</div>
								</div>
							</div>
					</div>
			</AppModal>

		<AppModal open={Boolean(viewPurchase)} onClose={closeViewPurchase} cardClassName="purchases-modal-card sales-new-sale-card w-full max-w-5xl max-h-[92vh] overflow-hidden">
		{viewPurchase && (
			<>
				<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
						<div>
							<h3 className="text-sm font-bold text-slate-900">Purchase View</h3>
							<p className="text-[11px] text-slate-500">Read-only purchase invoice details</p>
						</div>
						<button type="button" onClick={closeViewPurchase} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Close</button>
					</div>

					<div className="max-h-[calc(92vh-72px)] overflow-y-auto p-4 space-y-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="rounded-xl border border-slate-200 bg-white p-3">
									<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Invoice</div>
									<div className="mt-1 text-sm font-bold text-slate-900">{viewPurchase.purchaseNumber}</div>
									<div className="mt-1 text-xs text-slate-600">{formatDate(viewPurchase.purchaseDate)} · {formatTime(viewPurchase.purchaseTime)}</div>
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

							<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
								<table className="w-full text-left text-xs">
									<thead className="border-b border-slate-200 bg-slate-50">
										<tr>
											<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Product</th>
											<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Boxes</th>
											<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Pieces / Box</th>
											<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Loose</th>
											<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Units</th>
											<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Cost</th>
											<th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Total</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{viewPurchase.items.map((item, index) => (
											<tr key={`${viewPurchase.purchaseNumber}-${index}`}>
												<td className="px-3 py-2 text-slate-800">{item.product}</td>
												<td className="px-3 py-2 text-slate-700">{item.boxes}</td>
												<td className="px-3 py-2 text-slate-700">{item.piecesPerBox}</td>
												<td className="px-3 py-2 text-slate-700">{item.loosePieces}</td>
												<td className="px-3 py-2 text-slate-700">{item.totalUnits}</td>
												<td className="px-3 py-2 text-slate-700">{formatMoney(item.unitCost)}</td>
												<td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(item.lineTotal)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

						{viewPurchase.notes ? (
							<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
								<div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</div>
								<div className="mt-1">{viewPurchase.notes}</div>
							</div>
						) : null}
					</div>
				</>
			)}
		</AppModal>
			<AppModal open={Boolean(deleteTarget)} onClose={cancelDeletePurchase} cardClassName="w-full max-w-sm">
				{deleteTarget ? (
					<div className="p-4">
						<h3 className="text-sm font-bold text-slate-900">Delete Purchase?</h3>
						<p className="mt-1 text-xs text-slate-600">Delete <span className="font-semibold text-slate-800">{deleteTarget.purchaseNumber}</span> for <span className="font-semibold text-slate-800">{deleteTarget.supplierName}</span>?</p>
						<p className="mt-1 text-[11px] text-rose-700">This action cannot be undone.</p>
						<div className="mt-4 flex items-center justify-end gap-2">
							<button type="button" onClick={cancelDeletePurchase} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Cancel</button>
							<button type="button" onClick={confirmDeletePurchase} className="rounded-lg border border-rose-600 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">Delete</button>
						</div>
					</div>
				) : null}
			</AppModal>

		</AdminShell>
	);
}
