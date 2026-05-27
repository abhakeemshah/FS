import * as bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { jwtVerify } from './jwt';

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
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const key = new TextEncoder().encode(secret);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const payload = await jwtVerify(token);
    return payload as unknown as AuthPayload;
  } catch (error) {
    return null;
  }
}
