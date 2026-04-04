import { describe, it, expect } from 'vitest'
import { buildServer } from '../../packages/relay/src/server.js'
import { buildProverServer } from '../../packages/prover/src/server.js'

describe('relay startup', () => {
  it('buildServer returns a listening-capable Fastify instance with /health', async () => {
    const app = await buildServer({ logger: false, corsOrigin: '*' })
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
    await app.close()
  })
})

describe('prover startup', () => {
  it('buildProverServer returns a Fastify instance with health endpoint', async () => {
    const config = {
      PROVER_INTERNAL_SECRET: 'test-secret-minimum-16',
      REDIS_URL: 'redis://localhost:6379',
      CIRCUIT_DIR: './packages/contracts/circuits/build',
      WORKER_POOL_SIZE: 1,
      PORT: 3099,
      HOST: '127.0.0.1',
      NODE_ENV: 'test' as const,
    }
    const app = await buildProverServer({ config, logger: false })
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })
})
