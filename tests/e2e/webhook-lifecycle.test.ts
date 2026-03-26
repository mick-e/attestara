/**
 * End-to-end test: Webhook Lifecycle
 *
 * Exercises the full webhook lifecycle:
 *   Register user -> Create webhook -> List webhooks -> Trigger delivery
 *   -> Check delivery history -> Deactivate webhook -> Verify HMAC signature
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { buildServer } from '../../packages/relay/src/server.js'
import { clearAuthStores } from '../../packages/relay/src/routes/auth.js'
import { clearAgentStores } from '../../packages/relay/src/routes/agents.js'
import { clearCredentialStores } from '../../packages/relay/src/routes/credentials.js'
import { clearSessionStores } from '../../packages/relay/src/routes/sessions.js'
import { clearCommitmentStores } from '../../packages/relay/src/routes/commitments.js'
import { clearWebhookStores } from '../../packages/relay/src/routes/webhooks.js'
import { webhookService } from '../../packages/relay/src/services/webhook.service.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

async function registerAndGetToken(
  baseUrl: string,
  email: string,
  password = 'password123',
  orgName = 'Test Org',
): Promise<{ accessToken: string; orgId: string }> {
  const res = await fetch(`${baseUrl}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, orgName }),
  })
  expect(res.status).toBe(201)
  const data = await res.json() as { accessToken: string; user: { orgId: string } }
  return { accessToken: data.accessToken, orgId: data.user.orgId }
}

async function createWebhook(
  baseUrl: string,
  orgId: string,
  token: string,
  url = 'https://example.com/hook',
  events = ['session.created', 'turn.added'],
): Promise<{ id: string; secret: string; url: string; events: string[]; active: boolean }> {
  const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url, events }),
  })
  expect(res.status).toBe(201)
  return res.json() as any
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('E2E: Webhook Lifecycle', () => {
  let app: Awaited<ReturnType<typeof buildServer>>
  let baseUrl: string

  beforeAll(async () => {
    app = await buildServer({ logger: false })
    await app.listen({ port: 0, host: '127.0.0.1' })
    const address = app.server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    clearAuthStores()
    clearAgentStores()
    clearCredentialStores()
    clearSessionStores()
    clearCommitmentStores()
    clearWebhookStores()
  })

  // ── Phase 1: Create webhook ────────────────────────────────────────────────

  describe('Phase 1: Create Webhook', () => {
    it('should create a webhook and return the secret once', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'alice@example.com')

      const wh = await createWebhook(baseUrl, orgId, accessToken)

      expect(wh.id).toBeTruthy()
      expect(wh.secret).toBeTruthy()
      expect(wh.secret).toMatch(/^whsec_/)
      expect(wh.url).toBe('https://example.com/hook')
      expect(wh.events).toContain('session.created')
      expect(wh.active).toBe(true)
    })

    it('should return 400 on invalid URL', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'b@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ url: 'not-a-url', events: ['turn.added'] }),
      })
      expect(res.status).toBe(400)
      const body = await res.json() as { code: string }
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 on empty events array', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'c@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ url: 'https://example.com/hook', events: [] }),
      })
      expect(res.status).toBe(400)
    })

    it('should return 401 without auth', async () => {
      const res = await fetch(`${baseUrl}/v1/orgs/fake-org/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/hook', events: ['turn.added'] }),
      })
      expect(res.status).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const { accessToken } = await registerAndGetToken(baseUrl, 'd@example.com')
      const { orgId: orgIdB } = await registerAndGetToken(baseUrl, 'e@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgIdB}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ url: 'https://example.com/hook', events: ['turn.added'] }),
      })
      expect(res.status).toBe(403)
    })
  })

  // ── Phase 2: List webhooks ─────────────────────────────────────────────────

  describe('Phase 2: List Webhooks', () => {
    it('should list webhooks without exposing the secret', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'f@example.com')

      await createWebhook(baseUrl, orgId, accessToken, 'https://hook1.example.com/a', ['session.created'])
      await createWebhook(baseUrl, orgId, accessToken, 'https://hook2.example.com/b', ['turn.added'])

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json() as { data: any[]; pagination: { total: number } }
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(2)

      // Secret must not be present in the listing
      for (const wh of data.data) {
        expect(wh.secret).toBeUndefined()
        expect(wh.id).toBeTruthy()
        expect(wh.url).toBeTruthy()
        expect(typeof wh.active).toBe('boolean')
      }
    })

    it('new org has no webhooks initially', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'g@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json() as { data: any[] }
      expect(data.data).toHaveLength(0)
    })
  })

  // ── Phase 3: Trigger webhook delivery ─────────────────────────────────────

  describe('Phase 3: Trigger Webhook Delivery', () => {
    it('should deliver a payload to a webhook via service', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'h@example.com')
      const wh = await createWebhook(baseUrl, orgId, accessToken, 'https://example.com/hook', ['session.created'])

      // Trigger delivery directly via the service (simulating an event)
      const payload = { sessionId: 'sess-001', status: 'active' }
      const delivery = webhookService.deliver(wh.id, 'session.created', payload)

      expect(delivery).not.toBeNull()
      expect(delivery!.webhookId).toBe(wh.id)
      expect(delivery!.event).toBe('session.created')
      expect(delivery!.status).toBe('pending')
      expect(delivery!.attempts).toBe(1)
    })

    it('delivery to unknown webhook ID returns null', () => {
      const delivery = webhookService.deliver('nonexistent-webhook', 'session.created', {})
      expect(delivery).toBeNull()
    })
  })

  // ── Phase 4: Check delivery history ───────────────────────────────────────

  describe('Phase 4: Delivery History', () => {
    it('should retrieve delivery history via API', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'i@example.com')
      const wh = await createWebhook(baseUrl, orgId, accessToken, 'https://example.com/hook', ['session.created'])

      // Trigger two deliveries
      webhookService.deliver(wh.id, 'session.created', { sessionId: 's1' })
      webhookService.deliver(wh.id, 'session.created', { sessionId: 's2' })

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks/${wh.id}/deliveries`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json() as { data: any[]; pagination: { total: number } }
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
    })

    it('empty history for webhook with no deliveries', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'j@example.com')
      const wh = await createWebhook(baseUrl, orgId, accessToken, 'https://example.com/hook', ['turn.added'])

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks/${wh.id}/deliveries`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json() as { data: any[] }
      expect(data.data).toHaveLength(0)
    })

    it('should return 404 for delivery history of non-existent webhook', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'k@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks/nonexistent-id/deliveries`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(404)
      const body = await res.json() as { code: string }
      expect(body.code).toBe('WEBHOOK_NOT_FOUND')
    })

    it('should return 403 for another org webhook delivery history', async () => {
      const { accessToken: tokenA } = await registerAndGetToken(baseUrl, 'k2@example.com')
      const { accessToken: tokenB, orgId: orgB } = await registerAndGetToken(baseUrl, 'k3@example.com')

      const wh = await createWebhook(baseUrl, orgB, tokenB, 'https://example.com/hook', ['turn.added'])

      // Org A requests delivery history for Org B's webhook
      // The org access guard will block this since orgA != orgB in the path
      // But here we're using orgB in the URL so it would be 403 for tokenA
      const res = await fetch(`${baseUrl}/v1/orgs/${orgB}/webhooks/${wh.id}/deliveries`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      })
      expect(res.status).toBe(403)
    })
  })

  // ── Phase 5: Deactivate webhook ────────────────────────────────────────────

  describe('Phase 5: Deactivate Webhook', () => {
    it('should deactivate a webhook via DELETE and return 204', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'l@example.com')
      const wh = await createWebhook(baseUrl, orgId, accessToken, 'https://example.com/hook', ['session.created'])

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks/${wh.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(204)
    })

    it('deactivated webhook should be marked inactive in the service', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'm@example.com')
      const wh = await createWebhook(baseUrl, orgId, accessToken, 'https://example.com/hook', ['session.created'])

      // Deactivate
      await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks/${wh.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      // Verify inactive status via list
      const listRes = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await listRes.json() as { data: any[] }
      const found = data.data.find((w: any) => w.id === wh.id)
      expect(found).toBeDefined()
      expect(found.active).toBe(false)
    })

    it('should return 404 when deactivating non-existent webhook', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'n@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/webhooks/nonexistent-id`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(404)
      const body = await res.json() as { code: string }
      expect(body.code).toBe('WEBHOOK_NOT_FOUND')
    })
  })

  // ── Phase 6: HMAC signature verification ──────────────────────────────────

  describe('Phase 6: HMAC Signature Verification', () => {
    it('should generate a verifiable HMAC signature for a payload', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'o@example.com')
      const wh = await createWebhook(baseUrl, orgId, accessToken, 'https://example.com/hook', ['session.created'])

      const secret = wh.secret
      const payload = { sessionId: 'sess-123', event: 'session.created', timestamp: '2026-01-01T00:00:00Z' }

      // Sign via service
      const signature = webhookService.signPayload(wh.id, payload)
      expect(signature).not.toBeNull()

      // Verify locally using the known secret
      const expectedSig = createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex')

      expect(signature).toBe(expectedSig)
    })

    it('different payloads produce different signatures', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'p@example.com')
      const wh = await createWebhook(baseUrl, orgId, accessToken, 'https://example.com/hook', ['session.created'])

      const sig1 = webhookService.signPayload(wh.id, { event: 'a' })
      const sig2 = webhookService.signPayload(wh.id, { event: 'b' })

      expect(sig1).not.toBe(sig2)
    })

    it('signPayload returns null for unknown webhook', () => {
      const sig = webhookService.signPayload('nonexistent-webhook', { event: 'a' })
      expect(sig).toBeNull()
    })

    it('different webhooks with different secrets produce different signatures for same payload', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'q@example.com')

      const wh1 = await createWebhook(baseUrl, orgId, accessToken, 'https://hook1.example.com/a', ['turn.added'])
      const wh2 = await createWebhook(baseUrl, orgId, accessToken, 'https://hook2.example.com/b', ['turn.added'])

      const payload = { sessionId: 'sess-xyz' }
      const sig1 = webhookService.signPayload(wh1.id, payload)
      const sig2 = webhookService.signPayload(wh2.id, payload)

      // Different secrets → different signatures for the same payload
      expect(sig1).not.toBe(sig2)
    })
  })
})
