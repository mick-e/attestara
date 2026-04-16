import { PrismaClient } from '@prisma/client'

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
  const base = process.env.DATABASE_URL ?? ''
  const poolSize = process.env.DATABASE_POOL_SIZE ?? '10'
  // Only append connection_limit if not already in the URL
  if (base.includes('connection_limit')) return base
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}connection_limit=${poolSize}`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: buildDatabaseUrl(),
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Graceful shutdown — disconnect the Prisma client and drain the
 * connection pool. Call this from your server shutdown hook.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}

/**
 * Health check — run a lightweight query to verify the database
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
