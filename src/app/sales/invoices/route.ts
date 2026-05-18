import { NextResponse } from 'next/server';

export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = '/login/admin/sales/invoices';
  return NextResponse.redirect(url, 307);
}

export function HEAD(request: Request) {
  return GET(request);
}
