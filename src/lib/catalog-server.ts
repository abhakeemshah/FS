import 'server-only';
import fs from 'fs';
import path from 'path';
import prisma from './db';
import ensureDbReady from './db-init';

export const CATALOG_SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'catalog-snapshot.json');

const SEED_PRODUCT_PREFIX = 'seed-prd-';
const SEED_LIST_PREFIX = 'seed-list-';

function sanitizeCatalogSnapshot(snapshot: Record<string, string>) {
  const nextSnapshot = { ...snapshot };

  for (const key of [
    'fs-communication:products',
    'fs-communication:product-lists',
    'fs-communication:selected-list',
  ]) {
    const rawValue = nextSnapshot[key];
    if (!rawValue) continue;

    try {
      const parsed = JSON.parse(rawValue) as unknown;

      if (key === 'fs-communication:products' && Array.isArray(parsed)) {
        nextSnapshot[key] = JSON.stringify(parsed.filter((item) => !(item && typeof item === 'object' && 'id' in item && String((item as { id?: unknown }).id ?? '').startsWith(SEED_PRODUCT_PREFIX))));
      }

      if (key === 'fs-communication:product-lists' && Array.isArray(parsed)) {
        nextSnapshot[key] = JSON.stringify(parsed.filter((item) => !(item && typeof item === 'object' && 'id' in item && String((item as { id?: unknown }).id ?? '').startsWith(SEED_LIST_PREFIX))));
      }

      if (key === 'fs-communication:selected-list' && typeof parsed === 'string' && parsed.startsWith(SEED_LIST_PREFIX)) {
        delete nextSnapshot[key];
      }
    } catch {
      // Leave malformed data untouched; callers will still receive the raw snapshot.
    }
  }

  return nextSnapshot;
}

// Read snapshot from Prisma when possible, otherwise fallback to file.
export async function readCatalogSnapshot(): Promise<Record<string, string>> {
  // ensure DB tables exist (best-effort)
  try {
    await ensureDbReady();
  } catch {}
  try {
    if (process.env.DATABASE_URL) {
      const rows = await prisma.catalogSnapshot.findMany();
      const out: Record<string, string> = {};
      for (const r of rows) {
        out[r.key] = r.value ?? '';
      }
      const sanitized = sanitizeCatalogSnapshot(out);
      if (JSON.stringify(sanitized) !== JSON.stringify(out)) {
        await writeCatalogSnapshot(sanitized);
      }
      return sanitized;
    }
  } catch (err) {
    // fall through to file fallback
    console.error('Prisma readCatalogSnapshot error:', err);
  }

  try {
    if (!fs.existsSync(CATALOG_SNAPSHOT_FILE)) return {};
    const raw = fs.readFileSync(CATALOG_SNAPSHOT_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const sanitized = sanitizeCatalogSnapshot(parsed as Record<string, string>);
      if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) {
        writeCatalogSnapshot(sanitized).catch((err) => {
          console.error('File sanitizeCatalogSnapshot write error:', err);
        });
      }
      return sanitized;
    }
    return {};
  } catch (err) {
    console.error('File readCatalogSnapshot error:', err);
    return {};
  }
}

export async function writeCatalogSnapshot(nextSnapshot: Record<string, string>) {
  const sanitizedSnapshot = sanitizeCatalogSnapshot(nextSnapshot);

  // Save a timestamped version on every write for recovery (keeps last 5)
  try {
    const snapshotsDir = path.join(process.cwd(), 'data', 'snapshots', 'catalog');
    if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(snapshotsDir, `catalog-${ts}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sanitizedSnapshot, null, 2), 'utf-8');
    // rotate keep last 5
    const files = fs.readdirSync(snapshotsDir).filter((f) => f.endsWith('.json')).sort();
    while (files.length > 5) {
      const old = files.shift();
      if (old) try { fs.unlinkSync(path.join(snapshotsDir, old)); } catch {}
    }
  } catch (err) {
    console.error('catalog snapshot version save error:', err);
  }

  try {
    if (process.env.DATABASE_URL) {
      // Ensure DB initialized
      await ensureDbReady();
      const existingRows = await prisma.catalogSnapshot.findMany();
      const nextKeysArr = Object.keys(sanitizedSnapshot);

      // Defensive: if sanitized snapshot is empty, avoid deleting existing rows.
      // This prevents accidental full-table wipes when sanitization unexpectedly
      // removes all keys (e.g., due to parsing errors or transient state).
      if (nextKeysArr.length === 0) {
        // Still attempt to upsert nothing, but preserve existing data.
        return;
      }

      const nextKeys = new Set(nextKeysArr);
      const keysToDelete = existingRows.filter((row) => !nextKeys.has(row.key)).map((row) => row.key);
      if (keysToDelete.length) {
        // If implicit deletes are attempted, block them unless explicitly allowed via env.
        if (process.env.ALLOW_SNAPSHOT_DELETES !== 'true') {
          // Record attempted delete in audit (DB + file) and skip deleting
          const audit = { type: 'catalog', action: 'delete_blocked', payload: { attemptedDeletes: keysToDelete, existingKeys: existingRows.map(r=>r.key) } };
          try {
            await prisma.$executeRaw`INSERT INTO SnapshotAudit (id, type, action, payload) VALUES (UUID(), ${audit.type}, ${audit.action}, ${JSON.stringify(audit.payload)})`;
          } catch (err) {
            // ignore if audit table missing
          }
          try {
            const auditDir = path.join(process.cwd(), 'data', 'audit');
            if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            fs.writeFileSync(path.join(auditDir, `catalog-delete-blocked-${ts}.json`), JSON.stringify(audit, null, 2), 'utf-8');
          } catch {}
        } else {
          await prisma.catalogSnapshot.deleteMany({ where: { key: { in: keysToDelete } } });
        }
      }

      await Promise.all(
        Object.entries(sanitizedSnapshot).map(([key, value]) =>
          prisma.catalogSnapshot.upsert({
            where: { key },
            create: { key, value },
            update: { value },
          }),
        ),
      );
      // record audit of the write
      try {
        const audit = { type: 'catalog', action: 'write', payload: { keys: Object.keys(sanitizedSnapshot) } };
        await prisma.$executeRaw`INSERT INTO SnapshotAudit (id, type, action, payload) VALUES (UUID(), ${audit.type}, ${audit.action}, ${JSON.stringify(audit.payload)})`;
      } catch (err) {
        // ignore if audit table not present
      }
      return;
    }
  } catch (err) {
    console.error('Prisma writeCatalogSnapshot error:', err);
  }

  const dataDir = path.dirname(CATALOG_SNAPSHOT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(CATALOG_SNAPSHOT_FILE, JSON.stringify(sanitizedSnapshot, null, 2), 'utf-8');
}

export async function updateCatalogSnapshot(key: string, value: string | null) {
  try {
    if (process.env.DATABASE_URL) {
      if (value === null) {
        await prisma.catalogSnapshot.deleteMany({ where: { key } });
      } else {
        await prisma.catalogSnapshot.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      }
      return await readCatalogSnapshot();
    }
  } catch (err) {
    console.error('Prisma updateCatalogSnapshot error:', err);
  }

  const snapshot = await readCatalogSnapshot();

  if (value === null) {
    delete snapshot[key];
  } else {
    snapshot[key] = value;
  }

  const sanitizedSnapshot = sanitizeCatalogSnapshot(snapshot);
  await writeCatalogSnapshot(sanitizedSnapshot);
  return sanitizedSnapshot;
}
