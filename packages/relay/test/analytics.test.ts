import { describe, it, expect, beforeEach } from 'vitest'
import { buildServer } from '../src/server.js'
import { clearAuthStores } from '../src/routes/auth.js'
import { clearAgentStores } from '../src/routes/agents.js'
import { clearCredentialStores } from '../src/routes/credentials.js'
import { clearSessionStores } from '../src/routes/sessions.js'
import { clearCommitmentStores } from '../src/routes/commitments.js'

async function createApp() {
  return buildServer({ logger: false })
}

async function registerAndGetToken(app: any, email = 'user@example.com') {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password: 'password123', orgName: 'Test Org' },
  })
  return JSON.parse(res.payload)
}

async function createAgent(app: any, token: string, orgId: string, did: string) {
  const res = await app.inject({
    method: 'POST',
    url: `/v1/orgs/${orgId}/agents`,
    headers: { authorization: `Bearer ${token}` },
    payload: { did, name: 'Agent', publicKey: '0xpubkey' },
  })
  return JSON.parse(res.payload)
}

async function createCredential(app: any, token: string, orgId: string, agentId: string, hash: string) {
  const res = await app.inject({
    method: 'POST',
    url: `/v1/orgs/${orgId}/credentials`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      agentId,
      credentialHash: hash,
      schemaHash: '0xschema',
      expiry: new Date(Date.now() + 86400000).toISOString(),
    },
  })
  return JSON.parse(res.payload)
}

async function createSession(app: any, token: string, orgId: string, initiatorAgentId: string, counterpartyAgentId: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/sessions',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      initiatorAgentId,
      counterpartyAgentId,
      initiatorOrgId: orgId,
      counterpartyOrgId: orgId,
      sessionType: 'intra_org',
    },
  })
  return JSON.parse(res.payload)
}

describe('Analytics routes', () => {
  beforeEach(() => {
    clearAuthStores()
    clearAgentStores()
    clearCredentialStores()
    clearSessionStores()
    clearCommitmentStores()
  })

  describe('GET /v1/orgs/:orgId/analytics', () => {
    it('should return zeros for an empty org', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/analytics`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.agentCount).toBe(0)
      expect(body.credentialCount).toBe(0)
      expect(body.sessionCount).toBe(0)
      expect(body.commitmentCount).toBe(0)
      expect(body.activeSessionCount).toBe(0)
      expect(body.avgTurnsPerSession).toBe(0)
    })

    it('should return correct counts for a populated org', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)
      const { orgId, accessToken: token } = { orgId: reg.user.orgId, accessToken: reg.accessToken }

      // Create 2 agents
      const agent1 = await createAgent(app, token, orgId, 'did:ethr:0xA1')
      const agent2 = await createAgent(app, token, orgId, 'did:ethr:0xA2')

      // Create 1 credential
      await createCredential(app, token, orgId, agent1.id, '0xhash1')

      // Create 2 sessions (intra_org -> immediately active)
      await createSession(app, token, orgId, agent1.id, agent2.id)
      await createSession(app, token, orgId, agent2.id, agent1.id)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${orgId}/analytics`,
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.agentCount).toBe(2)
      expect(body.credentialCount).toBe(1)
      expect(body.sessionCount).toBe(2)
      expect(body.activeSessionCount).toBe(2)
      expect(body.avgTurnsPerSession).toBe(0)
    })

    it('should require authentication', async () => {
      const app = await createApp()
      const reg = await registerAndGetToken(app)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg.user.orgId}/analytics`,
      })

      expect(res.statusCode).toBe(401)
    })

    it('should deny access to a different org', async () => {
      const app = await createApp()
      const reg1 = await registerAndGetToken(app, 'user1@example.com')
      const reg2 = await registerAndGetToken(app, 'user2@example.com')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${reg2.user.orgId}/analytics`,
        headers: { authorization: `Bearer ${reg1.accessToken}` },
      })

      expect(res.statusCode).toBe(403)
    })
  })
})
