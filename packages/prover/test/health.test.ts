import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import { healthRoutes } from '../src/routes/health.js'

function createMockDeps() {
  return {
    circuitManager: {
      loadedCount: 2,
      getAvailableCircuits: vi.fn(() => [
        { id: 'MandateBound', name: 'Mandate Bound', version: '1.0.0', constraintCount: 350, publicInputs: [], privateInputs: [], available: true },
        { id: 'ParameterRange', name: 'Parameter Range', version: '1.0.0', constraintCount: 550, publicInputs: [], privateInputs: [], available: false },
      ]),
    },
    cache: {
      isConnected: vi.fn(() => true),
      getProof: vi.fn(),
      setProof: vi.fn(),
      getVerificationKey: vi.fn(),
      setVerificationKey: vi.fn(),
      close: vi.fn(),
    },
    workerPool: {
      activeWorkers: 4,
      busyWorkers: 1,
      queuedTasks: 0,
    },
  }
}

describe('health routes', () => {
  it('returns health status with component info', async () => {
    const deps = createMockDeps()
    const app = Fastify()
    await app.register(healthRoutes(deps as any))

    const res = await app.inject({ method: 'GET', url: '/health' })
    const body = JSON.parse(res.body)

    expect(res.statusCode).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.circuits.loaded).toBe(2)
    expect(body.circuits.available).toEqual(['MandateBound'])
    expect(body.cache.connected).toBe(true)
    expect(body.workers.active).toBe(4)
    expect(body.workers.busy).toBe(1)
    expect(body.workers.queued).toBe(0)
  })

  it('returns circuit metadata', async () => {
    const deps = createMockDeps()
    const app = Fastify()
    await app.register(healthRoutes(deps as any))

    const res = await app.inject({ method: 'GET', url: '/circuits' })
    const body = JSON.parse(res.body)

    expect(res.statusCode).toBe(200)
    expect(body.circuits).toHaveLength(2)
    expect(body.circuits[0].id).toBe('MandateBound')
  })

  it('reports cache disconnected state', async () => {
    const deps = createMockDeps()
    deps.cache.isConnected = vi.fn(() => false)

    const app = Fastify()
    await app.register(healthRoutes(deps as any))

    const res = await app.inject({ method: 'GET', url: '/health' })
    const body = JSON.parse(res.body)

    expect(body.cache.connected).toBe(false)
  })
})
