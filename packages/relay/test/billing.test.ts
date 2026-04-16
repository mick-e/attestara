import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearBillingStore } from '../src/billing/x402.js'

// Mock Prisma and auth dependencies
vi.mock('../src/utils/prisma.js', () => ({
  getPrisma: () => ({}),
}))

// We test the billing routes directly via the Fastify server
// Since the server requires Prisma, we build a minimal version
import Fastify from 'fastify'
import { billingRoutes } from '../src/billing/x402.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'test-secret-must-be-at-least-32-chars-long!!'

function makeToken(orgId: string) {
  return jwt.sign(
    { sub: 'user_1', orgId, email: 'test@test.com', role: 'admin', type: 'access' },
    JWT_SECRET,
    { expiresIn: '1h', jwtid: 'test-jti' },
  )
}

async function buildTestApp() {
  const app = Fastify({ logger: false })
  app.decorate('config', { JWT_SECRET })
  // Decorate request with auth
  app.decorateRequest('auth', null)
  app.decorateRequest('apiKeyHash', null)
  await app.register(billingRoutes, { prefix: '/v1' })
  return app
}

describe('Billing x402', () => {
  beforeEach(() => {
    clearBillingStore()
  })

  it('GET /v1/billing/usage returns usage for org', async () => {
    const app = await buildTestApp()
    const token = makeToken('org_billing_test')

    const res = await app.inject({
      method: 'GET',
      url: '/v1/billing/usage',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.orgId).toBe('org_billing_test')
    expect(body.creditsRemaining).toBeGreaterThan(0)
    expect(body.usage).toBeInstanceOf(Array)
  })

  it('GET /v1/billing/plan returns plan info', async () => {
    const app = await buildTestApp()
    const token = makeToken('org_billing_test')

    const res = await app.inject({
      method: 'GET',
      url: '/v1/billing/plan',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.plan).toBe('starter')
    expect(body.credits).toBe(1000)
  })

  it('POST /v1/billing/topup adds credits', async () => {
    const app = await buildTestApp()
    const token = makeToken('org_billing_test')

    const res = await app.inject({
      method: 'POST',
      url: '/v1/billing/topup',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ credits: 500 }),
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.credits).toBe(1500) // 1000 default + 500 topup

    // Verify via plan endpoint
    const planRes = await app.inject({
      method: 'GET',
      url: '/v1/billing/plan',
      headers: { Authorization: `Bearer ${token}` },
    })
    const planBody = JSON.parse(planRes.payload)
    expect(planBody.credits).toBe(1500)
  })

  it('POST /v1/billing/topup validates input', async () => {
    const app = await buildTestApp()
    const token = makeToken('org_billing_test')

    const res = await app.inject({
      method: 'POST',
      url: '/v1/billing/topup',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ credits: -5 }),
    })

    expect(res.statusCode).toBe(400)
  })
})
