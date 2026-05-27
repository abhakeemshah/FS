import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../../lib/jwt';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const payload = await jwtVerify(authToken);
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can publish staff access data' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const map = body?.accessMetaMap;
    if (!map || typeof map !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const mapFile = path.join(dataDir, 'staff-access-map.json');
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(mapFile, JSON.stringify(map, null, 2), 'utf-8');
      return NextResponse.json({ success: true });
    } catch (e) {
      console.error('Failed writing published staff access map', e);
      return NextResponse.json({ error: 'Failed to write map' }, { status: 500 });
    }
  } catch (err) {
    console.error('Publish staff-meta error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
