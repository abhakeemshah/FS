import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { normalizeStaffAccessMeta, createDefaultStaffAccessMeta } from '../../../lib/staff-auth';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username')?.trim().toLowerCase();
    const userId = url.searchParams.get('id')?.trim();

    if (!username && !userId) {
      return NextResponse.json({ error: 'username or id is required' }, { status: 400 });
    }

    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (username) {
      user = await prisma.user.findFirst({ where: { username: username } }).catch(() => null);
      if (!user) {
        // fallback to email match
        user = await prisma.user.findFirst({ where: { email: username } }).catch(() => null);
      }
    }

    const dataDir = path.join(process.cwd(), 'data');
    const mapFile = path.join(dataDir, 'staff-access-map.json');

    if (!user) {
      // try fallback server-side map by username
      try {
        if (username && fs.existsSync(mapFile)) {
          const raw = fs.readFileSync(mapFile, 'utf-8');
          const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
          const match = parsed[username];
          if (match) {
            const staffAccessMeta = normalizeStaffAccessMeta(match ?? null);
            return NextResponse.json({ success: true, staffAccessMeta });
          }
        }
      } catch (e) {
        // ignore and continue to not found
      }

      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const staffAccessMeta = normalizeStaffAccessMeta(
      user.staffAccessMetaJson ? JSON.parse(user.staffAccessMetaJson) : createDefaultStaffAccessMeta(),
    );

    return NextResponse.json({ success: true, staffAccessMeta });
  } catch (err) {
    console.error('Get staff-meta error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
