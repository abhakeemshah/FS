#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import prisma from '../lib/db';
import ensureDbReady from '../lib/db-init';

type Snapshot = Record<string, string>;

async function prompt(question: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function restore(type: 'catalog' | 'ledger', filePath: string, replace = false) {
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Snapshot;

  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid snapshot file');

  console.log(`Restoring ${Object.keys(parsed).length} keys into ${type} from ${filePath}`);

  if (!process.env.FORCE) {
    const ans = (await prompt('Proceed? type YES to continue: ')).trim();
    if (ans !== 'YES') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  await ensureDbReady();

  if (type === 'catalog') {
    const existing = await prisma.catalogSnapshot.findMany();
    const existingKeys = new Set(existing.map((r) => r.key));

    await Promise.all(Object.entries(parsed).map(async ([key, value]) => {
      await prisma.catalogSnapshot.upsert({ where: { key }, create: { key, value }, update: { value } });
    }));

    if (replace) {
      if (process.env.ALLOW_SNAPSHOT_DELETES !== 'true') {
        console.log('Replace requested but ALLOW_SNAPSHOT_DELETES is not true; skip deletes.');
      } else {
        const keysToDelete = existing.filter((r) => !(r.key in parsed)).map((r) => r.key);
        if (keysToDelete.length) {
          await prisma.catalogSnapshot.deleteMany({ where: { key: { in: keysToDelete } } });
        }
      }
    }
  } else {
    const existing = await prisma.ledgerSnapshot.findMany();
    await Promise.all(Object.entries(parsed).map(async ([key, value]) => {
      await prisma.ledgerSnapshot.upsert({ where: { key }, create: { key, value }, update: { value } });
    }));

    if (replace) {
      if (process.env.ALLOW_SNAPSHOT_DELETES !== 'true') {
        console.log('Replace requested but ALLOW_SNAPSHOT_DELETES is not true; skip deletes.');
      } else {
        const keysToDelete = existing.filter((r) => !(r.key in parsed)).map((r) => r.key);
        if (keysToDelete.length) {
          await prisma.ledgerSnapshot.deleteMany({ where: { key: { in: keysToDelete } } });
        }
      }
    }
  }

  console.log('Restore complete.');
}

async function main() {
  const argv = process.argv.slice(2);
  const typeArg = argv.find((a) => a.startsWith('--type=')) || argv[0];
  const fileArg = argv.find((a) => a.startsWith('--file=')) || argv[1];
  const replace = argv.includes('--replace');

  let type: 'catalog' | 'ledger' | undefined;
  if (typeof typeArg === 'string') {
    const t = typeArg.replace('--type=', '');
    if (t === 'catalog' || t === 'ledger') type = t;
  }

  let filePath = typeof fileArg === 'string' ? fileArg.replace('--file=', '') : undefined;

  if (!type) {
    console.error('Usage: restore-snapshot.ts --type=catalog|ledger --file=path/to/file.json [--replace]');
    process.exit(1);
  }

  if (!filePath) {
    // try latest in snapshots dir
    const dir = path.join(process.cwd(), 'data', 'snapshots', type);
    if (!fs.existsSync(dir)) { console.error('No snapshots found and no file provided.'); process.exit(1); }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    if (!files.length) { console.error('No snapshot files found.'); process.exit(1); }
    filePath = path.join(dir, files[files.length - 1]);
    console.log('No file provided, using latest:', filePath);
  }

  await restore(type, filePath, replace);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
