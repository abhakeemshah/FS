import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import { readLedgerSnapshot, updateLedgerSnapshot } from '../../../lib/ledger-server';

export async function GET() {
  try {
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

    try {
      const payload = await jwtVerify(authToken);
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

    const snapshot = await updateLedgerSnapshot(key, value);
    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Ledger sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
