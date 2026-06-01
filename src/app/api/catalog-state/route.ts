import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../lib/jwt';
import { readCatalogSnapshot, updateCatalogSnapshot } from '../../../lib/catalog-server';

// Keys inside the catalog snapshot that must never be exposed to unauthenticated
// callers. The storefront only needs product/category/landing data; admin
// settings live in the same snapshot but are private.
const PRIVATE_CATALOG_KEYS = ['fs-communication:admin-settings'];

export async function GET() {
  const snapshot = await readCatalogSnapshot();

  // The catalog feeds the public storefront, so this endpoint stays public.
  // For unauthenticated requests, strip any private keys before responding.
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  let isAuthenticated = false;
  if (authToken) {
    try {
      const payload = await jwtVerify(authToken);
      isAuthenticated = !!payload?.role;
    } catch {
      isAuthenticated = false;
    }
  }

  if (isAuthenticated) {
    return NextResponse.json({ snapshot });
  }

  const publicSnapshot: Record<string, string> = { ...snapshot };
  for (const key of PRIVATE_CATALOG_KEYS) {
    delete publicSnapshot[key];
  }
  return NextResponse.json({ snapshot: publicSnapshot });
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
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can sync catalog data' }, { status: 403 });
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

    const snapshot = await updateCatalogSnapshot(key, value);
    return NextResponse.json({ success: true, snapshot });
  } catch (err) {
    console.error('Catalog sync error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
