import * as bcrypt from 'bcryptjs';
import { jwtSign, jwtVerify } from './jwt';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthPayload {
  id: string;
  email: string;
  role: 'admin' | 'staff';
}

export async function createAuthToken(payload: AuthPayload): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not configured');
  }

  return jwtSign(payload, secret);
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const secret = process.env.NEXTAUTH_SECRET;

    if (!secret) {
      return null;
    }

    const payload = jwtVerify(token, secret);
    return payload as AuthPayload;
  } catch (error) {
    return null;
  }
}
