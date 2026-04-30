import { describe, it, expect, beforeEach } from 'vitest'
import {
  getRegistry,
  httpRequestsTotal,
  httpRequestDurationMs,
  websocketActiveConnections,
  proverQueueDepth,
  proverCacheHits,
  proverCacheMisses,
} from '../src/metrics.js'

describe('Prometheus Metrics', () => {
  beforeEach(async () => {
    // Reset all custom metrics between tests
    httpRequestsTotal.reset()
    httpRequestDurationMs.reset()
    websocketActiveConnections.reset()
    proverQueueDepth.reset()
    proverCacheHits.reset()
    proverCacheMisses.reset()
  })

  it('getRegistry() returns a registry instance', () => {
    const registry = getRegistry()
    expect(registry).toBeDefined()
    expect(typeof registry.metrics).toBe('function')
  })

  it('/metrics output contains http_requests_total', async () => {
    httpRequestsTotal.inc({ method: 'GET', route: '/health', status: '200' })

    const registry = getRegistry()
    const output = await registry.metrics()

    expect(output).toContain('http_requests_total')
    expect(output).toContain('method="GET"')
    expect(output).toContain('route="/health"')
    expect(output).toContain('status="200"')
  })

  it('/metrics output contains http_request_duration_ms', async () => {
    httpRequestDurationMs.observe({ method: 'POST', route: '/v1/auth/login' }, 42)

    const registry = getRegistry()
    const output = await registry.metrics()

    expect(output).toContain('http_request_duration_ms')
  })

  it('websocket_active_connections gauge works', async () => {
    websocketActiveConnections.set(5)

    const registry = getRegistry()
    const output = await registry.metrics()

    expect(output).toContain('websocket_active_connections 5')
  })

  it('prover metrics are registered', async () => {
    proverQueueDepth.set(3)
    proverCacheHits.inc()
    proverCacheMisses.inc()
    proverCacheMisses.inc()

    const registry = getRegistry()
    const output = await registry.metrics()

    expect(output).toContain('prover_queue_depth 3')
    expect(output).toContain('prover_cache_hits')
    expect(output).toContain('prover_cache_misses')
  })

  it('registry content type is text/plain compatible', () => {
    const registry = getRegistry()
    expect(registry.contentType).toContain('text/plain')
  })
})
