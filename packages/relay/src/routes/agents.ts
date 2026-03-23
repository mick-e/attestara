import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireAuth, requireOrgAccess, type AuthContext } from '../middleware/auth.js'

interface StoredAgent {
  id: string
  orgId: string
  did: string
  name: string
  status: string
  metadata: Record<string, unknown>
  publicKey: string
  registeredTxHash: string | null
  createdAt: string
}

const agents = new Map<string, StoredAgent>()
const didIndex = new Map<string, string>() // did -> agentId

export function clearAgentStores() {
  agents.clear()
  didIndex.clear()
}

export function getAgentStores() {
  return { agents, didIndex }
}

const createAgentSchema = z.object({
  did: z.string().min(1),
  name: z.string().min(1).max(100),
  publicKey: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
})

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'

export const agentRoutes: FastifyPluginAsync = async (app) => {
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

    if (didIndex.has(parsed.data.did)) {
      return reply.status(409).send({
        code: 'DID_ALREADY_REGISTERED',
        message: 'DID is already registered',
        requestId: request.id,
      })
    }

    const agent: StoredAgent = {
      id: randomUUID(),
      orgId,
      did: parsed.data.did,
      name: parsed.data.name,
      status: 'active',
      metadata: parsed.data.metadata ?? {},
      publicKey: parsed.data.publicKey,
      registeredTxHash: null,
      createdAt: new Date().toISOString(),
    }
    agents.set(agent.id, agent)
    didIndex.set(agent.did, agent.id)

    return reply.status(201).send(agent)
  })

  // GET /v1/orgs/:orgId/agents
  app.get('/orgs/:orgId/agents', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const orgAgents = Array.from(agents.values()).filter(a => a.orgId === orgId)

    return reply.status(200).send({
      data: orgAgents,
      pagination: { total: orgAgents.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // GET /v1/orgs/:orgId/agents/:agentId
  app.get('/orgs/:orgId/agents/:agentId', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, agentId } = request.params as { orgId: string; agentId: string }
    const agent = agents.get(agentId)

    if (!agent || agent.orgId !== orgId) {
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

    const agent = agents.get(agentId)
    if (!agent || agent.orgId !== orgId) {
      return reply.status(404).send({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        requestId: request.id,
      })
    }

    if (parsed.data.name) agent.name = parsed.data.name
    if (parsed.data.metadata) agent.metadata = parsed.data.metadata
    if (parsed.data.status) agent.status = parsed.data.status

    return reply.status(200).send(agent)
  })

  // DELETE /v1/orgs/:orgId/agents/:agentId
  app.delete('/orgs/:orgId/agents/:agentId', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, agentId } = request.params as { orgId: string; agentId: string }
    const agent = agents.get(agentId)

    if (!agent || agent.orgId !== orgId) {
      return reply.status(404).send({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        requestId: request.id,
      })
    }

    agent.status = 'deactivated'

    return reply.status(200).send({ message: 'Agent deactivated', id: agentId })
  })
}
