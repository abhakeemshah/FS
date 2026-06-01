import 'server-only';

import fs from 'fs';
import path from 'path';
import prisma from './db';
import ensureDbReady from './db-init';
import {
  findStaffAccountFileRecordById,
  findStaffAccountFileRecordByEmail,
} from './staff-store-server';
import {
  normalizeStaffAccessMeta,
  createDefaultStaffAccessMeta,
  type StaffAccessMeta,
  type StaffModuleKey,
} from './staff-auth';

/**
 * Resolve a staff member's access permissions from trusted server-side sources
 * (Prisma user row, then the server-side file store, then the admin-published
 * access map). This mirrors the resolution used by GET /api/staff-meta, so the
 * server enforces exactly the permissions the admin configured. Permissions are
 * NEVER taken from request-supplied data, so they cannot be forged by a client.
 */
export async function resolveStaffAccessMeta(opts: {
  id?: string | null;
  email?: string | null;
}): Promise<StaffAccessMeta> {
  const id = opts.id?.trim() || '';
  const email = opts.email?.trim().toLowerCase() || '';

  try {
    await ensureDbReady();
  } catch {}

  let metaJson: string | null = null;

  if (id) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user?.staffAccessMetaJson) metaJson = user.staffAccessMetaJson;
    } catch {}
  }

  if (!metaJson && email) {
    try {
      const user = await prisma.user.findFirst({ where: { email } });
      if (user?.staffAccessMetaJson) metaJson = user.staffAccessMetaJson;
    } catch {}
  }

  if (!metaJson && id) {
    const record = findStaffAccountFileRecordById(id);
    if (record?.staffAccessMetaJson) metaJson = record.staffAccessMetaJson;
  }

  if (!metaJson && email) {
    const record = findStaffAccountFileRecordByEmail(email);
    if (record?.staffAccessMetaJson) metaJson = record.staffAccessMetaJson;
  }

  if (metaJson) {
    try {
      return normalizeStaffAccessMeta(JSON.parse(metaJson));
    } catch {}
  }

  if (email) {
    try {
      const mapFile = path.join(process.cwd(), 'data', 'staff-access-map.json');
      if (fs.existsSync(mapFile)) {
        const parsed = JSON.parse(fs.readFileSync(mapFile, 'utf-8') || '{}') as Record<string, unknown>;
        if (parsed[email]) return normalizeStaffAccessMeta(parsed[email]);
      }
    } catch {}
  }

  return createDefaultStaffAccessMeta();
}

export function staffCanEditModule(meta: StaffAccessMeta, moduleKey: StaffModuleKey): boolean {
  if (meta.status === 'suspended') return false;
  return meta.permissions[moduleKey] === 'edit';
}
