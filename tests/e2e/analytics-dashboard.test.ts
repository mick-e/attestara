/**
 * End-to-end test: Analytics Dashboard
 *
 * Verifies the analytics endpoint returns accurate counts reflecting
 * the actual state of agents, credentials, sessions, and commitments.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildServer } from '../../packages/relay/src/server.js'
import { clearAuthStores } from '../../packages/relay/src/routes/auth.js'
import { clearAgentStores } from '../../packages/relay/src/routes/agents.js'
import { clearCredentialStores } from '../../packages/relay/src/routes/credentials.js'
import { clearSessionStores } from '../../packages/relay/src/routes/sessions.js'
import { clearCommitmentStores } from '../../packages/relay/src/routes/commitments.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

interface UserContext {
  accessToken: string
  orgId: string
}

async function registerAndGetToken(
  baseUrl: string,
  email: string,
  password = 'password123',
  orgName = 'Test Org',
): Promise<UserContext> {
  const res = await fetch(`${baseUrl}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, orgName }),
  })
  expect(res.status).toBe(201)
  const data = await res.json() as { accessToken: string; user: { orgId: string } }
  return { accessToken: data.accessToken, orgId: data.user.orgId }
}

async function getAnalytics(
  baseUrl: string,
  orgId: string,
  token: string,
): Promise<{
  agentCount: number
  credentialCount: number
  sessionCount: number
  commitmentCount: number
  activeSessionCount: number
  avgTurnsPerSession: number
}> {
  const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.status).toBe(200)
  return res.json() as any
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

async function createCredential(
  baseUrl: string,
  orgId: string,
  agentId: string,
  token: string,
): Promise<{ id: string }> {
  const expiry = new Date(Date.now() + 86400 * 1000).toISOString()
  const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentId,
      credentialHash: `hash-${Math.random().toString(36).slice(2)}`,
      schemaHash: 'schema-001',
      expiry,
    }),
  })
  expect(res.status).toBe(201)
  return res.json() as any
}

async function createSession(
  baseUrl: string,
  token: string,
  initiatorAgentId: string,
  counterpartyAgentId: string,
  orgId: string,
): Promise<{ id: string; status: string }> {
  const res = await fetch(`${baseUrl}/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      initiatorAgentId,
      counterpartyAgentId,
      initiatorOrgId: orgId,
      counterpartyOrgId: orgId,
      sessionType: 'intra_org',
    }),
  })
  expect(res.status).toBe(201)
  return res.json() as any
}

async function appendTurn(
  baseUrl: string,
  sessionId: string,
  agentId: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/v1/sessions/${sessionId}/turns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentId,
      terms: { value: 100, currency: 'USD' },
      proofType: 'mandate_bound',
      proof: { protocol: 'groth16' },
      publicSignals: { signals: [1, 2, 3] },
      signature: 'sig-' + Math.random().toString(36).slice(2),
    }),
  })
  expect(res.status).toBe(201)
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('E2E: Analytics Dashboard', () => {
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

  // ── Empty org ──────────────────────────────────────────────────────────────

  describe('Empty org returns all zeros', () => {
    it('fresh org has all-zero analytics', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'empty@example.com')

      const analytics = await getAnalytics(baseUrl, orgId, accessToken)

      expect(analytics.agentCount).toBe(0)
      expect(analytics.credentialCount).toBe(0)
      expect(analytics.sessionCount).toBe(0)
      expect(analytics.commitmentCount).toBe(0)
      expect(analytics.activeSessionCount).toBe(0)
      expect(analytics.avgTurnsPerSession).toBe(0)
    })
  })

  // ── Agent count ────────────────────────────────────────────────────────────

  describe('Agent count accuracy', () => {
    it('reflects correct agent count after creating agents', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'agentcount@example.com')

      await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkA1')
      await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkA2')
      await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkA3')

      const analytics = await getAnalytics(baseUrl, orgId, accessToken)
      expect(analytics.agentCount).toBe(3)
    })
  })

  // ── Credential count ───────────────────────────────────────────────────────

  describe('Credential count accuracy', () => {
    it('reflects correct credential count', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'credcount@example.com')

      const agent = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkC1')
      await createCredential(baseUrl, orgId, agent.id, accessToken)
      await createCredential(baseUrl, orgId, agent.id, accessToken)

      const analytics = await getAnalytics(baseUrl, orgId, accessToken)
      expect(analytics.agentCount).toBe(1)
      expect(analytics.credentialCount).toBe(2)
    })
  })

  // ── Session count ──────────────────────────────────────────────────────────

  describe('Session count and active session count', () => {
    it('reflects correct session count and active count', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'sesscount@example.com')

      const agentA = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkSC1')
      const agentB = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkSC2')
      const agentC = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkSC3')

      // Create 2 sessions
      await createSession(baseUrl, accessToken, agentA.id, agentB.id, orgId)
      await createSession(baseUrl, accessToken, agentA.id, agentC.id, orgId)

      const analytics = await getAnalytics(baseUrl, orgId, accessToken)
      expect(analytics.sessionCount).toBe(2)
      expect(analytics.activeSessionCount).toBe(2)
    })

    it('session count is scoped to this org only', async () => {
      const { accessToken: tokenA, orgId: orgA } = await registerAndGetToken(baseUrl, 'scopeA@example.com')
      const { accessToken: tokenB, orgId: orgB } = await registerAndGetToken(baseUrl, 'scopeB@example.com')

      const agA1 = await createAgent(baseUrl, orgA, tokenA, 'did:key:z6MkScope1')
      const agA2 = await createAgent(baseUrl, orgA, tokenA, 'did:key:z6MkScope2')
      const agB1 = await createAgent(baseUrl, orgB, tokenB, 'did:key:z6MkScope3')
      const agB2 = await createAgent(baseUrl, orgB, tokenB, 'did:key:z6MkScope4')

      await createSession(baseUrl, tokenA, agA1.id, agA2.id, orgA)
      await createSession(baseUrl, tokenA, agA1.id, agA2.id, orgA)
      await createSession(baseUrl, tokenB, agB1.id, agB2.id, orgB)

      const analyticsA = await getAnalytics(baseUrl, orgA, tokenA)
      const analyticsB = await getAnalytics(baseUrl, orgB, tokenB)

      expect(analyticsA.sessionCount).toBe(2)
      expect(analyticsB.sessionCount).toBe(1)
    })
  })

  // ── avgTurnsPerSession calculation ─────────────────────────────────────────

  describe('avgTurnsPerSession calculation', () => {
    it('avgTurnsPerSession is 0 when no sessions exist', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'avg0@example.com')
      const analytics = await getAnalytics(baseUrl, orgId, accessToken)
      expect(analytics.avgTurnsPerSession).toBe(0)
    })

    it('avgTurnsPerSession equals the number of turns when there is one session', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'avg1@example.com')

      const agentA = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkAvg1')
      const agentB = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkAvg2')

      const sess = await createSession(baseUrl, accessToken, agentA.id, agentB.id, orgId)

      // Add 3 turns to this session
      await appendTurn(baseUrl, sess.id, agentA.id, accessToken)
      await appendTurn(baseUrl, sess.id, agentB.id, accessToken)
      await appendTurn(baseUrl, sess.id, agentA.id, accessToken)

      const analytics = await getAnalytics(baseUrl, orgId, accessToken)
      expect(analytics.sessionCount).toBe(1)
      expect(analytics.avgTurnsPerSession).toBe(3)
    })

    it('avgTurnsPerSession is averaged across multiple sessions', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'avg2@example.com')

      const agentA = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkAvgM1')
      const agentB = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkAvgM2')

      // Session 1: 2 turns
      const sess1 = await createSession(baseUrl, accessToken, agentA.id, agentB.id, orgId)
      await appendTurn(baseUrl, sess1.id, agentA.id, accessToken)
      await appendTurn(baseUrl, sess1.id, agentB.id, accessToken)

      // Session 2: 4 turns
      const sess2 = await createSession(baseUrl, accessToken, agentA.id, agentB.id, orgId)
      await appendTurn(baseUrl, sess2.id, agentA.id, accessToken)
      await appendTurn(baseUrl, sess2.id, agentB.id, accessToken)
      await appendTurn(baseUrl, sess2.id, agentA.id, accessToken)
      await appendTurn(baseUrl, sess2.id, agentB.id, accessToken)

      const analytics = await getAnalytics(baseUrl, orgId, accessToken)
      expect(analytics.sessionCount).toBe(2)
      // (2 + 4) / 2 = 3.0
      expect(analytics.avgTurnsPerSession).toBe(3)
    })

    it('session with no turns contributes 0 to avg', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'avg3@example.com')

      const agentA = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkAvgZ1')
      const agentB = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkAvgZ2')

      // Session 1: 0 turns
      await createSession(baseUrl, accessToken, agentA.id, agentB.id, orgId)

      // Session 2: 2 turns
      const sess2 = await createSession(baseUrl, accessToken, agentA.id, agentB.id, orgId)
      await appendTurn(baseUrl, sess2.id, agentA.id, accessToken)
      await appendTurn(baseUrl, sess2.id, agentB.id, accessToken)

      const analytics = await getAnalytics(baseUrl, orgId, accessToken)
      expect(analytics.sessionCount).toBe(2)
      // (0 + 2) / 2 = 1.0
      expect(analytics.avgTurnsPerSession).toBe(1)
    })
  })

  // ── Access control ─────────────────────────────────────────────────────────

  describe('Analytics access control', () => {
    it('returns 401 without authentication', async () => {
      const { orgId } = await registerAndGetToken(baseUrl, 'noauth@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/analytics`)
      expect(res.status).toBe(401)
    })

    it('returns 403 when accessing another org analytics', async () => {
      const { accessToken: tokenA } = await registerAndGetToken(baseUrl, 'secA@example.com')
      const { orgId: orgB } = await registerAndGetToken(baseUrl, 'secB@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgB}/analytics`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      })
      expect(res.status).toBe(403)
    })
  })

  // ── Full scenario ──────────────────────────────────────────────────────────

  describe('Full scenario: create entities then verify all analytics counts', () => {
    it('all counts are accurate after creating agents, credentials, and sessions', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'full@example.com')

      // Create 2 agents
      const agent1 = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkFull1')
      const agent2 = await createAgent(baseUrl, orgId, accessToken, 'did:key:z6MkFull2')

      // Create 3 credentials
      await createCredential(baseUrl, orgId, agent1.id, accessToken)
      await createCredential(baseUrl, orgId, agent1.id, accessToken)
      await createCredential(baseUrl, orgId, agent2.id, accessToken)

      // Create 2 sessions
      const sess1 = await createSession(baseUrl, accessToken, agent1.id, agent2.id, orgId)
      const sess2 = await createSession(baseUrl, accessToken, agent1.id, agent2.id, orgId)

      // Session 1 gets 1 turn, session 2 gets 3 turns
      await appendTurn(baseUrl, sess1.id, agent1.id, accessToken)
      await appendTurn(baseUrl, sess2.id, agent1.id, accessToken)
      await appendTurn(baseUrl, sess2.id, agent2.id, accessToken)
      await appendTurn(baseUrl, sess2.id, agent1.id, accessToken)

      const analytics = await getAnalytics(baseUrl, orgId, accessToken)

      expect(analytics.agentCount).toBe(2)
      expect(analytics.credentialCount).toBe(3)
      expect(analytics.sessionCount).toBe(2)
      expect(analytics.activeSessionCount).toBe(2)
      expect(analytics.commitmentCount).toBe(0) // no commitments created
      // avg turns: (1 + 3) / 2 = 2.0
      expect(analytics.avgTurnsPerSession).toBe(2)
    })
  })
})
