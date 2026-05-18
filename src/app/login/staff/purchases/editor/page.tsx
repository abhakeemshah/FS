'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentStaffModuleAccess, type StaffAccessLevel, PURCHASES_ORDERS_STORAGE_KEY, writeStoredArray, type PurchaseOrderRecord } from '../../../../../lib/purchases-utils';
import { syncLocalStaffMetaWithServer } from '../../../../../lib/staff-auth';

export default function StaffPurchasesEditorPage() {
	const router = useRouter();
	const [accessReady, setAccessReady] = useState(false);
	const [purchasesAccess, setPurchasesAccess] = useState<StaffAccessLevel>('none');
	const [formData, setFormData] = useState({
		supplierName: '',
		poNumber: '',
		items: [] as { description: string; quantity: number; rate: number }[],
		notes: '',
	});
	const [error, setError] = useState('');

	useEffect(() => {
		const checkAccess = async () => {
			await syncLocalStaffMetaWithServer();
			const access = getCurrentStaffModuleAccess('purchases');
			if (access !== 'edit') {
				router.push('/login/staff/purchases');
				return;
			}
			setPurchasesAccess(access);
			setAccessReady(true);
		};

		void checkAccess();
	}, [router]);

	const handleAddItem = () => {
		setFormData((c) => ({
			...c,
			items: [...c.items, { description: '', quantity: 1, rate: 0 }],
		}));
	};

	const handleRemoveItem = (index: number) => {
		setFormData((c) => ({
			...c,
			items: c.items.filter((_, i) => i !== index),
		}));
	};

	const handleSavePO = () => {
		setError('');

		if (!formData.supplierName.trim()) {
			setError('Supplier name is required.');
			return;
		}
		if (!formData.poNumber.trim()) {
			setError('PO number is required.');
			return;
		}
		if (formData.items.length === 0) {
			setError('Add at least one item.');
			return;
		}

		const total = formData.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
		const newPO: PurchaseOrderRecord = {
			poId: Date.now().toString(),
			poNumber: formData.poNumber.trim(),
			supplierName: formData.supplierName.trim(),
			date: new Date().toISOString(),
			items: formData.items.map((item) => ({
				description: item.description.trim(),
				quantity: item.quantity,
				rate: item.rate,
				amount: item.quantity * item.rate,
			})),
			total,
			notes: formData.notes.trim(),
			status: 'pending',
		};

		const pos = [newPO];
		writeStoredArray<PurchaseOrderRecord>(PURCHASES_ORDERS_STORAGE_KEY, pos);
		window.dispatchEvent(new Event('LEDGER_UPDATED'));
		router.push('/login/staff/purchases');
	};

	if (!accessReady) {
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
	}

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6">
			<div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">Create Purchase Order</h1>
						<p className="text-sm text-slate-600">Add purchase order details and line items.</p>
					</div>
					<Link href="/login/staff/purchases" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
						Back
					</Link>
				</div>

				<div className="space-y-4">
					<div className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
						<h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">PO Details</h3>
						<input
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="PO Number"
							value={formData.poNumber}
							onChange={(e) => setFormData((c) => ({ ...c, poNumber: e.target.value }))}
						/>
						<input
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Supplier Name"
							value={formData.supplierName}
							onChange={(e) => setFormData((c) => ({ ...c, supplierName: e.target.value }))}
						/>
					</div>

					<div className="space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Line Items</h3>
							<button
								type="button"
								onClick={handleAddItem}
								className="rounded-md border border-blue-600 bg-blue-600 px-2 py-1 text-xs font-bold text-white hover:bg-blue-700"
							>
								+ Add Item
							</button>
						</div>
						<div className="space-y-2">
							{formData.items.map((item, index) => (
								<div key={index} className="flex gap-2">
									<input
										className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-400"
										placeholder="Description"
										value={item.description}
										onChange={(e) => {
											setFormData((c) => {
												const newItems = [...c.items];
												newItems[index].description = e.target.value;
												return { ...c, items: newItems };
											});
										}}
									/>
									<input
										type="number"
										min="1"
										className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-400"
										placeholder="Qty"
										value={item.quantity}
										onChange={(e) => {
											setFormData((c) => {
												const newItems = [...c.items];
												newItems[index].quantity = Number(e.target.value) || 1;
												return { ...c, items: newItems };
											});
										}}
									/>
									<input
										type="number"
										min="0"
										step="0.01"
										className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-400"
										placeholder="Rate"
										value={item.rate}
										onChange={(e) => {
											setFormData((c) => {
												const newItems = [...c.items];
												newItems[index].rate = Number(e.target.value) || 0;
												return { ...c, items: newItems };
											});
										}}
									/>
									<button
										type="button"
										onClick={() => handleRemoveItem(index)}
										className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
									>
										Remove
									</button>
								</div>
							))}
						</div>
					</div>

					<div className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
						<h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Notes</h3>
						<textarea
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Additional notes"
							rows={3}
							value={formData.notes}
							onChange={(e) => setFormData((c) => ({ ...c, notes: e.target.value }))}
						/>
					</div>

					{error && <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}

					<div className="flex items-center justify-end gap-3">
						<Link href="/login/staff/purchases" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
							Cancel
						</Link>
						<button
							type="button"
							onClick={handleSavePO}
							className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
						>
							Save PO
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
