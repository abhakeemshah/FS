import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const databaseUrl = process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!databaseUrl) {
  throw new Error(
    'Missing DATABASE_URL environment variable. ' +
    'The app cannot connect to Turso. ' +
    'Ensure ecosystem.config.js passes DATABASE_URL to the process.'
  )
}

if (!authToken) {
  throw new Error(
    'Missing TURSO_AUTH_TOKEN environment variable. ' +
    'The Turso database connection requires an auth token. ' +
    'Ensure ecosystem.config.js passes TURSO_AUTH_TOKEN to the process.'
  )
}

console.log('[db] Connecting to Turso:', databaseUrl.replace(/\/\/[^@]+@/, '//***@'))

const libsql = createClient({
  url: databaseUrl,
  authToken,
})

const adapter = new PrismaLibSQL(libsql)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
let prisma: PrismaClient

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma
} else {
  prisma = new PrismaClient({ adapter })
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }
}

// Verify connectivity at startup
prisma.$connect()
  .then(() => console.log('[db] Successfully connected to Turso'))
  .catch((err) => {
    console.error('[db] Failed to connect to Turso:', err instanceof Error ? err.message : err)
  })

export default prisma
export { prisma as db }