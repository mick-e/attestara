import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Prisma client and config to avoid real DB connections
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  })),
}))

vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(() => ({
    DATABASE_URL: 'postgresql://localhost:5432/attestara_test',
    DATABASE_POOL_SIZE: 5,
    NODE_ENV: 'test',
  })),
}))

describe('database module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('exports checkDatabaseHealth function', async () => {
    const mod = await import('../src/database.js')
    expect(typeof mod.checkDatabaseHealth).toBe('function')
  })

  it('exports disconnectDatabase function', async () => {
    const mod = await import('../src/database.js')
    expect(typeof mod.disconnectDatabase).toBe('function')
  })

  it('exports prisma client', async () => {
    const mod = await import('../src/database.js')
    expect(mod.prisma).toBeTruthy()
  })
})
