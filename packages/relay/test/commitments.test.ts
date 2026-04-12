import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { buildServer } from '../src/server.js'
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

async function createSession(app: any, token: string, orgId: string) {
  const agentRes1 = await app.inject({
    method: 'POST',
    url: `/v1/orgs/${orgId}/agents`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      did: `did:ethr:0x${randomUUID().replace(/-/g, '').slice(0, 40)}`,
      name: 'Agent A',
      publicKey: '0xabcdef',
    },
  })
  const agentRes2 = await app.inject({
    method: 'POST',
    url: `/v1/orgs/${orgId}/agents`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      did: `did:ethr:0x${randomUUID().replace(/-/g, '').slice(0, 40)}`,
      name: 'Agent B',
      publicKey: '0xabcdef2',
    },
  })
  const agent1 = JSON.parse(agentRes1.payload)
  const agent2 = JSON.parse(agentRes2.payload)

  const sessionRes = await app.inject({
    method: 'POST',
    url: '/v1/sessions',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      initiatorAgentId: agent1.id,
      counterpartyAgentId: agent2.id,
      initiatorOrgId: orgId,
      counterpartyOrgId: orgId,
      sessionType: 'intra_org',
    },
  })
  return JSON.parse(sessionRes.payload)
}

const validCommitmentPayload = {
  agreementHash: '0xagreementhash123',
  parties: ['org-a', 'org-b'],
  credentialHashes: ['0xcred1', '0xcred2'],
  proofs: { pi_a: [1, 2, 3], pi_b: [[4, 5]], pi_c: [6, 7] },
  circuitVersions: ['v1.0.0'],
}

describe('Commitment routes', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  describe('POST /v1/sessions/:sessionId/commitment', () => {
    it('should create a commitment and return 201', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const session = await createSession(app, reg.accessToken, reg.user.orgId)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/commitment`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: validCommitmentPayload,
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.id).toBeDefined()
      expect(body.sessionId).toBe(session.id)
      expect(body.agreementHash).toBe(validCommitmentPayload.agreementHash)
      expect(body.parties).toEqual(validCommitmentPayload.parties)
      expect(body.credentialHashes).toEqual(validCommitmentPayload.credentialHashes)
      expect(body.proofs).toEqual(validCommitmentPayload.proofs)
      expect(body.circuitVersions).toEqual(validCommitmentPayload.circuitVersions)
      expect(body.txHash).toBeNull()
      expect(body.blockNumber).toBeNull()
      expect(body.verified).toBe(false)
      expect(body.createdAt).toBeDefined()
    })

    it('should return 400 for missing required fields', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const session = await createSession(app, reg.accessToken, reg.user.orgId)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/commitment`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agreementHash: '0xabc' }, // missing required fields
      })

      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/sessions/some-session-id/commitment',
        payload: validCommitmentPayload,
      })

      expect(res.statusCode).toBe(401)
    })

    it('should return 409 for duplicate session commitment', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const session = await createSession(app, reg.accessToken, reg.user.orgId)

      // Create first commitment
      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/commitment`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: validCommitmentPayload,
      })

      // Attempt duplicate
      const res = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/commitment`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { ...validCommitmentPayload, agreementHash: '0xother' },
      })

      expect(res.statusCode).toBe(409)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('DUPLICATE_SESSION_COMMITMENT')
    })
  })

  describe('GET /v1/commitments', () => {
    it('should list commitments for authenticated user\'s org', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const session = await createSession(app, reg.accessToken, reg.user.orgId)

      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/commitment`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: validCommitmentPayload,
      })

      const res = await app.inject({
        method: 'GET',
        url: '/v1/commitments',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(1)
      expect(body.pagination).toBeDefined()
      expect(body.pagination.total).toBe(1)
    })

    it('should return empty list when org has no commitments', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'GET',
        url: '/v1/commitments',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(0)
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/commitments',
      })

      expect(res.statusCode).toBe(401)
    })

    it('should not return commitments from other orgs', async () => {
      const app = await createApp()
      const org1 = await registerUser(app, 'org1commits@example.com')
      const org2 = await registerUser(app, 'org2commits@example.com')

      const session = await createSession(app, org1.accessToken, org1.user.orgId)
      await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/commitment`,
        headers: { authorization: `Bearer ${org1.accessToken}` },
        payload: validCommitmentPayload,
      })

      const res = await app.inject({
        method: 'GET',
        url: '/v1/commitments',
        headers: { authorization: `Bearer ${org2.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.data).toHaveLength(0)
    })
  })

  describe('GET /v1/commitments/:id', () => {
    it('should return commitment by id', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const session = await createSession(app, reg.accessToken, reg.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/commitment`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: validCommitmentPayload,
      })
      const commitment = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/commitments/${commitment.id}`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.id).toBe(commitment.id)
      expect(body.sessionId).toBe(session.id)
    })

    it('should return 404 for unknown commitment', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'GET',
        url: '/v1/commitments/nonexistent-id',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(404)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('COMMITMENT_NOT_FOUND')
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'GET',
        url: '/v1/commitments/some-id',
      })

      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /v1/commitments/:id/verify', () => {
    it('should set verified=true and return 200', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const session = await createSession(app, reg.accessToken, reg.user.orgId)

      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/sessions/${session.id}/commitment`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: validCommitmentPayload,
      })
      const commitment = JSON.parse(createRes.payload)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/commitments/${commitment.id}/verify`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.id).toBe(commitment.id)
      expect(body.verified).toBe(true)
    })

    it('should return 404 for unknown commitment', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/commitments/nonexistent/verify',
        headers: { authorization: `Bearer ${reg.accessToken}` },
      })

      expect(res.statusCode).toBe(404)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('COMMITMENT_NOT_FOUND')
    })

    it('should return 401 without auth', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/commitments/some-id/verify',
      })

      expect(res.statusCode).toBe(401)
    })
  })
})
