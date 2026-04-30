import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RemoteProver } from '../src/prover/remote.js'
import type { CircuitId, ProofResult } from '@attestara/types'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const BASE_URL = 'http://localhost:3002'
const CIRCUIT: CircuitId = 'MandateBound' as CircuitId

const mockProofResult: Omit<ProofResult, 'generationTimeMs'> = {
  proof: {
    pi_a: ['1', '2'],
    pi_b: [['3', '4'], ['5', '6']],
    pi_c: ['7', '8'],
    protocol: 'groth16',
    curve: 'bn128',
  },
  publicSignals: { signals: ['100'] },
  circuitId: CIRCUIT,
  circuitVersion: '1.0.0',
}

beforeEach(() => {
  mockFetch.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RemoteProver', () => {
  describe('generateProof', () => {
    it('sends proof request to correct endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProofResult,
      })

      const prover = new RemoteProver(BASE_URL)
      const result = await prover.generateProof(CIRCUIT, { max_value: 500000n, randomness: 'abc' })

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/prove/mandate-bound`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      expect(result.proof).toEqual(mockProofResult.proof)
      expect(typeof result.generationTimeMs).toBe('number')
    })

    it('throws on unknown circuit', async () => {
      const prover = new RemoteProver(BASE_URL)
      await expect(prover.generateProof('UnknownCircuit' as CircuitId, {})).rejects.toThrow('Unknown circuit')
    })

    it('throws on failed HTTP response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      })

      const prover = new RemoteProver(BASE_URL)
      await expect(prover.generateProof(CIRCUIT, {})).rejects.toThrow('Proof generation failed')
    })

    it('serializes bigint inputs to strings', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProofResult,
      })

      const prover = new RemoteProver(BASE_URL)
      await prover.generateProof(CIRCUIT, { max_value: 500000n })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.inputs.max_value).toBe('500000')
    })
  })

  describe('verifyProof', () => {
    it('sends verification request to /verify', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ valid: true, circuitId: CIRCUIT, circuitVersion: '1.0.0' }),
      })

      const prover = new RemoteProver(BASE_URL)
      const fullResult = { ...mockProofResult, generationTimeMs: 50 }
      const result = await prover.verifyProof(CIRCUIT, fullResult)

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/verify`,
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result.valid).toBe(true)
      expect(typeof result.verificationTimeMs).toBe('number')
    })

    it('throws on failed verification response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      })

      const prover = new RemoteProver(BASE_URL)
      const fullResult = { ...mockProofResult, generationTimeMs: 50 }
      await expect(prover.verifyProof(CIRCUIT, fullResult)).rejects.toThrow('Verification failed')
    })
  })
})
