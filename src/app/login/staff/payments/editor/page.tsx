'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentStaffModuleAccess, type StaffAccessLevel } from '../../../../../lib/sales-utils';
import { syncLocalStaffMetaWithServer } from '../../../../../lib/staff-auth';

export default function StaffPaymentsEditorPage() {
	const router = useRouter();
	const [accessReady, setAccessReady] = useState(false);
	const [paymentsAccess, setPaymentsAccess] = useState<StaffAccessLevel>('none');
	const [formData, setFormData] = useState({
		partyName: '',
		paymentAmount: '',
		paymentDate: new Date().toISOString().split('T')[0],
		paymentMethod: 'Bank Transfer',
		reference: '',
		notes: '',
	});
	const [error, setError] = useState('');

	useEffect(() => {
		const checkAccess = async () => {
			await syncLocalStaffMetaWithServer();
			const access = getCurrentStaffModuleAccess('payments');
			if (access !== 'edit') {
				router.push('/login/staff/payments');
				return;
			}
			setPaymentsAccess(access);
			setAccessReady(true);
		};

		void checkAccess();
	}, [router]);

	const handleSavePayment = () => {
		setError('');
		
		if (!formData.partyName.trim()) {
			setError('Party name is required.');
			return;
		}
		if (!formData.paymentAmount || Number(formData.paymentAmount) <= 0) {
			setError('Payment amount must be greater than 0.');
			return;
		}

		// Save payment to localStorage
		const payments = JSON.parse(localStorage.getItem('PAYMENTS_DATA') || '[]');
		const newPayment = {
			id: Date.now().toString(),
			createdAt: new Date().toISOString(),
			partyName: formData.partyName.trim(),
			paymentAmount: Number(formData.paymentAmount),
			paymentDate: formData.paymentDate,
			paymentMethod: formData.paymentMethod,
			reference: formData.reference.trim(),
			notes: formData.notes.trim(),
		};

		payments.unshift(newPayment);
		localStorage.setItem('PAYMENTS_DATA', JSON.stringify(payments));
		window.dispatchEvent(new Event('PAYMENTS_UPDATED'));
		router.push('/login/staff/payments');
	};

	if (!accessReady) {
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
	}

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6">
			<div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">Record Payment</h1>
						<p className="text-sm text-slate-600">Add a new payment entry with party and amount details.</p>
					</div>
					<Link href="/login/staff/payments" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
						Back
					</Link>
				</div>

				<div className="space-y-4">
					<div className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
						<h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Payment Details</h3>
						<input
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Party Name"
							value={formData.partyName}
							onChange={(e) => setFormData((c) => ({ ...c, partyName: e.target.value }))}
						/>
						<input
							type="number"
							step="0.01"
							min="0"
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Payment Amount"
							value={formData.paymentAmount}
							onChange={(e) => setFormData((c) => ({ ...c, paymentAmount: e.target.value }))}
						/>
						<input
							type="date"
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							value={formData.paymentDate}
							onChange={(e) => setFormData((c) => ({ ...c, paymentDate: e.target.value }))}
						/>
						<select
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							value={formData.paymentMethod}
							onChange={(e) => setFormData((c) => ({ ...c, paymentMethod: e.target.value }))}
						>
							<option>Bank Transfer</option>
							<option>Cash</option>
							<option>Cheque</option>
							<option>Card</option>
						</select>
						<input
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Reference (Invoice #, Check #, etc.)"
							value={formData.reference}
							onChange={(e) => setFormData((c) => ({ ...c, reference: e.target.value }))}
						/>
						<textarea
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Notes"
							rows={3}
							value={formData.notes}
							onChange={(e) => setFormData((c) => ({ ...c, notes: e.target.value }))}
						/>
					</div>

					{error && <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}

					<div className="flex items-center justify-end gap-3">
						<Link href="/login/staff/payments" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
							Cancel
						</Link>
						<button
							type="button"
							onClick={handleSavePayment}
							className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
						>
							Save Payment
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
