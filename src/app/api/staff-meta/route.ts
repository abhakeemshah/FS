import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { ensureDbReady } from '../../../lib/db-init';
import { normalizeStaffAccessMeta, createDefaultStaffAccessMeta } from '../../../lib/staff-auth';
import { findStaffAccountFileRecordById } from '../../../lib/staff-store-server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    await ensureDbReady();

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
      user = await prisma.user.findFirst({ where: { email: username } }).catch(() => null);
    }

    if (!user && userId) {
      const fileAccount = findStaffAccountFileRecordById(userId);
      if (fileAccount) {
        user = {
          id: fileAccount.id,
          email: fileAccount.email,
          staffAccessMetaJson: fileAccount.staffAccessMetaJson ?? null,
        } as {
          id: string;
          email: string;
          staffAccessMetaJson?: string | null;
        };
      }
    }

    const dataDir = path.join(process.cwd(), 'data');
    const mapFile = path.join(dataDir, 'staff-access-map.json');
    const resolvedUsername = username ?? (user ? user.email.trim().toLowerCase() : null);

    if (!user) {
      // try fallback server-side map by username
      try {
        if (resolvedUsername && fs.existsSync(mapFile)) {
          const raw = fs.readFileSync(mapFile, 'utf-8');
          const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
          const match = parsed[resolvedUsername];
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
      user.staffAccessMetaJson
        ? JSON.parse(user.staffAccessMetaJson)
        : (() => {
            if (!resolvedUsername || !fs.existsSync(mapFile)) return createDefaultStaffAccessMeta();

            try {
              const raw = fs.readFileSync(mapFile, 'utf-8');
              const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
              return parsed[resolvedUsername] ?? createDefaultStaffAccessMeta();
            } catch {
              return createDefaultStaffAccessMeta();
            }
          })(),
    );

    return NextResponse.json({ success: true, staffAccessMeta });
  } catch (err) {
    console.error('Get staff-meta error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
