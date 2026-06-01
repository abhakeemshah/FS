import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import fs from 'fs';
import path from 'path';
import prisma from '../../../lib/db';
import { resolveStaffAccessMeta, staffCanEditModule } from '../../../lib/staff-access-server';
import type { StaffModuleKey } from '../../../lib/staff-auth';

const LEDGER_SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'ledger-snapshot.json');

// Maps the ledger storage keys the client writes to the staff permission module
// they belong to. Staff must have "edit" on the matching module to write.
const LEDGER_KEY_MODULE: Record<string, StaffModuleKey> = {
  'fs-communication:sales-bills': 'sales',
  'fs-communication:purchases': 'purchases',
  'fs-communication:manual-payments': 'payments',
};

async function readLedgerSnapshot(): Promise<Record<string, string>> {
  try {
    if (process.env.DATABASE_URL) {
      const rows = await prisma.ledgerSnapshot.findMany();
      const snapshot: Record<string, string> = {};
      for (const row of rows) {
        snapshot[row.key] = row.value ?? '';
      }
      return snapshot;
    }
  } catch (error) {
    console.error('Prisma readLedgerSnapshot error:', error);
  }

  try {
    if (!fs.existsSync(LEDGER_SNAPSHOT_FILE)) return {};
    const raw = fs.readFileSync(LEDGER_SNAPSHOT_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch (error) {
    console.error('File readLedgerSnapshot error:', error);
    return {};
  }
}

async function writeLedgerSnapshot(nextSnapshot: Record<string, string>) {
  try {
    if (process.env.DATABASE_URL) {
      const existingRows = await prisma.ledgerSnapshot.findMany();
      const nextKeysArr = Object.keys(nextSnapshot);

      if (nextKeysArr.length === 0) {
        // Defensive: avoid deleting all rows if snapshot is empty.
        return await readLedgerSnapshot();
      }

      const nextKeys = new Set(nextKeysArr);
      const keysToDelete = existingRows.filter((row) => !nextKeys.has(row.key)).map((row) => row.key);

      if (keysToDelete.length) {
        await prisma.ledgerSnapshot.deleteMany({ where: { key: { in: keysToDelete } } });
      }

      await Promise.all(
        Object.entries(nextSnapshot).map(([key, value]) =>
          prisma.ledgerSnapshot.upsert({
            where: { key },
            create: { key, value },
            update: { value },
          }),
        ),
      );
      return;
    }
  } catch (error) {
    console.error('Prisma writeLedgerSnapshot error:', error);
  }

  const dataDir = path.dirname(LEDGER_SNAPSHOT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(LEDGER_SNAPSHOT_FILE, JSON.stringify(nextSnapshot, null, 2), 'utf-8');
}

async function updateLedgerSnapshot(key: string, value: string | null) {
  try {
    if (process.env.DATABASE_URL) {
      if (value === null) {
        await prisma.ledgerSnapshot.deleteMany({ where: { key } });
      } else {
        await prisma.ledgerSnapshot.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      }
      return await readLedgerSnapshot();
    }
  } catch (error) {
    console.error('Prisma updateLedgerSnapshot error:', error);
  }

  const snapshot = await readLedgerSnapshot();
  if (value === null) {
    delete snapshot[key];
  } else {
    snapshot[key] = value;
  }
  await writeLedgerSnapshot(snapshot);
  return snapshot;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const payload = await jwtVerify(authToken);
      if (!payload?.role) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const snapshot = await readLedgerSnapshot();
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Ledger GET error:', error);
    return NextResponse.json({ error: 'Failed to read ledger snapshot' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: { id?: string; email?: string; role?: string } | null = null;
    try {
      payload = (await jwtVerify(authToken)) as { id?: string; email?: string; role?: string };
      if (!payload?.role) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const key = typeof body?.key === 'string' ? body.key : '';
    const value = typeof body?.value === 'string' ? body.value : null;

    if (!key) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Server-side permission enforcement. Admins may write anything. Staff may
    // only write a ledger module they have "edit" access to. Permissions are
    // read from trusted server state (not the request), so a view-only staff
    // member cannot bypass this by editing a cookie or calling the API directly.
    if (payload.role !== 'admin') {
      const moduleKey = LEDGER_KEY_MODULE[key];
      if (!moduleKey) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const meta = await resolveStaffAccessMeta({ id: payload.id, email: payload.email });
      if (!staffCanEditModule(meta, moduleKey)) {
        return NextResponse.json(
          { error: 'You do not have edit access for this section' },
          { status: 403 },
        );
      }
    }

    const snapshot = await updateLedgerSnapshot(key, value);
    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Ledger sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
