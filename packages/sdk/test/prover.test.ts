import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProverManager } from '../src/prover/index.js'
import { LocalProver } from '../src/prover/local.js'
import { RemoteProver } from '../src/prover/remote.js'
import { TestProver } from '../src/testing/test-prover.js'
import { CircuitId } from '@attestara/types'

describe('TestProver', () => {
  const prover = new TestProver()

  it('should generate a deterministic fake proof', async () => {
    const result = await prover.generateProof(CircuitId.MANDATE_BOUND, {
      maxValue: 10000n,
      domain: 'procurement',
    })

    expect(result.circuitId).toBe(CircuitId.MANDATE_BOUND)
    expect(result.circuitVersion).toBe('v1-test')
    expect(result.proof.protocol).toBe('groth16')
    expect(result.proof.curve).toBe('bn128')
    expect(result.proof.pi_a).toHaveLength(2)
    expect(result.proof.pi_b).toHaveLength(2)
    expect(result.proof.pi_c).toHaveLength(2)
    expect(result.publicSignals.signals).toContain('10000')
    expect(result.publicSignals.signals).toContain('procurement')
    expect(result.generationTimeMs).toBe(10)
  })

  it('should verify any proof as valid', async () => {
    const proof = await prover.generateProof(CircuitId.PARAMETER_RANGE, {
      value: 500n,
    })
    const result = await prover.verifyProof(CircuitId.PARAMETER_RANGE, proof)

    expect(result.valid).toBe(true)
    expect(result.circuitId).toBe(CircuitId.PARAMETER_RANGE)
    expect(result.circuitVersion).toBe('v1-test')
    expect(result.verificationTimeMs).toBe(1)
  })
})

describe('LocalProver', () => {
  it('should throw when no circuit directory is configured', async () => {
    const prover = new LocalProver()
    await expect(
      prover.generateProof(CircuitId.MANDATE_BOUND, { value: 1n })
    ).rejects.toThrow('Circuit directory not configured')
  })

  it('should throw for verify when no circuit directory is configured', async () => {
    const prover = new LocalProver()
    const fakeProof = await new TestProver().generateProof(CircuitId.MANDATE_BOUND, {})
    await expect(
      prover.verifyProof(CircuitId.MANDATE_BOUND, fakeProof)
    ).rejects.toThrow('Circuit directory not configured')
  })

  it('should throw not-yet-implemented when circuit dir is set', async () => {
    const prover = new LocalProver('/some/circuits')
    await expect(
      prover.generateProof(CircuitId.MANDATE_BOUND, { value: 1n })
    ).rejects.toThrow('Real proof generation not yet implemented')
  })
})

describe('ProverManager', () => {
  it('should create a local prover in local mode', () => {
    const manager = new ProverManager({ mode: 'local' })
    // Should succeed creating, but fail generating (no circuits)
    expect(manager).toBeDefined()
  })

  it('should create a remote prover in remote mode', () => {
    const manager = new ProverManager({ mode: 'remote', remoteUrl: 'http://localhost:3000' })
    expect(manager).toBeDefined()
  })

  it('should delegate to local prover', async () => {
    const manager = new ProverManager({ mode: 'local' })
    await expect(
      manager.generateProof(CircuitId.MANDATE_BOUND, { value: 1n })
    ).rejects.toThrow('Circuit directory not configured')
  })
})

describe('RemoteProver', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('should send correct request for MandateBound circuit', async () => {
    const fakeResponse = {
      proof: { pi_a: ['0x1', '0x2'], pi_b: [['0x3', '0x4'], ['0x5', '0x6']], pi_c: ['0x7', '0x8'], protocol: 'groth16', curve: 'bn128' },
      publicSignals: { signals: ['10000'] },
      circuitId: 'MandateBound',
      circuitVersion: 'v1',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResponse,
    })

    const prover = new RemoteProver('http://prover.test:3000')
    const result = await prover.generateProof(CircuitId.MANDATE_BOUND, {
      maxValue: 10000n,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://prover.test:3000/prove/mandate-bound',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    // Check the body was serialized correctly (bigint → string)
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.inputs.maxValue).toBe('10000')

    expect(result.circuitId).toBe('MandateBound')
    expect(result.generationTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('should throw on unknown circuit', async () => {
    const prover = new RemoteProver('http://prover.test:3000')
    await expect(
      prover.generateProof('UnknownCircuit' as CircuitId, {})
    ).rejects.toThrow('Unknown circuit: UnknownCircuit')
  })

  it('should throw on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    })

    const prover = new RemoteProver('http://prover.test:3000')
    await expect(
      prover.generateProof(CircuitId.MANDATE_BOUND, {})
    ).rejects.toThrow('Proof generation failed: Internal Server Error')
  })

  it('should send verify request correctly', async () => {
    const fakeVerifyResponse = {
      valid: true,
      circuitId: 'MandateBound',
      circuitVersion: 'v1',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeVerifyResponse,
    })

    const prover = new RemoteProver('http://prover.test:3000')
    const proof = await new TestProver().generateProof(CircuitId.MANDATE_BOUND, {})
    const result = await prover.verifyProof(CircuitId.MANDATE_BOUND, proof)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://prover.test:3000/verify',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.valid).toBe(true)
    expect(result.verificationTimeMs).toBeGreaterThanOrEqual(0)
  })
})
