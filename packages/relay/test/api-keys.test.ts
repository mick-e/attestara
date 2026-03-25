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

describe('API Key routes', () => {
  beforeEach(() => {
    clearAuthStores()
    clearOrgStores()
    clearAgentStores()
    clearCredentialStores()
    clearSessionStores()
    clearCommitmentStores()
    clearApiKeyStores()
  })

  describe('POST /v1/orgs/:orgId/api-keys', () => {
    it('should create an api key and return 201 with rawKey', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'My API Key', scopes: ['read', 'write'] },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.id).toBeDefined()
      expect(body.orgId).toBe(reg.user.orgId)
      expect(body.name).toBe('My API Key')
      expect(body.scopes).toEqual(['read', 'write'])
      expect(body.rawKey).toMatch(/^ac_[0-9a-f]{64}$/)
      expect(body.keyHash).toBeDefined()
      expect(body.lastUsedAt).toBeNull()
      expect(body.expiresAt).toBeNull()
      expect(body.createdAt).toBeDefined()
    })

    it('should create key with scopes defaulting to empty array', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'No Scopes Key' },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.scopes).toEqual([])
    })

    it('should create key with expiresAt when provided', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const expiresAt = new Date(Date.now() + 86400000).toISOString()

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'Expiring Key', scopes: ['read'], expiresAt },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.expiresAt).toBe(expiresAt)
    })

    it('should return 400 for missing name', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { scopes: ['read'] },
      })

      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/orgs/some-org-id/api-keys',
        payload: { name: 'Key' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'org1apikeys@example.com')
      const org2 = await registerUser(app, 'org2apikeys@example.com')

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${org2.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: { name: 'Key' },
      })

      expect(res.statusCode).toBe(403)
    })
  })

  describe('GET /v1/orgs/:orgId/api-keys', () => {
    it('should list api keys for org without rawKey', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      // Create two keys
      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'Key 1', scopes: ['read'] },
      })
      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'Key 2', scopes: ['write'] },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(2)
      expect(body.pagination).toBeDefined()
      expect(body.pagination.total).toBe(2)
      // rawKey should NOT be in list responses
      body.data.forEach((key: any) => {
        expect(key.rawKey).toBeUndefined()
        expect(key.keyHash).toBeDefined()
      })
    })

    it('should return empty list when org has no keys', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(0)
      expect(body.pagination.total).toBe(0)
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/orgs/some-org-id/api-keys',
      })

      expect(res.statusCode).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'org1listkeys@example.com')
      const org2 = await registerUser(app, 'org2listkeys@example.com')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${org2.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('should not return keys from other orgs', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'org1isolation@example.com')
      const org2 = await registerUser(app, 'org2isolation@example.com')

      // Create key for org1
      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${org1.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: { name: 'Org1 Key' },
      })

      // org2 lists their own keys
      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${org2.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(0)
    })
  })

  describe('DELETE /v1/orgs/:orgId/api-keys/:id', () => {
    it('should revoke an api key and return 204', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'To Revoke', scopes: ['read'] },
      })
      const created = JSON.parse(createRes.payload)

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${reg.user.orgId}/api-keys/${created.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(deleteRes.statusCode).toBe(204)

      // Verify key is gone from the list
      const listRes = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      const list = JSON.parse(listRes.payload)
      expect(list.data).toHaveLength(0)
    })

    it('should return 404 for nonexistent key', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${reg.user.orgId}/api-keys/nonexistent-id`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(404)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('API_KEY_NOT_FOUND')
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/orgs/some-org-id/api-keys/some-key-id',
      })

      expect(res.statusCode).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'org1deletekey@example.com')
      const org2 = await registerUser(app, 'org2deletekey@example.com')

      // Create key for org1
      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${org1.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: { name: 'Org1 Key' },
      })
      const created = JSON.parse(createRes.payload)

      // org2 tries to delete org1's key
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${org1.user.orgId}/api-keys/${created.id}`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })
})
