import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import {
  listInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  createInvoice,
  deleteInvoice,
  getSalesStats,
} from '../../../lib/services/invoice-service';
import { readLedgerSnapshot, writeLedgerSnapshot } from '../../../lib/ledger-server';
import { SALES_BILLS_STORAGE_KEY } from '../../../lib/ledger-store';

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
  const invoiceNumber = url.searchParams.get('invoiceNumber');

  if (id) {
    const invoice = await getInvoiceById(id);
    return invoice
      ? NextResponse.json({ success: true, invoice })
      : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (invoiceNumber) {
    const invoice = await getInvoiceByNumber(invoiceNumber);
    return invoice
      ? NextResponse.json({ success: true, invoice })
      : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const invoices = await listInvoices({
    limit: Number(url.searchParams.get('limit')) || undefined,
    customerName: url.searchParams.get('customerName') || undefined,
  });

  return NextResponse.json({ success: true, invoices });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const invoice = await createInvoice(body);

    // Dual-write: mirror original input to legacy snapshot (not the Prisma model)
    try {
      const snapshot = await readLedgerSnapshot();
      const existing = JSON.parse(snapshot[SALES_BILLS_STORAGE_KEY] || '[]');
      // Create a legacy-format record from the input body to match what the old UI expects
      const legacyRecord = {
        billId: `legacy-${Date.now()}`,
        invoiceNumber: invoice.invoiceNumber,
        date: body.date,
        time: body.time,
        customerName: body.customerName,
        customerContact: body.customerContact || '',
        paymentMethod: body.paymentMethod,
        subtotal: body.subtotal,
        discount: body.discount,
        profit: body.profit,
        total: body.total,
        recordedBy: body.recordedBy || 'admin',
        items: (body.items || []).map((item: any) => ({
          product: item.productName || item.product || '',
          quantity: item.quantity,
          price: item.price,
          costPrice: item.costPrice,
          discount: item.discount || 0,
          total: item.total,
          profit: item.profit || 0,
        })),
      };
      const updated = Array.isArray(existing) ? [legacyRecord, ...existing] : [legacyRecord];
      await writeLedgerSnapshot({
        ...snapshot,
        [SALES_BILLS_STORAGE_KEY]: JSON.stringify(updated),
      });
    } catch (e) {
      console.error('Dual-write ledger snapshot error:', e);
    }

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (err) {
    console.error('Create invoice error:', err);
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
    await deleteInvoice(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete invoice error:', err);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

// Stats endpoint
export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'stats') {
    const stats = await getSalesStats();
    return NextResponse.json({ success: true, stats });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
