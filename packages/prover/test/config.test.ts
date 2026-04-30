import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('prover config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('parses valid config from environment', async () => {
    process.env.PROVER_INTERNAL_SECRET = 'super-secret-key-min16'
    process.env.REDIS_URL = 'redis://localhost:6379'
    process.env.CIRCUIT_DIR = '/tmp/circuits'
    process.env.WORKER_POOL_SIZE = '2'
    process.env.PORT = '3002'
    process.env.HOST = '127.0.0.1'
    process.env.NODE_ENV = 'test'

    const { loadProverConfig } = await import('../src/config.js')
    const config = loadProverConfig()

    expect(config.PROVER_INTERNAL_SECRET).toBe('super-secret-key-min16')
    expect(config.REDIS_URL).toBe('redis://localhost:6379')
    expect(config.CIRCUIT_DIR).toBe('/tmp/circuits')
    expect(config.WORKER_POOL_SIZE).toBe(2)
    expect(config.PORT).toBe(3002)
    expect(config.HOST).toBe('127.0.0.1')
    expect(config.NODE_ENV).toBe('test')
  })

  it('uses defaults for optional fields', async () => {
    process.env.PROVER_INTERNAL_SECRET = 'super-secret-key-min16'
    delete process.env.REDIS_URL
    delete process.env.CIRCUIT_DIR
    delete process.env.WORKER_POOL_SIZE
    delete process.env.PORT
    delete process.env.HOST
    delete process.env.NODE_ENV

    const { loadProverConfig } = await import('../src/config.js')
    const config = loadProverConfig()

    expect(config.REDIS_URL).toBe('redis://localhost:6379')
    expect(config.WORKER_POOL_SIZE).toBe(4)
    expect(config.PORT).toBe(3002)
    expect(config.HOST).toBe('0.0.0.0')
    expect(config.NODE_ENV).toBe('development')
  })

  it('throws on missing required PROVER_INTERNAL_SECRET', async () => {
    delete process.env.PROVER_INTERNAL_SECRET

    const { loadProverConfig } = await import('../src/config.js')
    expect(() => loadProverConfig()).toThrow()
  })
})
