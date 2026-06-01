import { NextRequest } from 'next/server';

type CookieOptions = {
	httpOnly: boolean;
	secure: boolean;
	sameSite: 'lax';
	maxAge: number;
	path: string;
	domain?: string;
};

function getSharedAuthCookieDomain(hostname: string) {
	const normalizedHost = hostname.trim().toLowerCase();
	if (!normalizedHost) return undefined;
	if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') return undefined;
	if (normalizedHost.endsWith('.localhost')) return undefined;
	if (normalizedHost === 'fs-communication.com' || normalizedHost.endsWith('.fs-communication.com')) {
		return '.fs-communication.com';
	}

	return undefined;
}

export function getAuthCookieOptions(req: NextRequest): CookieOptions {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 24 * 60 * 60,
		path: '/',
		domain: getSharedAuthCookieDomain(req.nextUrl.hostname),
	};
}
