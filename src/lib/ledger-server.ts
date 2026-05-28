 'use server';
import 'server-only';

import fs from 'fs';
import path from 'path';
import prisma from './db';

export type LedgerSnapshot = Record<string, string>;

const LEDGER_SNAPSHOT_FILE = path.join(process.cwd(), 'data', 'ledger-snapshot.json');

export async function readLedgerSnapshot(): Promise<LedgerSnapshot> {
  try {
    if (process.env.DATABASE_URL) {
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
    if (process.env.DATABASE_URL) {
      await prisma.ledgerSnapshot.deleteMany();
      const data = Object.keys(nextSnapshot).map((key) => ({ key, value: nextSnapshot[key] }));
      if (data.length) {
        await prisma.ledgerSnapshot.createMany({ data });
      }
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
}

export async function updateLedgerSnapshot(key: string, value: string | null) {
  try {
    if (process.env.DATABASE_URL) {
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
