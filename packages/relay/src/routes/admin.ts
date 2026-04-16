import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { getPrisma } from '../utils/prisma.js'
import { recordAudit } from '../services/audit.service.js'

function requireAdmin() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
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
  const JWT_SECRET = app.config.JWT_SECRET

  // GET /v1/admin/stats
  app.get('/admin/stats', {
    preHandler: [requireAuth(JWT_SECRET), requireAdmin()],
  }, async (request, reply) => {
    const [totalOrgs, totalUsers, totalAgents, totalSessions, totalCommitments] = await Promise.all([
      getPrisma().organisation.count(),
      getPrisma().user.count(),
      getPrisma().agent.count(),
      getPrisma().session.count(),
      getPrisma().commitment.count(),
    ])

    void recordAudit({
      action: 'admin.stats',
      outcome: 'success',
      userId: request.auth!.userId,
      orgId: request.auth!.orgId,
      actorIp: request.ip,
    })

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
  }, async (request, reply) => {
    void recordAudit({
      action: 'admin.indexer.backfill',
      outcome: 'success',
      userId: request.auth!.userId,
      orgId: request.auth!.orgId,
      actorIp: request.ip,
    })

    return reply.status(202).send({
      message: 'Backfill queued',
    })
  })
}
