/**
 * Integration test: Full Protocol Flow
 *
 * Exercises the complete Attestara pipeline through HTTP:
 *   Register two orgs → provision agents → issue credentials →
 *   create cross-org session → accept session → post negotiation turns →
 *   create commitment → verify commitment
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildServer } from '../../packages/relay/src/server.js'
import { clearAuthStores } from '../../packages/relay/src/routes/auth.js'
import { clearAgentStores } from '../../packages/relay/src/routes/agents.js'
import { clearCredentialStores } from '../../packages/relay/src/routes/credentials.js'
import { clearSessionStores } from '../../packages/relay/src/routes/sessions.js'
import { clearCommitmentStores } from '../../packages/relay/src/routes/commitments.js'

// ─── typed fetch helpers ─────────────────────────────────────────────────────

interface AuthResult {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; orgId: string; role: string }
}

interface Agent {
  id: string
  orgId: string
  did: string
  name: string
  status: string
}

interface Credential {
  id: string
  orgId: string
  agentId: string
  credentialHash: string
  schemaHash: string
  revoked: boolean
}

interface Session {
  id: string
  initiatorAgentId: string
  counterpartyAgentId: string
  initiatorOrgId: string
  counterpartyOrgId: string
  sessionType: string
  status: string
  inviteToken?: string
  turnCount: number
}

interface Turn {
  id: string
  sessionId: string
  agentId: string
  sequenceNumber: number
  terms: Record<string, unknown>
}

interface Commitment {
  id: string
  sessionId: string
  agreementHash: string
  parties: string[]
  credentialHashes: string[]
  verified: boolean
}

async function post<T>(baseUrl: string, path: string, body: unknown, token?: string): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json() as T
  return { status: res.status, data }
}

async function get<T>(baseUrl: string, path: string, token: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as T
  return { status: res.status, data }
}

// ─── suite ───────────────────────────────────────────────────────────────────

describe('Full Protocol Flow', () => {
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

  beforeEach(async () => {
    await clearAuthStores()
    await clearAgentStores()
    await clearCredentialStores()
    await clearSessionStores()
    await clearCommitmentStores()
  })

  it('completes the full negotiation and commitment pipeline', async () => {
    // ── Step 1: Register two organisations ───────────────────────────────────
    const regA = await post<AuthResult>(baseUrl, '/v1/auth/register', {
      email: 'orgA@example.com',
      password: 'password123',
      orgName: 'Org Alpha',
    })
    expect(regA.status).toBe(201)
    const { accessToken: tokenA, user: userA } = regA.data

    const regB = await post<AuthResult>(baseUrl, '/v1/auth/register', {
      email: 'orgB@example.com',
      password: 'password123',
      orgName: 'Org Beta',
    })
    expect(regB.status).toBe(201)
    const { accessToken: tokenB, user: userB } = regB.data

    expect(userA.orgId).not.toBe(userB.orgId)

    // ── Step 2: Each org provisions an agent ─────────────────────────────────
    const agentARes = await post<Agent>(baseUrl, `/v1/orgs/${userA.orgId}/agents`, {
      did: 'did:key:z6MkAlpha001',
      name: 'Alpha Agent',
      publicKey: '0xPublicKeyAlpha',
    }, tokenA)
    expect(agentARes.status).toBe(201)
    const agentA = agentARes.data

    const agentBRes = await post<Agent>(baseUrl, `/v1/orgs/${userB.orgId}/agents`, {
      did: 'did:key:z6MkBeta001',
      name: 'Beta Agent',
      publicKey: '0xPublicKeyBeta',
    }, tokenB)
    expect(agentBRes.status).toBe(201)
    const agentB = agentBRes.data

    expect(agentA.orgId).toBe(userA.orgId)
    expect(agentB.orgId).toBe(userB.orgId)

    // ── Step 3: Org A issues a credential to their agent ─────────────────────
    const expiry = new Date(Date.now() + 86400 * 1000).toISOString()
    const credRes = await post<Credential>(baseUrl, `/v1/orgs/${userA.orgId}/credentials`, {
      agentId: agentA.id,
      credentialHash: 'mandate-hash-alpha-001',
      schemaHash: 'agent-authority-v1',
      expiry,
      credentialData: { domain: 'procurement', maxValue: 500000 },
    }, tokenA)
    expect(credRes.status).toBe(201)
    const credential = credRes.data
    expect(credential.agentId).toBe(agentA.id)
    expect(credential.revoked).toBe(false)

    // Verify credential appears in list
    const credList = await get<{ data: Credential[] }>(
      baseUrl, `/v1/orgs/${userA.orgId}/credentials`, tokenA,
    )
    expect(credList.status).toBe(200)
    expect(credList.data.data).toHaveLength(1)

    // ── Step 4: Create cross-org session (Org A initiates) ───────────────────
    const sessionRes = await post<Session>(baseUrl, '/v1/sessions', {
      initiatorAgentId: agentA.id,
      counterpartyAgentId: agentB.id,
      initiatorOrgId: userA.orgId,
      counterpartyOrgId: userB.orgId,
      sessionType: 'cross_org',
    }, tokenA)
    expect(sessionRes.status).toBe(201)
    const session = sessionRes.data
    expect(session.status).toBe('pending_acceptance')
    expect(session.inviteToken).toBeTruthy()

    const sessionId = session.id
    const inviteToken = session.inviteToken!

    // ── Step 5: Org B accepts session with invite token ───────────────────────
    const acceptRes = await post<Session>(baseUrl, `/v1/sessions/${sessionId}/accept`, {
      inviteToken,
    }, tokenB)
    expect(acceptRes.status).toBe(200)
    expect(acceptRes.data.status).toBe('active')

    // ── Step 6: Post three negotiation turns ─────────────────────────────────
    const turnPayload = (agentId: string, price: number, action: string) => ({
      agentId,
      terms: { price, currency: 'USDC', action },
      proofType: 'MandateBound',
      proof: { pi_a: ['0x1', '0x2'], pi_b: [['0x3', '0x4'], ['0x5', '0x6']], pi_c: ['0x7', '0x8'] },
      publicSignals: { signals: ['1', '0'] },
      signature: `sig-${agentId}-${price}`,
    })

    // Turn 1: Org A proposes
    const turn1Res = await post<Turn>(baseUrl, `/v1/sessions/${sessionId}/turns`,
      turnPayload(agentA.id, 400000, 'propose'), tokenA)
    expect(turn1Res.status).toBe(201)
    expect(turn1Res.data.sequenceNumber).toBe(1)
    expect(turn1Res.data.agentId).toBe(agentA.id)

    // Turn 2: Org B counters
    const turn2Res = await post<Turn>(baseUrl, `/v1/sessions/${sessionId}/turns`,
      turnPayload(agentB.id, 420000, 'counter'), tokenB)
    expect(turn2Res.status).toBe(201)
    expect(turn2Res.data.sequenceNumber).toBe(2)
    expect(turn2Res.data.agentId).toBe(agentB.id)

    // Turn 3: Org A accepts counter
    const turn3Res = await post<Turn>(baseUrl, `/v1/sessions/${sessionId}/turns`,
      turnPayload(agentA.id, 420000, 'accept'), tokenA)
    expect(turn3Res.status).toBe(201)
    expect(turn3Res.data.sequenceNumber).toBe(3)

    // Verify turns are listed
    const turnsRes = await get<{ data: Turn[]; pagination: { total: number } }>(
      baseUrl, `/v1/sessions/${sessionId}/turns`, tokenA,
    )
    expect(turnsRes.status).toBe(200)
    expect(turnsRes.data.data).toHaveLength(3)

    // ── Step 7: Create a commitment from the agreed session ───────────────────
    const commitRes = await post<Commitment>(baseUrl, `/v1/sessions/${sessionId}/commitment`, {
      agreementHash: 'agreement-hash-420000-usdc',
      parties: [agentA.id, agentB.id],
      credentialHashes: [credential.credentialHash],
      proofs: {
        mandateBound: { pi_a: ['0xa', '0xb'], pi_b: [['0xc', '0xd'], ['0xe', '0xf']], pi_c: ['0x10', '0x11'] },
      },
      circuitVersions: ['MandateBound@1.0.0'],
    }, tokenA)
    expect(commitRes.status).toBe(201)
    const commitment = commitRes.data
    expect(commitment.sessionId).toBe(sessionId)
    expect(commitment.parties).toContain(agentA.id)
    expect(commitment.parties).toContain(agentB.id)
    expect(commitment.verified).toBe(false)

    // ── Step 8: Verify the commitment ────────────────────────────────────────
    const verifyRes = await post<Commitment>(
      baseUrl, `/v1/commitments/${commitment.id}/verify`, {}, tokenA,
    )
    expect(verifyRes.status).toBe(200)
    expect(verifyRes.data.verified).toBe(true)

    // Confirm via GET
    const getCommitRes = await get<Commitment>(
      baseUrl, `/v1/commitments/${commitment.id}`, tokenA,
    )
    expect(getCommitRes.status).toBe(200)
    expect(getCommitRes.data.verified).toBe(true)
    expect(getCommitRes.data.agreementHash).toBe('agreement-hash-420000-usdc')

    // Also visible in org commitment list
    const listCommitmentsA = await get<{ data: Commitment[] }>(
      baseUrl, '/v1/commitments', tokenA,
    )
    expect(listCommitmentsA.status).toBe(200)
    expect(listCommitmentsA.data.data).toHaveLength(1)

    const listCommitmentsB = await get<{ data: Commitment[] }>(
      baseUrl, '/v1/commitments', tokenB,
    )
    expect(listCommitmentsB.status).toBe(200)
    expect(listCommitmentsB.data.data).toHaveLength(1)
  })

  it('rejects duplicate commitment for the same session', async () => {
    const regRes = await post<AuthResult>(baseUrl, '/v1/auth/register', {
      email: 'dupcommit@example.com',
      password: 'password123',
      orgName: 'Dup Commit Org',
    })
    const { accessToken: token, user } = regRes.data

    const agentARes = await post<Agent>(baseUrl, `/v1/orgs/${user.orgId}/agents`, {
      did: 'did:key:z6MkDupA',
      name: 'Agent A',
      publicKey: '0xA',
    }, token)
    const agentBRes = await post<Agent>(baseUrl, `/v1/orgs/${user.orgId}/agents`, {
      did: 'did:key:z6MkDupB',
      name: 'Agent B',
      publicKey: '0xB',
    }, token)
    const agentA = agentARes.data
    const agentB = agentBRes.data

    const sessionRes = await post<Session>(baseUrl, '/v1/sessions', {
      initiatorAgentId: agentA.id,
      counterpartyAgentId: agentB.id,
      initiatorOrgId: user.orgId,
      counterpartyOrgId: user.orgId,
      sessionType: 'intra_org',
    }, token)
    const sessionId = sessionRes.data.id

    const commitBody = {
      agreementHash: 'hash-dup-test',
      parties: [agentA.id, agentB.id],
      credentialHashes: ['cred-hash-1'],
      proofs: {},
      circuitVersions: ['v1.0.0'],
    }

    const first = await post<Commitment>(baseUrl, `/v1/sessions/${sessionId}/commitment`, commitBody, token)
    expect(first.status).toBe(201)

    const second = await post<{ code: string }>(
      baseUrl, `/v1/sessions/${sessionId}/commitment`, commitBody, token,
    )
    expect(second.status).toBe(409)
    expect(second.data.code).toBe('DUPLICATE_SESSION_COMMITMENT')
  })

  it('rejects invite token from wrong session', async () => {
    const regA = await post<AuthResult>(baseUrl, '/v1/auth/register', {
      email: 'wrongtoken-a@example.com', password: 'password123', orgName: 'Org WA',
    })
    const regB = await post<AuthResult>(baseUrl, '/v1/auth/register', {
      email: 'wrongtoken-b@example.com', password: 'password123', orgName: 'Org WB',
    })
    const { accessToken: tokenA, user: userA } = regA.data
    const { accessToken: tokenB, user: userB } = regB.data

    const agentARes = await post<Agent>(baseUrl, `/v1/orgs/${userA.orgId}/agents`, {
      did: 'did:key:z6MkWrongA',
      name: 'WA',
      publicKey: '0xW',
    }, tokenA)
    const agentA = agentARes.data

    // Create two different sessions
    const sess1Res = await post<Session>(baseUrl, '/v1/sessions', {
      initiatorAgentId: agentA.id,
      counterpartyAgentId: null,
      initiatorOrgId: userA.orgId,
      counterpartyOrgId: userB.orgId,
      sessionType: 'cross_org',
    }, tokenA)
    const sess2Res = await post<Session>(baseUrl, '/v1/sessions', {
      initiatorAgentId: agentA.id,
      counterpartyAgentId: null,
      initiatorOrgId: userA.orgId,
      counterpartyOrgId: userB.orgId,
      sessionType: 'cross_org',
    }, tokenA)

    // Use session 1's invite token to accept session 2
    const wrongAccept = await post<{ code: string }>(
      baseUrl, `/v1/sessions/${sess2Res.data.id}/accept`,
      { inviteToken: sess1Res.data.inviteToken! },
      tokenB,
    )
    expect(wrongAccept.status).toBe(401)
    expect(wrongAccept.data.code).toBe('INVALID_TOKEN')
  })
})
