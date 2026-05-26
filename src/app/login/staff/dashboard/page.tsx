'use client';

import AdminDashboardPage from '../../admin/dashboard/page';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';

export default function StaffDashboardPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="dashboard">
				<AdminDashboardPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
