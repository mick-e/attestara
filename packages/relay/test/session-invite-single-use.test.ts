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

describe('Session invite token single-use enforcement', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  it('should return 409 INVITE_ALREADY_CONSUMED on a second accept of the same invite token', async () => {
    const app = await createApp()
    const org1 = await registerUser(app, `single-use-init-${randomUUID().slice(0, 6)}@example.com`)
    const org2 = await registerUser(app, `single-use-cp-${randomUUID().slice(0, 6)}@example.com`)
    const agent1 = await createAgent(app, org1.accessToken, org1.user.orgId)
    const agent2 = await createAgent(app, org2.accessToken, org2.user.orgId)

    // Create cross-org session (returns single-use inviteToken)
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
    expect(session.inviteToken).toBeDefined()

    // First accept -> 200 OK
    const firstAccept = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${session.id}/accept`,
      headers: { authorization: `Bearer ${org2.accessToken}` },
      payload: { inviteToken: session.inviteToken },
    })
    expect(firstAccept.statusCode).toBe(200)
    const firstBody = JSON.parse(firstAccept.payload)
    expect(firstBody.status).toBe('active')

    // Second accept with the same token -> 409 Conflict, INVITE_ALREADY_CONSUMED
    const secondAccept = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${session.id}/accept`,
      headers: { authorization: `Bearer ${org2.accessToken}` },
      payload: { inviteToken: session.inviteToken },
    })
    expect(secondAccept.statusCode).toBe(409)
    const secondBody = JSON.parse(secondAccept.payload)
    expect(secondBody.code).toBe('INVITE_ALREADY_CONSUMED')
  })
})
