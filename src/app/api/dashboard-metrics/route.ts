import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import {
  getMetric,
  setMetric,
  getAllMetrics,
} from '../../../lib/services/dashboard-metric-service';

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
  const metrics = await getAllMetrics();
  return NextResponse.json({ success: true, metrics });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

    await setMetric(key, value ?? null);
    const metrics = await getAllMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (err) {
    console.error('Set metric error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
