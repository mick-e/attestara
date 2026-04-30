import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

describe('relay config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    // Set minimum required env vars
    process.env.DATABASE_URL = 'postgresql://localhost:5432/attestara'
    process.env.JWT_SECRET = 'a'.repeat(32)
    process.env.PROVER_INTERNAL_SECRET = 'b'.repeat(16)
    process.env.ORG_MASTER_KEY_SECRET = 'c'.repeat(32)
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('parses valid config from environment', async () => {
    const { loadConfig } = await import('../src/config.js')
    const config = loadConfig()

    expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/attestara')
    expect(config.JWT_SECRET).toBe('a'.repeat(32))
    expect(config.NODE_ENV).toBe('test')
  })

  it('uses default values for optional fields', async () => {
    const { loadConfig } = await import('../src/config.js')
    const config = loadConfig()

    expect(config.PORT).toBe(3001)
    expect(config.HOST).toBe('0.0.0.0')
    expect(config.REDIS_URL).toBe('redis://localhost:6379')
    expect(config.JWT_EXPIRY).toBe('15m')
    expect(config.DATABASE_POOL_SIZE).toBe(10)
  })

  it('throws when JWT_SECRET is too short', async () => {
    process.env.JWT_SECRET = 'short'
    const { loadConfig } = await import('../src/config.js')
    expect(() => loadConfig()).toThrow()
  })

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL
    const { loadConfig } = await import('../src/config.js')
    expect(() => loadConfig()).toThrow()
  })

  it('parses CORS_ORIGIN as comma-separated list', async () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000,https://app.attestara.ai'
    const { loadConfig } = await import('../src/config.js')
    const config = loadConfig()
    expect(config.CORS_ORIGIN).toEqual(['http://localhost:3000', 'https://app.attestara.ai'])
  })

  it('defaults CORS_ORIGIN in non-production', async () => {
    delete process.env.CORS_ORIGIN
    const { loadConfig } = await import('../src/config.js')
    const config = loadConfig()
    expect(config.CORS_ORIGIN).toEqual(['http://localhost:3000'])
  })

  it('parses TRUSTED_PROXIES', async () => {
    process.env.TRUSTED_PROXIES = '10.0.0.0/8, 172.16.0.0/12'
    const { loadConfig } = await import('../src/config.js')
    const config = loadConfig()
    expect(config.TRUSTED_PROXIES).toEqual(['10.0.0.0/8', '172.16.0.0/12'])
  })
})
