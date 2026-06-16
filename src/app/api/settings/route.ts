import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import {
  getBusinessSettings,
  upsertBusinessSettings,
} from '../../../lib/services/settings-service';

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

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await getBusinessSettings();
    // Flatten BusinessSetting Prisma model to plain settings object the frontend expects
    const flat = settings ? {
      shopName: settings.shopName,
      shopPhone: settings.shopPhone,
      shopEmail: settings.shopEmail,
      shopAddress: settings.shopAddress,
      salesPrefix: settings.salesPrefix,
      purchasePrefix: settings.purchasePrefix,
      paymentPrefix: settings.paymentPrefix,
    } : null;
    return NextResponse.json({ settings: flat });
  } catch (err) {
    console.error('GET /api/settings error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const settings = body?.settings || body;
    if (!settings || typeof settings !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    await upsertBusinessSettings(settings);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/settings error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
