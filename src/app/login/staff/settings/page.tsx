'use client';

import AdminSettingsPage from '../../admin/settings/page';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';

export default function StaffSettingsPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="settings">
				<AdminSettingsPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
