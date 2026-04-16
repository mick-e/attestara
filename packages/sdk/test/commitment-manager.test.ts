import { describe, it, expect } from 'vitest'
import { CommitmentManager } from '../src/commitment/index.js'

describe('CommitmentManager', () => {
  it('creates a commitment locally', async () => {
    const manager = new CommitmentManager()
    const commitment = await manager.create({
      sessionId: 'sess-001',
      agreementHash: '0xabc123',
      parties: ['did:ethr:0x111', 'did:ethr:0x222'],
      credentialHashes: ['0xcred1', '0xcred2'],
      proofs: [],
    })

    expect(commitment.id).toBeTruthy()
    expect(commitment.sessionId).toBe('sess-001')
    expect(commitment.agreementHash).toBe('0xabc123')
    expect(commitment.parties).toHaveLength(2)
    expect(commitment.verified).toBe(false)
  })

  it('retrieves a commitment by ID', async () => {
    const manager = new CommitmentManager()
    const created = await manager.create({
      sessionId: 'sess-001',
      agreementHash: '0xabc123',
      parties: ['did:ethr:0x111'],
      credentialHashes: [],
      proofs: [],
    })

    const fetched = await manager.get(created.id)
    expect(fetched).toBeTruthy()
    expect(fetched?.id).toBe(created.id)
  })

  it('returns undefined for non-existent commitment', async () => {
    const manager = new CommitmentManager()
    const result = await manager.get('nonexistent')
    expect(result).toBeUndefined()
  })

  it('lists all commitments', async () => {
    const manager = new CommitmentManager()
    await manager.create({
      sessionId: 'sess-001',
      agreementHash: '0xabc',
      parties: [],
      credentialHashes: [],
      proofs: [],
    })
    await manager.create({
      sessionId: 'sess-002',
      agreementHash: '0xdef',
      parties: [],
      credentialHashes: [],
      proofs: [],
    })

    const all = await manager.list()
    expect(all.length).toBe(2)
  })

  it('filters by sessionId', async () => {
    const manager = new CommitmentManager()
    await manager.create({
      sessionId: 'sess-A',
      agreementHash: '0x1',
      parties: [],
      credentialHashes: [],
      proofs: [],
    })
    await manager.create({
      sessionId: 'sess-B',
      agreementHash: '0x2',
      parties: [],
      credentialHashes: [],
      proofs: [],
    })

    const filtered = await manager.list({ sessionId: 'sess-A' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.sessionId).toBe('sess-A')
  })

  it('verifies a commitment (local mode)', async () => {
    const manager = new CommitmentManager()
    const commitment = await manager.create({
      sessionId: 'sess-001',
      agreementHash: '0xabc',
      parties: [],
      credentialHashes: [],
      proofs: [],
    })

    const verified = await manager.verify(commitment.id)
    expect(verified).toBe(true)
  })

  it('returns false for verifying non-existent commitment', async () => {
    const manager = new CommitmentManager()
    const verified = await manager.verify('nonexistent')
    expect(verified).toBe(false)
  })
})
