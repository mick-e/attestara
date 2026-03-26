/**
 * End-to-end test: Admin Operations
 *
 * Verifies admin-only route protection and functionality:
 *   Regular user cannot access admin routes (403)
 *   Admin user can access stats and trigger backfill
 *   Stats reflect actual system state
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildServer } from '../../packages/relay/src/server.js'
import { clearAuthStores } from '../../packages/relay/src/routes/auth.js'
import { clearAgentStores } from '../../packages/relay/src/routes/agents.js'
import { clearCredentialStores } from '../../packages/relay/src/routes/credentials.js'
import { clearSessionStores } from '../../packages/relay/src/routes/sessions.js'
import { clearCommitmentStores } from '../../packages/relay/src/routes/commitments.js'
import { orgService } from '../../packages/relay/src/services/org.service.js'
import { generateAccessToken } from '../../packages/relay/src/middleware/auth.js'
import { AuthService } from '../../packages/relay/src/services/auth.service.js'

const JWT_SECRET = 'test-secret-at-least-32-chars-long!!'

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

/**
 * Creates an admin user directly via the service layer and returns a JWT token.
 * This mirrors what a real admin provisioning script would do.
 */
async function createAdminToken(): Promise<{ accessToken: string; orgId: string }> {
  const authService = new AuthService()
  const org = orgService.createOrg('Admin Org')
  const hash = await authService.hashPassword('adminpass99')
  const user = orgService.createUser(org.id, {
    email: 'admin@attestara.internal',
    passwordHash: hash,
    walletAddress: null,
    role: 'admin',
  })

  const tokenPayload = {
    sub: user.id,
    orgId: org.id,
    email: user.email,
    role: 'admin',
  }
  const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
  return { accessToken, orgId: org.id }
}

async function createAgent(
  baseUrl: string,
  orgId: string,
  token: string,
  did = 'did:key:z6Mk' + Math.random().toString(36).slice(2),
): Promise<{ id: string }> {
  const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ did, name: 'test-agent', publicKey: '0xabc123' }),
  })
  expect(res.status).toBe(201)
  return res.json() as any
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('E2E: Admin Operations', () => {
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
  })

  // ── Phase 1: Non-admin cannot access admin routes ──────────────────────────

  describe('Phase 1: Non-Admin Access Denied', () => {
    it('regular user (owner) cannot access GET /admin/stats', async () => {
      const { accessToken } = await registerAndGetToken(baseUrl, 'owner@example.com')

      const res = await fetch(`${baseUrl}/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(403)
      const body = await res.json() as { code: string }
      expect(body.code).toBe('FORBIDDEN')
    })

    it('regular user cannot trigger POST /admin/indexer/backfill', async () => {
      const { accessToken } = await registerAndGetToken(baseUrl, 'owner2@example.com')

      const res = await fetch(`${baseUrl}/v1/admin/indexer/backfill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(403)
    })

    it('unauthenticated request returns 401 for admin routes', async () => {
      const res = await fetch(`${baseUrl}/v1/admin/stats`)
      expect(res.status).toBe(401)
    })
  })

  // ── Phase 2: Admin user can access admin routes ────────────────────────────

  describe('Phase 2: Admin Access Granted', () => {
    it('admin user can access GET /admin/stats', async () => {
      const { accessToken } = await createAdminToken()

      const res = await fetch(`${baseUrl}/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json() as {
        totalOrgs: number
        totalUsers: number
        totalAgents: number
        totalSessions: number
        totalCommitments: number
      }
      expect(typeof body.totalOrgs).toBe('number')
      expect(typeof body.totalUsers).toBe('number')
      expect(typeof body.totalAgents).toBe('number')
      expect(typeof body.totalSessions).toBe('number')
      expect(typeof body.totalCommitments).toBe('number')
    })

    it('admin user can trigger POST /admin/indexer/backfill and gets 202', async () => {
      const { accessToken } = await createAdminToken()

      const res = await fetch(`${baseUrl}/v1/admin/indexer/backfill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(202)
      const body = await res.json() as { message: string }
      expect(body.message).toBe('Backfill queued')
    })
  })

  // ── Phase 3: Stats reflect actual system state ─────────────────────────────

  describe('Phase 3: Stats Reflect System State', () => {
    it('empty system has all-zero counts', async () => {
      const { accessToken } = await createAdminToken()

      // Note: createAdminToken creates 1 org and 1 user directly
      const res = await fetch(`${baseUrl}/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(200)
      const stats = await res.json() as {
        totalOrgs: number
        totalUsers: number
        totalAgents: number
        totalSessions: number
        totalCommitments: number
      }

      // Admin org + user were created directly
      expect(stats.totalOrgs).toBeGreaterThanOrEqual(1)
      expect(stats.totalUsers).toBeGreaterThanOrEqual(1)
      expect(stats.totalAgents).toBe(0)
      expect(stats.totalSessions).toBe(0)
      expect(stats.totalCommitments).toBe(0)
    })

    it('stats reflect created entities accurately', async () => {
      // Create admin token (1 org, 1 user created directly)
      const { accessToken: adminToken } = await createAdminToken()

      // Register 2 regular orgs/users via API
      const { accessToken: tokenA, orgId: orgA } = await registerAndGetToken(baseUrl, 'stat-a@example.com', 'pass1234', 'Stat Org A')
      const { accessToken: tokenB, orgId: orgB } = await registerAndGetToken(baseUrl, 'stat-b@example.com', 'pass1234', 'Stat Org B')

      // Create 3 agents across orgs
      await createAgent(baseUrl, orgA, tokenA, 'did:key:z6MkStatA1')
      await createAgent(baseUrl, orgA, tokenA, 'did:key:z6MkStatA2')
      await createAgent(baseUrl, orgB, tokenB, 'did:key:z6MkStatB1')

      const res = await fetch(`${baseUrl}/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      expect(res.status).toBe(200)
      const stats = await res.json() as {
        totalOrgs: number
        totalUsers: number
        totalAgents: number
        totalSessions: number
      }

      // 1 admin org + 2 regular orgs = 3 total orgs
      expect(stats.totalOrgs).toBe(3)
      // 1 admin user + 2 regular users = 3 total users
      expect(stats.totalUsers).toBe(3)
      // 3 agents created
      expect(stats.totalAgents).toBe(3)
      expect(stats.totalSessions).toBe(0)
    })

    it('session count increments after creating sessions', async () => {
      const { accessToken: adminToken } = await createAdminToken()
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'sess-stat@example.com', 'pass1234', 'Sess Org')

      const agentA = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkSessA')
      const agentB = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkSessB')

      // Create a session
      const sessRes = await fetch(`${baseUrl}/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          initiatorAgentId: agentA.id,
          counterpartyAgentId: agentB.id,
          initiatorOrgId: orgId,
          counterpartyOrgId: orgId,
          sessionType: 'intra_org',
        }),
      })
      expect(sessRes.status).toBe(201)

      const stats = await (await fetch(`${baseUrl}/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })).json() as { totalSessions: number }

      expect(stats.totalSessions).toBe(1)
    })
  })
})
