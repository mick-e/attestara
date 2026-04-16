import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess } from '../middleware/auth.js'
import { agentService } from '../services/agent.service.js'
import { credentialService } from '../services/credential.service.js'
import { sessionService } from '../services/session.service.js'
import { commitmentService } from '../services/commitment.service.js'
import { analyticsService, type TimeseriesMetric } from '../services/analytics.service.js'

const VALID_METRICS: TimeseriesMetric[] = [
  'sessions',
  'proof_latency_p50',
  'proof_latency_p95',
  'gas_spent',
  'commitments',
  'credentials',
]

const timeseriesQuerySchema = z.object({
  metric: z.enum(VALID_METRICS as [TimeseriesMetric, ...TimeseriesMetric[]]),
  days: z.coerce.number().int().min(1).max(365).default(14),
})

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // GET /v1/orgs/:orgId/analytics
  app.get('/orgs/:orgId/analytics', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }

    const agents = await agentService.listByOrg(orgId)
    const credentials = await credentialService.listByOrg(orgId)
    const sessions = await sessionService.listByOrg(orgId)
    const commitments = await commitmentService.listByOrg(orgId)

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

  // GET /v1/analytics/timeseries?metric=sessions&days=14
  app.get('/analytics/timeseries', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId: request.id,
      })
    }

    const parsed = timeseriesQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { metric, days } = parsed.data
    const data = await analyticsService.timeseries(auth.orgId, metric, days)
    return reply.status(200).send({ metric, days, data })
  })

  // GET /v1/orgs/:orgId/analytics/proof-latency
  app.get('/orgs/:orgId/analytics/proof-latency', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const data = await analyticsService.proofLatencyByCircuit(orgId)
    return reply.status(200).send({ data })
  })
}
