/**
 * Circuit breaker wrapper around prover HTTP calls.
 *
 * Uses opossum to protect the relay from cascading failures when the
 * prover service is unhealthy. Configuration:
 *   - 50% error rate over 20 requests triggers the circuit to open
 *   - 30s reset timeout before half-open probe
 *   - Fallback: returns cached proof if available, else 503
 */

import CircuitBreaker from 'opossum'

export interface ProverRequest {
  circuitType: string
  inputs: Record<string, unknown>
}

export interface ProverResponse {
  proof: Record<string, unknown>
  publicSignals: string[]
  cached?: boolean
}

export interface ProverCallOptions {
  /** The prover service base URL (e.g. http://localhost:3002) */
  proverUrl: string
  /** Shared secret for service-to-service auth */
  proverSecret: string
}

/**
 * Error thrown when the circuit breaker is open and no fallback is available.
 */
export class ProverUnavailableError extends Error {
  readonly code = 'PROVER_UNAVAILABLE'
  readonly statusCode = 503

  constructor(message = 'Prover service is unavailable') {
    super(message)
    this.name = 'ProverUnavailableError'
  }
}

/**
 * Raw function that calls the prover HTTP API.
 */
async function callProver(
  request: ProverRequest,
  options: ProverCallOptions,
): Promise<ProverResponse> {
  const url = `${options.proverUrl}/api/v1/prove`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.proverSecret}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Prover returned ${response.status}: ${body}`)
  }

  return response.json() as Promise<ProverResponse>
}

/**
 * Simple in-memory proof cache keyed by circuit type + inputs hash.
 */
const proofCache = new Map<string, ProverResponse>()

function cacheKey(req: ProverRequest): string {
  return `${req.circuitType}:${JSON.stringify(req.inputs)}`
}

/**
 * Store a proof response in the fallback cache.
 */
export function cacheProof(req: ProverRequest, res: ProverResponse): void {
  proofCache.set(cacheKey(req), res)
}

/**
 * Look up a cached proof for the given request.
 */
export function getCachedProof(req: ProverRequest): ProverResponse | undefined {
  return proofCache.get(cacheKey(req))
}

/**
 * Clear the proof cache (for testing).
 */
export function clearProofCache(): void {
  proofCache.clear()
}

/**
 * Create a circuit-breaker-protected prover client.
 *
 * @returns An object with a `prove()` method that wraps prover HTTP calls
 *   with opossum circuit breaker protection.
 */
export function createProverCircuitBreaker(options: ProverCallOptions) {
  const breaker = new CircuitBreaker(
    (request: ProverRequest) => callProver(request, options),
    {
      // Open circuit after 50% failures over 20 requests
      errorThresholdPercentage: 50,
      volumeThreshold: 20,
      // 30s before attempting a half-open probe
      resetTimeout: 30_000,
      // Timeout individual requests after 30s
      timeout: 30_000,
    },
  )

  // Fallback: return cached proof or throw 503
  breaker.fallback((request: ProverRequest) => {
    const cached = getCachedProof(request)
    if (cached) {
      return { ...cached, cached: true }
    }
    throw new ProverUnavailableError()
  })

  return {
    /**
     * Send a proof request to the prover, protected by the circuit breaker.
     * On success, the result is cached for fallback use.
     */
    async prove(request: ProverRequest): Promise<ProverResponse> {
      const result = await breaker.fire(request) as ProverResponse
      // Cache successful responses for fallback
      if (!result.cached) {
        cacheProof(request, result)
      }
      return result
    },

    /** The underlying opossum circuit breaker (for metrics/inspection). */
    breaker,
  }
}
