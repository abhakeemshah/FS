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
  return jwtSign(payload, process.env.NEXTAUTH_SECRET || 'your-secret-key');
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const payload = jwtVerify(token, process.env.NEXTAUTH_SECRET || 'your-secret-key');
    return payload as AuthPayload;
  } catch (error) {
    return null;
  }
}
