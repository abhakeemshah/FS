import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const libsql = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

const adapter = new PrismaLibSQL(libsql)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const db = globalForPrisma.prisma || new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export default db
export { db }