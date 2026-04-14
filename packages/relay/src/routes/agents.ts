import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess } from '../middleware/auth.js'
import { paginationQuery, buildPaginationOpts, buildPaginationResponse } from '../schemas/pagination.js'
import { agentService } from '../services/agent.service.js'

export { agentService as agentServiceInstance }

/** @deprecated use agentService.clearStores() directly */
export async function clearAgentStores() {
  await agentService.clearStores()
}

const createAgentSchema = z.object({
  did: z.string().regex(/^did:[a-z]+:.+$/, 'Invalid DID format (expected did:method:identifier)'),
  name: z.string().min(1).max(255),
  publicKey: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Public key must be hex-encoded with 0x prefix').optional().default('0x00'),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const agentRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // POST /v1/orgs/:orgId/agents
  app.post('/orgs/:orgId/agents', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const parsed = createAgentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const result = await agentService.create(orgId, parsed.data)

    if ('code' in result) {
      return reply.status(409).send({
        code: result.code,
        message: result.error,
        requestId: request.id,
      })
    }

    return reply.status(201).send(result)
  })

  // GET /v1/orgs/:orgId/agents
  app.get('/orgs/:orgId/agents', {
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
    const [orgAgents, total] = await Promise.all([
      agentService.listByOrg(orgId, opts),
      agentService.countByOrg(orgId),
    ])

    return reply.status(200).send(buildPaginationResponse(orgAgents, total, queryParsed.data))
  })

  // GET /v1/orgs/:orgId/agents/:agentId
  app.get('/orgs/:orgId/agents/:agentId', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, agentId } = request.params as { orgId: string; agentId: string }
    const agent = await agentService.getById(agentId, orgId)

    if (!agent) {
      return reply.status(404).send({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send(agent)
  })

  // PATCH /v1/orgs/:orgId/agents/:agentId
  app.patch('/orgs/:orgId/agents/:agentId', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, agentId } = request.params as { orgId: string; agentId: string }
    const parsed = updateAgentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const agent = await agentService.update(agentId, orgId, parsed.data)
    if (!agent) {
      return reply.status(404).send({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send(agent)
  })

  // DELETE /v1/orgs/:orgId/agents/:agentId
  app.delete('/orgs/:orgId/agents/:agentId', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, agentId } = request.params as { orgId: string; agentId: string }
    const agent = await agentService.deactivate(agentId, orgId)

    if (!agent) {
      return reply.status(404).send({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send({ message: 'Agent deactivated', id: agentId })
  })
}
