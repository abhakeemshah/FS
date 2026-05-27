import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../../lib/db';
import { jwtVerify } from '../../../../lib/jwt';
import { normalizeStaffAccessMeta, createDefaultStaffAccessMeta } from '../../../../lib/staff-auth';

export async function GET(_req: NextRequest) {
	try {
		const cookieStore = await cookies();
		const authToken = cookieStore.get('auth-token')?.value;

		if (!authToken) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const payload = await jwtVerify(authToken);

		if (payload.role === 'admin') {
			const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
			if (!configuredAdminEmail) {
				return NextResponse.json({ error: 'Admin authentication is not configured' }, { status: 500 });
			}
			const staffAccessMeta = normalizeStaffAccessMeta(createDefaultStaffAccessMeta());

			return NextResponse.json({
				success: true,
				user: {
					id: payload.id,
					email: configuredAdminEmail,
					name: 'Administrator',
					role: 'admin',
					staffAccessMeta,
				},
				staffAccessMeta,
			});
		}

		const user = await prisma.user.findUnique({
			where: { id: payload.id },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
			},
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const staffAccessMeta = normalizeStaffAccessMeta(createDefaultStaffAccessMeta());

		return NextResponse.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				staffAccessMeta,
			},
			staffAccessMeta,
		});
	} catch (error) {
		console.error('Get auth user error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}