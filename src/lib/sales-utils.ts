import { readStoredArray, writeStoredArray, SALES_BILLS_STORAGE_KEY } from './ledger-store';
import { hasAdminSession, getCurrentStaffModuleAccess, readStaffSession } from './staff-auth';
import { BUSINESS_PROFILE } from './business-profile';

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
	recordedBy?: string;
};

export type StaffAccessLevel = 'none' | 'view' | 'edit';

export const paymentMethodOptions = ['Cash', 'EasyPaisa', 'JazzCash', 'Bank Transfer', 'Card'];

let billSequence = 1;

export const emptyLineItem = (): DraftLineItem => ({
	product: '',
	quantity: '',
	price: '',
	costPrice: '',
	discount: '',
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
	<title>Cash Memo - ${BUSINESS_PROFILE.shopName}</title>
	<style>
		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}
		body {
			font-family: Arial, sans-serif;
			font-size: 12px;
			color: #000;
			background-color: #525659;
			display: flex;
			justify-content: center;
			padding: 20px;
		}
		.page {
			width: 21cm;
			min-height: 29.7cm;
			background: white;
			padding: 1.5cm 1.5cm;
			box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
			position: relative;
		}
		@page {
			size: A4;
			margin: 0;
		}
		@media print {
			body {
				background-color: white;
				padding: 0;
				display: block;
			}
			.page {
				width: auto;
				min-height: auto;
				box-shadow: none;
				padding: 1.5cm;
			}
			* {
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
		}
		.bg-navy { background-color: #000066; color: white; }
		.bg-lightgray { background-color: #e2e2e2; }
		.bg-darkgray { background-color: #888888; color: white; }
		.text-navy { color: #000066; }
		.header-section {
			display: flex;
			justify-content: space-between;
			margin-bottom: 25px;
		}
		.company-info h1 {
			font-family: 'Times New Roman', Times, serif;
			font-size: 38px;
			font-weight: normal;
			letter-spacing: 1px;
			margin-bottom: 8px;
		}
		.company-info p {
			font-size: 13px;
			margin-bottom: 4px;
		}
		.memo-info {
			text-align: right;
			padding-top: 15px;
		}
		.memo-info h2 {
			font-size: 18px;
			text-decoration: underline;
			letter-spacing: 2px;
			margin-bottom: 4px;
		}
		.memo-info h3 {
			font-size: 16px;
			letter-spacing: 5px;
			font-weight: bold;
			margin-bottom: 12px;
		}
		.barcode-container {
			display: flex;
			flex-direction: column;
			align-items: center;
			margin-top: 5px;
		}
		.barcode-bars {
			height: 35px;
			width: 120px;
			background:
				repeating-linear-gradient(
					90deg,
					#000,
					#000 2px,
					#fff 2px,
					#fff 4px,
					#000 4px,
					#000 7px,
					#fff 7px,
					#fff 9px
				);
			border-bottom: 2px solid white;
		}
		.barcode-text {
			font-family: 'Courier New', Courier, monospace;
			font-size: 10px;
			letter-spacing: 3px;
			margin-top: 2px;
		}
		.info-grid {
			display: grid;
			grid-template-columns: 1fr 280px;
			gap: 15px;
			margin-bottom: 25px;
		}
		.recipient-box {
			border: 1px solid #999;
		}
		.recipient-box .title-bar {
			padding: 5px 10px;
			font-weight: bold;
		}
		.recipient-box .customer-name {
			font-size: 18px;
			padding: 10px;
			background: white;
			border-bottom: 1px solid #999;
		}
		.recipient-details {
			display: grid;
			grid-template-columns: 80px 1fr;
			gap: 5px;
			padding: 10px;
		}
		.recipient-details div {
			padding: 2px 0;
		}
		.recipient-remarks {
			border-top: 1px solid #999;
			padding: 5px 10px;
			display: grid;
			grid-template-columns: 80px 1fr;
		}
		.invoice-meta {
			border-collapse: collapse;
			width: 100%;
			text-align: center;
		}
		.invoice-meta th, .invoice-meta td {
			border: 1px solid #999;
			padding: 6px;
		}
		.invoice-meta th {
			font-weight: normal;
		}
		.invoice-meta .spacer-row {
			height: 10px;
			border: none;
		}
		.product-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 15px;
			border: 1px solid #999;
		}
		.product-table th, .product-table td {
			padding: 6px 10px;
			text-align: right;
			border-bottom: 1px dashed #ccc;
		}
		.product-table th {
			text-align: right;
			font-style: italic;
			font-weight: normal;
			border-bottom: none;
		}
		.product-table th:nth-child(1), .product-table td:nth-child(1),
		.product-table th:nth-child(2), .product-table td:nth-child(2) {
			text-align: left;
		}
		.product-table tbody tr:last-child td {
			border-bottom: none;
		}
		.product-table tfoot td {
			font-style: italic;
			border-top: 1px solid #999;
		}
		.totals-section {
			display: flex;
			justify-content: space-between;
			margin-bottom: 30px;
			align-items: flex-start;
		}
		.total-pcs {
			font-size: 16px;
			font-weight: bold;
			font-style: italic;
			padding-left: 10px;
		}
		.total-pcs span {
			margin-left: 20px;
			font-size: 18px;
		}
		.financial-summary {
			width: 280px;
			border-collapse: collapse;
		}
		.financial-summary td {
			padding: 5px 10px;
			font-style: italic;
		}
		.financial-summary td:nth-child(2) {
			text-align: right;
		}
		.financial-summary tr {
			border-bottom: 1px dashed #999;
		}
		.financial-summary tr:last-child {
			border-bottom: none;
			font-weight: bold;
			font-size: 14px;
		}
		.footer-cards {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 60px;
		}
		.card {
			border: 1px solid #999;
		}
		.card-header {
			padding: 5px;
			text-align: center;
		}
		.card-body {
			padding: 15px;
			background: white;
			min-height: 100px;
		}
		.bank-info {
			display: grid;
			grid-template-columns: 110px 1fr;
			gap: 8px;
			line-height: 1.4;
		}
		.bank-info .bank-name {
			grid-column: 1 / -1;
			text-align: center;
			font-weight: bold;
			margin-bottom: 5px;
		}
		.bank-info strong {
			font-weight: normal;
		}
		.dev-info {
			text-align: center;
			line-height: 1.8;
		}
		.dev-info .dev-names {
			font-weight: bold;
			margin-bottom: 15px;
			display: block;
		}
		.dev-contact {
			display: flex;
			justify-content: center;
			gap: 20px;
		}
		.signatures {
			display: flex;
			justify-content: space-between;
			padding: 0 20px;
			margin-bottom: 40px;
		}
		.sig-block {
			width: 250px;
			text-align: center;
		}
		.sig-block p {
			margin-bottom: 40px;
			font-style: italic;
			text-align: left;
		}
		.sig-line {
			border-top: 1px solid #000;
			padding-top: 5px;
			font-style: italic;
		}
		.page-num {
			text-align: right;
			font-style: italic;
			padding-right: 20px;
		}
	</style>
</head>
<body>
	<div class="page">
		<header class="header-section">
			<div class="company-info">
				<h1 class="text-navy">${BUSINESS_PROFILE.shopName}</h1>
				<p>${escapeHtml(BUSINESS_PROFILE.address)}</p>
				<p>Buniess Associates : ${escapeHtml(BUSINESS_PROFILE.shopOwner)}</p>
				<p>Phone : ${escapeHtml(BUSINESS_PROFILE.contactNumber)}</p>
				<p>Email : ${escapeHtml(BUSINESS_PROFILE.email)}</p>
			</div>
			<div class="memo-info">
				<h2>CASH MEMO</h2>
				<h3>ORIGENAL</h3>
				<div class="barcode-container">
					<div class="barcode-bars"></div>
					<div class="barcode-text">* ${escapeHtml(bill.invoiceNumber.replace(/[^0-9]/g, '').slice(-5) || '11361')} *</div>
				</div>
			</div>
		</header>

		<div class="info-grid">
			<div class="recipient-box">
				<div class="title-bar bg-navy">RECIPIENT</div>
				<div class="customer-name text-navy">${escapeHtml(bill.customerName || 'WALK-IN CUSTOMER')}</div>
				<div class="recipient-details bg-lightgray">
					<div>Address :</div>
					<div>—</div>
					<div>City :</div>
					<div>—</div>
					<div>Phone :</div>
					<div>${escapeHtml(bill.customerContact || '—')}</div>
				</div>
				<div class="recipient-remarks bg-lightgray">
					<div>Remarks</div>
					<div>---</div>
				</div>
			</div>

			<div>
				<table class="invoice-meta">
					<tr class="bg-lightgray">
						<th>Invoice ID</th>
						<th>Invoice Time</th>
					</tr>
					<tr>
						<td>${escapeHtml(bill.invoiceNumber)}</td>
						<td>${escapeHtml(formatTime(bill.time))}</td>
					</tr>
					<tr class="spacer-row"><td colspan="2"></td></tr>
					<tr class="bg-lightgray">
						<th colspan="2">Date</th>
					</tr>
					<tr>
						<td colspan="2">${escapeHtml(new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(bill.date)))}</td>
					</tr>
				</table>
			</div>
		</div>

		<table class="product-table">
			<thead>
				<tr class="bg-navy">
					<th>Product Name</th>
					<th>Description</th>
					<th>Crtn</th>
					<th>Pcs</th>
					<th>Qty</th>
					<th>Rate</th>
					<th>TO-Pcs</th>
					<th>Net Rate</th>
					<th>AMOUNT</th>
				</tr>
			</thead>
			<tbody>
				${bill.items
					.map(
						(item) => `
				<tr>
					<td>${escapeHtml(item.product)}</td>
					<td>----</td>
					<td>0</td>
					<td>${item.quantity}</td>
					<td>${item.quantity}</td>
					<td>${formatMoney(item.price)}</td>
					<td>0</td>
					<td>${formatMoney(item.price)}</td>
					<td>${formatMoney(item.total)}</td>
				</tr>`,
					)
					.join('')}
			</tbody>
			<tfoot>
				<tr class="bg-darkgray">
					<td>Total Item(s):-</td>
					<td>${bill.items.length}</td>
					<td>0</td>
					<td>${bill.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td>${formatMoney(bill.total)}</td>
				</tr>
			</tfoot>
		</table>

		<div class="totals-section">
			<div class="total-pcs">
				Total Pcs Qty <span>${bill.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
			</div>
			<table class="financial-summary">
				<tr>
					<td>PREV.</td>
					<td>0</td>
				</tr>
				<tr>
					<td>TOTAL</td>
					<td>${formatMoney(bill.total)}</td>
				</tr>
				<tr>
					<td>PAID AMOUNT</td>
					<td>0</td>
				</tr>
				<tr>
					<td>BALANCE</td>
					<td>${formatMoney(bill.total)}</td>
				</tr>
			</table>
		</div>

		<div class="footer-cards">
			<div class="card">
				<div class="card-header bg-navy">BANK ACCOUNT DETAILS</div>
				<div class="card-body">
					<div class="bank-info">
						<div class="bank-name">Meezan Bank Limited</div>
						<strong>Buniess Associates:</strong> <span>${escapeHtml(BUSINESS_PROFILE.shopOwner)}</span>
						<strong>Contact Number:</strong> <span>${escapeHtml(BUSINESS_PROFILE.contactNumber)}</span>
						<strong>Email:</strong> <span>${escapeHtml(BUSINESS_PROFILE.email)}</span>
						<strong>Address:</strong> <span>${escapeHtml(BUSINESS_PROFILE.address)}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="signatures">
			<div class="sig-block">
				<p>Thank you for your business!</p>
				<div class="sig-line">Customer Signature</div>
			</div>
			<div class="sig-block">
				<p>&nbsp;</p>
				<div class="sig-line">Authorized Signature</div>
			</div>
		</div>

		<div class="page-num">PAGE #: &nbsp; 1 / 1</div>
	</div>
</body>
</html>
`;

export type PurchasePrintableItem = {
	product: string;
	boxes: number;
	piecesPerBox: number;
	loosePieces: number;
	unitCost: number;
	totalUnits: number;
	lineTotal: number;
};

export type PurchasePrintableRecord = {
	purchaseNumber: string;
	createdAt: string;
	purchaseDate: string;
	purchaseTime: string;
	supplierName: string;
	sourceName: string;
	purchaseReference: string;
	paymentMethod: string;
	status: string;
	transportCost: number;
	notes?: string;
	items: PurchasePrintableItem[];
	subtotal: number;
	totalUnits: number;
	total: number;
	recordedBy?: string;
};

export const buildPrintablePurchaseInvoice = (purchase: PurchasePrintableRecord) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Purchase Invoice - ${BUSINESS_PROFILE.shopName}</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background-color: #525659; display: flex; justify-content: center; padding: 20px; }
		.page { width: 21cm; min-height: 29.7cm; background: white; padding: 1.5cm; box-shadow: 0 0 10px rgba(0,0,0,.5); position: relative; }
		@page { size: A4; margin: 0; }
		@media print { body { background-color: white; padding: 0; display: block; } .page { width: auto; min-height: auto; box-shadow: none; padding: 1.5cm; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
		.bg-navy { background-color: #000066; color: white; }
		.bg-lightgray { background-color: #e2e2e2; }
		.bg-darkgray { background-color: #888888; color: white; }
		.text-navy { color: #000066; }
		.header-section { display: flex; justify-content: space-between; margin-bottom: 25px; }
		.company-info h1 { font-family: 'Times New Roman', Times, serif; font-size: 38px; font-weight: normal; letter-spacing: 1px; margin-bottom: 8px; }
		.company-info p { font-size: 13px; margin-bottom: 4px; }
		.memo-info { text-align: right; padding-top: 15px; }
		.memo-info h2 { font-size: 18px; text-decoration: underline; letter-spacing: 2px; margin-bottom: 4px; }
		.memo-info h3 { font-size: 16px; letter-spacing: 5px; font-weight: bold; margin-bottom: 12px; }
		.barcode-container { display: flex; flex-direction: column; align-items: center; margin-top: 5px; }
		.barcode-bars { height: 35px; width: 120px; background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px); border-bottom: 2px solid white; }
		.barcode-text { font-family: 'Courier New', Courier, monospace; font-size: 10px; letter-spacing: 3px; margin-top: 2px; }
		.info-grid { display: grid; grid-template-columns: 1fr 280px; gap: 15px; margin-bottom: 25px; }
		.recipient-box { border: 1px solid #999; }
		.recipient-box .title-bar { padding: 5px 10px; font-weight: bold; }
		.recipient-box .customer-name { font-size: 18px; padding: 10px; background: white; border-bottom: 1px solid #999; }
		.recipient-details { display: grid; grid-template-columns: 80px 1fr; gap: 5px; padding: 10px; }
		.recipient-details div { padding: 2px 0; }
		.recipient-remarks { border-top: 1px solid #999; padding: 5px 10px; display: grid; grid-template-columns: 80px 1fr; }
		.invoice-meta { border-collapse: collapse; width: 100%; text-align: center; }
		.invoice-meta th, .invoice-meta td { border: 1px solid #999; padding: 6px; }
		.invoice-meta th { font-weight: normal; }
		.invoice-meta .spacer-row { height: 10px; border: none; }
		.product-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #999; }
		.product-table th, .product-table td { padding: 6px 8px; text-align: right; border-bottom: 1px dashed #ccc; }
		.product-table th { font-style: italic; font-weight: normal; border-bottom: none; }
		.product-table th:nth-child(1), .product-table td:nth-child(1) { text-align: left; }
		.product-table tbody tr:last-child td { border-bottom: none; }
		.product-table tfoot td { font-style: italic; border-top: 1px solid #999; }
		.totals-section { display: flex; justify-content: space-between; margin-bottom: 24px; align-items: flex-start; }
		.total-pcs { font-size: 16px; font-weight: bold; font-style: italic; padding-left: 10px; }
		.total-pcs span { margin-left: 20px; font-size: 18px; }
		.financial-summary { width: 280px; border-collapse: collapse; }
		.financial-summary td { padding: 5px 10px; font-style: italic; }
		.financial-summary td:nth-child(2) { text-align: right; }
		.financial-summary tr { border-bottom: 1px dashed #999; }
		.financial-summary tr:last-child { border-bottom: none; font-weight: bold; font-size: 14px; }
		.footer-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 60px; }
		.card { border: 1px solid #999; }
		.card-header { padding: 5px; text-align: center; }
		.card-body { padding: 15px; background: white; min-height: 100px; }
		.bank-info { display: grid; grid-template-columns: 110px 1fr; gap: 8px; line-height: 1.4; }
		.bank-info .bank-name { grid-column: 1 / -1; text-align: center; font-weight: bold; margin-bottom: 5px; }
		.bank-info strong { font-weight: normal; }
		.dev-info { text-align: center; line-height: 1.8; }
		.dev-info .dev-names { font-weight: bold; margin-bottom: 15px; display: block; }
		.dev-contact { display: flex; justify-content: center; gap: 20px; }
		.signatures { display: flex; justify-content: space-between; padding: 0 20px; margin-bottom: 40px; }
		.sig-block { width: 250px; text-align: center; }
		.sig-block p { margin-bottom: 40px; font-style: italic; text-align: left; }
		.sig-line { border-top: 1px solid #000; padding-top: 5px; font-style: italic; }
		.page-num { text-align: right; font-style: italic; padding-right: 20px; }
	</style>
</head>
<body>
	<div class="page">
		<header class="header-section">
			<div class="company-info">
				<h1 class="text-navy">${BUSINESS_PROFILE.shopName}</h1>
				<p>${escapeHtml(BUSINESS_PROFILE.address)}</p>
				<p>Buniess Associates : ${escapeHtml(BUSINESS_PROFILE.shopOwner)}</p>
				<p>Phone : ${escapeHtml(BUSINESS_PROFILE.contactNumber)}</p>
				<p>Email : ${escapeHtml(BUSINESS_PROFILE.email)}</p>
			</div>
			<div class="memo-info">
				<h2>PURCHASE INVOICE</h2>
				<h3>ORIGINAL</h3>
				<div class="barcode-container">
					<div class="barcode-bars"></div>
					<div class="barcode-text">* ${escapeHtml(purchase.purchaseNumber.replace(/[^0-9]/g, '').slice(-5) || '11361')} *</div>
				</div>
			</div>
		</header>

		<div class="info-grid">
			<div class="recipient-box">
				<div class="title-bar bg-navy">SUPPLIER</div>
				<div class="customer-name text-navy">${escapeHtml(purchase.supplierName || 'SUPPLIER')}</div>
				<div class="recipient-details bg-lightgray">
					<div>Source :</div>
					<div>${escapeHtml(purchase.sourceName || 'Direct')}</div>
					<div>Ref :</div>
					<div>${escapeHtml(purchase.purchaseReference || '—')}</div>
					<div>Status :</div>
					<div>${escapeHtml(purchase.status || 'Pending')}</div>
					<div>Payment :</div>
					<div>${escapeHtml(purchase.paymentMethod || '—')}</div>
				</div>
				<div class="recipient-remarks bg-lightgray">
					<div>Notes</div>
					<div>${escapeHtml(purchase.notes || '---')}</div>
				</div>
			</div>

			<div>
				<table class="invoice-meta">
					<tr class="bg-lightgray">
						<th>Invoice ID</th>
						<th>Invoice Time</th>
					</tr>
					<tr>
						<td>${escapeHtml(purchase.purchaseNumber)}</td>
						<td>${escapeHtml(purchase.purchaseTime || '—')}</td>
					</tr>
					<tr class="spacer-row"><td colspan="2"></td></tr>
					<tr class="bg-lightgray">
						<th colspan="2">Date</th>
					</tr>
					<tr>
						<td colspan="2">${escapeHtml(new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(purchase.purchaseDate)))}</td>
					</tr>
				</table>
			</div>
		</div>

		<table class="product-table">
			<thead>
				<tr class="bg-navy">
					<th>Product</th>
					<th>Crtn</th>
					<th>Pcs/Box</th>
					<th>Loose</th>
					<th>Qty</th>
					<th>Rate</th>
					<th>AMOUNT</th>
				</tr>
			</thead>
			<tbody>
				${purchase.items
					.map(
						(item) => `
				<tr>
					<td>${escapeHtml(item.product)}</td>
					<td>${item.boxes}</td>
					<td>${item.piecesPerBox}</td>
					<td>${item.loosePieces}</td>
					<td>${item.totalUnits}</td>
					<td>${formatMoney(item.unitCost)}</td>
					<td>${formatMoney(item.lineTotal)}</td>
				</tr>`,
					)
					.join('')}
			</tbody>
			<tfoot>
				<tr class="bg-darkgray">
					<td>Total Item(s):-</td>
					<td>${purchase.items.length}</td>
					<td>${purchase.items.reduce((sum, item) => sum + item.boxes, 0)}</td>
					<td>${purchase.items.reduce((sum, item) => sum + item.loosePieces, 0)}</td>
					<td>${purchase.totalUnits}</td>
					<td></td>
					<td>${formatMoney(purchase.total)}</td>
				</tr>
			</tfoot>
		</table>

		<div class="totals-section">
			<div class="total-pcs">
				Total Units <span>${purchase.totalUnits}</span>
			</div>
			<table class="financial-summary">
				<tr>
					<td>SUBTOTAL</td>
					<td>${formatMoney(purchase.subtotal)}</td>
				</tr>
				<tr>
					<td>TRANSPORT</td>
					<td>${formatMoney(purchase.transportCost)}</td>
				</tr>
				<tr>
					<td>TOTAL</td>
					<td>${formatMoney(purchase.total)}</td>
				</tr>
				<tr>
					<td>RECORDED BY</td>
					<td>${escapeHtml(purchase.recordedBy || 'Unknown')}</td>
				</tr>
			</table>
		</div>

		<div class="footer-cards">
			<div class="card">
				<div class="card-header bg-navy">PURCHASE DETAILS</div>
				<div class="card-body">
					<div class="bank-info">
						<div class="bank-name">${escapeHtml(BUSINESS_PROFILE.shopName)}</div>
						<strong>Source:</strong> <span>${escapeHtml(purchase.sourceName || 'Direct')}</span>
						<strong>Reference:</strong> <span>${escapeHtml(purchase.purchaseReference || '—')}</span>
						<strong>Status:</strong> <span>${escapeHtml(purchase.status || 'Pending')}</span>
						<strong>Payment:</strong> <span>${escapeHtml(purchase.paymentMethod || '—')}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="signatures">
			<div class="sig-block">
				<p>Goods received and checked.</p>
				<div class="sig-line">Supplier Signature</div>
			</div>
			<div class="sig-block">
				<p>&nbsp;</p>
				<div class="sig-line">Authorized Signature</div>
			</div>
		</div>

		<div class="page-num">PAGE #: &nbsp; 1 / 1</div>
	</div>
</body>
</html>
`;

export const buildPrintablePayment = (payment: { paymentNumber: string; title: string; party: string; direction: string; amount: number; date: string; time: string; notes?: string; }) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<title>${escapeHtml(payment.paymentNumber)} - Payment</title>
	<style>
		body{font-family:Inter, Arial, sans-serif;margin:0;padding:28px;color:#0f172a}
		.paper{max-width:700px;margin:0 auto}
		.band{display:flex;justify-content:space-between;align-items:center;padding:14px;border-radius:8px;background:#06b6d4;color:#fff}
		.meta{display:flex;gap:12px;margin-top:16px}
		.card{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#fff}
		.right{text-align:right}
		.amount{font-weight:800;font-size:20px}
		.note{margin-top:12px;color:#475569}
	</style>
</head>
<body>
	<div class="paper">
		<div class="band"><div>${BUSINESS_PROFILE.shopName}</div><div>${escapeHtml(payment.paymentNumber)}</div></div>
		<div class="meta">
			<div class="card">
				<div style="font-size:11px;color:#64748b">Title</div>
				<div style="font-weight:700">${escapeHtml(payment.title)}</div>
				<div style="margin-top:8px;color:#64748b">Party</div>
				<div>${escapeHtml(payment.party)}</div>
			</div>
			<div class="card right">
				<div style="font-size:11px;color:#64748b">Direction</div>
				<div style="font-weight:700">${escapeHtml(payment.direction)}</div>
				<div style="margin-top:8px;font-size:18px" class="amount">${formatMoney(payment.amount)}</div>
				<div style="margin-top:6px;color:#64748b">${escapeHtml(payment.date)} ${escapeHtml(payment.time)}</div>
			</div>
		</div>
		${payment.notes ? `<div class="note"><strong>Notes:</strong> ${escapeHtml(payment.notes)}</div>` : ''}
	</div>
</body>
</html>
`;

export const createBillRecord = (form: BillFormState): BillRecord => {
	const now = new Date();
	const billId = `${now.getTime()}-${billSequence}`;
	const recordedBy = readStaffSession()?.name || (hasAdminSession() ? 'Administrator' : 'Unknown');
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
		recordedBy,
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
