import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';
import AdminDashboardPage from '../../admin/dashboard/page';

export default function StaffDashboardPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="dashboard">
				<AdminDashboardPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
