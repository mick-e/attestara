import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess, type AuthContext } from '../middleware/auth.js'
import { orgService } from '../services/org.service.js'

export function clearOrgStores() {
  orgService.clearStores()
}

export function getOrgMembers() {
  return {
    get(orgId: string) {
      const members = orgService.listMembers(orgId)
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

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'

export const orgRoutes: FastifyPluginAsync = async (app) => {
  // POST /v1/orgs
  app.post('/orgs', {
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

    const auth = (request as any).auth as AuthContext
    const org = orgService.createOrg(parsed.data.name, parsed.data.plan)

    // Track membership
    orgService.addMember(org.id, auth.userId)

    return reply.status(201).send({
      ...org,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  // GET /v1/orgs/:orgId
  app.get('/orgs/:orgId', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }

    // In a real implementation, fetch from DB
    return reply.status(200).send({
      id: orgId,
      name: 'Organisation',
      slug: 'org-slug',
      plan: 'starter',
    })
  })

  // PATCH /v1/orgs/:orgId
  app.patch('/orgs/:orgId', {
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
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const memberIds = orgService.listMembers(orgId)

    return reply.status(200).send({
      data: memberIds.map(id => ({ id, orgId, role: 'member' })),
      pagination: { total: memberIds.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // POST /v1/orgs/:orgId/invite
  app.post('/orgs/:orgId/invite', {
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

    const inviteId = orgService.createInvite(orgId, parsed.data.email, parsed.data.role)

    return reply.status(201).send({
      id: inviteId,
      orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'pending',
    })
  })
}
