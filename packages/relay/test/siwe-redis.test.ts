import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSetex = vi.fn().mockResolvedValue('OK')
const mockGet = vi.fn().mockResolvedValue(null)
const mockDel = vi.fn().mockResolvedValue(1)

vi.mock('../src/utils/redis.js', () => ({
  getRedis: () => ({
    setex: mockSetex,
    get: mockGet,
    del: mockDel,
  }),
}))

describe('SIWE nonce store (Redis)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('storeNonce stores address with 300s TTL in Redis', async () => {
    const { storeNonce } = await import('../src/utils/siwe.js')
    await storeNonce('test-nonce', '0xAbC123')
    expect(mockSetex).toHaveBeenCalledWith(
      'siwe:nonce:test-nonce',
      300,
      '0xabc123',
    )
  })

  it('consumeNonce returns address and deletes key', async () => {
    mockGet.mockResolvedValueOnce('0xabc123')
    const { consumeNonce } = await import('../src/utils/siwe.js')
    const address = await consumeNonce('test-nonce')
    expect(address).toBe('0xabc123')
    expect(mockDel).toHaveBeenCalledWith('siwe:nonce:test-nonce')
  })

  it('consumeNonce returns null for missing nonce', async () => {
    mockGet.mockResolvedValueOnce(null)
    const { consumeNonce } = await import('../src/utils/siwe.js')
    const address = await consumeNonce('missing-nonce')
    expect(address).toBeNull()
    expect(mockDel).not.toHaveBeenCalled()
  })
})
