import 'server-only';

import fs from 'fs';
import path from 'path';

export type StaffAccountFileRecord = {
	id: string;
	name: string;
	email: string;
	password: string;
	role: 'staff' | 'admin';
	createdAt: string;
	updatedAt: string;
	staffAccessMetaJson?: string | null;
};

const STAFF_ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'staff-accounts.json');

function ensureDataDir() {
	const dataDir = path.dirname(STAFF_ACCOUNTS_FILE);
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
}

export function readStaffAccountFileRecords(): StaffAccountFileRecord[] {
	try {
		if (!fs.existsSync(STAFF_ACCOUNTS_FILE)) return [];
		const raw = fs.readFileSync(STAFF_ACCOUNTS_FILE, 'utf-8');
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];

		return parsed.filter((item): item is StaffAccountFileRecord => {
			return Boolean(
				item &&
				typeof item === 'object' &&
				'id' in item &&
				'email' in item &&
				'password' in item &&
				'name' in item &&
				'role' in item,
			);
		});
	} catch {
		return [];
	}
}

export function writeStaffAccountFileRecords(records: StaffAccountFileRecord[]) {
	ensureDataDir();
	fs.writeFileSync(STAFF_ACCOUNTS_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

export function findStaffAccountFileRecordByEmail(email: string) {
	const normalizedEmail = email.trim().toLowerCase();
	return readStaffAccountFileRecords().find((record) => record.email.trim().toLowerCase() === normalizedEmail) ?? null;
}

export function findStaffAccountFileRecordById(id: string) {
	const normalizedId = id.trim();
	return readStaffAccountFileRecords().find((record) => record.id === normalizedId) ?? null;
}

export function upsertStaffAccountFileRecord(record: StaffAccountFileRecord) {
	const records = readStaffAccountFileRecords();
	const normalizedEmail = record.email.trim().toLowerCase();
	const index = records.findIndex((item) => item.id === record.id || item.email.trim().toLowerCase() === normalizedEmail);
	const nextRecord = {
		...record,
		email: normalizedEmail,
		updatedAt: new Date().toISOString(),
	};

	if (index >= 0) {
		records[index] = { ...records[index], ...nextRecord };
	} else {
		records.unshift(nextRecord);
	}

	writeStaffAccountFileRecords(records);
	return nextRecord;
}

export function deleteStaffAccountFileRecord(id: string) {
	const normalizedId = id.trim();
	const records = readStaffAccountFileRecords().filter((record) => record.id !== normalizedId);
	writeStaffAccountFileRecords(records);
}

export function mergeStaffAccountFileRecords(records: StaffAccountFileRecord[]) {
	const existing = readStaffAccountFileRecords();
	const next = new Map<string, StaffAccountFileRecord>();

	for (const record of existing) {
		next.set(record.id, record);
		next.set(record.email.trim().toLowerCase(), record);
	}

	for (const record of records) {
		next.set(record.id, record);
		next.set(record.email.trim().toLowerCase(), record);
	}

	const merged: StaffAccountFileRecord[] = [];
	for (const value of next.values()) {
		if (!merged.some((item) => item.id === value.id)) {
			merged.push(value);
		}
	}

	writeStaffAccountFileRecords(merged);
	return merged;
}