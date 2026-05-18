import { NextRequest, NextResponse } from 'next/server';

function readJwtPayload(token: string): { role?: string } | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const payload = new TextDecoder().decode(bytes);
    return JSON.parse(payload) as { role?: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminPaths = [
    '/login/admin/dashboard',
    '/login/admin/products',
    '/login/admin/staff',
    '/login/admin/parties',
    '/login/admin/payments',
    '/login/admin/purchases',
    '/login/admin/reports',
    '/login/admin/settings',
  ];
  const staffPaths = [
    '/login/staff/dashboard',
    '/login/staff/settings',
  ];

  const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));
  const isStaffPath = staffPaths.some((path) => pathname.startsWith(path));

  if (isAdminPath || isStaffPath) {
    const token = request.cookies.get('auth-token')?.value;
    const payload = token ? readJwtPayload(token) : null;
    const role = payload?.role;

    if (!token || !token.includes('.') || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAdminPath && role !== 'admin') {
      return NextResponse.redirect(new URL('/login/staff', request.url));
    }

    if (isStaffPath && role !== 'staff') {
      return NextResponse.redirect(new URL('/login/admin', request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login/admin/:path*', '/login/staff/:path*'],
};
