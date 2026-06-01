import { jwtVerify as joseVerify } from 'jose';

// Resolve the JWT signing secret. In production a real JWT_SECRET is required;
// we never fall back to a hardcoded value there, otherwise tokens could be forged.
export function getJwtSecret(): string {
	const secret = process.env.JWT_SECRET;
	if (secret && secret.trim().length > 0) return secret;

	if (process.env.NODE_ENV === 'production') {
		throw new Error('JWT_SECRET is not set. Refusing to start auth with an insecure default in production.');
	}

	return 'dev-only-insecure-secret';
}

export async function jwtVerify(token: string) {
	const secret = new TextEncoder().encode(getJwtSecret());

	try {
		const { payload } = await joseVerify(token, secret);
		return payload;
	} catch {
		throw new Error('Invalid token');
	}
}
