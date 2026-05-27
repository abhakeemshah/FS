import { jwtVerify as verifyToken } from 'jose';
import crypto from 'crypto';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function jwtVerify(token: string) {
  try {
    const verified = await verifyToken(token, secret);
    return verified.payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function jwtSign(payload: any, secretValue: string, expiresIn = '24h'): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = parseExpiresIn(expiresIn);

  const claims = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signature = hmacSha256(`${encodedHeader}.${encodedPayload}`, secretValue);
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function hmacSha256(message: string, secretValue: string): Buffer {
  return crypto.createHmac('sha256', secretValue).update(message).digest();
}

function base64UrlEncode(str: string | Buffer): string {
  const encoded = typeof str === 'string' ? Buffer.from(str, 'utf8') : str;
  return encoded
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 86400; // default 24h

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 3600;
    case 'd':
      return num * 86400;
    default:
      return 86400;
  }
}
