import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { ensureDbReady } from '../../../../lib/db-init';
import { verifyPassword, createAuthToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';
import { findStaffAccountFileRecordByEmail } from '../../../../lib/staff-store-server';
import { getAuthCookieOptions } from '../../../../lib/auth-cookie-options';

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const authCookieOptions = getAuthCookieOptions(req);

    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    if (role === 'admin') {
      const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const configuredAdminPassword = process.env.ADMIN_PASSWORD;

      if (!configuredAdminEmail || !configuredAdminPassword) {
        return NextResponse.json(
          { error: 'Admin authentication is not configured' },
          { status: 500 }
        );
      }

      if (email.toLowerCase() !== configuredAdminEmail || password !== configuredAdminPassword) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const token = await createAuthToken({
        id: 'admin',
        email: configuredAdminEmail,
        role: 'admin',
      });

      const cookieStore = await cookies();
      cookieStore.set('auth-token', token, authCookieOptions);
      cookieStore.set('auth-role', 'admin', authCookieOptions);

      return NextResponse.json({
        success: true,
        message: 'admin login successful',
        user: {
          id: 'admin',
          email: configuredAdminEmail,
          role: 'admin',
          name: 'Administrator',
        },
      });
    }

    const normalizedEmail = email.toLowerCase();

    // Find user by email and role. Fall back to the server-side file store if Prisma fails or the row is missing.
    let user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role,
      },
    }).catch(() => null);

    if (!user && role === 'staff') {
      const fileUser = findStaffAccountFileRecordByEmail(normalizedEmail);
      if (fileUser) {
        const isPasswordValid = await verifyPassword(password, fileUser.password);
        if (!isPasswordValid) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }

        const token = await createAuthToken({
          id: fileUser.id,
          email: fileUser.email,
          role: 'staff',
        });

        const cookieStore = await cookies();
        cookieStore.set('auth-token', token, authCookieOptions);
        cookieStore.set('auth-role', 'staff', authCookieOptions);

        return NextResponse.json({
          success: true,
          message: 'staff login successful',
          user: {
            id: fileUser.id,
            email: fileUser.email,
            role: 'staff',
            name: fileUser.name,
          },
        });
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password. If Prisma has a stale row, fall back to the file store for staff logins.
    let isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid && role === 'staff') {
      const fileUser = findStaffAccountFileRecordByEmail(normalizedEmail);
      if (fileUser) {
        isPasswordValid = await verifyPassword(password, fileUser.password);
        if (isPasswordValid) {
          user = {
            id: fileUser.id,
            email: fileUser.email,
            password: fileUser.password,
            name: fileUser.name,
            role: 'staff',
          };
        }
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await createAuthToken({
      id: user.id,
      email: user.email,
      role: user.role as 'admin' | 'staff',
    });

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, authCookieOptions);
    cookieStore.set('auth-role', user.role, authCookieOptions);

    return NextResponse.json({
      success: true,
      message: `${role} login successful`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
