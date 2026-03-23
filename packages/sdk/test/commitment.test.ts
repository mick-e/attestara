import { describe, it, expect } from 'vitest'
import { CommitmentManager } from '../src/commitment/index.js'
import { ChainCommitmentClient } from '../src/commitment/chain.js'
import { CircuitId } from '@agentclear/types'
import type { CommitmentProof, ZKProof, PublicSignals } from '@agentclear/types'

const fakeProof: ZKProof = {
  pi_a: ['0x1', '0x2'],
  pi_b: [['0x3', '0x4'], ['0x5', '0x6']],
  pi_c: ['0x7', '0x8'],
  protocol: 'groth16',
  curve: 'bn128',
}

const fakeSignals: PublicSignals = {
  signals: ['10000'],
}

const sampleProofs: CommitmentProof[] = [
  {
    circuitId: CircuitId.MANDATE_BOUND,
    circuitVersion: 'v1',
    proof: fakeProof,
    publicSignals: fakeSignals,
  },
]

function makeCommitmentParams() {
  return {
    sessionId: 'session-1',
    agreementHash: '0xabc123',
    parties: ['did:ethr:0xAAA', 'did:ethr:0xBBB'],
    credentialHashes: ['0xcred1', '0xcred2'],
    proofs: sampleProofs,
  }
}

describe('CommitmentManager', () => {
  describe('create', () => {
    it('should create a commitment with all fields', async () => {
      const manager = new CommitmentManager()
      const commitment = await manager.create(makeCommitmentParams())

      expect(commitment.id).toBeDefined()
      expect(commitment.sessionId).toBe('session-1')
      expect(commitment.agreementHash).toBe('0xabc123')
      expect(commitment.parties).toEqual(['did:ethr:0xAAA', 'did:ethr:0xBBB'])
      expect(commitment.credentialHashes).toEqual(['0xcred1', '0xcred2'])
      expect(commitment.proofs).toHaveLength(1)
      expect(commitment.txHash).toBeNull()
      expect(commitment.blockNumber).toBeNull()
      expect(commitment.verified).toBe(false)
      expect(commitment.createdAt).toBeInstanceOf(Date)
    })

    it('should assign unique IDs', async () => {
      const manager = new CommitmentManager()
      const c1 = await manager.create(makeCommitmentParams())
      const c2 = await manager.create(makeCommitmentParams())
      expect(c1.id).not.toBe(c2.id)
    })
  })

  describe('get', () => {
    it('should retrieve a commitment by ID', async () => {
      const manager = new CommitmentManager()
      const commitment = await manager.create(makeCommitmentParams())
      const retrieved = await manager.get(commitment.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(commitment.id)
      expect(retrieved!.sessionId).toBe('session-1')
    })

    it('should return undefined for unknown ID', async () => {
      const manager = new CommitmentManager()
      const retrieved = await manager.get('nonexistent')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('list', () => {
    it('should list all commitments', async () => {
      const manager = new CommitmentManager()
      await manager.create(makeCommitmentParams())
      await manager.create({ ...makeCommitmentParams(), sessionId: 'session-2' })
      const all = await manager.list()
      expect(all).toHaveLength(2)
    })

    it('should filter by sessionId', async () => {
      const manager = new CommitmentManager()
      await manager.create(makeCommitmentParams())
      await manager.create({ ...makeCommitmentParams(), sessionId: 'session-2' })
      const filtered = await manager.list({ sessionId: 'session-1' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].sessionId).toBe('session-1')
    })

    it('should filter by date range', async () => {
      const manager = new CommitmentManager()
      const c1 = await manager.create(makeCommitmentParams())
      // Manually backdate
      c1.createdAt = new Date('2025-01-01')
      const c2 = await manager.create({ ...makeCommitmentParams(), sessionId: 'session-2' })
      c2.createdAt = new Date('2026-06-01')

      const filtered = await manager.list({
        fromDate: new Date('2026-01-01'),
      })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].sessionId).toBe('session-2')
    })

    it('should filter by toDate', async () => {
      const manager = new CommitmentManager()
      const c1 = await manager.create(makeCommitmentParams())
      c1.createdAt = new Date('2025-01-01')
      const c2 = await manager.create({ ...makeCommitmentParams(), sessionId: 'session-2' })
      c2.createdAt = new Date('2026-06-01')

      const filtered = await manager.list({
        toDate: new Date('2025-12-31'),
      })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].sessionId).toBe('session-1')
    })

    it('should return empty array when no matches', async () => {
      const manager = new CommitmentManager()
      await manager.create(makeCommitmentParams())
      const filtered = await manager.list({ sessionId: 'nonexistent' })
      expect(filtered).toHaveLength(0)
    })
  })

  describe('verify', () => {
    it('should verify an existing commitment', async () => {
      const manager = new CommitmentManager()
      const commitment = await manager.create(makeCommitmentParams())
      expect(commitment.verified).toBe(false)

      const result = await manager.verify(commitment.id)
      expect(result).toBe(true)

      const updated = await manager.get(commitment.id)
      expect(updated!.verified).toBe(true)
    })

    it('should return false for nonexistent commitment', async () => {
      const manager = new CommitmentManager()
      const result = await manager.verify('nonexistent')
      expect(result).toBe(false)
    })
  })
})

describe('ChainCommitmentClient', () => {
  it('should throw when no contract address configured', async () => {
    const client = new ChainCommitmentClient('http://localhost:8545')
    await expect(client.submit({
      agreementHash: '0xabc',
      parties: ['a'],
      merkleRoot: '0xroot',
      credentialHashes: ['0xcred'],
    })).rejects.toThrow('Commitment contract address not configured')
  })

  it('should throw on submit when contract not deployed', async () => {
    const client = new ChainCommitmentClient('http://localhost:8545', '0xContract')
    await expect(client.submit({
      agreementHash: '0xabc',
      parties: ['a'],
      merkleRoot: '0xroot',
      credentialHashes: ['0xcred'],
    })).rejects.toThrow('not yet implemented')
  })

  it('should throw on verifyOnChain when contract not deployed', async () => {
    const client = new ChainCommitmentClient('http://localhost:8545', '0xContract')
    await expect(client.verifyOnChain('id-1')).rejects.toThrow('not yet implemented')
  })
})
