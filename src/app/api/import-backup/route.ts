import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import { updateCatalogSnapshot } from '../../../lib/catalog-server';
import { updateLedgerSnapshot } from '../../../lib/ledger-server';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const payload = await jwtVerify(authToken);
      if (payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const raw = body?.rawStorage;
    if (!raw || typeof raw !== 'object') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    // Dispatch keys to catalog or ledger snapshots based on key name heuristics.
    const ledgerKeys = new Set(['fs-communication:sales-bills', 'fs-communication:purchases', 'fs-communication:manual-payments']);

    for (const [key, value] of Object.entries(raw)) {
      try {
        if (ledgerKeys.has(key)) {
          await updateLedgerSnapshot(key, typeof value === 'string' ? value : null);
        } else {
          await updateCatalogSnapshot(key, typeof value === 'string' ? value : null);
        }
      } catch (err) {
        console.error('Import key error', key, err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Import backup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
