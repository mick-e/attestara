import { describe, it, expect, beforeEach } from 'vitest'
import { buildServer } from '../src/server.js'
import { clearAllStores } from './helpers/db-cleanup.js'

async function createApp() {
  return buildServer({ logger: false })
}

async function registerAndGetToken(app: any, email = 'admin@example.com') {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password: 'password123', orgName: 'Test Org' },
  })
  return JSON.parse(res.payload)
}

async function createAgent(app: any, token: string, orgId: string, did = 'did:ethr:0xAAA') {
  const res = await app.inject({
    method: 'POST',
    url: `/v1/orgs/${orgId}/agents`,
    headers: { authorization: `Bearer ${token}` },
    payload: { did, name: 'Agent 1', publicKey: '0xpubkey123' },
  })
  return JSON.parse(res.payload)
}

describe('Agent routes', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  describe('POST /v1/orgs/:orgId/agents', () => {
    it('should provision an agent', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)
      expect(agent.id).toBeDefined()
      expect(agent.did).toBe('did:ethr:0xAAA')
      expect(agent.name).toBe('Agent 1')
      expect(agent.status).toBe('active')
      expect(agent.orgId).toBe(reg.user.orgId)
    })

    it('should reject duplicate DID', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      await createAgent(app, reg.accessToken, reg.user.orgId, 'did:ethr:0xDUP')
      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/agents`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { did: 'did:ethr:0xDUP', name: 'Agent 2', publicKey: '0xkey' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should reject missing fields', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/agents`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'Agent 1' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /v1/orgs/:orgId/agents', () => {
    it('should list agents for org', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      await createAgent(app, reg.accessToken, reg.user.orgId, 'did:ethr:0x111')
      await createAgent(app, reg.accessToken, reg.user.orgId, 'did:ethr:0x222')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/agents`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(2)
      expect(body.pagination.total).toBe(2)
    })
  })

  describe('GET /v1/orgs/:orgId/agents/:agentId', () => {
    it('should get agent detail', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/agents/${agent.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.id).toBe(agent.id)
      expect(body.did).toBe('did:ethr:0xAAA')
    })

    it('should return 404 for unknown agent', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/agents/nonexistent`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('PATCH /v1/orgs/:orgId/agents/:agentId', () => {
    it('should update agent name', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/orgs/${reg.user.orgId}/agents/${agent.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'Updated Agent' },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.name).toBe('Updated Agent')
    })
  })

  describe('DELETE /v1/orgs/:orgId/agents/:agentId', () => {
    it('should deactivate an agent', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${reg.user.orgId}/agents/${agent.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.message).toBe('Agent deactivated')

      // Verify agent is deactivated
      const getRes = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/agents/${agent.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      const detail = JSON.parse(getRes.payload)
      expect(detail.status).toBe('deactivated')
    })

    it('should return 404 for unknown agent', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${reg.user.orgId}/agents/nonexistent`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
