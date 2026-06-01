import AdminPaymentsPage from '../../admin/payments/page';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';

export default function StaffPaymentsPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="payments">
				<AdminPaymentsPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
