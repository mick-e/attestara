import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { healthRoutes } from '../src/routes/health.js'
import { proveRoutes } from '../src/routes/prove.js'
import { InMemoryProverCache } from '../src/cache.js'
import { CircuitManager } from '../src/circuits.js'
import { ProverError } from '../src/errors.js'
import type { WorkerPool } from '../src/workers/pool.js'

// Mock worker pool that returns deterministic results
function createMockWorkerPool(opts?: { failGeneration?: boolean; failVerification?: boolean }): WorkerPool {
  return {
    activeWorkers: 2,
    busyWorkers: 0,
    queuedTasks: 0,
    initialize: vi.fn(),
    shutdown: vi.fn(),
    submitProofGeneration: vi.fn(async (circuitId: string) => {
      if (opts?.failGeneration) {
        throw new ProverError('PROOF_GENERATION_FAILED', 'Mock generation failure', 500)
      }
      return {
        proof: {
          pi_a: ['1', '2', '1'],
          pi_b: [['3', '4'], ['5', '6'], ['1', '0']],
          pi_c: ['7', '8', '1'],
          protocol: 'groth16',
          curve: 'bn128',
        },
        publicSignals: ['12345', '42000'],
        durationMs: 50,
      }
    }),
    submitProofVerification: vi.fn(async () => {
      if (opts?.failVerification) {
        throw new ProverError('PROOF_VERIFICATION_FAILED', 'Mock verification failure', 500)
      }
      return { valid: true, durationMs: 5 }
    }),
  } as unknown as WorkerPool
}

// Mock circuit manager that reports circuits as available
function createMockCircuitManager(): CircuitManager {
  const mgr = new CircuitManager('./test-circuits')
  // Override to pretend circuits are loaded
  ;(mgr as any).artifacts = new Map([
    ['MandateBound', { wasmPath: '/fake/mb.wasm', zkeyPath: '/fake/mb.zkey', verificationKey: { protocol: 'groth16' } }],
    ['ParameterRange', { wasmPath: '/fake/pr.wasm', zkeyPath: '/fake/pr.zkey', verificationKey: { protocol: 'groth16' } }],
    ['CredentialFreshness', { wasmPath: '/fake/cf.wasm', zkeyPath: '/fake/cf.zkey', verificationKey: { protocol: 'groth16' } }],
    ['IdentityBinding', { wasmPath: '/fake/ib.wasm', zkeyPath: '/fake/ib.zkey', verificationKey: { protocol: 'groth16' } }],
  ])
  return mgr
}

async function buildTestApp(overrides?: { workerPool?: WorkerPool; circuitManager?: CircuitManager }) {
  const cache = new InMemoryProverCache()
  const circuitManager = overrides?.circuitManager ?? createMockCircuitManager()
  const workerPool = overrides?.workerPool ?? createMockWorkerPool()

  const deps = { circuitManager, cache, workerPool }

  const app = Fastify({ logger: false })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ProverError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: request.id,
      })
    }
    const statusCode = error.statusCode ?? 500
    reply.status(statusCode).send({
      code: 'INTERNAL_ERROR',
      message: statusCode >= 500 ? 'Internal server error' : error.message,
      requestId: request.id,
    })
  })

  await app.register(healthRoutes(deps), { prefix: '/api/v1' })
  await app.register(proveRoutes(deps))

  return app
}

describe('Health endpoints', () => {
  it('GET /api/v1/health returns status info', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
    expect(body.circuits.loaded).toBe(4)
    expect(body.workers.active).toBe(2)
    expect(body.cache.connected).toBe(true)
  })

  it('GET /api/v1/circuits returns circuit metadata', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/circuits' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.circuits).toHaveLength(4)
    expect(body.circuits.map((c: any) => c.id)).toContain('MandateBound')
    expect(body.circuits.map((c: any) => c.id)).toContain('ParameterRange')
    expect(body.circuits.map((c: any) => c.id)).toContain('CredentialFreshness')
    expect(body.circuits.map((c: any) => c.id)).toContain('IdentityBinding')
    for (const c of body.circuits) {
      expect(c.available).toBe(true)
      expect(c.version).toBe('1.0.0')
      expect(c.constraintCount).toBeGreaterThan(0)
    }
  })
})

describe('Prove endpoints', () => {
  it('POST /prove/mandate-bound generates a proof', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/prove/mandate-bound',
      payload: {
        inputs: {
          commitment: '12345',
          proposed: '42000',
          max_value: '50000',
          randomness: '99999',
        },
      },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.proof).toBeDefined()
    expect(body.proof.protocol).toBe('groth16')
    expect(body.proof.curve).toBe('bn128')
    expect(body.publicSignals).toBeDefined()
    expect(body.circuitId).toBe('MandateBound')
    expect(body.circuitVersion).toBe('1.0.0')
    expect(body.generationTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('POST /prove/parameter-range generates a proof', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/prove/parameter-range',
      payload: {
        inputs: {
          commitment_floor: '111',
          commitment_ceiling: '222',
          proposed: '150',
          floor_val: '100',
          ceiling_val: '200',
          r1: '333',
          r2: '444',
        },
      },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.circuitId).toBe('ParameterRange')
  })

  it('POST /prove/credential-freshness generates a proof', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/prove/credential-freshness',
      payload: {
        inputs: {
          credential_hash: '555',
          current_timestamp: '1700000000',
          issuance_timestamp: '1600000000',
          expiry_timestamp: '1800000000',
          credential_data_hash: '666',
          r: '777',
        },
      },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.circuitId).toBe('CredentialFreshness')
  })

  it('POST /prove/identity-binding generates a proof', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/prove/identity-binding',
      payload: {
        inputs: {
          did_public_key: ['111', '222'],
          session_commitment: '333',
          did_private_key: '444',
          session_id: '555',
          session_public_key: ['666', '777'],
        },
      },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.circuitId).toBe('IdentityBinding')
  })

  it('rejects invalid inputs with 400', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/prove/mandate-bound',
      payload: {
        inputs: {
          commitment: 'not-a-number',
          proposed: '42000',
          max_value: '50000',
          randomness: '99999',
        },
      },
    })
    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.payload)
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('rejects missing inputs with 400', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/prove/mandate-bound',
      payload: { inputs: {} },
    })
    expect(res.statusCode).toBe(400)
  })

  it('rejects malformed request body', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/prove/mandate-bound',
      payload: { notInputs: true },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 500 on proof generation failure', async () => {
    const failPool = createMockWorkerPool({ failGeneration: true })
    const app = await buildTestApp({ workerPool: failPool })
    const res = await app.inject({
      method: 'POST',
      url: '/prove/mandate-bound',
      payload: {
        inputs: {
          commitment: '12345',
          proposed: '42000',
          max_value: '50000',
          randomness: '99999',
        },
      },
    })
    expect(res.statusCode).toBe(500)
    const body = JSON.parse(res.payload)
    expect(body.code).toBe('PROOF_GENERATION_FAILED')
  })
})

describe('Verify endpoint', () => {
  it('POST /verify verifies a proof', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/verify',
      payload: {
        circuit: 'MandateBound',
        proof: {
          pi_a: ['1', '2'],
          pi_b: [['3', '4'], ['5', '6']],
          pi_c: ['7', '8'],
          protocol: 'groth16',
          curve: 'bn128',
        },
        publicSignals: {
          signals: ['12345', '42000'],
        },
      },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.valid).toBe(true)
    expect(body.circuitId).toBe('MandateBound')
    expect(body.verificationTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('rejects invalid circuit name', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/verify',
      payload: {
        circuit: 'NonexistentCircuit',
        proof: {
          pi_a: ['1', '2'],
          pi_b: [['3', '4'], ['5', '6']],
          pi_c: ['7', '8'],
          protocol: 'groth16',
          curve: 'bn128',
        },
        publicSignals: { signals: [] },
      },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('Bundle endpoint', () => {
  it('POST /prove/bundle generates all four proofs', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/prove/bundle',
      payload: {
        mandateBound: {
          commitment: '12345',
          proposed: '42000',
          max_value: '50000',
          randomness: '99999',
        },
        parameterRange: {
          commitment_floor: '111',
          commitment_ceiling: '222',
          proposed: '150',
          floor_val: '100',
          ceiling_val: '200',
          r1: '333',
          r2: '444',
        },
        credentialFreshness: {
          credential_hash: '555',
          current_timestamp: '1700000000',
          issuance_timestamp: '1600000000',
          expiry_timestamp: '1800000000',
          credential_data_hash: '666',
          r: '777',
        },
        identityBinding: {
          did_public_key: ['111', '222'],
          session_commitment: '333',
          did_private_key: '444',
          session_id: '555',
          session_public_key: ['666', '777'],
        },
      },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.mandateBound.circuitId).toBe('MandateBound')
    expect(body.parameterRange.circuitId).toBe('ParameterRange')
    expect(body.credentialFreshness.circuitId).toBe('CredentialFreshness')
    expect(body.identityBinding.circuitId).toBe('IdentityBinding')
    expect(body.totalGenerationTimeMs).toBeGreaterThanOrEqual(0)
  })
})
