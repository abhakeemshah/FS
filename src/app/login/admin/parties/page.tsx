 'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { readStaffSession, hasAdminSession } from '../../../../lib/staff-auth';
import { AdminShell } from '../../../../components/admin-shell';

export default function AdminPartiesPage() {
	const router = useRouter();

	useEffect(() => {
		const staff = readStaffSession();
		if (!staff && !hasAdminSession()) {
			router.push('/login');
		}
	}, [router]);

	return (
		<AdminShell active="parties" title="Parties">
			<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-4">
					<h2 className="text-lg font-bold text-white">Parties</h2>
				</div>
				<div className="grid gap-3 p-4 sm:grid-cols-2">
					<Link href="/login/admin/parties/customers" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-100">
						<div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Customers</div>
						<div className="mt-2 text-base font-extrabold text-slate-900">Customer history</div>
					</Link>
					<Link href="/login/admin/parties/suppliers" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-100">
						<div className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">Suppliers</div>
						<div className="mt-2 text-base font-extrabold text-slate-900">Purchase history</div>
					</Link>
				</div>
			</section>
		</AdminShell>
	);
}
