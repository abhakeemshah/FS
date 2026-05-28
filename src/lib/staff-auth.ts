import { emitAppActionSuccess, type AppWriteOptions } from './app-feedback';

export const STAFF_ACCOUNTS_STORAGE_KEY = 'fs-communication:staff-accounts';
export const STAFF_SESSION_STORAGE_KEY = 'fs-communication:staff-session';
export const STAFF_SESSION_COOKIE = 'fs-communication:staff-session-active';
export const ADMIN_SESSION_STORAGE_KEY = 'fs-communication:admin-session';
export const STAFF_ACCESS_META_KEY = 'fs-communication:staff-access-meta';
export const STAFF_AUTH_EVENT = 'staff-auth-updated';

export const STAFF_MODULE_KEYS = ['dashboard', 'sales', 'products', 'purchases', 'payments', 'parties', 'reports', 'settings'] as const;
export const STAFF_SETTINGS_KEYS = ['profile', 'interface', 'alerts', 'quick-actions', 'privacy', 'receipt-view'] as const;

export type StaffModuleKey = (typeof STAFF_MODULE_KEYS)[number];
export type StaffSettingKey = (typeof STAFF_SETTINGS_KEYS)[number];

export type StaffAccessLevel = 'none' | 'view' | 'edit';

export type StaffAccessMeta = {
	role: 'cashier' | 'sales' | 'inventory' | 'supervisor';
	status: 'active' | 'suspended';
	permissions: Record<StaffModuleKey, StaffAccessLevel>;
	allowedSettings: StaffSettingKey[];
	lastUpdatedAt: string;
};

type StaffAccessMetaLike = Partial<StaffAccessMeta> & {
	permissions?: Partial<Record<StaffModuleKey, StaffAccessLevel>>;
	allowedSettings?: unknown;
};

export type StaffAccessMetaMap = Record<string, StaffAccessMeta>;

export type StaffAccount = {
	id: string;
	name: string;
	username: string;
	password: string;
	createdAt: string;
	createdBy: string;
};
// Optional archival marker to avoid hard-deletes; use soft-delete by setting `deletedAt`.
export type StaffAccountRecord = StaffAccount & { deletedAt?: string | null };

export type StaffSession = {
	id: string;
	name: string;
	username: string;
	loggedInAt: string;
};

const accessRank: Record<StaffAccessLevel, number> = {
	none: 0,
	view: 1,
	edit: 2,
};

const defaultPermissions = (): Record<StaffModuleKey, StaffAccessLevel> => ({
	dashboard: 'view',
	sales: 'view',
	products: 'none',
	purchases: 'view',
	payments: 'view',
	parties: 'none',
	reports: 'none',
	settings: 'none',
});

const defaultAllowedSettings = (): StaffSettingKey[] => ['profile', 'interface'];

function isStaffModuleKey(value: unknown): value is StaffModuleKey {
	return typeof value === 'string' && (STAFF_MODULE_KEYS as readonly string[]).includes(value);
}

function isStaffSettingKey(value: unknown): value is StaffSettingKey {
	return typeof value === 'string' && (STAFF_SETTINGS_KEYS as readonly string[]).includes(value);
}

function normalizeAllowedSettings(value: unknown): StaffSettingKey[] {
	if (!Array.isArray(value)) return defaultAllowedSettings();

	const normalized = value.filter(isStaffSettingKey);
	return normalized.length > 0 ? normalized : defaultAllowedSettings();
}

function normalizeAccessLevel(value: unknown): StaffAccessLevel {
	if (value === 'none' || value === 'view' || value === 'edit') return value;
	if (value === 'full') return 'edit';
	return 'none';
}

function normalizePermissions(value: unknown): Record<StaffModuleKey, StaffAccessLevel> {
	const fallback = defaultPermissions();
	if (!value || typeof value !== 'object') return fallback;

	const permissions = value as Partial<Record<StaffModuleKey, unknown>>;
	return {
		dashboard: normalizeAccessLevel(permissions.dashboard) || fallback.dashboard,
		sales: normalizeAccessLevel(permissions.sales) || fallback.sales,
		products: normalizeAccessLevel(permissions.products) || fallback.products,
		purchases: normalizeAccessLevel(permissions.purchases) || fallback.purchases,
		payments: normalizeAccessLevel(permissions.payments) || fallback.payments,
		parties: normalizeAccessLevel(permissions.parties) || fallback.parties,
		reports: normalizeAccessLevel(permissions.reports) || fallback.reports,
		settings: normalizeAccessLevel(permissions.settings) || fallback.settings,
	};
}

export function normalizeStaffAccessMeta(value: unknown): StaffAccessMeta {
	const candidate = (value ?? {}) as StaffAccessMetaLike;

	return {
		role: candidate.role === 'cashier' || candidate.role === 'sales' || candidate.role === 'inventory' || candidate.role === 'supervisor' ? candidate.role : 'cashier',
		status: candidate.status === 'suspended' ? 'suspended' : 'active',
		permissions: normalizePermissions(candidate.permissions),
		allowedSettings: normalizeAllowedSettings(candidate.allowedSettings),
		lastUpdatedAt: typeof candidate.lastUpdatedAt === 'string' && candidate.lastUpdatedAt ? candidate.lastUpdatedAt : new Date().toISOString(),
	};
}

export function createDefaultStaffAccessMeta(): StaffAccessMeta {
	return {
		role: 'cashier',
		status: 'active',
		permissions: defaultPermissions(),
		allowedSettings: defaultAllowedSettings(),
		lastUpdatedAt: new Date().toISOString(),
	};
}

function dispatchAuthChange() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(STAFF_AUTH_EVENT));
}

function writeClientCookie(name: string, value: string | null) {
	if (typeof window === 'undefined') return;
	if (value === null) {
		window.document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
		return;
	}

	window.document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${24 * 60 * 60}; samesite=lax`;
}

function readClientCookie(name: string) {
	if (typeof window === 'undefined') return null;

	const prefix = `${name}=`;
	const entries = window.document.cookie ? window.document.cookie.split('; ') : [];
	for (const entry of entries) {
		if (entry.startsWith(prefix)) {
			return decodeURIComponent(entry.slice(prefix.length));
		}
	}

	return null;
}

function readJson<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback;

	try {
		const rawValue = readClientCookie(key) ?? window.localStorage.getItem(key);
		if (!rawValue) return fallback;
		return decodeStoredJson<T>(rawValue);
	} catch {
		return fallback;
	}
}
function writeJson<T>(key: string, value: T, options?: AppWriteOptions) {
	if (typeof window === 'undefined') return;
	writeClientCookie(key, encodeStoredJson(value));
	dispatchAuthChange();
	if (!options?.silent) emitAppActionSuccess(key);
}

function encodeStoredJson<T>(value: T): string {
	const json = JSON.stringify(value);
	const bytes = new TextEncoder().encode(json);
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return window.btoa(binary);
}

function decodeStoredJson<T>(rawValue: string): T {
	try {
		const binary = window.atob(rawValue);
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		return JSON.parse(new TextDecoder().decode(bytes)) as T;
	} catch {
		return JSON.parse(rawValue) as T;
	}
}

export function readStaffAccounts(): StaffAccount[] {
	const accounts = readJson<StaffAccountRecord[]>(STAFF_ACCOUNTS_STORAGE_KEY, []);

	return accounts
		.filter((account) => account && !account.deletedAt && account.username && account.password)
		.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

// Read the raw stored accounts including soft-deleted records. Use when you need to update or archive.
export function readAllStaffAccounts(): StaffAccountRecord[] {
	return readJson<StaffAccountRecord[]>(STAFF_ACCOUNTS_STORAGE_KEY, []);
}

export function saveStaffAccounts(accounts: StaffAccount[]) {
	writeJson(STAFF_ACCOUNTS_STORAGE_KEY, accounts);
}

export function readStaffAccessMetaMap(): StaffAccessMetaMap {
	if (typeof window === 'undefined') return {};

	try {
		const raw = readClientCookie(STAFF_ACCESS_META_KEY) ?? window.localStorage.getItem(STAFF_ACCESS_META_KEY);
		if (!raw) return {};
		const parsed = decodeStoredJson<StaffAccessMetaMap>(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

export function writeStaffAccessMetaMap(value: StaffAccessMetaMap, options?: AppWriteOptions) {
	if (typeof window === 'undefined') return;
	const serialized = encodeStoredJson(value);
	writeClientCookie(STAFF_ACCESS_META_KEY, serialized);
	try {
		window.localStorage.setItem(STAFF_ACCESS_META_KEY, serialized);
	} catch {
		// localStorage can be disabled; cookie persistence is the primary path.
	}
	dispatchAuthChange();
	if (!options?.silent) emitAppActionSuccess(STAFF_ACCESS_META_KEY);

	if (hasAdminSession()) {
		void fetch('/api/auth/staff', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ accessMetaMap: value }),
			cache: 'no-store',
			credentials: 'include',
		}).catch(() => null);
	}

	void fetch('/api/staff-meta/publish', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ accessMetaMap: value }),
		cache: 'no-store',
	}).catch(() => null);
}

export function getStaffAccessMetaKey(value: Pick<StaffSession, 'id' | 'username'> | Pick<StaffAccount, 'id' | 'username'> | string) {
	if (typeof value === 'string') {
		return value.trim().toLowerCase();
	}

	return value.username.trim().toLowerCase() || value.id;
}

export function getStaffAccessMetaForCurrentSession() {
	const session = readStaffSession();
	if (!session) return null;

	const metaMap = readStaffAccessMetaMap();
	const directKey = getStaffAccessMetaKey(session);
	if (metaMap[directKey]) {
		return metaMap[directKey];
	}

	const matchingAccount = readStaffAccounts().find((account) => account.username.trim().toLowerCase() === session.username.trim().toLowerCase());
	if (matchingAccount) {
		const accountKey = getStaffAccessMetaKey(matchingAccount);
		return metaMap[accountKey] ?? metaMap[matchingAccount.id] ?? null;
	}

	return metaMap[session.id] ?? null;
}

export function getCurrentStaffModuleAccess(moduleKey: StaffModuleKey): StaffAccessLevel {
	const meta = getStaffAccessMetaForCurrentSession();
	return meta?.permissions?.[moduleKey] ?? 'none';
}

export function canCurrentStaffAccessModule(moduleKey: StaffModuleKey, requiredLevel: Exclude<StaffAccessLevel, 'none'> = 'view') {
	const currentLevel = getCurrentStaffModuleAccess(moduleKey);
	return accessRank[currentLevel] >= accessRank[requiredLevel];
}

export function getStaffAllowedSettings(): StaffSettingKey[] {
	const meta = getStaffAccessMetaForCurrentSession();
	const settings = meta?.allowedSettings;
	return (settings && settings.length > 0) ? settings : defaultAllowedSettings();
}

export function isSettingAllowed(settingKey: StaffSettingKey): boolean {
	const allowedSettings = getStaffAllowedSettings();
	return allowedSettings.includes(settingKey);
}

export function getStaffAccessLabel(level: StaffAccessLevel) {
	if (level === 'none') return 'No access';
	if (level === 'view') return 'View';
	return 'Edit';
}

export function createStaffAccount(input: {
	name: string;
	username: string;
	password: string;
	createdBy?: string;
}): { ok: true; account: StaffAccount } | { ok: false; message: string } {
	const name = input.name.trim();
	const username = input.username.trim().toLowerCase();
	const password = input.password.trim();

	if (!name) return { ok: false, message: 'Name is required.' };
	if (!username) return { ok: false, message: 'Username is required.' };
	if (password.length < 4) return { ok: false, message: 'Password must be at least 4 characters.' };

	const accounts = readStaffAccounts();
	const exists = accounts.some((account) => account.username === username);
	if (exists) return { ok: false, message: 'Username already exists.' };

	const account: StaffAccount = {
		id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		name,
		username,
		password,
		createdAt: new Date().toISOString(),
		createdBy: input.createdBy?.trim() || 'admin',
	};

	writeJson(STAFF_ACCOUNTS_STORAGE_KEY, [account, ...accounts]);
	return { ok: true, account };
}

export function authenticateStaff(usernameInput: string, passwordInput: string): StaffAccount | null {
	const username = usernameInput.trim().toLowerCase();
	const password = passwordInput.trim();

	if (!username || !password) return null;

	const account = readStaffAccounts().find(
		(staffAccount) => staffAccount.username === username && staffAccount.password === password,
	);

	return account ?? null;
}

export function saveStaffSession(account: Pick<StaffAccount, 'id' | 'name' | 'username'>) {
	const session: StaffSession = {
		id: account.id,
		name: account.name,
		username: account.username,
		loggedInAt: new Date().toISOString(),
	};

	if (typeof window !== 'undefined') {
		writeClientCookie(STAFF_SESSION_STORAGE_KEY, encodeStoredJson(session));
		writeClientCookie(STAFF_SESSION_COOKIE, '1');
		dispatchAuthChange();
	}

	// Initialize default permissions if not already set
	const metaMap = readStaffAccessMetaMap();
	const key = getStaffAccessMetaKey(session);
	if (!metaMap[key]) {
		metaMap[key] = createDefaultStaffAccessMeta();
		writeStaffAccessMetaMap(metaMap);
	}
}

export function readStaffSession(): StaffSession | null {
	if (typeof window === 'undefined') return null;

	try {
		const rawValue = readClientCookie(STAFF_SESSION_STORAGE_KEY) ?? window.localStorage.getItem(STAFF_SESSION_STORAGE_KEY);
		if (!rawValue) return null;

		const session = decodeStoredJson<StaffSession>(rawValue);
		if (!session?.id || !session?.username) throw new Error('Invalid staff session');
		return session;
	} catch {
		// If parsing the stored session fails, remove only the corrupted staff session
		// entry and the client session cookie. Do NOT clear all localStorage —
		// that was destructive and removed unrelated persisted data.
		try {
			writeClientCookie(STAFF_SESSION_STORAGE_KEY, null);
		} catch {
			// ignore
		}
		try {
			writeClientCookie(STAFF_SESSION_COOKIE, null);
		} catch {
			// ignore
		}
		return null;
	}
}

export function clearStaffSession() {
	if (typeof window === 'undefined') return;
	writeClientCookie(STAFF_SESSION_STORAGE_KEY, null);
	writeClientCookie(STAFF_SESSION_COOKIE, null);
	dispatchAuthChange();
}

export function markAdminSessionActive() {
	if (typeof window === 'undefined') return;
	writeClientCookie(ADMIN_SESSION_STORAGE_KEY, new Date().toISOString());
	dispatchAuthChange();
}

export function hasAdminSession() {
	if (typeof window === 'undefined') return false;
	try {
		const rawValue = readClientCookie(ADMIN_SESSION_STORAGE_KEY) ?? window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
		if (!rawValue) return false;

		const issuedAt = new Date(rawValue).getTime();
		if (!Number.isFinite(issuedAt)) {
			writeClientCookie(ADMIN_SESSION_STORAGE_KEY, null);
			return false;
		}

		const isFresh = Date.now() - issuedAt < 24 * 60 * 60 * 1000;
		if (!isFresh) {
			writeClientCookie(ADMIN_SESSION_STORAGE_KEY, null);
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

export async function fetchCurrentStaffAccessMeta(): Promise<StaffAccessMeta | null> {
	if (typeof window === 'undefined') return null;

	try {
		const response = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
		if (response.ok) {
			const data = (await response.json()) as { staffAccessMeta?: unknown; user?: { staffAccessMeta?: unknown } };
			const rawMeta = data.staffAccessMeta ?? data.user?.staffAccessMeta ?? null;
			const result = normalizeStaffAccessMeta(rawMeta);
			if (result) return result;
		}
	} catch {
		// ignore and try public lookup
	}

	const session = readStaffSession();
	if (!session) return null;

	try {
		const username = encodeURIComponent(session.username.trim().toLowerCase());
		const fallback = await fetch(`/api/staff-meta?username=${username}`, { cache: 'no-store' });
		if (!fallback.ok) return null;

		const data = (await fallback.json()) as { staffAccessMeta?: unknown };
		return normalizeStaffAccessMeta(data.staffAccessMeta ?? null);
	} catch {
		return null;
	}
}

export async function syncLocalStaffMetaWithServer(): Promise<void> {
	if (typeof window === 'undefined') return;

	try {
		const remote = await fetchCurrentStaffAccessMeta();
		if (!remote) return;

		const session = readStaffSession();
		if (!session) return;

		const key = getStaffAccessMetaKey(session);
		const map = readStaffAccessMetaMap();
		map[key] = remote;
		writeStaffAccessMetaMap(map);
	} catch (err) {
		// noop
	}
}

// Admin authentication (demo/development only)
export function authenticateAdmin(emailInput: string, passwordInput: string): boolean {
	const email = emailInput.trim().toLowerCase();
	const password = passwordInput.trim();

	if (!email || !password || typeof window === 'undefined') return false;

	try {
		const request = new XMLHttpRequest();
		request.open('POST', '/api/auth/login', false);
		request.setRequestHeader('Content-Type', 'application/json');
		request.send(JSON.stringify({ email, password, role: 'admin' }));

		if (request.status < 200 || request.status >= 300) return false;

		const response = JSON.parse(request.responseText) as { success?: boolean };
		return response.success === true;
	} catch {
		return false;
	}
}

export function saveAdminSession(): void {
	if (typeof window === 'undefined') return;
	markAdminSessionActive();
	dispatchAuthChange();
}

export function clearAdminSession(): void {
	if (typeof window === 'undefined') return;
	window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
	dispatchAuthChange();
}

export function readAdminEmail(): string | null {
	if (typeof window === 'undefined') return null;
	return null;
}

