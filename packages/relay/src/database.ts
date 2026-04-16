import { PrismaClient } from '@prisma/client'
import { loadConfig } from './config.js'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client singleton with connection pooling.
 *
 * In development, the client is cached on `globalThis` to survive
 * hot-reloads without exhausting database connections.
 *
 * Pool size is controlled via DATABASE_POOL_SIZE env var (default 10).
 * The value is appended to DATABASE_URL as `connection_limit` if not
 * already present in the URL.
 */
function buildDatabaseUrl(): string {
  const config = loadConfig()
  const base = config.DATABASE_URL
  const poolSize = String(config.DATABASE_POOL_SIZE)
  // Only append connection_limit if not already in the URL
  if (base.includes('connection_limit')) return base
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}connection_limit=${poolSize}`
}

function createPrismaClient(): PrismaClient {
  const config = loadConfig()
  return new PrismaClient({
    datasourceUrl: buildDatabaseUrl(),
    log:
      config.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (loadConfig().NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Graceful shutdown -- disconnect the Prisma client and drain the
 * connection pool. Call this from your server shutdown hook.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}

/**
 * Health check -- run a lightweight query to verify the database
 * connection is alive.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
