import { readStoredArray, writeStoredArray, SALES_BILLS_STORAGE_KEY } from './ledger-store';
import { hasAdminSession, getCurrentStaffModuleAccess } from './staff-auth';

export type DraftLineItem = {
	product: string;
	quantity: string;
	price: string;
	costPrice: string;
	discount: string;
};

export type LineItem = {
	product: string;
	quantity: number;
	price: number;
	costPrice: number;
	discount: number;
	total: number;
	profit: number;
};

export type BillFormState = {
	customerName: string;
	customerContact: string;
	paymentMethod: string;
	draftLineItem: DraftLineItem;
	lineItems: DraftLineItem[];
};

export type BillRecord = {
	billId: string;
	invoiceNumber: string;
	date: string;
	time: string;
	customerName: string;
	customerContact: string;
	paymentMethod: string;
	items: LineItem[];
	subtotal: number;
	discount: number;
	profit: number;
	total: number;
};

export type StaffAccessLevel = 'none' | 'view' | 'edit';

export const paymentMethodOptions = ['Cash', 'EasyPaisa', 'JazzCash', 'Bank Transfer', 'Card'];

let billSequence = 1;

export const emptyLineItem = (): DraftLineItem => ({
	product: '',
	quantity: '1',
	price: '',
	costPrice: '',
	discount: '0',
});

export const createBlankForm = (): BillFormState => ({
	customerName: '',
	customerContact: '',
	paymentMethod: paymentMethodOptions[0],
	draftLineItem: emptyLineItem(),
	lineItems: [],
});

export const formatMoney = (value: number | string | null | undefined) => {
	const amount = typeof value === 'string' ? Number(value) : value;
	return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

export const formatDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	}).format(new Date(value));

export const formatTime = (value: string) => value;

const escapeHtml = (str: string) =>
	str
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

export const buildPrintableBill = (bill: BillRecord) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${escapeHtml(bill.invoiceNumber)} - Bill</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
		.header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
		h1 { margin: 0; font-size: 22px; }
		.meta, .summary { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
		table { width: 100%; border-collapse: collapse; margin-top: 18px; }
		th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 13px; }
		th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
		.summary { margin-top: 16px; margin-left: auto; width: 280px; }
		.row { display: flex; justify-content: space-between; margin-top: 8px; }
		.total { border-top: 1px solid #cbd5e1; margin-top: 10px; padding-top: 10px; font-weight: 700; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<h1>Sales Bill</h1>
			<div>Invoice: ${escapeHtml(bill.invoiceNumber)}</div>
			<div>Date: ${escapeHtml(formatDate(bill.date))} ${escapeHtml(formatTime(bill.time))}</div>
		</div>
	</div>

	<div class="meta">
		<div><strong>Customer:</strong> ${escapeHtml(bill.customerName)}</div>
		<div><strong>Contact:</strong> ${escapeHtml(bill.customerContact)}</div>
		<div><strong>Payment:</strong> ${escapeHtml(bill.paymentMethod)}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th>Product</th>
				<th>Qty</th>
				<th>Price</th>
				<th>Discount</th>
				<th>Total</th>
			</tr>
		</thead>
		<tbody>
			${bill.items
				.map(
					(item) => `
				<tr>
					<td>${escapeHtml(item.product)}</td>
					<td>${item.quantity}</td>
					<td>${formatMoney(item.price)}</td>
					<td>${formatMoney(item.discount)}</td>
					<td>${formatMoney(item.total)}</td>
				</tr>`,
				)
				.join('')}
		</tbody>
	</table>

	<div class="summary">
		<div class="row"><span>Subtotal:</span><strong>${formatMoney(bill.subtotal)}</strong></div>
		<div class="row"><span>Discount:</span><strong>${formatMoney(bill.discount)}</strong></div>
		<div class="row total"><span>Total:</span><strong>${formatMoney(bill.total)}</strong></div>
		<div class="row"><span>Profit:</span><strong>${formatMoney(bill.profit)}</strong></div>
	</div>
</body>
</html>
`;

export const createBillRecord = (form: BillFormState): BillRecord => {
	const now = new Date();
	const billId = `${now.getTime()}-${billSequence}`;
	const items = form.lineItems.map((item) => {
		const quantity = Number(item.quantity);
		const price = Number(item.price);
		const costPrice = Number(item.costPrice);
		const discount = Number(item.discount);
		const subtotal = Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0;
		const total = Math.max(subtotal - (Number.isFinite(discount) ? discount : 0), 0);
		const actualCost = Number.isFinite(quantity) && Number.isFinite(costPrice) ? quantity * costPrice : 0;
		const profit = total - actualCost;

		return {
			product: item.product.trim(),
			quantity,
			price,
			costPrice: Number.isFinite(costPrice) ? costPrice : 0,
			discount: Number.isFinite(discount) ? discount : 0,
			total,
			profit,
		};
	});

	billSequence++;

	const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
	const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
	const total = Math.max(subtotal - totalDiscount, 0);
	const profit = items.reduce((sum, item) => sum + item.profit, 0);

	return {
		billId,
		invoiceNumber: `INV-${now.getFullYear()}-${String(billSequence).padStart(5, '0')}`,
		date: now.toISOString().split('T')[0],
		time: now.toLocaleTimeString(),
		customerName: form.customerName.trim(),
		customerContact: form.customerContact.trim(),
		paymentMethod: form.paymentMethod,
		items,
		subtotal,
		discount: totalDiscount,
		profit,
		total,
	};
};

export { readStoredArray, writeStoredArray, SALES_BILLS_STORAGE_KEY, hasAdminSession, getCurrentStaffModuleAccess };

export const getStaffAccessLabel = (level: StaffAccessLevel): string => {
	const labels: Record<StaffAccessLevel, string> = {
		none: 'No Access',
		view: 'View Only',
		edit: 'Can Edit',
	};
	return labels[level] || 'No Access';
};
