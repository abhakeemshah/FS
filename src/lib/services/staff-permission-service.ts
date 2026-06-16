import 'server-only';
import prisma from '../db';

export type StaffPermissionInput = {
  userId: string;
  role: 'cashier' | 'sales' | 'inventory' | 'supervisor';
  status: 'active' | 'suspended';
  permissions?: Record<string, string>;
  allowedSettings?: string[];
};

export async function getStaffPermission(userId: string) {
  try {
    return await prisma.staffPermission.findUnique({
      where: { userId },
    });
  } catch {
    return null;
  }
}

export async function upsertStaffPermission(input: StaffPermissionInput) {
  return prisma.staffPermission.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      role: input.role,
      status: input.status,
      permissions: input.permissions ? JSON.stringify(input.permissions) : null,
      allowedSettings: input.allowedSettings ? JSON.stringify(input.allowedSettings) : null,
    },
    update: {
      role: input.role,
      status: input.status,
      permissions: input.permissions ? JSON.stringify(input.permissions) : null,
      allowedSettings: input.allowedSettings ? JSON.stringify(input.allowedSettings) : null,
    },
  });
}

export async function listStaffPermissions() {
  try {
    return await prisma.staffPermission.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  } catch {
    return [];
  }
}

export async function deleteStaffPermission(userId: string) {
  try {
    await prisma.staffPermission.delete({ where: { userId } });
  } catch {
    // ignore if not found
  }
}
