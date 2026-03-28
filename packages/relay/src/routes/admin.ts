import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { getPrisma } from '../utils/prisma.js'

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
    const [totalOrgs, totalUsers, totalAgents, totalSessions, totalCommitments] = await Promise.all([
      getPrisma().organisation.count(),
      getPrisma().user.count(),
      getPrisma().agent.count(),
      getPrisma().session.count(),
      getPrisma().commitment.count(),
    ])

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
