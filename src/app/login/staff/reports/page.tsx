'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	getCurrentStaffModuleAccess,
	getStaffAccessLabel,
	type StaffAccessLevel,
	type StaffModuleKey,
} from '../../../../lib/sales-utils';
import { STAFF_AUTH_EVENT, STAFF_MODULE_KEYS, clearStaffSession, syncLocalStaffMetaWithServer } from '../../../../lib/staff-auth';

export default function StaffReportsPage() {
	const [accessReady, setAccessReady] = useState(false);
	const [reportsAccess, setReportsAccess] = useState<StaffAccessLevel>('none');
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
			setReportsAccess(getCurrentStaffModuleAccess('reports'));
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

		return () => {
			window.removeEventListener(STAFF_AUTH_EVENT, handleRefresh);
			window.removeEventListener('storage', handleRefresh);
		};
	}, []);

	const moduleCards = STAFF_MODULE_KEYS.filter((moduleKey) => moduleAccess[moduleKey] !== 'none').map((moduleKey) => ({
		key: moduleKey,
		label: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1),
		access: moduleAccess[moduleKey],
	}));
	const canEdit = reportsAccess === 'edit';
	const handleExportReport = () => {
		window.location.href = '/login/staff/reports/editor';
	};

	if (!accessReady) {
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
	}

	if (reportsAccess === 'none') {
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
								moduleCard.key === 'reports'
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
						<p className="text-sm font-extrabold tracking-tight text-slate-900">Reports</p>
						{/* Access Level label removed to match admin UI */}
						<p className="text-[11px] text-slate-500">{canEdit ? 'You can edit and export reports.' : 'View-only access. Editing is disabled.'}</p>
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
					<div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-lg font-bold text-slate-900">Reports module</p>
								<p className="text-sm text-slate-600">{canEdit ? 'Edit mode is active.' : 'View mode is active.'}</p>
							</div>
							<button
								type="button"
								onClick={handleExportReport}
								disabled={!canEdit}
								className={`rounded-md px-3 py-2 text-xs font-bold transition ${canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}
							>
								Export report
							</button>
						</div>
						<div className="mt-4 grid gap-3 md:grid-cols-2">
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">View: review report data.</div>
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Edit: refresh, add, or remove report entries.</div>
						</div>
						<div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
							Reports data is not loaded yet.
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
