import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { jwtVerify } from '../../../../lib/jwt';

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const payload = await jwtVerify(authToken);
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can revalidate the site cache' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Revalidate site error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}