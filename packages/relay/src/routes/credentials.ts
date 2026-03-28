import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess } from '../middleware/auth.js'
import { credentialService } from '../services/credential.service.js'

export async function clearCredentialStores() {
  await credentialService.clearStores()
}

export function getCredentialStores() {
  return { credentials: (credentialService as any).credentials as Map<string, unknown> }
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

    const result = await credentialService.create(orgId, {
      agentId: parsed.data.agentId,
      credentialHash: parsed.data.credentialHash,
      schemaHash: parsed.data.schemaHash,
      ipfsCid: parsed.data.ipfsCid,
      credentialData: parsed.data.credentialData,
      expiry: parsed.data.expiry,
    })

    if ('error' in result) {
      return reply.status(409).send({
        code: 'CONFLICT',
        message: result.error,
        requestId: request.id,
      })
    }

    return reply.status(201).send(result)
  })

  // GET /v1/orgs/:orgId/credentials
  app.get('/orgs/:orgId/credentials', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const orgCreds = await credentialService.listByOrg(orgId)

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
    const credential = await credentialService.getById(id, orgId)

    if (!credential) {
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
    const credential = await credentialService.revoke(id, orgId)

    if (!credential) {
      return reply.status(404).send({
        code: 'CREDENTIAL_NOT_FOUND',
        message: 'Credential not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send({ message: 'Credential revoked', id })
  })
}
