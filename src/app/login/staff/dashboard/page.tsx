'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
	STAFF_MODULE_KEYS,
	getCurrentStaffModuleAccess,
	getStaffAccessLabel,
  clearStaffSession,
  type StaffAccessLevel,
  type StaffModuleKey,
	syncLocalStaffMetaWithServer,
} from '../../../../lib/staff-auth';

export default function StaffDashboardPage() {
	const router = useRouter();
	const [moduleAccess, setModuleAccess] = useState<Record<StaffModuleKey, StaffAccessLevel>>({
		sales: 'none',
		purchases: 'none',
		payments: 'none',
		parties: 'none',
		reports: 'none',
	});

	useEffect(() => {
		(async () => {
			await syncLocalStaffMetaWithServer();
			setModuleAccess(
				Object.fromEntries(STAFF_MODULE_KEYS.map((moduleKey) => [moduleKey, getCurrentStaffModuleAccess(moduleKey)])) as Record<
					StaffModuleKey,
					StaffAccessLevel
				>,
			);
		})();
	}, []);

  const moduleCards = STAFF_MODULE_KEYS.filter((moduleKey) => moduleAccess[moduleKey] !== 'none').map((moduleKey) => ({
    key: moduleKey,
    title: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1),
    access: moduleAccess[moduleKey],
    description:
      moduleKey === 'sales'
        ? 'Customer invoices and bill history'
        : moduleKey === 'purchases'
          ? 'Purchase records and supplier activity'
          : moduleKey === 'payments'
            ? 'Payment ledger and settlements'
            : moduleKey === 'parties'
              ? 'Customers and suppliers'
              : 'Reports and summaries',
    icon:
      moduleKey === 'sales'
        ? 'receipt_long'
        : moduleKey === 'purchases'
          ? 'shopping_cart'
          : moduleKey === 'payments'
            ? 'account_balance_wallet'
            : moduleKey === 'parties'
              ? 'groups'
              : 'analytics',
  }));

	const handleLogout = () => {
		clearStaffSession();
		router.push('/login');
	};

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Header */}
			<header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
				<div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">Staff Dashboard</h1>
						<p className="text-sm text-slate-500">Welcome to your workspace</p>
					</div>
					<button
						onClick={handleLogout}
						className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2"
					>
						<span className="material-symbols-outlined text-lg">logout</span>
						Logout
					</button>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-6 py-8">
				{/* Welcome Section */}
				<div className="mb-8">
					<div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-8 text-white shadow-lg">
						<div className="flex items-start justify-between">
							<div>
								<h2 className="text-3xl font-bold mb-2">Welcome to Staff Portal</h2>
								<p className="text-emerald-100 text-lg">Access your modules and manage your work</p>
							</div>
							<div className="text-6xl opacity-20">👤</div>
						</div>
					</div>
				</div>

				{/* Module Access */}
				<div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
						<h3 className="text-lg font-semibold text-slate-900">Your Modules</h3>
						<p className="text-sm text-slate-500 mt-1">Click to access modules assigned by your admin</p>
					</div>
					<div className="p-6">
						{moduleCards.length ? (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{moduleCards.map((moduleCard) => (
									<Link
										key={moduleCard.key}
										href={`/login/staff/${moduleCard.key}`}
										className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-400 hover:bg-blue-50 transition-all group cursor-pointer"
									>
										<div className="flex items-start gap-3 mb-3">
											<div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
												<span className="material-symbols-outlined text-slate-700 group-hover:text-blue-700 transition-colors">{moduleCard.icon}</span>
											</div>
											<span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
												{getStaffAccessLabel(moduleCard.access)}
											</span>
										</div>
										<p className="font-semibold text-slate-900 group-hover:text-blue-900">{moduleCard.title}</p>
										<p className="text-sm text-slate-600 mt-1">{moduleCard.description}</p>
										<div className="mt-3 flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
											<span className="text-xs font-semibold">Open</span>
											<span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
								<p className="text-slate-500">No modules have been assigned yet.</p>
								<p className="text-xs text-slate-400 mt-2">Contact your admin to request access</p>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
