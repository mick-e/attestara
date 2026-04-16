import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock opossum before importing the module under test
vi.mock('opossum', () => {
  return {
    default: class MockCircuitBreaker {
      private fn: (...args: any[]) => any
      private opts: any
      private failCount = 0
      private totalCount = 0

      constructor(fn: (...args: any[]) => any, opts: any) {
        this.fn = fn
        this.opts = opts
      }

      async fire(...args: any[]) {
        this.totalCount++
        try {
          const result = await this.fn(...args)
          return result
        } catch (err) {
          this.failCount++
          const errorRate = (this.failCount / this.totalCount) * 100
          const threshold = this.opts.errorThresholdPercentage ?? 50
          const volume = this.opts.volumeThreshold ?? 20

          // If circuit should be open, call fallback
          if (this.totalCount >= volume && errorRate >= threshold && this.opts.fallback) {
            return this.opts.fallback(...args)
          }
          throw err
        }
      }
    },
  }
})

import {
  createProverCircuitBreaker,
  ProverUnavailableError,
  cacheProof,
  getCachedProof,
  clearProofCache,
  type ProverRequest,
  type ProverResponse,
} from '../src/utils/circuit-breaker.js'

describe('Circuit Breaker', () => {
  beforeEach(() => {
    clearProofCache()
    vi.restoreAllMocks()
  })

  describe('ProverUnavailableError', () => {
    it('has correct code and statusCode', () => {
      const err = new ProverUnavailableError()
      expect(err.code).toBe('PROVER_UNAVAILABLE')
      expect(err.statusCode).toBe(503)
      expect(err.message).toBe('Prover service is unavailable')
    })

    it('accepts custom message', () => {
      const err = new ProverUnavailableError('custom message')
      expect(err.message).toBe('custom message')
    })
  })

  describe('Proof Cache', () => {
    const request: ProverRequest = {
      circuitType: 'MandateBound',
      inputs: { maxValue: 500000, currentValue: 400000 },
    }
    const response: ProverResponse = {
      proof: { pi_a: ['1', '2'] },
      publicSignals: ['1', '0'],
    }

    it('stores and retrieves cached proofs', () => {
      cacheProof(request, response)
      expect(getCachedProof(request)).toEqual(response)
    })

    it('returns undefined for cache miss', () => {
      expect(getCachedProof({ circuitType: 'x', inputs: {} })).toBeUndefined()
    })

    it('clearProofCache empties the cache', () => {
      cacheProof(request, response)
      clearProofCache()
      expect(getCachedProof(request)).toBeUndefined()
    })
  })

  describe('createProverCircuitBreaker', () => {
    it('successful call caches the result', async () => {
      // Mock fetch to return success
      const mockResponse: ProverResponse = {
        proof: { pi_a: ['1'] },
        publicSignals: ['0'],
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }))

      const client = createProverCircuitBreaker({
        proverUrl: 'http://localhost:3002',
        proverSecret: 'test-secret',
      })

      const result = await client.prove({
        circuitType: 'ParameterRange',
        inputs: { value: 100 },
      })

      expect(result).toEqual(mockResponse)

      // Check it was cached
      const cached = getCachedProof({
        circuitType: 'ParameterRange',
        inputs: { value: 100 },
      })
      expect(cached).toEqual(mockResponse)

      vi.unstubAllGlobals()
    })

    it('after repeated failures, falls back to cached proof', async () => {
      // Pre-cache a proof for fallback
      const request: ProverRequest = { circuitType: 'test', inputs: { x: 1 } }
      const cachedResponse: ProverResponse = {
        proof: { fallback: true },
        publicSignals: ['1'],
      }
      cacheProof(request, cachedResponse)

      // Mock fetch to always fail
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      }))

      const client = createProverCircuitBreaker({
        proverUrl: 'http://localhost:3002',
        proverSecret: 'test-secret',
      })

      // Fire enough failures to trigger the circuit breaker (volumeThreshold=20)
      for (let i = 0; i < 19; i++) {
        try {
          await client.prove(request)
        } catch {
          // expected failures
        }
      }

      // The 20th+ call should use fallback (cached proof)
      const result = await client.prove(request)
      expect(result.cached).toBe(true)
      expect(result.proof).toEqual({ fallback: true })

      vi.unstubAllGlobals()
    })

    it('without cache, fallback throws ProverUnavailableError', async () => {
      const request: ProverRequest = { circuitType: 'nocache', inputs: {} }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('error'),
      }))

      const client = createProverCircuitBreaker({
        proverUrl: 'http://localhost:3002',
        proverSecret: 'test-secret',
      })

      // Trigger enough failures
      for (let i = 0; i < 19; i++) {
        try {
          await client.prove(request)
        } catch {
          // expected
        }
      }

      // 20th call: fallback with no cache should throw 503
      await expect(client.prove(request)).rejects.toThrow(ProverUnavailableError)

      vi.unstubAllGlobals()
    })
  })
})
