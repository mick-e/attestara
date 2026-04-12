import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { buildServer } from '../src/server.js'
import { clearAllStores } from './helpers/db-cleanup.js'

async function createApp() {
  return buildServer({ logger: false })
}

async function registerAndGetToken(app: any) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email: `user-${randomUUID().slice(0, 6)}@example.com`, password: 'password123', orgName: 'Test Org' },
  })
  return JSON.parse(res.payload)
}

async function createAgent(app: any, token: string, orgId: string) {
  const res = await app.inject({
    method: 'POST',
    url: `/v1/orgs/${orgId}/agents`,
    headers: { authorization: `Bearer ${token}` },
    payload: { did: `did:ethr:0x${randomUUID().replace(/-/g, '').slice(0, 40)}`, name: 'Agent', publicKey: '0xabcdef' },
  })
  return JSON.parse(res.payload)
}

describe('Credential routes', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  describe('POST /v1/orgs/:orgId/credentials', () => {
    it('should issue a credential', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: {
          agentId: agent.id,
          credentialHash: '0xhash123',
          schemaHash: '0xschema456',
          expiry: '2027-01-01T00:00:00Z',
        },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.id).toBeDefined()
      expect(body.credentialHash).toBe('0xhash123')
      expect(body.revoked).toBe(false)
    })

    it('should reject duplicate credential hash', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xdup', schemaHash: '0xs', expiry: '2027-01-01T00:00:00Z' },
      })

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xdup', schemaHash: '0xs', expiry: '2027-01-01T00:00:00Z' },
      })
      expect(res.statusCode).toBe(409)
    })
  })

  describe('GET /v1/orgs/:orgId/credentials', () => {
    it('should list credentials for org', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xhash1', schemaHash: '0xs', expiry: '2027-01-01T00:00:00Z' },
      })
      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xhash2', schemaHash: '0xs', expiry: '2027-01-01T00:00:00Z' },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(2)
    })
  })

  describe('GET /v1/orgs/:orgId/credentials/:id', () => {
    it('should get credential detail', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xdetail', schemaHash: '0xs', expiry: '2027-01-01T00:00:00Z' },
      })
      const cred = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/credentials/${cred.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.id).toBe(cred.id)
    })

    it('should return 404 for unknown credential', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/credentials/nonexistent`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /v1/orgs/:orgId/credentials/:id', () => {
    it('should revoke a credential', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xrevoke', schemaHash: '0xs', expiry: '2027-01-01T00:00:00Z' },
      })
      const cred = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${reg.user.orgId}/credentials/${cred.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)

      // Verify revoked
      const getRes = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/credentials/${cred.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      const body = JSON.parse(getRes.payload)
      expect(body.revoked).toBe(true)
    })

    it('should return 404 for unknown credential', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${reg.user.orgId}/credentials/nonexistent`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
