import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../../lib/jwt';
import { upsertStaffPermission } from '../../../../lib/services/staff-permission-service';
import prisma from '../../../../lib/db';
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

    // Write to StaffPermission table for each user in the map
    const entries = Object.entries(map);
    for (const [key, meta] of entries) {
      const metaObj = meta as Record<string, unknown>;
      
      // Find the user by email (key) or id
      let user = await prisma.user.findFirst({
        where: { OR: [{ email: key }, { id: key }] },
        select: { id: true },
      }).catch(() => null);

      if (user) {
        await upsertStaffPermission({
          userId: user.id,
          role: (metaObj.role as any) ?? 'cashier',
          status: (metaObj.status as any) ?? 'active',
          permissions: metaObj.permissions as Record<string, string> | undefined,
          allowedSettings: metaObj.allowedSettings as string[] | undefined,
        });

        // Also update staffAccessMetaJson on the user for backward compat
        await prisma.user.update({
          where: { id: user.id },
          data: { staffAccessMetaJson: JSON.stringify(metaObj) },
        }).catch(() => {});
      }
    }

    // Also write to file-based map for backward compatibility
    const dataDir = path.join(process.cwd(), 'data');
    const mapFile = path.join(dataDir, 'staff-access-map.json');
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(mapFile, JSON.stringify(map, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed writing published staff access map', e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Publish staff-meta error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}