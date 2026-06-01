import 'server-only';
import prisma from './db';

let initialized = false;

export async function ensureDbReady() {
  if (initialized) return;
  initialized = true;

  try {
    // In development, prefer file-based fallback unless explicitly enabled.
    if (!process.env.DATABASE_URL || (process.env.NODE_ENV !== 'production' && process.env.FS_USE_DB !== 'true')) return;

    // Create CatalogSnapshot table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS CatalogSnapshot (
        id VARCHAR(32) PRIMARY KEY,
        ` + "`key` VARCHAR(191) UNIQUE NOT NULL," + `
        value LONGTEXT,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create User table if missing so staff/auth routes can self-heal on fresh deployments.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`User\` (
        id VARCHAR(191) PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(191) NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'staff',
        staffAccessMetaJson LONGTEXT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
