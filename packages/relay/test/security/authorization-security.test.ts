import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { buildServer } from '../../src/server.js'
import { clearAuthStores } from '../../src/routes/auth.js'
import { clearOrgStores } from '../../src/routes/orgs.js'
import { clearAgentStores } from '../../src/routes/agents.js'
import { clearCredentialStores } from '../../src/routes/credentials.js'
import { clearSessionStores } from '../../src/routes/sessions.js'
import { clearCommitmentStores } from '../../src/routes/commitments.js'
import { clearApiKeyStores } from '../../src/routes/api-keys.js'
import { clearWebhookStores } from '../../src/routes/webhooks.js'
import { generateAccessToken } from '../../src/middleware/auth.js'

const JWT_SECRET = 'test-secret-at-least-32-chars-long!!'

async function createApp() {
  return buildServer({ logger: false })
}

function clearAllStores() {
  clearAuthStores()
  clearOrgStores()
  clearAgentStores()
  clearCredentialStores()
  clearSessionStores()
  clearCommitmentStores()
  clearApiKeyStores()
  clearWebhookStores()
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

function makeAdminToken(orgId = 'admin-org-id') {
  return generateAccessToken(
    { sub: 'admin-user-id', orgId, email: 'admin@example.com', role: 'admin' },
    JWT_SECRET,
  )
}

describe('Authorization Security', () => {
  beforeEach(() => {
    clearAllStores()
  })

  describe('Org Isolation — Agents', () => {
    it('should prevent Org A from accessing Org B agents (list)', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-agents@example.com')
      const orgB = await registerUser(app, 'orgb-agents@example.com')
      await createAgent(app, orgB.accessToken, orgB.user.orgId)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${orgB.user.orgId}/agents`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should prevent Org A from creating agents in Org B', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-create-agent@example.com')
      const orgB = await registerUser(app, 'orgb-create-agent@example.com')

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${orgB.user.orgId}/agents`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: { did: 'did:ethr:0xAAA', name: 'Injected', publicKey: '0xkey' },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Org Isolation — Credentials', () => {
    it('should prevent Org A from accessing Org B credentials', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-creds@example.com')
      const orgB = await registerUser(app, 'orgb-creds@example.com')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${orgB.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should prevent Org A from issuing credentials in Org B', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-issue-cred@example.com')
      const orgB = await registerUser(app, 'orgb-issue-cred@example.com')
      const agentB = await createAgent(app, orgB.accessToken, orgB.user.orgId)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${orgB.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: { agentId: agentB.id, credentialHash: '0xhash', schemaHash: '0xschema', expiry: '2027-01-01T00:00:00Z' },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Org Isolation — API Keys', () => {
    it('should prevent Org A from accessing Org B API keys (list)', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-apikeys@example.com')
      const orgB = await registerUser(app, 'orgb-apikeys@example.com')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${orgB.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should prevent Org A from creating API keys in Org B', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-create-key@example.com')
      const orgB = await registerUser(app, 'orgb-create-key@example.com')

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${orgB.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: { name: 'Injected Key', scopes: ['read'] },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should prevent Org A from deleting Org B API keys', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-del-key@example.com')
      const orgB = await registerUser(app, 'orgb-del-key@example.com')

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${orgB.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${orgB.accessToken}` },
        payload: { name: 'OrgB Key' },
      })
      const key = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/orgs/${orgB.user.orgId}/api-keys/${key.id}`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Org Isolation — Webhooks', () => {
    it('should prevent Org A from accessing Org B webhooks', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-webhooks@example.com')
      const orgB = await registerUser(app, 'orgb-webhooks@example.com')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${orgB.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should prevent Org A from creating webhooks in Org B', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-create-wh@example.com')
      const orgB = await registerUser(app, 'orgb-create-wh@example.com')

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${orgB.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: { url: 'https://attacker.com/hook', events: ['agent.created'] },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Org Isolation — Analytics', () => {
    it('should prevent Org A from accessing Org B analytics', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'orga-analytics@example.com')
      const orgB = await registerUser(app, 'orgb-analytics@example.com')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${orgB.user.orgId}/analytics`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should allow an org to access its own analytics', async () => {
      const app = await createApp()
      const org = await registerUser(app, 'org-own-analytics@example.com')

      const res = await app.inject({
        method: 'GET',
        url: `/v1/orgs/${org.user.orgId}/analytics`,
        headers: { authorization: `Bearer ${org.accessToken}` },
      })
      expect(res.statusCode).toBe(200)
    })
  })

  describe('Org Isolation — Sessions', () => {
    it('should prevent unrelated Org C from accessing Org A-B cross-org sessions', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'sess-orga@example.com')
      const orgB = await registerUser(app, 'sess-orgb@example.com')
      const orgC = await registerUser(app, 'sess-orgc@example.com')
      const agentA = await createAgent(app, orgA.accessToken, orgA.user.orgId)
      const agentB = await createAgent(app, orgB.accessToken, orgB.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: {
          initiatorAgentId: agentA.id,
          counterpartyAgentId: agentB.id,
          initiatorOrgId: orgA.user.orgId,
          counterpartyOrgId: orgB.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      // Org C is unrelated — should get 403
      const res = await app.inject({
        method: 'GET',
        url: `/v1/sessions/${session.id}`,
        headers: { authorization: `Bearer ${orgC.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Admin Role Enforcement', () => {
    it('should reject non-admin from admin stats', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should reject non-admin from indexer backfill', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/indexer/backfill',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should allow admin to access admin stats', async () => {
      const app = await createApp()
      const adminToken = makeAdminToken()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
        headers: { authorization: `Bearer ${adminToken}` },
      })
      expect(res.statusCode).toBe(200)
    })

    it('should allow admin to trigger indexer backfill', async () => {
      const app = await createApp()
      const adminToken = makeAdminToken()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/indexer/backfill',
        headers: { authorization: `Bearer ${adminToken}` },
      })
      expect(res.statusCode).toBe(202)
    })

    it('should return 401 for unauthenticated admin routes', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/stats',
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('Session Invite Token Security', () => {
    it('should reject wrong invite token on session accept', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'invite-orga@example.com')
      const orgB = await registerUser(app, 'invite-orgb@example.com')
      const agentA = await createAgent(app, orgA.accessToken, orgA.user.orgId)
      const agentB = await createAgent(app, orgB.accessToken, orgB.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: {
          initiatorAgentId: agentA.id,
          counterpartyAgentId: agentB.id,
          initiatorOrgId: orgA.user.orgId,
          counterpartyOrgId: orgB.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${orgB.accessToken}` },
        payload: { inviteToken: 'completely-wrong-token-value' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should reject accepting an already-active session', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'active-orga@example.com')
      const orgB = await registerUser(app, 'active-orgb@example.com')
      const agentA = await createAgent(app, orgA.accessToken, orgA.user.orgId)
      const agentB = await createAgent(app, orgB.accessToken, orgB.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: {
          initiatorAgentId: agentA.id,
          counterpartyAgentId: agentB.id,
          initiatorOrgId: orgA.user.orgId,
          counterpartyOrgId: orgB.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      // Accept the session once
      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${orgB.accessToken}` },
        payload: { inviteToken: session.inviteToken },
      })

      // Re-generate invite (the original was consumed, need a fresh one)
      const inviteRes = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/invite`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      const { inviteToken: newToken } = JSON.parse(inviteRes.payload)

      // Try to accept again — session is already active
      const res = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${orgB.accessToken}` },
        payload: { inviteToken: newToken },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should not expose invite token hash in list responses', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'hash-orga@example.com')
      const orgB = await registerUser(app, 'hash-orgb@example.com')
      const agentA = await createAgent(app, orgA.accessToken, orgA.user.orgId)
      const agentB = await createAgent(app, orgB.accessToken, orgB.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: {
          initiatorAgentId: agentA.id,
          counterpartyAgentId: agentB.id,
          initiatorOrgId: orgA.user.orgId,
          counterpartyOrgId: orgB.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const created = JSON.parse(createRes.payload)

      // List sessions — the inviteTokenHash should be null/omitted in list view
      const listRes = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      const list = JSON.parse(listRes.payload)
      const session = list.data[0]

      // inviteToken (raw) must NOT appear in list responses
      expect(session.inviteToken).toBeUndefined()
    })
  })

  describe('Term Redaction in Cross-Org Sessions', () => {
    it('should redact counterparty terms in cross-org sessions', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'redact-orga@example.com')
      const orgB = await registerUser(app, 'redact-orgb@example.com')
      const agentA = await createAgent(app, orgA.accessToken, orgA.user.orgId)
      const agentB = await createAgent(app, orgB.accessToken, orgB.user.orgId)

      // Create a cross-org session
      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: {
          initiatorAgentId: agentA.id,
          counterpartyAgentId: agentB.id,
          initiatorOrgId: orgA.user.orgId,
          counterpartyOrgId: orgB.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      // Org B accepts
      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${orgB.accessToken}` },
        payload: { inviteToken: session.inviteToken },
      })

      // Org B submits a turn with terms
      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/turns`,
        headers: { authorization: `Bearer ${orgB.accessToken}` },
        payload: {
          agentId: agentB.id,
          terms: { price: 999, secret: 'top-secret' },
          proofType: 'mandate_bound',
          proof: {},
          publicSignals: {},
          signature: '0xsigB',
        },
      })

      // Org A views the turns — Org B's terms should be redacted
      const turnsRes = await app.inject({
        method: 'GET',
        url: `/v1/sessions/${session.id}/turns`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      expect(turnsRes.statusCode).toBe(200)
      const turns = JSON.parse(turnsRes.payload)
      const bTurn = turns.data.find((t: any) => t.agentId === agentB.id)
      expect(bTurn).toBeDefined()
      expect(bTurn.terms).toEqual({ redacted: true })
      expect(bTurn.terms.price).toBeUndefined()
      expect(bTurn.terms.secret).toBeUndefined()
    })

    it('should not redact own terms in cross-org sessions', async () => {
      const app = await createApp()
      const orgA = await registerUser(app, 'own-terms-orga@example.com')
      const orgB = await registerUser(app, 'own-terms-orgb@example.com')
      const agentA = await createAgent(app, orgA.accessToken, orgA.user.orgId)
      const agentB = await createAgent(app, orgB.accessToken, orgB.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: {
          initiatorAgentId: agentA.id,
          counterpartyAgentId: agentB.id,
          initiatorOrgId: orgA.user.orgId,
          counterpartyOrgId: orgB.user.orgId,
          sessionType: 'cross_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      // Org B accepts
      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/accept`,
        headers: { authorization: `Bearer ${orgB.accessToken}` },
        payload: { inviteToken: session.inviteToken },
      })

      // Org A submits a turn with its own terms
      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/turns`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
        payload: {
          agentId: agentA.id,
          terms: { price: 100, condition: 'net30' },
          proofType: 'mandate_bound',
          proof: {},
          publicSignals: {},
          signature: '0xsigA',
        },
      })

      // Org A views the turns — its own terms should NOT be redacted
      const turnsRes = await app.inject({
        method: 'GET',
        url: `/v1/sessions/${session.id}/turns`,
        headers: { authorization: `Bearer ${orgA.accessToken}` },
      })
      expect(turnsRes.statusCode).toBe(200)
      const turns = JSON.parse(turnsRes.payload)
      const aTurn = turns.data.find((t: any) => t.agentId === agentA.id)
      expect(aTurn).toBeDefined()
      expect(aTurn.terms.price).toBe(100)
      expect(aTurn.terms.condition).toBe('net30')
    })

    it('should not redact terms in intra-org sessions', async () => {
      const app = await createApp()
      const reg = await registerUser(app, 'intra-terms@example.com')
      const agentA = await createAgent(app, reg.accessToken, reg.user.orgId)
      const agentB = await createAgent(app, reg.accessToken, reg.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/sessions',
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: {
          initiatorAgentId: agentA.id,
          counterpartyAgentId: agentB.id,
          initiatorOrgId: reg.user.orgId,
          counterpartyOrgId: reg.user.orgId,
          sessionType: 'intra_org',
        },
      })
      const session = JSON.parse(createRes.payload)

      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/turns`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: {
          agentId: agentB.id,
          terms: { price: 500, details: 'visible' },
          proofType: 'mandate_bound',
          proof: {},
          publicSignals: {},
          signature: '0xsig',
        },
      })

      const turnsRes = await app.inject({
        method: 'GET',
        url: `/v1/sessions/${session.id}/turns`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })
      const turns = JSON.parse(turnsRes.payload)
      const turn = turns.data[0]
      // For intra-org, terms are fully visible
      expect(turn.terms.price).toBe(500)
      expect(turn.terms.details).toBe('visible')
      expect(turn.terms.redacted).toBeUndefined()
    })
  })
})
