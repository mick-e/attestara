import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, type AuthContext } from '../middleware/auth.js'
import { paginationQuery, buildPaginationOpts, buildPaginationResponse } from '../schemas/pagination.js'
import { sessionService } from '../services/session.service.js'
import { recordAudit } from '../services/audit.service.js'

export async function clearSessionStores() {
  await sessionService.clearStores()
}

export function getSessionStores() {
  return {
    sessions: (sessionService as any).sessions as Map<string, unknown>,
    turns: (sessionService as any).turns as Map<string, unknown[]>,
    inviteTokens: (sessionService as any).inviteTokens as Map<string, string>,
  }
}

const createSessionSchema = z.object({
  initiatorAgentId: z.string().min(1),
  counterpartyAgentId: z.string().min(1).nullable().optional(),
  initiatorOrgId: z.string().min(1),
  counterpartyOrgId: z.string().min(1),
  sessionType: z.enum(['intra_org', 'cross_org']).default('intra_org'),
  sessionConfig: z.record(z.unknown()).optional(),
})

const acceptSchema = z.object({
  inviteToken: z.string().min(1),
})

const createTurnSchema = z.object({
  agentId: z.string().min(1),
  terms: z.record(z.unknown()),
  proofType: z.string().min(1),
  proof: z.record(z.unknown()),
  publicSignals: z.record(z.unknown()),
  signature: z.string().min(1),
})

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // Test-env bypass for invite-acceptance rate limit. Production: 20/hour per IP.
  const isTestEnv = app.config.NODE_ENV === 'test' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
  const acceptMax = isTestEnv ? 10_000 : 20

  // POST /v1/sessions
  app.post('/sessions', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const parsed = createSessionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { session, inviteToken } = await sessionService.createSession(parsed.data)

    void recordAudit({
      action: 'session.create',
      outcome: 'success',
      userId: request.auth!.userId,
      orgId: parsed.data.initiatorOrgId,
      actorIp: request.ip,
      resource: `Session:${session.id}`,
    })

    const response: Record<string, unknown> = { ...session }
    if (inviteToken) {
      response.inviteToken = inviteToken
    }

    return reply.status(201).send(response)
  })

  // GET /v1/sessions
  app.get('/sessions', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const auth = request.auth!
    const queryParsed = paginationQuery.safeParse(request.query)
    if (!queryParsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: queryParsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const opts = buildPaginationOpts(queryParsed.data)
    const [orgSessions, total] = await Promise.all([
      sessionService.listByOrg(auth.orgId, opts),
      sessionService.countByOrg(auth.orgId),
    ])

    return reply.status(200).send(buildPaginationResponse(orgSessions, total, queryParsed.data))
  })

  // GET /v1/sessions/:sessionId
  app.get('/sessions/:sessionId', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const auth = request.auth!
    const session = await sessionService.getSessionWithOrgCheck(sessionId, auth.orgId)

    if (!session) {
      // Check if session exists at all (for 404 vs 403)
      const exists = await sessionService.getSession(sessionId)
      if (!exists) {
        return reply.status(404).send({
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          requestId: request.id,
        })
      }
      return reply.status(403).send({
        code: 'FORBIDDEN',
        message: 'Access denied to this session',
        requestId: request.id,
      })
    }

    if (sessionService.isExpired(session)) {
      return reply.status(410).send({
        code: 'SESSION_EXPIRED',
        message: 'Session has expired',
        requestId: request.id,
      })
    }

    return reply.status(200).send(session)
  })

  // GET /v1/sessions/:sessionId/turns
  app.get('/sessions/:sessionId/turns', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const auth = request.auth!
    const session = await sessionService.getSession(sessionId)

    if (!session) {
      return reply.status(404).send({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        requestId: request.id,
      })
    }

    if (session.initiatorOrgId !== auth.orgId && session.counterpartyOrgId !== auth.orgId) {
      return reply.status(403).send({
        code: 'FORBIDDEN',
        message: 'Access denied to this session',
        requestId: request.id,
      })
    }

    if (sessionService.isExpired(session)) {
      return reply.status(410).send({
        code: 'SESSION_EXPIRED',
        message: 'Session has expired',
        requestId: request.id,
      })
    }

    const redactedTurns = await sessionService.getTurns(sessionId, auth.orgId)

    return reply.status(200).send({
      data: redactedTurns,
      pagination: { total: redactedTurns.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // POST /v1/sessions/:sessionId/turns
  app.post('/sessions/:sessionId/turns', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const parsed = createTurnSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const result = await sessionService.appendTurn(sessionId, parsed.data)

    if ('error' in result) {
      let statusCode = 400
      if (result.code === 'SESSION_NOT_FOUND') statusCode = 404
      if (result.code === 'SESSION_EXPIRED') statusCode = 410
      return reply.status(statusCode).send({
        code: result.code,
        message: result.error,
        requestId: request.id,
      })
    }

    return reply.status(201).send(result)
  })

  // POST /v1/sessions/:sessionId/invite
  app.post('/sessions/:sessionId/invite', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }

    const result = await sessionService.generateInviteToken(sessionId)

    if ('error' in result) {
      const statusCode = result.code === 'SESSION_NOT_FOUND' ? 404 : 400
      return reply.status(statusCode).send({
        code: result.code,
        message: result.error,
        requestId: request.id,
      })
    }

    return reply.status(200).send(result)
  })

  // POST /v1/sessions/:sessionId/accept — 20 requests per hour per IP
  app.post('/sessions/:sessionId/accept', {
    preHandler: [requireAuth(JWT_SECRET)],
    config: {
      rateLimit: {
        max: acceptMax,
        timeWindow: '1 hour',
        keyGenerator: (request) => request.ip,
      },
    },
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const parsed = acceptSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Missing invite token',
        requestId: request.id,
      })
    }

    const result = await sessionService.acceptSession(sessionId, parsed.data.inviteToken)

    if ('error' in result) {
      let statusCode = 400
      if (result.code === 'SESSION_NOT_FOUND') statusCode = 404
      if (result.code === 'INVALID_TOKEN') statusCode = 401
      if (result.code === 'INVITE_ALREADY_CONSUMED') statusCode = 409
      if (result.code === 'SESSION_EXPIRED') statusCode = 410
      return reply.status(statusCode).send({
        code: result.code,
        message: result.error,
        requestId: request.id,
      })
    }

    return reply.status(200).send(result)
  })
}
