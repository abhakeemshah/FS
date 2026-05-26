import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { verifyPassword, createAuthToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
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
      cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      });
      cookieStore.set('auth-role', 'admin', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      });

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

    // Find user by email and role
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        role,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
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
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
    cookieStore.set('auth-role', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

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
