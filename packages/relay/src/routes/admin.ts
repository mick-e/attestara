import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { orgService } from '../services/org.service.js'
import { agentService } from '../services/agent.service.js'
import { sessionService } from '../services/session.service.js'
import { commitmentService } from '../services/commitment.service.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'

function requireAdmin() {
  return async (request: any, reply: any) => {
    const auth = request.auth
    if (!auth || auth.role !== 'admin') {
      return reply.status(403).send({
        code: 'FORBIDDEN',
        message: 'Admin access required',
        requestId: request.id,
      })
    }
  }
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/admin/stats
  app.get('/admin/stats', {
    preHandler: [requireAuth(JWT_SECRET), requireAdmin()],
  }, async (_request, reply) => {
    // Count orgs by iterating over users' orgIds (deduplicated via orgService internals)
    // orgService exposes orgs indirectly; we count unique orgs from all users
    const allOrgIds = new Set<string>()
    let totalUsers = 0

    // Walk all users via listMembers — instead use a dedicated approach:
    // orgService doesn't expose a listOrgs(). We sum up from what we can access.
    // Since orgService.orgMembers is private we use a workaround:
    // Each created org gets a user; we track orgId from users via getUserById.
    // The simplest approach: iterate sessions + commitments for counts, and
    // approximate org/user counts via agents/sessions context.
    //
    // For the stats we return real counts from the in-memory stores.
    const agents = Array.from((agentService as any).agents.values()) as any[]
    agents.forEach((a: any) => allOrgIds.add(a.orgId))

    // Count users via orgService internal users map
    totalUsers = (orgService as any).users.size

    // Count orgs
    const totalOrgs = (orgService as any).orgs.size

    const totalAgents = agents.length
    const totalSessions = (sessionService as any).sessions.size
    const totalCommitments = (commitmentService as any).commitments.size

    return reply.status(200).send({
      totalOrgs,
      totalUsers,
      totalAgents,
      totalSessions,
      totalCommitments,
    })
  })

  // POST /v1/admin/indexer/backfill
  app.post('/admin/indexer/backfill', {
    preHandler: [requireAuth(JWT_SECRET), requireAdmin()],
  }, async (_request, reply) => {
    return reply.status(202).send({
      message: 'Backfill queued',
    })
  })
}
