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
        createdAt: staff.createdAt.toISOString(),
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

    if (body?.action === 'update-password') {
      const staffId = typeof body.staffId === 'string' ? body.staffId.trim() : '';
      const password = typeof body.password === 'string' ? body.password.trim() : '';

      if (!staffId || password.length < 4) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      await prisma.user.update({ where: { id: staffId }, data: { password: hashedPassword } });
      return NextResponse.json({ success: true });
    }

    if (body?.action === 'delete-account') {
      const staffId = typeof body.staffId === 'string' ? body.staffId.trim() : '';
      if (!staffId) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      await prisma.user.delete({ where: { id: staffId } });
      return NextResponse.json({ success: true });
    }

    const accessMetaMap = body?.accessMetaMap;
    if (!accessMetaMap || typeof accessMetaMap !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const entries = Object.entries(accessMetaMap);
    await Promise.all(
      entries.map(([key, meta]) =>
        prisma.user
          .findFirst({ where: { OR: [{ id: key }, { email: key }, { name: key }] } })
          .then((user) => (user ? prisma.user.update({ where: { id: user.id }, data: { staffAccessMetaJson: JSON.stringify(meta ?? {}) } }) : null)),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Patch staff access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await verifyAdminSession(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(req.url);
    const staffId = url.searchParams.get('staffId')?.trim() ?? '';
    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: staffId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
