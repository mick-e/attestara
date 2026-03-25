import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, type AuthContext } from '../middleware/auth.js'
import { sessionService } from '../services/session.service.js'

export function clearSessionStores() {
  sessionService.clearStores()
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
  counterpartyAgentId: z.string().min(1),
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

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'

export const sessionRoutes: FastifyPluginAsync = async (app) => {
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

    const { session, inviteToken } = sessionService.createSession(parsed.data)

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
    const auth = (request as any).auth as AuthContext
    const orgSessions = sessionService.listByOrg(auth.orgId)

    return reply.status(200).send({
      data: orgSessions,
      pagination: { total: orgSessions.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // GET /v1/sessions/:sessionId
  app.get('/sessions/:sessionId', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const auth = (request as any).auth as AuthContext
    const session = sessionService.getSessionWithOrgCheck(sessionId, auth.orgId)

    if (!session) {
      // Check if session exists at all (for 404 vs 403)
      const exists = sessionService.getSession(sessionId)
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

    return reply.status(200).send(session)
  })

  // GET /v1/sessions/:sessionId/turns
  app.get('/sessions/:sessionId/turns', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const auth = (request as any).auth as AuthContext
    const session = sessionService.getSession(sessionId)

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

    const redactedTurns = sessionService.getTurns(sessionId, auth.orgId)

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

    const result = sessionService.appendTurn(sessionId, parsed.data)

    if ('error' in result) {
      const statusCode = result.code === 'SESSION_NOT_FOUND' ? 404 : 400
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

    const result = sessionService.generateInviteToken(sessionId)

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

  // POST /v1/sessions/:sessionId/accept
  app.post('/sessions/:sessionId/accept', {
    preHandler: [requireAuth(JWT_SECRET)],
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

    const result = sessionService.acceptSession(sessionId, parsed.data.inviteToken)

    if ('error' in result) {
      let statusCode = 400
      if (result.code === 'SESSION_NOT_FOUND') statusCode = 404
      if (result.code === 'INVALID_TOKEN') statusCode = 401
      return reply.status(statusCode).send({
        code: result.code,
        message: result.error,
        requestId: request.id,
      })
    }

    return reply.status(200).send(result)
  })
}
