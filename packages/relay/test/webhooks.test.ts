import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { buildServer } from '../src/server.js'
import { clearAuthStores } from '../src/routes/auth.js'
import { clearOrgStores } from '../src/routes/orgs.js'
import { clearAgentStores } from '../src/routes/agents.js'
import { clearCredentialStores } from '../src/routes/credentials.js'
import { clearSessionStores } from '../src/routes/sessions.js'
import { clearCommitmentStores } from '../src/routes/commitments.js'
import { clearApiKeyStores } from '../src/routes/api-keys.js'
import { clearWebhookStores } from '../src/routes/webhooks.js'

async function createApp() {
  return buildServer({ logger: false })
}

async function registerUser(app: any, email?: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: {
      email: email ?? `user-${randomUUID().slice(0, 6)}@example.com`,
      password: 'password123',
      orgName: `Org ${randomUUID().slice(0, 6)}`,
    },
  })
  return JSON.parse(res.payload)
}

describe('Webhook routes', () => {
  beforeEach(() => {
    clearAuthStores()
    clearOrgStores()
    clearAgentStores()
    clearCredentialStores()
    clearSessionStores()
    clearCommitmentStores()
    clearApiKeyStores()
    clearWebhookStores()
  })

  describe('POST /v1/orgs/:orgId/webhooks', () => {
    it('should register a webhook and return 201 with secret shown once', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'https://example.com/hook', events: ['agent.created'] },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.id).toBeDefined()
      expect(body.orgId).toBe(reg.user.orgId)
      expect(body.url).toBe('https://example.com/hook')
      expect(body.events).toEqual(['agent.created'])
      expect(body.active).toBe(true)
      expect(body.createdAt).toBeDefined()
      expect(body.secret).toMatch(/^whsec_[0-9a-f]{64}$/)
      // secrets should not be in the stored view fields
      expect(body.rawSecretEncrypted).toBeUndefined()
      expect(body.secretHash).toBeUndefined()
    })

    it('should return 400 for invalid url', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'not-a-url', events: ['agent.created'] },
      })

      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when events is empty', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'https://example.com/hook', events: [] },
      })

      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when url is missing', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { events: ['agent.created'] },
      })

      expect(res.statusCode).toBe(400)
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/orgs/some-org-id/webhooks',
        payload: { url: 'https://example.com/hook', events: ['agent.created'] },
      })

      expect(res.statusCode).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'wh-org1a@example.com')
      const org2 = await registerUser(app, 'wh-org2a@example.com')

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${org2.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: { url: 'https://example.com/hook', events: ['event'] },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  describe('GET /v1/orgs/:orgId/webhooks', () => {
    it('should list webhooks for an org', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'https://a.example.com', events: ['event.a'] },
      })
      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'https://b.example.com', events: ['event.b'] },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(2)
      expect(body.pagination.total).toBe(2)
      // secret must not appear in list
      body.data.forEach((wh: any) => {
        expect(wh.secret).toBeUndefined()
        expect(wh.rawSecretEncrypted).toBeUndefined()
        expect(wh.secretHash).toBeUndefined()
      })
    })

    it('should return empty list when org has no webhooks', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(0)
      expect(body.pagination.total).toBe(0)
    })

    it('should not return webhooks from other orgs', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'wh-org1b@example.com')
      const org2 = await registerUser(app, 'wh-org2b@example.com')

      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${org1.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: { url: 'https://org1.example.com', events: ['event'] },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${org2.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(0)
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/orgs/some-org/webhooks',
      })

      expect(res.statusCode).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'wh-org1c@example.com')
      const org2 = await registerUser(app, 'wh-org2c@example.com')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${org2.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  describe('DELETE /v1/orgs/:orgId/webhooks/:id', () => {
    it('should deactivate a webhook and return 204', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'https://example.com/hook', events: ['event'] },
      })
      const created = JSON.parse(createRes.payload)

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${reg.user.orgId}/webhooks/${created.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(deleteRes.statusCode).toBe(204)

      // Verify webhook is now inactive
      const listRes = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      const list = JSON.parse(listRes.payload)
      expect(list.data[0].active).toBe(false)
    })

    it('should return 404 for nonexistent webhook', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${reg.user.orgId}/webhooks/nonexistent-id`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(404)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('WEBHOOK_NOT_FOUND')
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/orgs/some-org/webhooks/some-id',
      })

      expect(res.statusCode).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'wh-org1d@example.com')
      const org2 = await registerUser(app, 'wh-org2d@example.com')

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${org1.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: { url: 'https://example.com/hook', events: ['event'] },
      })
      const created = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${org1.user.orgId}/webhooks/${created.id}`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  describe('GET /v1/orgs/:orgId/webhooks/:id/deliveries', () => {
    it('should return delivery history for a webhook', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'https://example.com/hook', events: ['event'] },
      })
      const created = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/webhooks/${created.id}/deliveries`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toEqual([])
      expect(body.pagination.total).toBe(0)
    })

    it('should return 404 for nonexistent webhook', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/webhooks/nonexistent-id/deliveries`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(404)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('WEBHOOK_NOT_FOUND')
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/orgs/some-org/webhooks/some-id/deliveries',
      })

      expect(res.statusCode).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'wh-org1e@example.com')
      const org2 = await registerUser(app, 'wh-org2e@example.com')

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${org1.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: { url: 'https://example.com/hook', events: ['event'] },
      })
      const created = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${org1.user.orgId}/webhooks/${created.id}/deliveries`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })
})
