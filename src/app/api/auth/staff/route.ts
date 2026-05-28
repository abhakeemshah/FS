import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { hashPassword } from '../../../../lib/auth';
import { cookies } from 'next/headers';
import { jwtVerify } from '../../../../lib/jwt';
import {
  deleteStaffAccountFileRecord,
  findStaffAccountFileRecordByEmail,
  findStaffAccountFileRecordById,
  mergeStaffAccountFileRecords,
  readStaffAccountFileRecords,
  upsertStaffAccountFileRecord,
} from '../../../../lib/staff-store-server';

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

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists in Prisma or the server-side file store.
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    }).catch(() => null);
    const existingFile = findStaffAccountFileRecordByEmail(normalizedEmail);

    if (existing || existingFile) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const staffRecord = {
		id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		name,
		email: normalizedEmail,
		password: hashedPassword,
		role: 'staff' as const,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

    try {
      await prisma.user.create({
        data: {
          id: staffRecord.id,
          email: normalizedEmail,
          password: hashedPassword,
          name,
          role: 'staff',
        },
      });
    } catch (error) {
      console.error('Prisma create staff fallback to file store:', error);
    }

    const fileRecord = upsertStaffAccountFileRecord(staffRecord);

    return NextResponse.json({
      success: true,
      message: 'Staff account created',
      staff: {
        id: fileRecord.id,
        name: fileRecord.name,
        email: fileRecord.email,
        role: fileRecord.role,
        createdAt: fileRecord.createdAt,
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

    // Get all staff accounts from Prisma and the server-side file store, then merge them.
    const prismaStaff = await prisma.user.findMany({
      where: { role: 'staff' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        password: true,
      },
    }).catch(() => []);

    const fileStaff = readStaffAccountFileRecords().filter((record) => record.role === 'staff');

    const merged = mergeStaffAccountFileRecords([
      ...fileStaff,
      ...prismaStaff.map((staff) => ({
        id: staff.id,
        name: staff.name ?? '',
        email: staff.email,
        password: staff.password,
        role: 'staff' as const,
        createdAt: staff.createdAt.toISOString(),
        updatedAt: staff.createdAt.toISOString(),
      })),
    ]);

    const staff = merged
      .filter((record) => record.role === 'staff')
      .map((record) => ({
        id: record.id,
        name: record.name,
        email: record.email,
        role: record.role,
        createdAt: new Date(record.createdAt),
      }));

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
      try {
        await prisma.user.update({ where: { id: staffId }, data: { password: hashedPassword } });
      } catch (error) {
        console.error('Prisma update password fallback to file store:', error);
      }

      const fileRecord = findStaffAccountFileRecordById(staffId);
      if (fileRecord) {
        upsertStaffAccountFileRecord({ ...fileRecord, password: hashedPassword });
      }
      return NextResponse.json({ success: true });
    }

    if (body?.action === 'delete-account') {
      const staffId = typeof body.staffId === 'string' ? body.staffId.trim() : '';
      if (!staffId) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      try {
        await prisma.user.delete({ where: { id: staffId } });
      } catch (error) {
        console.error('Prisma delete fallback to file store:', error);
      }

      deleteStaffAccountFileRecord(staffId);
      return NextResponse.json({ success: true });
    }

    const accessMetaMap = body?.accessMetaMap;
    if (!accessMetaMap || typeof accessMetaMap !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const entries = Object.entries(accessMetaMap);
    await Promise.all(
      entries.map(async ([key, meta]) => {
        const user = await prisma.user
          .findFirst({ where: { OR: [{ id: key }, { email: key }, { name: key }] } })
          .catch(() => null);

        if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { staffAccessMetaJson: JSON.stringify(meta ?? {}) } }).catch(() => null);
          return;
        }

        const fileRecord = findStaffAccountFileRecordById(key) ?? findStaffAccountFileRecordByEmail(key);
        if (fileRecord) {
          upsertStaffAccountFileRecord({ ...fileRecord, staffAccessMetaJson: JSON.stringify(meta ?? {}) });
        }
      }),
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

    try {
      await prisma.user.delete({ where: { id: staffId } });
    } catch (error) {
      console.error('Prisma delete fallback to file store:', error);
    }

    deleteStaffAccountFileRecord(staffId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
