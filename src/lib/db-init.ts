import 'server-only';
import prisma from './db';

let initialized = false;

export async function ensureDbReady() {
  if (initialized) return;
  initialized = true;

  try {
    if (!process.env.DATABASE_URL) return;

    // Create CatalogSnapshot table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS CatalogSnapshot (
        id VARCHAR(32) PRIMARY KEY,
        ` + "`key` VARCHAR(191) UNIQUE NOT NULL," + `
        value LONGTEXT,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create LedgerSnapshot table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS LedgerSnapshot (
        id VARCHAR(32) PRIMARY KEY,
        ` + "`key` VARCHAR(191) UNIQUE NOT NULL," + `
        value LONGTEXT,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // Create SnapshotAudit table for audit logging
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS SnapshotAudit (
        id VARCHAR(32) PRIMARY KEY,
        type VARCHAR(32) NOT NULL,
        action VARCHAR(64) NOT NULL,
        payload LONGTEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    console.error('ensureDbReady error:', err);
  }
}

export default ensureDbReady;
