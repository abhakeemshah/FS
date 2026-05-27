import fs from 'fs';
import path from 'path';

export const CATALOG_SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'catalog-snapshot.json');

export function readCatalogSnapshot(): Record<string, string> {
  try {
    if (!fs.existsSync(CATALOG_SNAPSHOT_FILE)) {
      return {};
    }

    const raw = fs.readFileSync(CATALOG_SNAPSHOT_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeCatalogSnapshot(nextSnapshot: Record<string, string>) {
  const dataDir = path.dirname(CATALOG_SNAPSHOT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(CATALOG_SNAPSHOT_FILE, JSON.stringify(nextSnapshot, null, 2), 'utf-8');
}

export function updateCatalogSnapshot(key: string, value: string | null) {
  const snapshot = readCatalogSnapshot();

  if (value === null) {
    delete snapshot[key];
  } else {
    snapshot[key] = value;
  }

  writeCatalogSnapshot(snapshot);
  return snapshot;
}
