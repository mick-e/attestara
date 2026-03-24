import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import type { ProverConfig } from './config.js'
import { CircuitManager } from './circuits.js'
import { RedisProverCache, InMemoryProverCache, type ProverCache } from './cache.js'
import { WorkerPool } from './workers/pool.js'
import { healthRoutes } from './routes/health.js'
import { proveRoutes } from './routes/prove.js'
import { ProverError } from './errors.js'

export interface ProverServerOptions {
  config: ProverConfig
  logger?: boolean
}

export async function buildProverServer(options: ProverServerOptions) {
  const { config } = options

  const app = Fastify({
    logger: options.logger !== false
      ? {
          level: config.NODE_ENV === 'production' ? 'info' : 'debug',
          serializers: {
            req(request) {
              return {
                method: request.method,
                url: request.url,
                requestId: request.id,
              }
            },
          },
        }
      : false,
    genReqId: () => crypto.randomUUID(),
  })

  // CORS
  await app.register(cors, {
    origin: true, // Prover is an internal service; accept all origins
  })

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Initialize circuit manager
  const circuitManager = new CircuitManager(config.CIRCUIT_DIR)
  await circuitManager.initialize()

  // Initialize cache (Redis with in-memory fallback)
  let cache: ProverCache
  if (config.NODE_ENV === 'test') {
    cache = new InMemoryProverCache()
  } else {
    const redisCache = await RedisProverCache.create(config.REDIS_URL)
    if (redisCache) {
      cache = redisCache
      if (app.log) app.log.info('Redis cache connected')
    } else {
      cache = new InMemoryProverCache()
      if (app.log) app.log.warn('Redis unavailable, using in-memory cache')
    }
  }

  // Initialize worker pool
  const workerPool = new WorkerPool(config.WORKER_POOL_SIZE)
  await workerPool.initialize()

  const deps = { circuitManager, cache, workerPool }

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ProverError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: request.id,
      })
    }

    const fastifyError = error as { statusCode?: number; code?: string; message: string }
    const statusCode = fastifyError.statusCode ?? 500
    const response = {
      code: fastifyError.code ?? 'INTERNAL_ERROR',
      message: statusCode >= 500 ? 'Internal server error' : fastifyError.message,
      requestId: request.id,
    }

    if (statusCode >= 500 && app.log) {
      app.log.error({ err: error, requestId: request.id }, 'Unhandled error')
    }

    reply.status(statusCode).send(response)
  })

  // Register routes
  await app.register(healthRoutes(deps), { prefix: '/api/v1' })
  await app.register(proveRoutes(deps))

  // Graceful shutdown
  app.addHook('onClose', async () => {
    await workerPool.shutdown()
    await cache.close()
  })

  return app
}
