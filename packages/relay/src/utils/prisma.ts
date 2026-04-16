import { PrismaClient } from '@prisma/client'
import { loadConfig } from '../config.js'

let prisma: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!prisma) {
    const config = loadConfig()
    prisma = new PrismaClient({
      log: config.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return prisma
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
