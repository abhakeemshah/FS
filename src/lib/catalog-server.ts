import 'server-only';
import fs from 'fs';
import path from 'path';
import prisma from './db';

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

  try {
    if (process.env.DATABASE_URL) {
      // upsert all keys: simple approach - delete all and re-create to keep parity with file snapshot
      await prisma.catalogSnapshot.deleteMany();
      const creates = Object.keys(sanitizedSnapshot).map((k) => ({ key: k, value: sanitizedSnapshot[k] }));
      if (creates.length) await prisma.catalogSnapshot.createMany({ data: creates });
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
