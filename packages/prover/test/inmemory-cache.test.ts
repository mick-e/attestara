import { describe, it, expect } from 'vitest'
import { InMemoryProverCache } from '../src/cache.js'
import type { ProofResult, CircuitId } from '@attestara/types'

function mockProofResult(circuit: string = 'MandateBound'): ProofResult {
  return {
    proof: {
      pi_a: ['1', '2'],
      pi_b: [['3', '4'], ['5', '6']],
      pi_c: ['7', '8'],
      protocol: 'groth16',
      curve: 'bn128',
    },
    publicSignals: { signals: ['100'] },
    circuitId: circuit as CircuitId,
    circuitVersion: '1.0.0',
    generationTimeMs: 50,
  }
}

describe('InMemoryProverCache', () => {
  it('is always connected', () => {
    const cache = new InMemoryProverCache()
    expect(cache.isConnected()).toBe(true)
  })

  it('returns null for uncached proof', async () => {
    const cache = new InMemoryProverCache()
    const result = await cache.getProof('MandateBound', { max_value: 100 })
    expect(result).toBeNull()
  })

  it('stores and retrieves a proof', async () => {
    const cache = new InMemoryProverCache()
    const proof = mockProofResult()
    await cache.setProof('MandateBound', { max_value: 100 }, proof)

    const retrieved = await cache.getProof('MandateBound', { max_value: 100 })
    expect(retrieved).toEqual(proof)
  })

  it('returns null for different inputs', async () => {
    const cache = new InMemoryProverCache()
    const proof = mockProofResult()
    await cache.setProof('MandateBound', { max_value: 100 }, proof)

    const retrieved = await cache.getProof('MandateBound', { max_value: 200 })
    expect(retrieved).toBeNull()
  })

  it('stores and retrieves verification keys', async () => {
    const cache = new InMemoryProverCache()
    const vkey = { alpha: '1', beta: '2', gamma: '3' }
    await cache.setVerificationKey('MandateBound', vkey)

    const retrieved = await cache.getVerificationKey('MandateBound')
    expect(retrieved).toEqual(vkey)
  })

  it('returns null for uncached verification key', async () => {
    const cache = new InMemoryProverCache()
    const result = await cache.getVerificationKey('MandateBound')
    expect(result).toBeNull()
  })

  it('clears all data on close', async () => {
    const cache = new InMemoryProverCache()
    await cache.setProof('MandateBound', { x: 1 }, mockProofResult())
    await cache.setVerificationKey('MandateBound', { alpha: '1' })

    await cache.close()

    const proof = await cache.getProof('MandateBound', { x: 1 })
    const vkey = await cache.getVerificationKey('MandateBound')
    expect(proof).toBeNull()
    expect(vkey).toBeNull()
  })

  it('expires proofs after TTL', async () => {
    const cache = new InMemoryProverCache()
    // Set with 0 TTL (expire immediately)
    await cache.setProof('MandateBound', { x: 1 }, mockProofResult(), 0)

    // Wait a tick for expiry
    await new Promise(r => setTimeout(r, 10))

    const result = await cache.getProof('MandateBound', { x: 1 })
    expect(result).toBeNull()
  })
})
