import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireAuth, requireOrgAccess, type AuthContext } from '../middleware/auth.js'

// In-memory stores (shared with auth via imports — will be replaced by Prisma)
const orgMembers = new Map<string, Set<string>>() // orgId -> Set<userId>
const invites = new Map<string, { orgId: string; email: string; role: string }>()

export function clearOrgStores() {
  orgMembers.clear()
  invites.clear()
}

export function getOrgMembers() {
  return orgMembers
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
    const org = {
      id: randomUUID(),
      name: parsed.data.name,
      slug: parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + randomUUID().slice(0, 6),
      plan: parsed.data.plan ?? 'starter',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Track membership
    const members = new Set<string>()
    members.add(auth.userId)
    orgMembers.set(org.id, members)

    return reply.status(201).send(org)
  })

  // GET /v1/orgs/:orgId
  app.get('/orgs/:orgId', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const auth = (request as any).auth as AuthContext

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
    const members = orgMembers.get(orgId) ?? new Set()

    return reply.status(200).send({
      data: Array.from(members).map(id => ({ id, orgId, role: 'member' })),
      pagination: { total: members.size, page: 1, pageSize: 50, totalPages: 1 },
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

    const inviteId = randomUUID()
    invites.set(inviteId, { orgId, email: parsed.data.email, role: parsed.data.role })

    return reply.status(201).send({
      id: inviteId,
      orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'pending',
    })
  })
}
