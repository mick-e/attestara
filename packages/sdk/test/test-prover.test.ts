import { describe, it, expect } from 'vitest'
import { TestProver } from '../src/testing/test-prover.js'
import type { CircuitId } from '@attestara/types'

describe('TestProver', () => {
  const prover = new TestProver()
  const CIRCUIT: CircuitId = 'MandateBound' as CircuitId

  describe('generateProof', () => {
    it('returns a valid proof structure', async () => {
      const result = await prover.generateProof(CIRCUIT, { max_value: 500000n })

      expect(result.proof.pi_a).toHaveLength(2)
      expect(result.proof.pi_b).toHaveLength(2)
      expect(result.proof.pi_c).toHaveLength(2)
      expect(result.proof.protocol).toBe('groth16')
      expect(result.proof.curve).toBe('bn128')
    })

    it('includes circuit metadata', async () => {
      const result = await prover.generateProof(CIRCUIT, {})
      expect(result.circuitId).toBe(CIRCUIT)
      expect(result.circuitVersion).toBe('v1-test')
      expect(result.generationTimeMs).toBe(10)
    })

    it('maps input values to public signals', async () => {
      const result = await prover.generateProof(CIRCUIT, {
        max_value: 500000n,
        randomness: 'abc',
      })
      expect(result.publicSignals.signals).toContain('500000')
      expect(result.publicSignals.signals).toContain('abc')
    })

    it('handles empty inputs', async () => {
      const result = await prover.generateProof(CIRCUIT, {})
      expect(result.publicSignals.signals).toHaveLength(0)
    })
  })

  describe('verifyProof', () => {
    it('always returns valid for test proofs', async () => {
      const proof = await prover.generateProof(CIRCUIT, { x: 1n })
      const result = await prover.verifyProof(CIRCUIT, proof)

      expect(result.valid).toBe(true)
      expect(result.circuitId).toBe(CIRCUIT)
      expect(result.circuitVersion).toBe('v1-test')
      expect(result.verificationTimeMs).toBe(1)
    })

    it('preserves circuit version from proof', async () => {
      const proof = await prover.generateProof('ParameterRange' as CircuitId, {})
      const result = await prover.verifyProof('ParameterRange' as CircuitId, proof)

      expect(result.circuitVersion).toBe(proof.circuitVersion)
    })
  })
})
