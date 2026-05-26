'use client';

import AdminProductsPage from '../../admin/products/page';
import { StaffPageFrame } from '../../../../components/staff-page-frame';
import { WorkspaceModeProvider } from '../../../../components/admin-shell';

export default function StaffProductsPage() {
	return (
		<WorkspaceModeProvider mode="staff">
			<StaffPageFrame moduleKey="products">
				<AdminProductsPage />
			</StaffPageFrame>
		</WorkspaceModeProvider>
	);
}
