import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, type AuthContext } from '../middleware/auth.js'
import { paginationQuery, buildPaginationOpts, buildPaginationResponse } from '../schemas/pagination.js'
import { createSessionSchema, acceptSchema, createTurnSchema } from '../schemas/session.js'
import { sessionService } from '../services/session.service.js'
import { recordAudit } from '../services/audit.service.js'
import {
  sessionSchema,
  createSessionBody,
  createTurnBody,
  acceptSessionBody,
  turnSchema,
  errorResponse,
  paginatedResponse,
  paginationQuerySchema,
} from '../schemas/openapi.js'

export async function clearSessionStores() {
  await sessionService.clearStores()
}

export function getSessionStores() {
  type ServiceInternals = {
    sessions: Map<string, unknown>
    turns: Map<string, unknown[]>
    inviteTokens: Map<string, string>
  }
  const svc = sessionService as unknown as ServiceInternals
  return {
    sessions: svc.sessions,
    turns: svc.turns,
    inviteTokens: svc.inviteTokens,
  }
}

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // Test-env bypass for invite-acceptance rate limit. Production: 20/hour per IP.
  const isTestEnv = app.config.NODE_ENV === 'test'
  const acceptMax = isTestEnv ? 10_000 : 20

  // POST /v1/sessions
  app.post('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'Create a negotiation session',
      description: 'Creates a new negotiation session between two agents and returns an invite token for the counterparty.',
      body: createSessionBody,
      response: { 201: sessionSchema, 400: errorResponse },
    },
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
    schema: {
      tags: ['Sessions'],
      summary: 'List negotiation sessions',
      description: 'Returns a paginated list of sessions accessible to the authenticated user.',
      querystring: paginationQuerySchema,
      response: { 200: paginatedResponse(sessionSchema), 400: errorResponse },
    },
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
    schema: {
      tags: ['Sessions'],
      summary: 'Get session by ID',
      description: 'Returns the details of a specific negotiation session. Returns 403 if the user does not belong to either party, 410 if expired.',
      response: { 200: sessionSchema, 403: errorResponse, 404: errorResponse, 410: errorResponse },
    },
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
    schema: {
      tags: ['Sessions'],
      summary: 'List turns in a session',
      description: 'Returns all negotiation turns within a session. Counterparty proof data is redacted.',
      response: { 200: paginatedResponse(turnSchema), 403: errorResponse, 404: errorResponse, 410: errorResponse },
    },
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
    schema: {
      tags: ['Sessions'],
      summary: 'Submit a negotiation turn',
      description: 'Appends a new turn (proposal) with ZK proof to the negotiation session.',
      body: createTurnBody,
      response: { 201: turnSchema, 400: errorResponse, 404: errorResponse, 410: errorResponse },
    },
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
    schema: {
      tags: ['Sessions'],
      summary: 'Generate an invite token',
      description: 'Generates a one-time invite token for the counterparty to join the session.',
      response: {
        200: { type: 'object' as const, properties: { inviteToken: { type: 'string' as const }, sessionId: { type: 'string' as const } } },
        400: errorResponse,
        404: errorResponse,
      },
    },
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
    schema: {
      tags: ['Sessions'],
      summary: 'Accept a session invite',
      description: 'Accepts a session invite using the one-time invite token, activating the session.',
      body: acceptSessionBody,
      response: { 200: sessionSchema, 400: errorResponse, 401: errorResponse, 404: errorResponse, 409: errorResponse, 410: errorResponse },
    },
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

  // POST /v1/sessions/:sessionId/abandon
  app.post('/sessions/:sessionId/abandon', {
    schema: {
      tags: ['Sessions'],
      summary: 'Abandon a session',
      description: 'Terminates a session that is active or pending acceptance. Only participants may abandon.',
      response: {
        200: { type: 'object' as const, properties: { message: { type: 'string' as const }, sessionId: { type: 'string' as const } } },
        400: errorResponse,
        403: errorResponse,
        404: errorResponse,
        500: errorResponse,
      },
    },
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

    if (session.status !== 'active' && session.status !== 'pending_acceptance') {
      return reply.status(400).send({
        code: 'SESSION_NOT_ACTIVE',
        message: 'Session is not active or pending',
        requestId: request.id,
      })
    }

    const result = await sessionService.abandonSession(sessionId)
    if (!result) {
      return reply.status(500).send({
        code: 'ABANDON_FAILED',
        message: 'Failed to abandon session',
        requestId: request.id,
      })
    }

    return reply.status(200).send({ message: 'Session abandoned', sessionId })
  })
}
