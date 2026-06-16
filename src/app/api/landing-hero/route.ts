import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import {
  getLandingHero,
  upsertLandingHero,
} from '../../../lib/services/landing-hero-service';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  try {
    const payload = await jwtVerify(token);
    return payload as { id: string; email?: string; role: string };
  } catch {
    return null;
  }
}

export async function GET() {
  const hero = await getLandingHero();
  return NextResponse.json({ success: true, hero });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const hero = await upsertLandingHero(body);
    return NextResponse.json({ success: true, hero });
  } catch (err) {
    console.error('Upsert landing hero error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
