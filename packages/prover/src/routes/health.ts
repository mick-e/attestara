import type { FastifyPluginAsync } from 'fastify'
import type { CircuitManager } from '../circuits.js'
import type { ProverCache } from '../cache.js'
import type { WorkerPool } from '../workers/pool.js'

export interface HealthDeps {
  circuitManager: CircuitManager
  cache: ProverCache
  workerPool: WorkerPool
}

export const healthRoutes = (deps: HealthDeps): FastifyPluginAsync => async (app) => {
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      circuits: {
        loaded: deps.circuitManager.loadedCount,
        available: deps.circuitManager.getAvailableCircuits().filter(c => c.available).map(c => c.id),
      },
      cache: {
        connected: deps.cache.isConnected(),
      },
      workers: {
        active: deps.workerPool.activeWorkers,
        busy: deps.workerPool.busyWorkers,
        queued: deps.workerPool.queuedTasks,
      },
    }
  })

  app.get('/circuits', async () => {
    return {
      circuits: deps.circuitManager.getAvailableCircuits(),
    }
  })
}
