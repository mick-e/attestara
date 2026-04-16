import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the SDK import to fail so the fallback is exercised
vi.mock('@attestara/sdk', () => {
  throw new Error('SDK not available in test')
})

const { DIDService } = await import('../../src/services/did.service.js')

describe('DIDService', () => {
  let service: InstanceType<typeof DIDService>

  beforeEach(() => {
    service = new DIDService()
  })

  it('creates a did:ethr identifier', async () => {
    const result = await service.createDid('test-agent')
    expect(result.did).toMatch(/^did:ethr:arb-sepolia:0x[0-9a-f]{40}$/)
    expect(result.publicKey).toMatch(/^0x[0-9a-f]+$/)
  })

  it('produces unique DIDs for different calls', async () => {
    const a = await service.createDid('agent-a')
    const b = await service.createDid('agent-b')
    expect(a.did).not.toBe(b.did)
  })

  it('returns a publicKey with 0x prefix', async () => {
    const result = await service.createDid('key-test')
    expect(result.publicKey.startsWith('0x')).toBe(true)
    expect(result.publicKey.length).toBeGreaterThan(10)
  })
})
