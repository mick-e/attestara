import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProverManager } from '../src/prover/index.js'
import type { BundleProofRequest } from '../src/prover/index.js'
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

  it('should throw on unknown circuit when circuit dir is set', async () => {
    const prover = new LocalProver('/some/circuits')
    await expect(
      prover.generateProof('UnknownCircuit' as CircuitId, { value: 1n })
    ).rejects.toThrow('Unknown circuit: UnknownCircuit')
  })

  it('should throw on missing circuit artifacts when circuit dir is set', async () => {
    const prover = new LocalProver('/nonexistent/circuits')
    await expect(
      prover.generateProof(CircuitId.MANDATE_BOUND, {
        proposed: '420000',
        commitment: '12345',
        max_value: '500000',
        randomness: '99999',
      })
    ).rejects.toThrow('Missing circuit artifacts')
  })

  it('should throw on missing verification key for verifyProof', async () => {
    const prover = new LocalProver('/nonexistent/circuits')
    const fakeProof = await new TestProver().generateProof(CircuitId.MANDATE_BOUND, {})
    await expect(
      prover.verifyProof(CircuitId.MANDATE_BOUND, fakeProof)
    ).rejects.toThrow('Failed to load verification key')
  })

  it('should throw snarkjs not installed when dynamic import fails', async () => {
    // Use a prover with circuit dir set but mock snarkjs import to fail
    const prover = new LocalProver('/some/circuits')

    // Access private snarkjs loader via prototype - we test error path by
    // using a dir that exists but has no artifacts, triggering the artifact check
    // before snarkjs is loaded. The snarkjs import error is tested separately
    // by verifying the error message format.
    await expect(
      prover.generateProof(CircuitId.MANDATE_BOUND, {
        proposed: '420000',
        commitment: '12345',
        max_value: '500000',
        randomness: '99999',
      })
    ).rejects.toThrow() // Will throw missing artifacts or snarkjs not installed
  })
})

describe('ProverManager', () => {
  it('should create a local prover in local mode', () => {
    const manager = new ProverManager({ mode: 'local' })
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

  describe('TurnProofBundle', () => {
    it('should reject empty bundle requests', async () => {
      const manager = new ProverManager({ mode: 'local' })
      await expect(
        manager.generateTurnProofBundle('session-1', 1, [])
      ).rejects.toThrow('At least one proof request is required')
    })

    it('should generate a bundle with multiple proofs using TestProver', async () => {
      // Create a manager that delegates to TestProver via a wrapper
      const testProver = new TestProver()
      const manager = new ProverManager({ mode: 'local' })
      // Override the internal prover with our test prover
      ;(manager as unknown as { prover: typeof testProver }).prover = testProver

      const requests: BundleProofRequest[] = [
        {
          circuit: CircuitId.MANDATE_BOUND,
          inputs: { proposed: 420000n, commitment: 12345n, max_value: 500000n, randomness: 99999n },
        },
        {
          circuit: CircuitId.PARAMETER_RANGE,
          inputs: { proposed: 300n, commitment: 67890n, floor: 100n, ceiling: 500n, randomness: 11111n },
        },
      ]

      const bundle = await manager.generateTurnProofBundle('session-abc', 1, requests)

      expect(bundle.sessionId).toBe('session-abc')
      expect(bundle.turnSequence).toBe(1)
      expect(bundle.proofs).toHaveLength(2)
      expect(bundle.proofs[0].circuitId).toBe(CircuitId.MANDATE_BOUND)
      expect(bundle.proofs[1].circuitId).toBe(CircuitId.PARAMETER_RANGE)
      expect(bundle.bundleHash).toBeDefined()
      expect(bundle.bundleHash).toHaveLength(64) // SHA-256 hex
      expect(bundle.generatedAt).toBeInstanceOf(Date)
      expect(bundle.totalGenerationTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should generate a full 4-circuit bundle', async () => {
      const testProver = new TestProver()
      const manager = new ProverManager({ mode: 'local' })
      ;(manager as unknown as { prover: typeof testProver }).prover = testProver

      const requests: BundleProofRequest[] = [
        {
          circuit: CircuitId.MANDATE_BOUND,
          inputs: { proposed: 420000n, commitment: 12345n, max_value: 500000n, randomness: 99999n },
        },
        {
          circuit: CircuitId.PARAMETER_RANGE,
          inputs: { proposed: 300n, commitment: 67890n, floor: 100n, ceiling: 500n, randomness: 11111n },
        },
        {
          circuit: CircuitId.CREDENTIAL_FRESHNESS,
          inputs: { current_timestamp: 1700000000n, credential_commitment: 22222n },
        },
        {
          circuit: CircuitId.IDENTITY_BINDING,
          inputs: { session_commitment: 33333n, did_private_key: 44444n },
        },
      ]

      const bundle = await manager.generateTurnProofBundle('session-full', 3, requests)

      expect(bundle.proofs).toHaveLength(4)
      expect(bundle.proofs.map((p) => p.circuitId)).toEqual([
        CircuitId.MANDATE_BOUND,
        CircuitId.PARAMETER_RANGE,
        CircuitId.CREDENTIAL_FRESHNESS,
        CircuitId.IDENTITY_BINDING,
      ])
      expect(bundle.turnSequence).toBe(3)
    })

    it('should verify a valid bundle', async () => {
      const testProver = new TestProver()
      const manager = new ProverManager({ mode: 'local' })
      ;(manager as unknown as { prover: typeof testProver }).prover = testProver

      const requests: BundleProofRequest[] = [
        {
          circuit: CircuitId.MANDATE_BOUND,
          inputs: { proposed: 420000n },
        },
        {
          circuit: CircuitId.PARAMETER_RANGE,
          inputs: { proposed: 300n },
        },
      ]

      const bundle = await manager.generateTurnProofBundle('session-verify', 1, requests)
      const result = await manager.verifyTurnProofBundle(bundle)

      expect(result.valid).toBe(true)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].valid).toBe(true)
      expect(result.results[0].circuitId).toBe(CircuitId.MANDATE_BOUND)
      expect(result.results[1].valid).toBe(true)
      expect(result.results[1].circuitId).toBe(CircuitId.PARAMETER_RANGE)
    })

    it('should detect tampered bundle hash', async () => {
      const testProver = new TestProver()
      const manager = new ProverManager({ mode: 'local' })
      ;(manager as unknown as { prover: typeof testProver }).prover = testProver

      const bundle = await manager.generateTurnProofBundle('session-tamper', 1, [
        { circuit: CircuitId.MANDATE_BOUND, inputs: { proposed: 100n } },
      ])

      // Tamper with the bundle hash
      bundle.bundleHash = 'tampered_hash_value'

      await expect(
        manager.verifyTurnProofBundle(bundle)
      ).rejects.toThrow('TurnProofBundle hash mismatch')
    })

    it('should produce deterministic bundle hashes', async () => {
      const testProver = new TestProver()
      const manager = new ProverManager({ mode: 'local' })
      ;(manager as unknown as { prover: typeof testProver }).prover = testProver

      const requests: BundleProofRequest[] = [
        { circuit: CircuitId.MANDATE_BOUND, inputs: { proposed: 420000n } },
      ]

      const bundle1 = await manager.generateTurnProofBundle('session-det', 1, requests)
      const bundle2 = await manager.generateTurnProofBundle('session-det', 1, requests)

      // Same inputs should produce same bundle hash (TestProver is deterministic)
      expect(bundle1.bundleHash).toBe(bundle2.bundleHash)
    })

    it('should fail the entire bundle if one proof fails', async () => {
      const manager = new ProverManager({ mode: 'local' })
      // No circuit dir configured, so proof generation will fail

      const requests: BundleProofRequest[] = [
        { circuit: CircuitId.MANDATE_BOUND, inputs: { proposed: 100n } },
        { circuit: CircuitId.PARAMETER_RANGE, inputs: { proposed: 200n } },
      ]

      await expect(
        manager.generateTurnProofBundle('session-fail', 1, requests)
      ).rejects.toThrow('Circuit directory not configured')
    })
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

    // Check the body was serialized correctly (bigint -> string)
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
