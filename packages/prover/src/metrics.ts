/**
 * Prometheus metrics for the Attestara prover service.
 *
 * Registers counters, histograms, and gauges, hooks into Fastify
 * request lifecycle, and exposes a GET /metrics endpoint.
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client'

const registry = new Registry()

collectDefaultMetrics({ register: registry })

// -- HTTP metrics -------------------------------------------------------------

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
})

export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route'] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [registry],
})

// -- Prover-specific metrics --------------------------------------------------

export const proverQueueDepth = new Gauge({
  name: 'prover_queue_depth',
  help: 'Number of proof generation jobs in the queue',
  registers: [registry],
})

export const proverCacheHits = new Counter({
  name: 'prover_cache_hits',
  help: 'Total number of prover cache hits',
  registers: [registry],
})

export const proverCacheMisses = new Counter({
  name: 'prover_cache_misses',
  help: 'Total number of prover cache misses',
  registers: [registry],
})

/**
 * Return the shared Prometheus registry.
 */
export function getRegistry(): Registry {
  return registry
}

/**
 * Fastify plugin that:
 * 1. Registers onRequest/onResponse hooks to populate HTTP metrics.
 * 2. Registers GET /metrics endpoint returning Prometheus text format.
 */
export const metricsPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('onRequest', async (request) => {
    (request as any).__metricsStart = process.hrtime.bigint()
  })

  app.addHook('onResponse', async (request, reply) => {
    const start = (request as any).__metricsStart as bigint | undefined
    const route = request.routeOptions?.url ?? request.url
    const method = request.method
    const status = String(reply.statusCode)

    httpRequestsTotal.inc({ method, route, status })

    if (start !== undefined) {
      const durationNs = Number(process.hrtime.bigint() - start)
      const durationMs = durationNs / 1e6
      httpRequestDurationMs.observe({ method, route }, durationMs)
    }
  })

  app.get('/metrics', async (_request, reply) => {
    const metrics = await registry.metrics()
    reply.type(registry.contentType).send(metrics)
  })
}
