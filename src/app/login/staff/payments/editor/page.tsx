import { redirect } from 'next/navigation';

export default function StaffPaymentsEditorRedirect() {
	redirect('/login/staff/payments');
}
