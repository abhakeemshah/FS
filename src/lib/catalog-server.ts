import 'server-only';
import fs from 'fs';
import path from 'path';
import prisma from './db';

export const CATALOG_SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'catalog-snapshot.json');

// Read snapshot from Prisma when possible, otherwise fallback to file.
export async function readCatalogSnapshot(): Promise<Record<string, string>> {
  try {
    if (process.env.DATABASE_URL) {
      const rows = await prisma.catalogSnapshot.findMany();
      const out: Record<string, string> = {};
      for (const r of rows) {
        out[r.key] = r.value ?? '';
      }
      return out;
    }
  } catch (err) {
    // fall through to file fallback
    console.error('Prisma readCatalogSnapshot error:', err);
  }

  try {
    if (!fs.existsSync(CATALOG_SNAPSHOT_FILE)) return {};
    const raw = fs.readFileSync(CATALOG_SNAPSHOT_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch (err) {
    console.error('File readCatalogSnapshot error:', err);
    return {};
  }
}

export async function writeCatalogSnapshot(nextSnapshot: Record<string, string>) {
  try {
    if (process.env.DATABASE_URL) {
      // upsert all keys: simple approach - delete all and re-create to keep parity with file snapshot
      await prisma.catalogSnapshot.deleteMany();
      const creates = Object.keys(nextSnapshot).map((k) => ({ key: k, value: nextSnapshot[k] }));
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

  fs.writeFileSync(CATALOG_SNAPSHOT_FILE, JSON.stringify(nextSnapshot, null, 2), 'utf-8');
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

  await writeCatalogSnapshot(snapshot);
  return snapshot;
}
