import { jwtVerify as joseVerify } from 'jose';

export async function jwtVerify(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
  try {
    const { payload } = await joseVerify(token, secret);
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
