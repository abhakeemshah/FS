import AdminPartyCustomersPage from '../../../admin/parties/customers/page';
import { StaffPageFrame } from '../../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../../components/admin-shell';

export default function StaffPartyCustomersPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="parties">
				<AdminPartyCustomersPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
