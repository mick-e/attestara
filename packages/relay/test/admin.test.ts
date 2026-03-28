import { describe, it, expect, beforeEach } from 'vitest'
import { buildServer } from '../src/server.js'
import { clearAllStores } from './helpers/db-cleanup.js'
import { generateAccessToken } from '../src/middleware/auth.js'
import { getPrisma } from '../src/utils/prisma.js'

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

/**
 * Register a real user, promote them to admin in the DB,
 * and return a JWT with role=admin and the real orgId.
 */
async function registerAdminUser(app: any, email = 'admin@example.com') {
  const reg = await registerUser(app, email)
  // Promote user to admin in the database
  await getPrisma().user.update({
    where: { id: reg.user.id },
    data: { role: 'admin' },
  })
  // Generate a new access token reflecting the admin role
  const adminToken = generateAccessToken(
    { sub: reg.user.id, orgId: reg.user.orgId, email, role: 'admin' },
    JWT_SECRET,
  )
  return { ...reg, accessToken: adminToken }
}

describe('Admin routes', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  describe('GET /v1/admin/stats', () => {
    it('should return system-wide stats for an admin', async () => {
      const app = await createApp()
      const admin = await registerAdminUser(app)

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
        headers: { authorization: `Bearer ${admin.accessToken}` },
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

      // Register two regular orgs plus the admin
      await registerUser(app, 'org1@example.com')
      await registerUser(app, 'org2@example.com')
      const admin = await registerAdminUser(app, 'admin-stats@example.com')

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
        headers: { authorization: `Bearer ${admin.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      // 3 orgs: org1, org2, and the admin's org
      expect(body.totalOrgs).toBe(3)
      expect(body.totalUsers).toBe(3)
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
      const admin = await registerAdminUser(app, 'admin-backfill@example.com')

      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/indexer/backfill',
        headers: { authorization: `Bearer ${admin.accessToken}` },
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
