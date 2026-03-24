import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryProverCache } from '../src/cache.js'
import type { ProofResult, CircuitId } from '@attestara/types'

function makeProofResult(circuitId: string = 'MandateBound'): ProofResult {
  return {
    proof: {
      pi_a: ['1', '2'],
      pi_b: [['3', '4'], ['5', '6']],
      pi_c: ['7', '8'],
      protocol: 'groth16',
      curve: 'bn128',
    },
    publicSignals: { signals: ['12345', '42000'] },
    circuitId: circuitId as CircuitId,
    circuitVersion: '1.0.0',
    generationTimeMs: 50,
  }
}

describe('InMemoryProverCache', () => {
  let cache: InMemoryProverCache

  beforeEach(() => {
    cache = new InMemoryProverCache()
  })

  it('returns null for uncached proof', async () => {
    const result = await cache.getProof('MandateBound', { commitment: '123' })
    expect(result).toBeNull()
  })

  it('stores and retrieves proof results', async () => {
    const inputs = { commitment: '123', proposed: '456' }
    const proof = makeProofResult()
    await cache.setProof('MandateBound', inputs, proof)
    const cached = await cache.getProof('MandateBound', inputs)
    expect(cached).toEqual(proof)
  })

  it('differentiates by circuit ID', async () => {
    const inputs = { commitment: '123' }
    const proof1 = makeProofResult('MandateBound')
    const proof2 = makeProofResult('ParameterRange')
    await cache.setProof('MandateBound', inputs, proof1)
    await cache.setProof('ParameterRange', inputs, proof2)
    const cached1 = await cache.getProof('MandateBound', inputs)
    const cached2 = await cache.getProof('ParameterRange', inputs)
    expect(cached1?.circuitId).toBe('MandateBound')
    expect(cached2?.circuitId).toBe('ParameterRange')
  })

  it('differentiates by input values', async () => {
    const proof1 = makeProofResult()
    const proof2 = { ...makeProofResult(), generationTimeMs: 100 }
    await cache.setProof('MandateBound', { a: '1' }, proof1)
    await cache.setProof('MandateBound', { a: '2' }, proof2)
    const cached1 = await cache.getProof('MandateBound', { a: '1' })
    const cached2 = await cache.getProof('MandateBound', { a: '2' })
    expect(cached1?.generationTimeMs).toBe(50)
    expect(cached2?.generationTimeMs).toBe(100)
  })

  it('respects TTL expiration', async () => {
    const inputs = { x: '1' }
    const proof = makeProofResult()
    await cache.setProof('MandateBound', inputs, proof, 0) // 0-second TTL = already expired
    // Give a ms for the expiry to pass
    await new Promise(r => setTimeout(r, 10))
    const cached = await cache.getProof('MandateBound', inputs)
    expect(cached).toBeNull()
  })

  it('stores and retrieves verification keys', async () => {
    const vkey = { protocol: 'groth16', curve: 'bn128', data: 'test' }
    await cache.setVerificationKey('MandateBound', vkey)
    const cached = await cache.getVerificationKey('MandateBound')
    expect(cached).toEqual(vkey)
  })

  it('returns null for uncached verification key', async () => {
    const cached = await cache.getVerificationKey('Unknown')
    expect(cached).toBeNull()
  })

  it('reports as connected', () => {
    expect(cache.isConnected()).toBe(true)
  })

  it('clears on close', async () => {
    await cache.setProof('MandateBound', { x: '1' }, makeProofResult())
    await cache.setVerificationKey('MandateBound', { a: 1 })
    await cache.close()
    const proof = await cache.getProof('MandateBound', { x: '1' })
    const vkey = await cache.getVerificationKey('MandateBound')
    expect(proof).toBeNull()
    expect(vkey).toBeNull()
  })
})
