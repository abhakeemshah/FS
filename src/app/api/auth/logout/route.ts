import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieOptions } from '../../../../lib/auth-cookie-options';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authCookieOptions = getAuthCookieOptions(req);
    cookieStore.set('auth-token', '', { ...authCookieOptions, maxAge: 0 });
    cookieStore.set('auth-role', '', { ...authCookieOptions, maxAge: 0 });

    return NextResponse.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
