import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess, type AuthContext } from '../middleware/auth.js'
import { orgService } from '../services/org.service.js'
import { recordAudit } from '../services/audit.service.js'
import {
  orgSchema,
  createOrgBody,
  updateOrgBody,
  inviteBody,
  errorResponse,
} from '../schemas/openapi.js'

export async function clearOrgStores() {
  await orgService.clearStores()
}

export function getOrgMembers() {
  return {
    async get(orgId: string) {
      const members = await orgService.listMembers(orgId)
      return members.length > 0 ? new Set(members) : undefined
    },
  }
}

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  plan: z.string().optional(),
})

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  plan: z.string().optional(),
})

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.string().default('member'),
})

export const orgRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // POST /v1/orgs
  app.post('/orgs', {
    schema: {
      tags: ['Orgs'],
      summary: 'Create an organisation',
      description: 'Creates a new organisation and adds the authenticated user as a member.',
      body: createOrgBody,
      response: { 201: orgSchema, 400: errorResponse },
    },
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const parsed = createOrgSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const auth = request.auth!
    const org = await orgService.createOrg(parsed.data.name, parsed.data.plan)

    // Track membership
    await orgService.addMember(org.id, auth.userId)

    void recordAudit({
      action: 'org.create',
      outcome: 'success',
      userId: auth.userId,
      orgId: org.id,
      actorIp: request.ip,
      resource: `Organisation:${org.id}`,
    })

    return reply.status(201).send({
      ...org,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  // GET /v1/orgs/:orgId
  app.get('/orgs/:orgId', {
    schema: {
      tags: ['Orgs'],
      summary: 'Get organisation by ID',
      description: 'Returns the details of a specific organisation.',
      response: { 200: orgSchema, 404: errorResponse },
    },
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const org = await orgService.getOrg(orgId)

    if (!org) {
      return reply.status(404).send({
        code: 'ORG_NOT_FOUND',
        message: 'Organisation not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send(org)
  })

  // PATCH /v1/orgs/:orgId
  app.patch('/orgs/:orgId', {
    schema: {
      tags: ['Orgs'],
      summary: 'Update an organisation',
      description: 'Updates the name or plan of an existing organisation.',
      body: updateOrgBody,
      response: { 200: orgSchema, 400: errorResponse },
    },
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const parsed = updateOrgSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    return reply.status(200).send({
      id: orgId,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    })
  })

  // GET /v1/orgs/:orgId/members
  app.get('/orgs/:orgId/members', {
    schema: {
      tags: ['Orgs'],
      summary: 'List organisation members',
      description: 'Returns a list of user IDs that are members of the organisation.',
      response: {
        200: {
          type: 'object' as const,
          properties: {
            data: { type: 'array' as const, items: { type: 'object' as const, properties: { id: { type: 'string' as const }, orgId: { type: 'string' as const }, role: { type: 'string' as const } } } },
            pagination: { type: 'object' as const, properties: { total: { type: 'number' as const }, page: { type: 'number' as const }, pageSize: { type: 'number' as const }, totalPages: { type: 'number' as const } } },
          },
        },
      },
    },
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const memberIds = await orgService.listMembers(orgId)

    return reply.status(200).send({
      data: memberIds.map(id => ({ id, orgId, role: 'member' })),
      pagination: { total: memberIds.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // POST /v1/orgs/:orgId/invite
  app.post('/orgs/:orgId/invite', {
    schema: {
      tags: ['Orgs'],
      summary: 'Invite a user to an organisation',
      description: 'Sends an invitation to join the organisation to the specified email address.',
      body: inviteBody,
      response: {
        201: { type: 'object' as const, properties: { id: { type: 'string' as const }, orgId: { type: 'string' as const }, email: { type: 'string' as const }, role: { type: 'string' as const }, status: { type: 'string' as const } } },
        400: errorResponse,
      },
    },
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const parsed = inviteSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const inviteId = await orgService.createInvite(orgId, parsed.data.email, parsed.data.role)

    return reply.status(201).send({
      id: inviteId,
      orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'pending',
    })
  })
}
