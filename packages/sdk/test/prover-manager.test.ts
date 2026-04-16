import { describe, it, expect, vi } from 'vitest'
import { ProverManager } from '../src/prover/index.js'
import type { CircuitId, ProofResult } from '@attestara/types'

// Mock the LocalProver module
vi.mock('../src/prover/local.js', () => ({
  LocalProver: vi.fn().mockImplementation(() => ({
    generateProof: vi.fn(async (circuit: CircuitId) => ({
      proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'], protocol: 'groth16', curve: 'bn128' },
      publicSignals: { signals: ['100'] },
      circuitId: circuit,
      circuitVersion: '1.0.0',
      generationTimeMs: 50,
    })),
    verifyProof: vi.fn(async (circuit: CircuitId) => ({
      valid: true,
      circuitId: circuit,
      circuitVersion: '1.0.0',
      verificationTimeMs: 10,
    })),
  })),
}))

vi.mock('../src/prover/remote.js', () => ({
  RemoteProver: vi.fn().mockImplementation(() => ({
    generateProof: vi.fn(async (circuit: CircuitId) => ({
      proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'], protocol: 'groth16', curve: 'bn128' },
      publicSignals: { signals: ['200'] },
      circuitId: circuit,
      circuitVersion: '1.0.0',
      generationTimeMs: 100,
    })),
    verifyProof: vi.fn(async () => ({
      valid: true,
      circuitId: 'MandateBound',
      circuitVersion: '1.0.0',
      verificationTimeMs: 20,
    })),
  })),
}))

describe('ProverManager', () => {
  it('uses local prover by default', async () => {
    const manager = new ProverManager({ mode: 'local' })
    const result = await manager.generateProof('MandateBound' as CircuitId, {})
    expect(result.circuitId).toBe('MandateBound')
    expect(result.publicSignals.signals[0]).toBe('100')
  })

  it('uses remote prover when mode is remote', async () => {
    const manager = new ProverManager({ mode: 'remote', remoteUrl: 'http://localhost:3002' })
    const result = await manager.generateProof('MandateBound' as CircuitId, {})
    expect(result.publicSignals.signals[0]).toBe('200')
  })

  it('generates a turn proof bundle', async () => {
    const manager = new ProverManager({ mode: 'local' })
    const bundle = await manager.generateTurnProofBundle('sess-1', 1, [
      { circuit: 'MandateBound' as CircuitId, inputs: { max_value: 500000n } },
      { circuit: 'ParameterRange' as CircuitId, inputs: { floor: 100000n, ceiling: 600000n } },
    ])

    expect(bundle.proofs).toHaveLength(2)
    expect(bundle.sessionId).toBe('sess-1')
    expect(bundle.turnSequence).toBe(1)
    expect(bundle.bundleHash).toBeTruthy()
    expect(typeof bundle.totalGenerationTimeMs).toBe('number')
  })

  it('throws on empty proof bundle request', async () => {
    const manager = new ProverManager({ mode: 'local' })
    await expect(manager.generateTurnProofBundle('sess-1', 1, [])).rejects.toThrow('At least one proof request')
  })

  it('verifies a turn proof bundle', async () => {
    const manager = new ProverManager({ mode: 'local' })
    const bundle = await manager.generateTurnProofBundle('sess-1', 1, [
      { circuit: 'MandateBound' as CircuitId, inputs: {} },
    ])

    const { valid, results } = await manager.verifyTurnProofBundle(bundle)
    expect(valid).toBe(true)
    expect(results).toHaveLength(1)
    expect(results[0]?.valid).toBe(true)
  })

  it('detects tampered bundle hash', async () => {
    const manager = new ProverManager({ mode: 'local' })
    const bundle = await manager.generateTurnProofBundle('sess-1', 1, [
      { circuit: 'MandateBound' as CircuitId, inputs: {} },
    ])

    bundle.bundleHash = 'tampered-hash'
    await expect(manager.verifyTurnProofBundle(bundle)).rejects.toThrow('hash mismatch')
  })
})
