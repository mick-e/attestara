import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ioredis before importing
vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    status: 'ready',
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  }))
  return { default: MockRedis }
})

// Mock config to avoid requiring all env vars in unit tests
vi.mock('../src/config.js', () => ({
  loadConfig: () => ({
    REDIS_URL: 'redis://localhost:6379',
  }),
}))

describe('Redis client', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should export getRedis and closeRedis', async () => {
    const { getRedis, closeRedis } = await import('../src/utils/redis.js')
    expect(typeof getRedis).toBe('function')
    expect(typeof closeRedis).toBe('function')
  })

  it('should return a Redis instance', async () => {
    const { getRedis } = await import('../src/utils/redis.js')
    const redis = getRedis()
    expect(redis).toBeTruthy()
    expect(redis.status).toBe('ready')
  })
})
