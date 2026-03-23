import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID, createHash } from 'crypto'
import { buildServer } from '../src/server.js'
import { clearAuthStores } from '../src/routes/auth.js'
import { clearOrgStores } from '../src/routes/orgs.js'
import { clearAgentStores } from '../src/routes/agents.js'
import { clearCredentialStores } from '../src/routes/credentials.js'
import { clearSessionStores } from '../src/routes/sessions.js'

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

async function createAgent(app: any, token: string, orgId: string) {
  const did = `did:ethr:0x${randomUUID().replace(/-/g, '').slice(0, 40)}`
  const res = await app.inject({
    method: 'POST',
    url: `/v1/orgs/${orgId}/agents`,
    headers: { authorization: `Bearer ${token}` },
    payload: { did, name: 'Agent', publicKey: '0xpubkey' },
  })
  return JSON.parse(res.payload)
}

describe('Session routes', () => {
  beforeEach(() => {
    clearAuthStores()
    clearOrgStores()
    clearAgentStores()
    clearCredentialStores()
    clearSessionStores()
  })

  describe('Intra-org sessions', () => {
    it('POST /v1/sessions should create an intra-org session', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const agent1 = await createAgent(app, reg.accessToken, reg.user.orgId)
      const agent2 = await createAgent(app, reg.accessToken, reg.user.orgId)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: reg.user.orgId,
          counterpartyOrgId: reg.user.orgId,
          sessionType: 'intra_org',
          sessionConfig: { maxTurns: 10 },
        },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.id).toBeDefined()
      expect(body.status).toBe('active')
      expect(body.sessionType).toBe('intra_org')
      expect(body.inviteTokenHash).toBeNull()
      expect(body.inviteToken).toBeUndefined()
    })

    it('GET /v1/sessions should list sessions for the org', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const agent1 = await createAgent(app, reg.accessToken, reg.user.orgId)
      const agent2 = await createAgent(app, reg.accessToken, reg.user.orgId)

      await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: reg.user.orgId,
          counterpartyOrgId: reg.user.orgId,
          sessionType: 'intra_org',
        },
      })

      const res = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(1)
    })

    it('GET /v1/sessions/:sessionId should get session detail', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const agent1 = await createAgent(app, reg.accessToken, reg.user.orgId)
      const agent2 = await createAgent(app, reg.accessToken, reg.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: reg.user.orgId,
          counterpartyOrgId: reg.user.orgId,
        },
      })
      const session = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/sessions/${session.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.id).toBe(session.id)
    })

    it('GET /v1/sessions/:sessionId should return 404 for unknown session', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const res = await app.inject({
        method: 'GET',
        url: '/v1/sessions/nonexistent',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(404)
    })

    it('GET /v1/sessions/:sessionId/turns should return empty turns', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const agent1 = await createAgent(app, reg.accessToken, reg.user.orgId)
      const agent2 = await createAgent(app, reg.accessToken, reg.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: reg.user.orgId,
          counterpartyOrgId: reg.user.orgId,
        },
      })
      const session = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/sessions/${session.id}/turns`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(0)
    })
  })

  describe('Cross-org sessions', () => {
    it('should create a cross-org session with pending_acceptance status', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'org1@example.com')
      const org2 = await registerUser(app, 'org2@example.com')
      const agent1 = await createAgent(app, org1.accessToken, org1.user.orgId)
      const agent2 = await createAgent(app, org2.accessToken, org2.user.orgId)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: org1.user.orgId,
          counterpartyOrgId: org2.user.orgId,
          sessionType: 'cross_org',
        },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.status).toBe('pending_acceptance')
      expect(body.inviteToken).toBeDefined()
      expect(body.inviteToken.length).toBe(64) // 32 bytes hex
      expect(body.inviteTokenHash).toBeDefined()
    })

    it('should accept a cross-org invite with valid token', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'initiator@example.com')
      const org2 = await registerUser(app, 'counterparty@example.com')
      const agent1 = await createAgent(app, org1.accessToken, org1.user.orgId)
      const agent2 = await createAgent(app, org2.accessToken, org2.user.orgId)

      // Create cross-org session
      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: org1.user.orgId,
          counterpartyOrgId: org2.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      // Accept with counterparty
      const acceptRes = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
        payload: { inviteToken: session.inviteToken },
      })
      expect(acceptRes.statusCode).toBe(200)
      const accepted = JSON.parse(acceptRes.payload)
      expect(accepted.status).toBe('active')
    })

    it('should reject invalid invite token', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'init@example.com')
      const org2 = await registerUser(app, 'cp@example.com')
      const agent1 = await createAgent(app, org1.accessToken, org1.user.orgId)
      const agent2 = await createAgent(app, org2.accessToken, org2.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: org1.user.orgId,
          counterpartyOrgId: org2.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      const acceptRes = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
        payload: { inviteToken: 'wrong-token-value' },
      })
      expect(acceptRes.statusCode).toBe(401)
    })

    it('should allow both orgs to list cross-org sessions', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'list1@example.com')
      const org2 = await registerUser(app, 'list2@example.com')
      const agent1 = await createAgent(app, org1.accessToken, org1.user.orgId)
      const agent2 = await createAgent(app, org2.accessToken, org2.user.orgId)

      await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: org1.user.orgId,
          counterpartyOrgId: org2.user.orgId,
          sessionType: 'cross_org',
        },
      })

      // Org1 should see the session
      const res1 = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org1.accessToken}` },
      })
      expect(JSON.parse(res1.payload).data).toHaveLength(1)

      // Org2 should also see the session
      const res2 = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org2.accessToken}` },
      })
      expect(JSON.parse(res2.payload).data).toHaveLength(1)
    })

    it('should deny access to sessions from unrelated orgs', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'deny1@example.com')
      const org2 = await registerUser(app, 'deny2@example.com')
      const org3 = await registerUser(app, 'deny3@example.com')
      const agent1 = await createAgent(app, org1.accessToken, org1.user.orgId)
      const agent2 = await createAgent(app, org2.accessToken, org2.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: org1.user.orgId,
          counterpartyOrgId: org2.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      // Org3 should NOT see this session
      const res = await app.inject({
        method: 'GET',
        url: `/v1/sessions/${session.id}`,
        headers: { authorization: `Bearer ${org3.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('POST /v1/sessions/:sessionId/invite should generate new invite token', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'inv1@example.com')
      const org2 = await registerUser(app, 'inv2@example.com')
      const agent1 = await createAgent(app, org1.accessToken, org1.user.orgId)
      const agent2 = await createAgent(app, org2.accessToken, org2.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: org1.user.orgId,
          counterpartyOrgId: org2.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      const inviteRes = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/invite`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
      })
      expect(inviteRes.statusCode).toBe(200)
      const body = JSON.parse(inviteRes.payload)
      expect(body.inviteToken).toBeDefined()
      expect(body.sessionId).toBe(session.id)
    })

    it('should reject invite for intra-org sessions', async () => {
      const app = await createApp()
      const reg = await registerUser(app, 'intra@example.com')
      const agent1 = await createAgent(app, reg.accessToken, reg.user.orgId)
      const agent2 = await createAgent(app, reg.accessToken, reg.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: reg.user.orgId,
          counterpartyOrgId: reg.user.orgId,
          sessionType: 'intra_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      const inviteRes = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/invite`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(inviteRes.statusCode).toBe(400)
    })

    it('should reject acceptance of already active session', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'active1@example.com')
      const org2 = await registerUser(app, 'active2@example.com')
      const agent1 = await createAgent(app, org1.accessToken, org1.user.orgId)
      const agent2 = await createAgent(app, org2.accessToken, org2.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: {
          initiatorAgentId: agent1.id,
          counterpartyAgentId: agent2.id,
          initiatorOrgId: org1.user.orgId,
          counterpartyOrgId: org2.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      // Accept first time
      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
        payload: { inviteToken: session.inviteToken },
      })

      // Try to accept again
      const res = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${org2.accessToken}` },
        payload: { inviteToken: session.inviteToken },
      })
      expect(res.statusCode).toBe(400)
    })
  })
})
