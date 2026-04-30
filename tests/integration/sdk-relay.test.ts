/**
 * Integration tests: SDK ↔ Relay
 *
 * Starts a real Fastify relay server on a random port and exercises all
 * major API surfaces via HTTP fetch — no mocks of the server layer.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildServer } from '../../packages/relay/src/server.js'
import { clearAuthStores } from '../../packages/relay/src/routes/auth.js'
import { clearAgentStores } from '../../packages/relay/src/routes/agents.js'
import { clearCredentialStores } from '../../packages/relay/src/routes/credentials.js'
import { clearSessionStores } from '../../packages/relay/src/routes/sessions.js'
import { clearCommitmentStores } from '../../packages/relay/src/routes/commitments.js'

// ─── helpers ────────────────────────────────────────────────────────────────

async function register(
  baseUrl: string,
  email: string,
  password = 'password123',
  orgName = 'Test Org',
) {
  const res = await fetch(`${baseUrl}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, orgName }),
  })
  return res
}

async function login(baseUrl: string, email: string, password = 'password123') {
  const res = await fetch(`${baseUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return res
}

async function createAgent(
  baseUrl: string,
  orgId: string,
  token: string,
  did = 'did:key:z6Mk' + Math.random().toString(36).slice(2),
) {
  return fetch(`${baseUrl}/v1/orgs/${orgId}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      did,
      name: 'test-agent',
      publicKey: '0xabc123',
    }),
  })
}

async function createCredential(
  baseUrl: string,
  orgId: string,
  agentId: string,
  token: string,
) {
  const expiry = new Date(Date.now() + 86400 * 1000).toISOString()
  return fetch(`${baseUrl}/v1/orgs/${orgId}/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      agentId,
      credentialHash: `hash-${Math.random().toString(36).slice(2)}`,
      schemaHash: 'schema-hash-001',
      expiry,
    }),
  })
}

// ─── suite ──────────────────────────────────────────────────────────────────

describe('SDK ↔ Relay Integration', () => {
  let app: Awaited<ReturnType<typeof buildServer>>
  let baseUrl: string

  beforeAll(async () => {
    app = await buildServer({ logger: false })
    await app.listen({ port: 0, host: '127.0.0.1' })
    const address = app.server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${address.port}`
  }, 30_000)

  afterAll(async () => {
    if (app) await app.close()
  })

  beforeEach(async () => {
    await clearAuthStores()
    await clearAgentStores()
    await clearCredentialStores()
    await clearSessionStores()
    await clearCommitmentStores()
  })

  // ── Health ────────────────────────────────────────────────────────────────

  it('GET /health returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string }
    expect(body.status).toBe('ok')
  })

  // ── Auth: Register ────────────────────────────────────────────────────────

  it('POST /v1/auth/register creates user and returns tokens', async () => {
    const res = await register(baseUrl, 'alice@example.com')
    expect(res.status).toBe(201)
    const data = await res.json() as {
      accessToken: string
      refreshToken: string
      expiresIn: number
      user: { id: string; email: string; orgId: string; role: string }
    }
    expect(data.accessToken).toBeTruthy()
    expect(data.refreshToken).toBeTruthy()
    expect(data.expiresIn).toBe(900)
    expect(data.user.email).toBe('alice@example.com')
    expect(data.user.role).toBe('owner')
    expect(data.user.orgId).toBeTruthy()
  })

  it('POST /v1/auth/register returns 409 on duplicate email', async () => {
    await register(baseUrl, 'dup@example.com')
    const res2 = await register(baseUrl, 'dup@example.com')
    expect(res2.status).toBe(409)
    const body = await res2.json() as { code: string }
    expect(body.code).toBe('CONFLICT')
  })

  it('POST /v1/auth/register returns 400 on invalid body', async () => {
    const res = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'short', orgName: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  // ── Auth: Login ───────────────────────────────────────────────────────────

  it('POST /v1/auth/login returns tokens for valid credentials', async () => {
    await register(baseUrl, 'bob@example.com', 'mypassword99', 'Bob Org')
    const res = await login(baseUrl, 'bob@example.com', 'mypassword99')
    expect(res.status).toBe(200)
    const data = await res.json() as { accessToken: string; user: { email: string } }
    expect(data.accessToken).toBeTruthy()
    expect(data.user.email).toBe('bob@example.com')
  })

  it('POST /v1/auth/login returns 401 for wrong password', async () => {
    await register(baseUrl, 'carol@example.com', 'correctpassword', 'Carol Org')
    const res = await login(baseUrl, 'carol@example.com', 'wrongpassword')
    expect(res.status).toBe(401)
  })

  it('POST /v1/auth/login returns 401 for unknown email', async () => {
    const res = await login(baseUrl, 'ghost@example.com', 'any')
    expect(res.status).toBe(401)
  })

  // ── Auth: Refresh ─────────────────────────────────────────────────────────

  it('POST /v1/auth/refresh issues new tokens from valid refresh token', async () => {
    const regRes = await register(baseUrl, 'refresh@example.com')
    const { refreshToken } = await regRes.json() as { refreshToken: string }

    const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { accessToken: string; refreshToken: string }
    expect(data.accessToken).toBeTruthy()
    expect(data.refreshToken).toBeTruthy()
  })

  it('POST /v1/auth/refresh returns 401 for garbage token', async () => {
    const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'not.a.valid.token' }),
    })
    expect(res.status).toBe(401)
  })

  // ── Agents ────────────────────────────────────────────────────────────────

  it('POST /v1/orgs/:orgId/agents provisions an agent', async () => {
    const regRes = await register(baseUrl, 'dave@example.com')
    const { accessToken, user } = await regRes.json() as { accessToken: string; user: { orgId: string } }

    const res = await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkTest001')
    expect(res.status).toBe(201)
    const agent = await res.json() as { id: string; did: string; orgId: string }
    expect(agent.did).toBe('did:key:z6MkTest001')
    expect(agent.orgId).toBe(user.orgId)
  })

  it('GET /v1/orgs/:orgId/agents lists agents for org', async () => {
    const regRes = await register(baseUrl, 'eve@example.com')
    const { accessToken, user } = await regRes.json() as { accessToken: string; user: { orgId: string } }

    await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkAgentA')
    await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkAgentB')

    const res = await fetch(`${baseUrl}/v1/orgs/${user.orgId}/agents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[]; pagination: { total: number } }
    expect(data.data).toHaveLength(2)
    expect(data.pagination.total).toBe(2)
  })

  it('POST /v1/orgs/:orgId/agents returns 409 on duplicate DID', async () => {
    const regRes = await register(baseUrl, 'dup-agent@example.com')
    const { accessToken, user } = await regRes.json() as { accessToken: string; user: { orgId: string } }

    await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkDup')
    const res2 = await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkDup')
    expect(res2.status).toBe(409)
  })

  it('GET /v1/orgs/:orgId/agents returns 401 without auth', async () => {
    const res = await fetch(`${baseUrl}/v1/orgs/some-org-id/agents`)
    expect(res.status).toBe(401)
  })

  // ── Credentials ───────────────────────────────────────────────────────────

  it('POST /v1/orgs/:orgId/credentials issues a credential', async () => {
    const regRes = await register(baseUrl, 'frank@example.com')
    const { accessToken, user } = await regRes.json() as { accessToken: string; user: { orgId: string } }

    const agentRes = await createAgent(baseUrl, user.orgId, accessToken)
    const agent = await agentRes.json() as { id: string }

    const res = await createCredential(baseUrl, user.orgId, agent.id, accessToken)
    expect(res.status).toBe(201)
    const cred = await res.json() as { id: string; orgId: string; agentId: string; revoked: boolean }
    expect(cred.orgId).toBe(user.orgId)
    expect(cred.agentId).toBe(agent.id)
    expect(cred.revoked).toBe(false)
  })

  it('GET /v1/orgs/:orgId/credentials lists credentials for org', async () => {
    const regRes = await register(baseUrl, 'grace@example.com')
    const { accessToken, user } = await regRes.json() as { accessToken: string; user: { orgId: string } }

    const agentRes = await createAgent(baseUrl, user.orgId, accessToken)
    const agent = await agentRes.json() as { id: string }

    await createCredential(baseUrl, user.orgId, agent.id, accessToken)

    const res = await fetch(`${baseUrl}/v1/orgs/${user.orgId}/credentials`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[]; pagination: { total: number } }
    expect(data.data).toHaveLength(1)
  })

  it('DELETE /v1/orgs/:orgId/credentials/:id revokes a credential', async () => {
    const regRes = await register(baseUrl, 'henry@example.com')
    const { accessToken, user } = await regRes.json() as { accessToken: string; user: { orgId: string } }

    const agentRes = await createAgent(baseUrl, user.orgId, accessToken)
    const agent = await agentRes.json() as { id: string }

    const credRes = await createCredential(baseUrl, user.orgId, agent.id, accessToken)
    const cred = await credRes.json() as { id: string }

    const res = await fetch(`${baseUrl}/v1/orgs/${user.orgId}/credentials/${cred.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { message: string }
    expect(body.message).toBe('Credential revoked')
  })

  // ── Sessions ──────────────────────────────────────────────────────────────

  it('POST /v1/sessions creates an intra-org session', async () => {
    const regRes = await register(baseUrl, 'iris@example.com')
    const { accessToken, user } = await regRes.json() as { accessToken: string; user: { orgId: string } }

    const agentARes = await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkIntraA')
    const agentBRes = await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkIntraB')
    const agentA = await agentARes.json() as { id: string }
    const agentB = await agentBRes.json() as { id: string }

    const res = await fetch(`${baseUrl}/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        initiatorAgentId: agentA.id,
        counterpartyAgentId: agentB.id,
        initiatorOrgId: user.orgId,
        counterpartyOrgId: user.orgId,
        sessionType: 'intra_org',
      }),
    })
    expect(res.status).toBe(201)
    const session = await res.json() as { id: string; status: string; sessionType: string }
    expect(session.status).toBe('active')
    expect(session.sessionType).toBe('intra_org')
  })

  it('POST /v1/sessions creates a cross-org session with invite token', async () => {
    const orgARes = await register(baseUrl, 'jack@example.com', 'pass1234', 'Org A')
    const { accessToken: tokenA, user: userA } = await orgARes.json() as {
      accessToken: string; user: { orgId: string }
    }

    const orgBRes = await register(baseUrl, 'kate@example.com', 'pass1234', 'Org B')
    const { user: userB } = await orgBRes.json() as { accessToken: string; user: { orgId: string } }

    const agentARes = await createAgent(baseUrl, userA.orgId, tokenA, 'did:key:z6MkCrossA')
    const agentA = await agentARes.json() as { id: string }

    const res = await fetch(`${baseUrl}/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        initiatorAgentId: agentA.id,
        counterpartyAgentId: null,
        initiatorOrgId: userA.orgId,
        counterpartyOrgId: userB.orgId,
        sessionType: 'cross_org',
      }),
    })
    expect(res.status).toBe(201)
    const session = await res.json() as { id: string; status: string; inviteToken: string }
    expect(session.status).toBe('pending_acceptance')
    expect(session.inviteToken).toBeTruthy()
  })

  it('GET /v1/sessions lists sessions for authenticated user org', async () => {
    const regRes = await register(baseUrl, 'leo@example.com')
    const { accessToken, user } = await regRes.json() as { accessToken: string; user: { orgId: string } }

    const agentARes = await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkListA')
    const agentBRes = await createAgent(baseUrl, user.orgId, accessToken, 'did:key:z6MkListB')
    const agentA = await agentARes.json() as { id: string }
    const agentB = await agentBRes.json() as { id: string }

    await fetch(`${baseUrl}/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        initiatorAgentId: agentA.id,
        counterpartyAgentId: agentB.id,
        initiatorOrgId: user.orgId,
        counterpartyOrgId: user.orgId,
        sessionType: 'intra_org',
      }),
    })

    const res = await fetch(`${baseUrl}/v1/sessions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[]; pagination: { total: number } }
    expect(data.data).toHaveLength(1)
  })
})
