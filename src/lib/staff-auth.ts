export const STAFF_ACCOUNTS_STORAGE_KEY = 'fs-communication:staff-accounts';
export const STAFF_SESSION_STORAGE_KEY = 'fs-communication:staff-session';
export const ADMIN_SESSION_STORAGE_KEY = 'fs-communication:admin-session';
export const STAFF_ACCESS_META_KEY = 'fs-communication:staff-access-meta';
export const STAFF_AUTH_EVENT = 'staff-auth-updated';

export const STAFF_MODULE_KEYS = ['sales', 'purchases', 'payments', 'parties', 'reports'] as const;
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
	sales: 'view',
	purchases: 'view',
	payments: 'view',
	parties: 'none',
	reports: 'none',
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
		sales: normalizeAccessLevel(permissions.sales) || fallback.sales,
		purchases: normalizeAccessLevel(permissions.purchases) || fallback.purchases,
		payments: normalizeAccessLevel(permissions.payments) || fallback.payments,
		parties: normalizeAccessLevel(permissions.parties) || fallback.parties,
		reports: normalizeAccessLevel(permissions.reports) || fallback.reports,
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

function readJson<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback;

	try {
		const rawValue = window.localStorage.getItem(key);
		if (!rawValue) return fallback;
		return JSON.parse(rawValue) as T;
	} catch {
		return fallback;
	}
}

function writeJson<T>(key: string, value: T) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(key, JSON.stringify(value));
	dispatchAuthChange();
}

export function readStaffAccounts(): StaffAccount[] {
	const accounts = readJson<StaffAccount[]>(STAFF_ACCOUNTS_STORAGE_KEY, []);

	return accounts
		.filter((account) => account?.username && account?.password)
		.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function readStaffAccessMetaMap(): StaffAccessMetaMap {
	if (typeof window === 'undefined') return {};

	try {
		const raw = window.localStorage.getItem(STAFF_ACCESS_META_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as StaffAccessMetaMap;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

export function writeStaffAccessMetaMap(value: StaffAccessMetaMap) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(STAFF_ACCESS_META_KEY, JSON.stringify(value));
	dispatchAuthChange();

	if (hasAdminSession()) {
		void fetch('/api/auth/staff', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ accessMetaMap: value }),
			credentials: 'include',
		}).catch(() => null);
	}

	void fetch('/api/staff-meta/publish', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ accessMetaMap: value }),
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

	writeJson(STAFF_SESSION_STORAGE_KEY, session);

	// Initialize default permissions if not already set
	const metaMap = readStaffAccessMetaMap();
	const key = getStaffAccessMetaKey(session);
	if (!metaMap[key]) {
		metaMap[key] = createDefaultStaffAccessMeta();
		writeStaffAccessMetaMap(metaMap);
	}
}

export function readStaffSession(): StaffSession | null {
	const session = readJson<StaffSession | null>(STAFF_SESSION_STORAGE_KEY, null);

	if (!session?.id || !session?.username) return null;
	return session;
}

export function clearStaffSession() {
	if (typeof window === 'undefined') return;
	window.localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
	dispatchAuthChange();
}

export function markAdminSessionActive() {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, new Date().toISOString());
	dispatchAuthChange();
}

export function hasAdminSession() {
	if (typeof window === 'undefined') return false;
	return Boolean(window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY));
}

export async function fetchCurrentStaffAccessMeta(): Promise<StaffAccessMeta | null> {
	if (typeof window === 'undefined') return null;

	try {
		const response = await fetch('/api/auth/me', { credentials: 'include' });
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
		const fallback = await fetch(`/api/staff-meta?username=${username}`);
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
	// Simple demo authentication - just check against demo credentials
	const email = emailInput.trim().toLowerCase();
	const password = passwordInput.trim();
	
	// Demo admin credentials
	return email === 'admin@fscomms.io' && password === 'admin123';
}

export function saveAdminSession(): void {
	if (typeof window === 'undefined') return;
	markAdminSessionActive();
	window.localStorage.setItem('admin-email', 'admin@fscomms.io');
	dispatchAuthChange();
}

export function clearAdminSession(): void {
	if (typeof window === 'undefined') return;
	window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
	window.localStorage.removeItem('admin-email');
	dispatchAuthChange();
}

export function readAdminEmail(): string | null {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem('admin-email') ?? null;
}

