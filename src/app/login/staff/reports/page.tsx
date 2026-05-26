'use client';

import AdminReportsPage from '../../admin/reports/page';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';

export default function StaffReportsPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="reports">
				<AdminReportsPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
