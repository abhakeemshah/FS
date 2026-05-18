'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentStaffModuleAccess, type StaffAccessLevel } from '../../../../../lib/sales-utils';
import { syncLocalStaffMetaWithServer } from '../../../../../lib/staff-auth';

export default function StaffReportsEditorPage() {
	const router = useRouter();
	const [accessReady, setAccessReady] = useState(false);
	const [reportsAccess, setReportsAccess] = useState<StaffAccessLevel>('none');
	const [reportType, setReportType] = useState('sales_summary');
	const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
	const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const checkAccess = async () => {
			await syncLocalStaffMetaWithServer();
			const access = getCurrentStaffModuleAccess('reports');
			if (access !== 'edit') {
				router.push('/login/staff/reports');
				return;
			}
			setReportsAccess(access);
			setAccessReady(true);
		};

		void checkAccess();
	}, [router]);

	const handleGenerateReport = async () => {
		setLoading(true);
		try {
			// Simulate report generation
			const reportData = {
				type: reportType,
				startDate,
				endDate,
				generatedAt: new Date().toISOString(),
				generatedBy: 'Staff User',
			};

			// Save report to localStorage
			const reports = JSON.parse(localStorage.getItem('STAFF_REPORTS') || '[]');
			reports.unshift(reportData);
			localStorage.setItem('STAFF_REPORTS', JSON.stringify(reports));

			// Simulate download
			const csv = `Report Type,${reportType}\nStart Date,${startDate}\nEnd Date,${endDate}\nGenerated At,${new Date().toLocaleString()}\n`;
			const blob = new Blob([csv], { type: 'text/csv' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `report-${reportType}-${new Date().getTime()}.csv`;
			a.click();
			window.URL.revokeObjectURL(url);

			window.dispatchEvent(new Event('REPORTS_GENERATED'));
			setTimeout(() => router.push('/login/staff/reports'), 1000);
		} catch (error) {
			console.error('Report generation failed:', error);
		} finally {
			setLoading(false);
		}
	};

	if (!accessReady) {
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
	}

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6">
			<div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">Generate Report</h1>
						<p className="text-sm text-slate-600">Create and export reports based on your data and permissions.</p>
					</div>
					<Link href="/login/staff/reports" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
						Back
					</Link>
				</div>

				<div className="space-y-4">
					<div className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
						<h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Report Configuration</h3>
						
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
							<select
								className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
								value={reportType}
								onChange={(e) => setReportType(e.target.value)}
							>
								<option value="sales_summary">Sales Summary</option>
								<option value="purchases_summary">Purchases Summary</option>
								<option value="payments_summary">Payments Summary</option>
								<option value="party_wise">Party-Wise Report</option>
								<option value="monthly_summary">Monthly Summary</option>
							</select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
								<input
									type="date"
									className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
								<input
									type="date"
									className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
								/>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-end gap-3">
						<Link href="/login/staff/reports" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
							Cancel
						</Link>
						<button
							type="button"
							onClick={handleGenerateReport}
							disabled={loading}
							className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Generating...' : 'Generate & Export'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
