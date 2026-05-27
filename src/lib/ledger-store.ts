import { emitAppActionSuccess, type AppWriteOptions } from './app-feedback';

export type LedgerDirection = 'Incoming' | 'Outgoing';

export const SALES_BILLS_STORAGE_KEY = 'fs-communication:sales-bills';
export const PURCHASES_STORAGE_KEY = 'fs-communication:purchases';
export const MANUAL_PAYMENTS_STORAGE_KEY = 'fs-communication:manual-payments';
export const LEDGER_STORAGE_EVENT = 'ledger-storage-updated';

const LEDGER_SYNC_KEYS = new Set([
	SALES_BILLS_STORAGE_KEY,
	PURCHASES_STORAGE_KEY,
	MANUAL_PAYMENTS_STORAGE_KEY,
]);

export type SalesBillLike = {
	invoiceNumber: string;
	date: string;
	time: string;
	customerName: string;
	customerContact: string;
	paymentMethod: string;
	total: number;
	recordedBy?: string;
};

export type PurchaseRecordLike = {
	purchaseNumber: string;
	createdAt: string;
	supplierName: string;
	sourceName: string;
	purchaseReference: string;
	purchaseDate: string;
	purchaseTime: string;
	paymentMethod: string;
	status: string;
	transportCost: number;
	notes: string;
	total: number;
	recordedBy?: string;
};

export type LedgerPaymentRecord = {
	paymentNumber: string;
	title: string;
	party: string;
	direction: LedgerDirection;
	amount: number;
	date: string;
	time: string;
	notes: string;
	createdAt: string;
	recordedBy?: string;
};

export function readStoredArray<T>(storageKey: string): T[] {
	if (typeof window === 'undefined') return [];

	try {
		const rawValue = window.localStorage.getItem(storageKey);
		if (!rawValue) return [];

		const parsedValue = JSON.parse(rawValue);
		return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
	} catch {
		return [];
	}
}

function syncLedgerSnapshot(storageKey: string, value: string | null) {
	if (typeof window === 'undefined') return;
	if (!LEDGER_SYNC_KEYS.has(storageKey)) return;

	void fetch('/api/ledger-state', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		cache: 'no-store',
		body: JSON.stringify({ key: storageKey, value }),
	}).catch(() => null);
}

export function writeStoredArray<T>(storageKey: string, value: T[], options?: AppWriteOptions) {
	if (typeof window === 'undefined') return;

	const serialized = JSON.stringify(value);
	window.localStorage.setItem(storageKey, serialized);
	syncLedgerSnapshot(storageKey, serialized);
	window.dispatchEvent(new Event(LEDGER_STORAGE_EVENT));
	if (!options?.silent) emitAppActionSuccess(storageKey);
}

export function getNextPaymentSequence(records: Array<{ paymentNumber: string }>, prefix = 'PAY-') {
	return records.reduce((highest, record) => {
		const match = record.paymentNumber.match(new RegExp(`^${prefix}(\\d+)$`));
		if (!match) return highest;

		const value = Number(match[1]);
		return Number.isFinite(value) ? Math.max(highest, value) : highest;
	}, 0) + 1;
}

const toDateKey = (value: string) => value.slice(0, 10);

export function mapSaleBillToPaymentRecord(bill: SalesBillLike): LedgerPaymentRecord {
	return {
		paymentNumber: bill.invoiceNumber,
		title: 'Sales payment',
		party: bill.customerName.trim() || 'Walk-in customer',
		direction: 'Incoming',
		amount: bill.total,
		date: toDateKey(bill.date),
		time: bill.time,
		notes: `Invoice ${bill.invoiceNumber} via ${bill.paymentMethod}`,
		createdAt: bill.date,
	};
}

export function mapPurchaseToPaymentRecord(purchase: PurchaseRecordLike): LedgerPaymentRecord {
	return {
		paymentNumber: purchase.purchaseNumber,
		title: 'Purchase payment',
		party: purchase.supplierName.trim() || 'Supplier',
		direction: 'Outgoing',
		amount: purchase.total,
		date: toDateKey(purchase.purchaseDate),
		time: purchase.purchaseTime,
		notes: `${purchase.sourceName}${purchase.purchaseReference ? ` · ${purchase.purchaseReference}` : ''}${purchase.status ? ` · ${purchase.status}` : ''}`,
		createdAt: purchase.createdAt,
	};
}
