import AdminPartiesPage from '../../admin/parties/page';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';

export default function StaffPartiesPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="parties">
				<AdminPartiesPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
