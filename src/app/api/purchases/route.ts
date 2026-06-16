import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import {
  listPurchases,
  getPurchaseById,
  createPurchase,
  deletePurchase,
  getPurchaseStats,
} from '../../../lib/services/purchase-service';
import { readLedgerSnapshot, writeLedgerSnapshot } from '../../../lib/ledger-server';
import { PURCHASES_STORAGE_KEY } from '../../../lib/ledger-store';

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
  const id = url.searchParams.get('id');

  if (id) {
    const purchase = await getPurchaseById(id);
    return purchase
      ? NextResponse.json({ success: true, purchase })
      : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const purchases = await listPurchases({
    limit: Number(url.searchParams.get('limit')) || undefined,
    supplierName: url.searchParams.get('supplierName') || undefined,
  });

  return NextResponse.json({ success: true, purchases });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const purchase = await createPurchase(body);

    // Dual-write to legacy snapshot (using original input format)
    try {
      const snapshot = await readLedgerSnapshot();
      const existing = JSON.parse(snapshot[PURCHASES_STORAGE_KEY] || '[]');
      const legacyRecord = {
        purchaseNumber: purchase.purchaseNumber,
        createdAt: body.purchaseDate,
        supplierName: body.supplierName,
        sourceName: body.sourceName || 'Direct',
        purchaseReference: body.purchaseReference || '',
        purchaseDate: body.purchaseDate,
        purchaseTime: body.purchaseTime,
        paymentMethod: body.paymentMethod,
        status: body.status,
        transportCost: body.transportCost || 0,
        notes: body.notes || '',
        total: body.total,
        recordedBy: body.recordedBy || 'admin',
        items: (body.items || []).map((item: any) => ({
          product: item.productName || item.product || '',
          boxes: item.boxes || 0,
          piecesPerBox: item.piecesPerBox || 0,
          loosePieces: item.loosePieces || 0,
          unitCost: item.unitCost || 0,
          totalUnits: item.totalUnits || 0,
          lineTotal: item.lineTotal || 0,
        })),
      };
      const updated = Array.isArray(existing) ? [legacyRecord, ...existing] : [legacyRecord];
      await writeLedgerSnapshot({
        ...snapshot,
        [PURCHASES_STORAGE_KEY]: JSON.stringify(updated),
      });
    } catch (e) {
      console.error('Dual-write purchase snapshot error:', e);
    }

    return NextResponse.json({ success: true, purchase }, { status: 201 });
  } catch (err) {
    console.error('Create purchase error:', err);
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
    await deletePurchase(id);
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
    const stats = await getPurchaseStats();
    return NextResponse.json({ success: true, stats });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
