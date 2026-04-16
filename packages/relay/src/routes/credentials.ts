import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess } from '../middleware/auth.js'
import { paginationQuery, buildPaginationOpts, buildPaginationResponse } from '../schemas/pagination.js'
import { credentialService } from '../services/credential.service.js'
import { recordAudit } from '../services/audit.service.js'
import {
  credentialSchema,
  createCredentialBody,
  errorResponse,
  paginatedResponse,
  paginationQuerySchema,
} from '../schemas/openapi.js'

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

export const credentialRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // POST /v1/orgs/:orgId/credentials
  app.post('/orgs/:orgId/credentials', {
    schema: {
      tags: ['Credentials'],
      summary: 'Create a credential',
      description: 'Registers a new W3C Verifiable Credential for an agent within the organisation.',
      body: createCredentialBody,
      response: { 201: credentialSchema, 400: errorResponse, 409: errorResponse },
    },
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
    schema: {
      tags: ['Credentials'],
      summary: 'List credentials for an organisation',
      description: 'Returns a paginated list of credentials belonging to the specified organisation.',
      querystring: paginationQuerySchema,
      response: { 200: paginatedResponse(credentialSchema), 400: errorResponse },
    },
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const queryParsed = paginationQuery.safeParse(request.query)
    if (!queryParsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: queryParsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const opts = buildPaginationOpts(queryParsed.data)
    const [orgCreds, total] = await Promise.all([
      credentialService.listByOrg(orgId, opts),
      credentialService.countByOrg(orgId),
    ])

    return reply.status(200).send(buildPaginationResponse(orgCreds, total, queryParsed.data))
  })

  // GET /v1/orgs/:orgId/credentials/:id
  app.get('/orgs/:orgId/credentials/:id', {
    schema: {
      tags: ['Credentials'],
      summary: 'Get credential by ID',
      description: 'Returns the details of a specific credential within the organisation.',
      response: { 200: credentialSchema, 404: errorResponse },
    },
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
    schema: {
      tags: ['Credentials'],
      summary: 'Revoke a credential',
      description: 'Revokes a credential, making it invalid for future proof generation.',
      response: {
        200: { type: 'object' as const, properties: { message: { type: 'string' as const }, id: { type: 'string' as const } } },
        404: errorResponse,
      },
    },
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

    void recordAudit({
      action: 'credential.revoke',
      outcome: 'success',
      userId: request.auth!.userId,
      orgId,
      actorIp: request.ip,
      resource: `Credential:${id}`,
    })

    return reply.status(200).send({ message: 'Credential revoked', id })
  })
}
