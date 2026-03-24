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
 * Connection pool size is controlled by the `connection_limit` parameter
 * in DATABASE_URL (e.g. `?connection_limit=10`).
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
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
