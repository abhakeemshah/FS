'use client';

import AdminPartySuppliersPage from '../../../admin/parties/suppliers/page';
import { StaffPageFrame } from '../../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../../components/admin-shell';

export default function StaffPartySuppliersPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="parties">
				<AdminPartySuppliersPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
