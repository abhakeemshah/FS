import AdminPurchasesPage from '../../admin/purchases/page';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';

export default function StaffPurchasesPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="purchases">
				<AdminPurchasesPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
