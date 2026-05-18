'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentStaffModuleAccess, type StaffAccessLevel } from '../../../../../lib/sales-utils';
import { syncLocalStaffMetaWithServer } from '../../../../../lib/staff-auth';

export default function StaffPartiesEditorPage() {
	const router = useRouter();
	const [accessReady, setAccessReady] = useState(false);
	const [partiesAccess, setPartiesAccess] = useState<StaffAccessLevel>('none');
	const [formData, setFormData] = useState({
		partyName: '',
		partyType: 'Customer',
		contact: '',
		email: '',
		address: '',
		notes: '',
	});
	const [error, setError] = useState('');

	useEffect(() => {
		const checkAccess = async () => {
			await syncLocalStaffMetaWithServer();
			const access = getCurrentStaffModuleAccess('parties');
			if (access !== 'edit') {
				router.push('/login/staff/parties');
				return;
			}
			setPartiesAccess(access);
			setAccessReady(true);
		};

		void checkAccess();
	}, [router]);

	const handleSaveParty = () => {
		setError('');
		
		if (!formData.partyName.trim()) {
			setError('Party name is required.');
			return;
		}
		if (!formData.contact.trim()) {
			setError('Contact information is required.');
			return;
		}

		// Save party to localStorage
		const parties = JSON.parse(localStorage.getItem('PARTIES_DATA') || '[]');
		const newParty = {
			id: Date.now().toString(),
			createdAt: new Date().toISOString(),
			partyName: formData.partyName.trim(),
			partyType: formData.partyType,
			contact: formData.contact.trim(),
			email: formData.email.trim(),
			address: formData.address.trim(),
			notes: formData.notes.trim(),
		};

		parties.unshift(newParty);
		localStorage.setItem('PARTIES_DATA', JSON.stringify(parties));
		window.dispatchEvent(new Event('PARTIES_UPDATED'));
		router.push('/login/staff/parties');
	};

	if (!accessReady) {
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
	}

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6">
			<div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">Add Party</h1>
						<p className="text-sm text-slate-600">Create a new customer or supplier entry.</p>
					</div>
					<Link href="/login/staff/parties" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
						Back
					</Link>
				</div>

				<div className="space-y-4">
					<div className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
						<h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Party Information</h3>
						<input
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Party Name"
							value={formData.partyName}
							onChange={(e) => setFormData((c) => ({ ...c, partyName: e.target.value }))}
						/>
						<select
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							value={formData.partyType}
							onChange={(e) => setFormData((c) => ({ ...c, partyType: e.target.value }))}
						>
							<option>Customer</option>
							<option>Supplier</option>
							<option>Both</option>
						</select>
						<input
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Contact Number"
							value={formData.contact}
							onChange={(e) => setFormData((c) => ({ ...c, contact: e.target.value }))}
						/>
						<input
							type="email"
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Email Address"
							value={formData.email}
							onChange={(e) => setFormData((c) => ({ ...c, email: e.target.value }))}
						/>
						<textarea
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Address"
							rows={3}
							value={formData.address}
							onChange={(e) => setFormData((c) => ({ ...c, address: e.target.value }))}
						/>
						<textarea
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
							placeholder="Notes"
							rows={2}
							value={formData.notes}
							onChange={(e) => setFormData((c) => ({ ...c, notes: e.target.value }))}
						/>
					</div>

					{error && <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}

					<div className="flex items-center justify-end gap-3">
						<Link href="/login/staff/parties" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
							Cancel
						</Link>
						<button
							type="button"
							onClick={handleSaveParty}
							className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
						>
							Save Party
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
