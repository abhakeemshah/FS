import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import {
  listPayments,
  createPayment,
  deletePayment,
  getPaymentStats,
} from '../../../lib/services/payment-service';
import { readLedgerSnapshot, writeLedgerSnapshot } from '../../../lib/ledger-server';
import { MANUAL_PAYMENTS_STORAGE_KEY } from '../../../lib/ledger-store';

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

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const payments = await listPayments({
    limit: Number(url.searchParams.get('limit')) || undefined,
    direction: url.searchParams.get('direction') || undefined,
    party: url.searchParams.get('party') || undefined,
    dateFrom: url.searchParams.get('dateFrom') || undefined,
    dateTo: url.searchParams.get('dateTo') || undefined,
  });

  return NextResponse.json({ success: true, payments });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const payment = await createPayment(body);

    // Dual-write to legacy snapshot (using original input format)
    try {
      const snapshot = await readLedgerSnapshot();
      const existing = JSON.parse(snapshot[MANUAL_PAYMENTS_STORAGE_KEY] || '[]');
      const legacyRecord = {
        paymentNumber: payment.paymentNumber,
        title: body.title,
        party: body.party,
        direction: body.direction,
        amount: body.amount,
        date: body.date,
        time: body.time,
        notes: body.notes || '',
        createdAt: body.date,
        recordedBy: body.recordedBy || 'admin',
      };
      const updated = Array.isArray(existing) ? [legacyRecord, ...existing] : [legacyRecord];
      await writeLedgerSnapshot({
        ...snapshot,
        [MANUAL_PAYMENTS_STORAGE_KEY]: JSON.stringify(updated),
      });
    } catch (e) {
      console.error('Dual-write payment snapshot error:', e);
    }

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (err) {
    console.error('Create payment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    await deletePayment(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  if (action === 'stats') {
    const stats = await getPaymentStats();
    return NextResponse.json({ success: true, stats });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
