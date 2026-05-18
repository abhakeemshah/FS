// Simple JWT implementation for Next.js
// In production, consider using jsonwebtoken package

import crypto from 'crypto';

export function jwtSign(payload: any, secret: string, expiresIn = '24h'): string {
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
  const signature = hmacSha256(`${encodedHeader}.${encodedPayload}`, secret);
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export function jwtVerify(token: string, secret: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  // Verify signature
  const signature = hmacSha256(`${encodedHeader}.${encodedPayload}`, secret);
  const expectedSignature = base64UrlEncode(signature);

  if (encodedSignature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  // Decode and verify payload
  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

function hmacSha256(message: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest();
}

function base64UrlEncode(str: string | Buffer): string {
  const encoded = typeof str === 'string' ? Buffer.from(str, 'utf8') : str;
  return encoded
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  let padded = str.replace(/\-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) {
    padded += '=';
  }
  return Buffer.from(padded, 'base64').toString('utf8');
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
