import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireAuth, requireOrgAccess, type AuthContext } from '../middleware/auth.js'

interface StoredCredential {
  id: string
  orgId: string
  agentId: string
  credentialHash: string
  schemaHash: string
  ipfsCid: string | null
  credentialDataCached: Record<string, unknown> | null
  expiry: string
  revoked: boolean
  registeredTxHash: string | null
  createdAt: string
}

const credentials = new Map<string, StoredCredential>()

export function clearCredentialStores() {
  credentials.clear()
}

export function getCredentialStores() {
  return { credentials }
}

const createCredentialSchema = z.object({
  agentId: z.string().uuid(),
  credentialHash: z.string().min(1),
  schemaHash: z.string().min(1),
  ipfsCid: z.string().optional(),
  credentialData: z.record(z.unknown()).optional(),
  expiry: z.string().datetime(),
})

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'

export const credentialRoutes: FastifyPluginAsync = async (app) => {
  // POST /v1/orgs/:orgId/credentials
  app.post('/orgs/:orgId/credentials', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const parsed = createCredentialSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    // Check for duplicate hash
    for (const cred of credentials.values()) {
      if (cred.credentialHash === parsed.data.credentialHash) {
        return reply.status(409).send({
          code: 'CONFLICT',
          message: 'Credential hash already exists',
          requestId: request.id,
        })
      }
    }

    const credential: StoredCredential = {
      id: randomUUID(),
      orgId,
      agentId: parsed.data.agentId,
      credentialHash: parsed.data.credentialHash,
      schemaHash: parsed.data.schemaHash,
      ipfsCid: parsed.data.ipfsCid ?? null,
      credentialDataCached: parsed.data.credentialData ?? null,
      expiry: parsed.data.expiry,
      revoked: false,
      registeredTxHash: null,
      createdAt: new Date().toISOString(),
    }
    credentials.set(credential.id, credential)

    return reply.status(201).send(credential)
  })

  // GET /v1/orgs/:orgId/credentials
  app.get('/orgs/:orgId/credentials', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const orgCreds = Array.from(credentials.values()).filter(c => c.orgId === orgId)

    return reply.status(200).send({
      data: orgCreds,
      pagination: { total: orgCreds.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // GET /v1/orgs/:orgId/credentials/:id
  app.get('/orgs/:orgId/credentials/:id', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string }
    const credential = credentials.get(id)

    if (!credential || credential.orgId !== orgId) {
      return reply.status(404).send({
        code: 'CREDENTIAL_NOT_FOUND',
        message: 'Credential not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send(credential)
  })

  // DELETE /v1/orgs/:orgId/credentials/:id (revoke)
  app.delete('/orgs/:orgId/credentials/:id', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string }
    const credential = credentials.get(id)

    if (!credential || credential.orgId !== orgId) {
      return reply.status(404).send({
        code: 'CREDENTIAL_NOT_FOUND',
        message: 'Credential not found',
        requestId: request.id,
      })
    }

    credential.revoked = true

    return reply.status(200).send({ message: 'Credential revoked', id })
  })
}
