import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, requireOrgAccess } from '../middleware/auth.js'
import { agentService } from '../services/agent.service.js'
import { credentialService } from '../services/credential.service.js'
import { sessionService } from '../services/session.service.js'
import { commitmentService } from '../services/commitment.service.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/orgs/:orgId/analytics
  app.get('/orgs/:orgId/analytics', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }

    const agents = agentService.listByOrg(orgId)
    const credentials = credentialService.listByOrg(orgId)
    const sessions = sessionService.listByOrg(orgId)
    const commitments = commitmentService.listByOrg(orgId, sessionService)

    const activeSessionCount = sessions.filter(s => s.status === 'active').length

    const avgTurnsPerSession = sessions.length === 0
      ? 0
      : sessions.reduce((sum, s) => sum + s.turnCount, 0) / sessions.length

    return reply.status(200).send({
      agentCount: agents.length,
      credentialCount: credentials.length,
      sessionCount: sessions.length,
      commitmentCount: commitments.length,
      activeSessionCount,
      avgTurnsPerSession,
    })
  })
}
