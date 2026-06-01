import AdminSalesInvoicesPage from '../../admin/sales/invoices/page';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';

export default function StaffSalesPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="sales">
				<AdminSalesInvoicesPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
