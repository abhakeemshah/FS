import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { hashPassword } from '../../../../lib/auth';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../../lib/jwt';

async function verifyAdminSession(authToken: string) {
  const payload = await jwtVerify(authToken);
  if (payload.role !== 'admin') {
    throw new Error('Only admins can perform this action');
  }
  return payload;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token and check if admin
    try {
      await verifyAdminSession(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create staff account
    const staff = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'staff',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Staff account created',
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token and check if admin
    try {
      await verifyAdminSession(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get all staff accounts
    const staff = await prisma.user.findMany({
      where: { role: 'staff' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token and check if admin
    try {
      await verifyAdminSession(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const accessMetaMap = body?.accessMetaMap;
    if (!accessMetaMap || typeof accessMetaMap !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // accessMetaMap keys can be user id, email, or username (local staff accounts)
    const entries = Object.entries(accessMetaMap);
    const fs = await import('fs');
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');
    const mapFile = path.join(dataDir, 'staff-access-map.json');

    // ensure data dir exists
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {
      // ignore
    }

    // load existing map
    let fallbackMap: Record<string, unknown> = {};
    try {
      if (fs.existsSync(mapFile)) {
        const raw = fs.readFileSync(mapFile, 'utf-8');
        fallbackMap = JSON.parse(raw || '{}');
      }
    } catch (e) {
      fallbackMap = {};
    }

    for (const [key, meta] of entries) {
      try {
        // Persist into fallback server-side map keyed by the provided key (e.g., username)
        fallbackMap[String(key).trim().toLowerCase()] = meta ?? {};
      } catch (err) {
        console.error('Error updating staff access for key', key, err);
      }
    }

    try {
      fs.writeFileSync(mapFile, JSON.stringify(fallbackMap, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed writing fallback staff access map', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Patch staff access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
