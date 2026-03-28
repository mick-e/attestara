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

describe('Org routes', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  describe('POST /v1/orgs', () => {
    it('should create an org', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'POST',
        url: '/v1/orgs',
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'New Org' },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.name).toBe('New Org')
      expect(body.slug).toContain('new-org')
      expect(body.plan).toBe('starter')
    })

    it('should reject without auth', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/v1/orgs',
        payload: { name: 'Org' },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /v1/orgs/:orgId', () => {
    it('should get an org by ID', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
    })

    it('should reject access to other org', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'GET',
        url: '/v1/orgs/other-org-id',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('PATCH /v1/orgs/:orgId', () => {
    it('should update org name', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/orgs/${reg.user.orgId}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'Updated Name' },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.name).toBe('Updated Name')
    })
  })

  describe('GET /v1/orgs/:orgId/members', () => {
    it('should list org members', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/members`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toBeDefined()
      expect(body.pagination).toBeDefined()
    })
  })

  describe('POST /v1/orgs/:orgId/invite', () => {
    it('should create an invite', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/invite`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { email: 'invite@example.com', role: 'member' },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.email).toBe('invite@example.com')
      expect(body.role).toBe('member')
      expect(body.status).toBe('pending')
    })

    it('should reject invalid email', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/invite`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { email: 'invalid', role: 'member' },
      })
      expect(res.statusCode).toBe(400)
    })
  })
})
