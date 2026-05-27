import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '../../../lib/db';

function checkEnv(name: string) {
  return !!process.env[name];
}

export async function GET(req: NextRequest) {
  // Secure: require HEALTH_CHECK_TOKEN in production
  const isProd = process.env.NODE_ENV === 'production';
  const token = process.env.HEALTH_CHECK_TOKEN;
  if (isProd && token) {
    const supplied = req.headers.get('x-health-check') || '';
    if (supplied !== token) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (isProd && !token) {
    // If no token is configured in production, refuse to run the check
    return NextResponse.json({ error: 'Health checks disabled in production (no token configured).' }, { status: 403 });
  }

  const envs = {
    DATABASE_URL: checkEnv('DATABASE_URL'),
    JWT_SECRET: checkEnv('JWT_SECRET'),
    ADMIN_EMAIL: checkEnv('ADMIN_EMAIL'),
    ADMIN_PASSWORD: checkEnv('ADMIN_PASSWORD'),
  };

  // Prisma connectivity test (best-effort)
  let prismaConnected = false;
  let prismaError: string | null = null;
  try {
    // attempt a lightweight query
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    prismaConnected = true;
  } catch (err: any) {
    prismaError = err?.message ?? String(err);
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  }

  // Filesystem writability (data/)
  let fsWritable = false;
  let fsError: string | null = null;
  try {
    const file = path.join(process.cwd(), 'data', '.health');
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, String(Date.now()), { encoding: 'utf-8' });
    fs.unlinkSync(file);
    fsWritable = true;
  } catch (err: any) {
    fsError = err?.message ?? String(err);
  }

  return NextResponse.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV || 'development',
    envs,
    prisma: { connected: prismaConnected, error: prismaError ? prismaError.slice(0, 200) : null },
    filesystem: { writable: fsWritable, error: fsError ? fsError.slice(0, 200) : null },
  });
}
