import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import { readCatalogSnapshot, updateCatalogSnapshot } from '../../../lib/catalog-server';

const ADMIN_SETTINGS_STORAGE_KEY = 'fs-communication:admin-settings';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const payload = await jwtVerify(token);
      if (!payload?.role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const snapshot = await readCatalogSnapshot();
    const raw = snapshot[ADMIN_SETTINGS_STORAGE_KEY] ?? null;
    return NextResponse.json({ settings: raw ? JSON.parse(raw) : null });
  } catch (err) {
    console.error('GET /api/settings error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const payload = await jwtVerify(token);
      if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const settings = body?.settings;
    if (!settings || typeof settings !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    await updateCatalogSnapshot(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/settings error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
