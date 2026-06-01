import 'server-only';

import fs from 'fs';
import path from 'path';
import prisma from './db';
import ensureDbReady from './db-init';

function shouldUseDb() {
  return !!process.env.DATABASE_URL && (process.env.NODE_ENV === 'production' || process.env.FS_USE_DB === 'true');
}

export type LedgerSnapshot = Record<string, string>;

const LEDGER_SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'ledger-snapshot.json');

export async function readLedgerSnapshot(): Promise<LedgerSnapshot> {
  // ensure DB tables exist (best-effort)
  try {
    await ensureDbReady();
  } catch {}
  try {
    if (shouldUseDb()) {
      const rows = await prisma.ledgerSnapshot.findMany();
      const snapshot: Record<string, string> = {};

      for (const row of rows) {
        snapshot[row.key] = row.value ?? '';
      }

      return snapshot;
    }
  } catch (error) {
    console.error('Prisma readLedgerSnapshot error:', error);
  }

  try {
    if (!fs.existsSync(LEDGER_SNAPSHOT_FILE)) return {};
    const raw = fs.readFileSync(LEDGER_SNAPSHOT_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch (error) {
    console.error('File readLedgerSnapshot error:', error);
    return {};
  }
}

export async function writeLedgerSnapshot(nextSnapshot: LedgerSnapshot) {
  try {
  if (shouldUseDb()) {
      // Ensure DB initialized
      await ensureDbReady();
        const existingRows = await prisma.ledgerSnapshot.findMany();
        const nextKeysArr = Object.keys(nextSnapshot);

        // Defensive: if next snapshot is empty, avoid deleting existing rows.
        if (nextKeysArr.length === 0) {
          return;
        }

        const nextKeys = new Set(nextKeysArr);
        const keysToDelete = existingRows.filter((row) => !nextKeys.has(row.key)).map((row) => row.key);

        if (keysToDelete.length) {
          if (process.env.ALLOW_SNAPSHOT_DELETES !== 'true') {
            const audit = { type: 'ledger', action: 'delete_blocked', payload: { attemptedDeletes: keysToDelete, existingKeys: existingRows.map(r=>r.key) } };
            try {
              await prisma.$executeRaw`INSERT INTO SnapshotAudit (id, type, action, payload) VALUES (UUID(), ${audit.type}, ${audit.action}, ${JSON.stringify(audit.payload)})`;
            } catch {}
            try {
              const auditDir = path.join(process.cwd(), 'data', 'audit');
              if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });
              const ts = new Date().toISOString().replace(/[:.]/g, '-');
              fs.writeFileSync(path.join(auditDir, `ledger-delete-blocked-${ts}.json`), JSON.stringify(audit, null, 2), 'utf-8');
            } catch {}
          } else {
            await prisma.ledgerSnapshot.deleteMany({ where: { key: { in: keysToDelete } } });
          }
        }

        await Promise.all(
        Object.entries(nextSnapshot).map(([key, value]) =>
            prisma.ledgerSnapshot.upsert({
              where: { key },
              create: { key, value },
              update: { value },
            }),
          ),
        );
        // also save a timestamped version for recovery
        try {
          const snapshotsDir = path.join(process.cwd(), 'data', 'snapshots', 'ledger');
          if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const filePath = path.join(snapshotsDir, `ledger-${ts}.json`);
          fs.writeFileSync(filePath, JSON.stringify(nextSnapshot, null, 2), 'utf-8');
          const files = fs.readdirSync(snapshotsDir).filter((f) => f.endsWith('.json')).sort();
          while (files.length > 5) {
            const old = files.shift();
            if (old) try { fs.unlinkSync(path.join(snapshotsDir, old)); } catch {}
          }
        } catch (err) {
          console.error('ledger snapshot version save error:', err);
        }
        // record audit of the write
        try {
          const audit = { type: 'ledger', action: 'write', payload: { keys: Object.keys(nextSnapshot) } };
          await prisma.$executeRaw`INSERT INTO SnapshotAudit (id, type, action, payload) VALUES (UUID(), ${audit.type}, ${audit.action}, ${JSON.stringify(audit.payload)})`;
        } catch (err) {}
      return;
    }
  } catch (error) {
    console.error('Prisma writeLedgerSnapshot error:', error);
  }

  const dataDir = path.dirname(LEDGER_SNAPSHOT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(LEDGER_SNAPSHOT_FILE, JSON.stringify(nextSnapshot, null, 2), 'utf-8');
  // keep file-based versions as well
  try {
    const snapshotsDir = path.join(process.cwd(), 'data', 'snapshots', 'ledger');
    if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(snapshotsDir, `ledger-${ts}.json`);
    fs.writeFileSync(filePath, JSON.stringify(nextSnapshot, null, 2), 'utf-8');
    const files = fs.readdirSync(snapshotsDir).filter((f) => f.endsWith('.json')).sort();
    while (files.length > 5) {
      const old = files.shift();
      if (old) try { fs.unlinkSync(path.join(snapshotsDir, old)); } catch {}
    }
  } catch (err) {
    console.error('ledger snapshot version save error:', err);
  }
}

export async function updateLedgerSnapshot(key: string, value: string | null) {
  try {
  if (shouldUseDb()) {
      if (value === null) {
        await prisma.ledgerSnapshot.deleteMany({ where: { key } });
      } else {
        await prisma.ledgerSnapshot.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      }

      return await readLedgerSnapshot();
    }
  } catch (error) {
    console.error('Prisma updateLedgerSnapshot error:', error);
  }

  const snapshot = await readLedgerSnapshot();
  if (value === null) {
    delete snapshot[key];
  } else {
    snapshot[key] = value;
  }
  await writeLedgerSnapshot(snapshot);
  return snapshot;
}
