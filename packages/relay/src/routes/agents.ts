import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, requireOrgAccess } from '../middleware/auth.js'
import { paginationQuery, buildPaginationOpts, buildPaginationResponse } from '../schemas/pagination.js'
import { provisionDidSchema, createAgentSchema, updateAgentSchema } from '../schemas/agent.js'
import { agentService } from '../services/agent.service.js'
import { didService } from '../services/did.service.js'
import {
  agentSchema,
  createAgentBody,
  updateAgentBody,
  provisionDidBody,
  errorResponse,
  paginatedResponse,
  paginationQuerySchema,
} from '../schemas/openapi.js'

export { agentService as agentServiceInstance }

/** @deprecated use agentService.clearStores() directly */
export async function clearAgentStores() {
  await agentService.clearStores()
}

export const agentRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // POST /v1/orgs/:orgId/agents
  app.post('/orgs/:orgId/agents', {
    schema: {
      tags: ['Agents'],
      summary: 'Register an agent',
      description: 'Registers a new agent under the specified organisation with a DID, name, and optional metadata.',
      body: createAgentBody,
      response: { 201: agentSchema, 400: errorResponse, 409: errorResponse },
    },
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

    const result = await agentService.create(orgId, {
      did: parsed.data.did,
      name: parsed.data.name,
      publicKey: parsed.data.publicKey,
      ...(parsed.data.metadata !== undefined ? { metadata: parsed.data.metadata } : {}),
    })

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
    schema: {
      tags: ['Agents'],
      summary: 'List agents for an organisation',
      description: 'Returns a paginated list of agents belonging to the specified organisation.',
      querystring: paginationQuerySchema,
      response: { 200: paginatedResponse(agentSchema), 400: errorResponse },
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
    const [orgAgents, total] = await Promise.all([
      agentService.listByOrg(orgId, opts),
      agentService.countByOrg(orgId),
    ])

    return reply.status(200).send(buildPaginationResponse(orgAgents, total, queryParsed.data))
  })

  // GET /v1/orgs/:orgId/agents/:agentId
  app.get('/orgs/:orgId/agents/:agentId', {
    schema: {
      tags: ['Agents'],
      summary: 'Get agent by ID',
      description: 'Returns the details of a specific agent within the organisation.',
      response: { 200: agentSchema, 404: errorResponse },
    },
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
    schema: {
      tags: ['Agents'],
      summary: 'Update an agent',
      description: 'Updates the name, metadata, or status of an existing agent.',
      body: updateAgentBody,
      response: { 200: agentSchema, 400: errorResponse, 404: errorResponse },
    },
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

    const agent = await agentService.update(agentId, orgId, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.metadata !== undefined ? { metadata: parsed.data.metadata } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    })
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
    schema: {
      tags: ['Agents'],
      summary: 'Deactivate an agent',
      description: 'Soft-deletes an agent by setting its status to inactive.',
      response: {
        200: { type: 'object' as const, properties: { message: { type: 'string' as const }, id: { type: 'string' as const } } },
        404: errorResponse,
      },
    },
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

  // POST /v1/agents/provision-did -- generate a real did:ethr via SDK Veramo
  app.post('/agents/provision-did', {
    schema: {
      tags: ['Agents'],
      summary: 'Provision a DID for an agent',
      description: 'Generates a new did:ethr decentralized identifier via Veramo for the named agent.',
      body: provisionDidBody,
      response: {
        201: { type: 'object' as const, properties: { did: { type: 'string' as const }, publicKey: { type: 'string' as const } } },
        400: errorResponse,
        500: errorResponse,
      },
    },
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const parsed = provisionDidSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    try {
      const result = await didService.createDid(parsed.data.name)
      return reply.status(201).send(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'DID generation failed'
      return reply.status(500).send({
        code: 'DID_GENERATION_FAILED',
        message,
        requestId: request.id,
      })
    }
  })
}
