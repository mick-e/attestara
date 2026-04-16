import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../src/server.js'

/**
 * Tests per-route rate limits (S5) using production thresholds.
 *
 * The per-route limits in auth.ts use `isTestEnv` to bypass under Vitest
 * (max raised to 10,000). To test real production values, we temporarily
 * override NODE_ENV to 'development' and unset VITEST before building
 * the server so `isTestEnv` evaluates to false.
 *
 * Rate-limit counters fire on `onRequest` (before the route handler), so
 * 429 is returned even when the handler itself would fail due to no DB.
 */
describe('Per-route rate limiting (production thresholds)', () => {
  let origNodeEnv: string | undefined
  let origVitest: string | undefined

  beforeAll(() => {
    origNodeEnv = process.env.NODE_ENV
    origVitest = process.env.VITEST
    process.env.NODE_ENV = 'development'
    delete process.env.VITEST
  })

  afterAll(() => {
    process.env.NODE_ENV = origNodeEnv
    if (origVitest !== undefined) {
      process.env.VITEST = origVitest
    }
  })

  it('returns 429 on the 6th login attempt within the rate window', { timeout: 60_000 }, async () => {
    const app = await buildServer({ logger: false })
    try {
      // Login limit is 5 per 15 minutes per IP (per S5 spec)
      const statuses: number[] = []
      for (let i = 0; i < 6; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/v1/auth/login',
          payload: { email: 'attacker@example.com', password: 'wrongpassword' },
        })
        statuses.push(res.statusCode)
      }

      // First 5 should NOT be 429 (they'll be 401 or 500 depending on DB)
      for (let i = 0; i < 5; i++) {
        expect(statuses[i]).not.toBe(429)
      }
      // 6th must be 429
      expect(statuses[5]).toBe(429)
    } finally {
      await app.close()
    }
  })

  it('returns 429 on the 4th register attempt within the rate window', async () => {
    const app = await buildServer({ logger: false })
    try {
      // Register limit is 3 per hour per IP (per S5 spec)
      const statuses: number[] = []
      for (let i = 0; i < 4; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/v1/auth/register',
          payload: {
            email: `ratelimit-${i}@example.com`,
            password: 'Password123!',
            orgName: `Rate Test Org ${i}`,
          },
        })
        statuses.push(res.statusCode)
      }

      // First 3 should NOT be 429
      for (let i = 0; i < 3; i++) {
        expect(statuses[i]).not.toBe(429)
      }
      // 4th must be 429
      expect(statuses[3]).toBe(429)
    } finally {
      await app.close()
    }
  })

  it('rate-limited response includes Retry-After header', async () => {
    const app = await buildServer({ logger: false })
    try {
      // Exhaust the 5-request login limit
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/v1/auth/login',
          payload: { email: 'retry@example.com', password: 'wrong' },
        })
      }
      // 6th triggers 429
      const blocked = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'retry@example.com', password: 'wrong' },
      })
      expect(blocked.statusCode).toBe(429)
      expect(blocked.headers['retry-after']).toBeDefined()
    } finally {
      await app.close()
    }
  })
})
