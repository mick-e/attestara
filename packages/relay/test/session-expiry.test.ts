import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { buildServer } from '../src/server.js'
import { getPrisma } from '../src/utils/prisma.js'
import { clearAllStores } from './helpers/db-cleanup.js'

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
    payload: { did, name: 'Agent', publicKey: '0xabcdef' },
  })
  return JSON.parse(res.payload)
}

/** Force a session's expiresAt into the past directly via Prisma. */
async function expireSession(sessionId: string): Promise<void> {
  await getPrisma().session.update({
    where: { id: sessionId },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  })
}

describe('Session expiry (7-day default, 410 Gone on access after expiry)', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  it('sets expiresAt approximately 7 days in the future on session creation', async () => {
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
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body.expiresAt).toBeDefined()
    const expiresMs = Date.parse(body.expiresAt)
    const deltaMs = expiresMs - Date.now()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    // Allow a generous 60s slack for test scheduling and clock drift.
    expect(deltaMs).toBeGreaterThan(sevenDaysMs - 60_000)
    expect(deltaMs).toBeLessThan(sevenDaysMs + 60_000)
  })

  it('GET /v1/sessions/:id returns 410 SESSION_EXPIRED for an expired session', async () => {
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
        sessionType: 'intra_org',
      },
    })
    const session = JSON.parse(createRes.payload)
    await expireSession(session.id)

    const res = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${session.id}`,
      headers: { authorization: `Bearer ${reg.accessToken}` },
    })
    expect(res.statusCode).toBe(410)
    expect(JSON.parse(res.payload).code).toBe('SESSION_EXPIRED')
  })

  it('GET /v1/sessions/:id/turns returns 410 SESSION_EXPIRED for an expired session', async () => {
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
        sessionType: 'intra_org',
      },
    })
    const session = JSON.parse(createRes.payload)
    await expireSession(session.id)

    const res = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${session.id}/turns`,
      headers: { authorization: `Bearer ${reg.accessToken}` },
    })
    expect(res.statusCode).toBe(410)
    expect(JSON.parse(res.payload).code).toBe('SESSION_EXPIRED')
  })

  it('POST /v1/sessions/:id/turns returns 410 SESSION_EXPIRED for an expired session', async () => {
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
        sessionType: 'intra_org',
      },
    })
    const session = JSON.parse(createRes.payload)
    await expireSession(session.id)

    const res = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${session.id}/turns`,
      headers: { authorization: `Bearer ${reg.accessToken}` },
      payload: {
        agentId: agent1.id,
        terms: { value: 100 },
        proofType: 'mandate_bound',
        proof: { pi_a: [], pi_b: [], pi_c: [] },
        publicSignals: { mandateHash: '0xabc' },
        signature: '0xdeadbeef',
      },
    })
    expect(res.statusCode).toBe(410)
    expect(JSON.parse(res.payload).code).toBe('SESSION_EXPIRED')
  })

  it('POST /v1/sessions/:id/accept returns 410 SESSION_EXPIRED for an expired cross-org session', async () => {
    const app = await createApp()
    const org1 = await registerUser(app, `exp-init-${randomUUID().slice(0, 6)}@example.com`)
    const org2 = await registerUser(app, `exp-cp-${randomUUID().slice(0, 6)}@example.com`)
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
    expect(createRes.statusCode).toBe(201)
    const session = JSON.parse(createRes.payload)
    const inviteToken = session.inviteToken as string
    // Expire AFTER capturing the invite token so we exercise the expiry path, not token validity.
    await expireSession(session.id)

    const res = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${session.id}/accept`,
      headers: { authorization: `Bearer ${org2.accessToken}` },
      payload: { inviteToken },
    })
    expect(res.statusCode).toBe(410)
    expect(JSON.parse(res.payload).code).toBe('SESSION_EXPIRED')
  })

  it('returns 410 SESSION_EXPIRED even if invite already consumed, when session is also expired', async () => {
    const app = await createApp()
    const org1 = await registerUser(app, `exp-dbl-init-${randomUUID().slice(0, 6)}@example.com`)
    const org2 = await registerUser(app, `exp-dbl-cp-${randomUUID().slice(0, 6)}@example.com`)
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
    expect(createRes.statusCode).toBe(201)
    const session = JSON.parse(createRes.payload)
    const inviteToken = session.inviteToken as string

    // First accept succeeds and consumes the invite (session still live).
    const firstAccept = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${session.id}/accept`,
      headers: { authorization: `Bearer ${org2.accessToken}` },
      payload: { inviteToken },
    })
    expect(firstAccept.statusCode).toBe(200)

    // Now expire the session. A second accept attempt hits both the "already consumed"
    // and "expired" conditions simultaneously. Per the error-code precedence, expiry wins.
    await expireSession(session.id)

    const secondAccept = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${session.id}/accept`,
      headers: { authorization: `Bearer ${org2.accessToken}` },
      payload: { inviteToken },
    })
    expect(secondAccept.statusCode).toBe(410)
    expect(JSON.parse(secondAccept.payload).code).toBe('SESSION_EXPIRED')
  })

  it('non-expired sessions work normally (control case)', async () => {
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
        sessionType: 'intra_org',
      },
    })
    const session = JSON.parse(createRes.payload)

    const getRes = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${session.id}`,
      headers: { authorization: `Bearer ${reg.accessToken}` },
    })
    expect(getRes.statusCode).toBe(200)

    const turnsRes = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${session.id}/turns`,
      headers: { authorization: `Bearer ${reg.accessToken}` },
    })
    expect(turnsRes.statusCode).toBe(200)
  })
})
