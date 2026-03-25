import { describe, it, expect, beforeEach } from 'vitest'
import { buildServer } from '../src/server.js'
import { clearAuthStores } from '../src/routes/auth.js'
import { clearAgentStores } from '../src/routes/agents.js'
import { clearCredentialStores } from '../src/routes/credentials.js'
import { clearSessionStores } from '../src/routes/sessions.js'
import { clearCommitmentStores } from '../src/routes/commitments.js'
import { generateAccessToken } from '../src/middleware/auth.js'

const JWT_SECRET = 'test-secret-at-least-32-chars-long!!'

async function createApp() {
  return buildServer({ logger: false })
}

/** Register a user and return the parsed response (role = 'owner') */
async function registerUser(app: any, email = 'user@example.com') {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password: 'password123', orgName: 'Test Org' },
  })
  return JSON.parse(res.payload)
}

/** Build an admin JWT directly (bypass register which creates 'owner' role) */
function makeAdminToken(orgId = 'admin-org-id') {
  return generateAccessToken(
    { sub: 'admin-user-id', orgId, email: 'admin@example.com', role: 'admin' },
    JWT_SECRET,
  )
}

describe('Admin routes', () => {
  beforeEach(() => {
    clearAuthStores()
    clearAgentStores()
    clearCredentialStores()
    clearSessionStores()
    clearCommitmentStores()
  })

  describe('GET /v1/admin/stats', () => {
    it('should return system-wide stats for an admin', async () => {
      const app = await createApp()
      const adminToken = makeAdminToken()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(typeof body.totalOrgs).toBe('number')
      expect(typeof body.totalUsers).toBe('number')
      expect(typeof body.totalAgents).toBe('number')
      expect(typeof body.totalSessions).toBe('number')
      expect(typeof body.totalCommitments).toBe('number')
    })

    it('should reflect real counts after creating resources', async () => {
      const app = await createApp()

      // Register two orgs to populate the stores
      await registerUser(app, 'org1@example.com')
      await registerUser(app, 'org2@example.com')

      const adminToken = makeAdminToken()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.totalOrgs).toBe(2)
      expect(body.totalUsers).toBe(2)
    })

    it('should return 403 for a non-admin user', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('should return 401 when unauthenticated', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
      })

      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /v1/admin/indexer/backfill', () => {
    it('should return 202 Accepted for an admin', async () => {
      const app = await createApp()
      const adminToken = makeAdminToken()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/indexer/backfill',
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(res.statusCode).toBe(202)
      const body = JSON.parse(res.payload)
      expect(body.message).toBeDefined()
    })

    it('should return 403 for a non-admin user', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/indexer/backfill',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })

    it('should return 401 when unauthenticated', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/indexer/backfill',
      })

      expect(res.statusCode).toBe(401)
    })
  })
})
