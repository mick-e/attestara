import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createHash, randomBytes, randomUUID } from 'crypto'
import { requireAuth, type AuthContext } from '../middleware/auth.js'

interface StoredSession {
  id: string
  initiatorAgentId: string
  initiatorOrgId: string
  counterpartyAgentId: string
  counterpartyOrgId: string
  sessionType: string
  inviteTokenHash: string | null
  status: string
  sessionConfig: Record<string, unknown>
  merkleRoot: string | null
  turnCount: number
  anchorTxHash: string | null
  createdAt: string
  updatedAt: string
}

interface StoredTurn {
  id: string
  sessionId: string
  agentId: string
  sequenceNumber: number
  terms: Record<string, unknown>
  proofType: string
  proof: Record<string, unknown>
  publicSignals: Record<string, unknown>
  signature: string
  createdAt: string
}

const sessions = new Map<string, StoredSession>()
const turns = new Map<string, StoredTurn[]>() // sessionId -> turns
const inviteTokens = new Map<string, string>() // tokenHash -> sessionId

export function clearSessionStores() {
  sessions.clear()
  turns.clear()
  inviteTokens.clear()
}

export function getSessionStores() {
  return { sessions, turns, inviteTokens }
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

    const auth = (request as any).auth as AuthContext
    const isCrossOrg = parsed.data.sessionType === 'cross_org'
    let inviteTokenHash: string | null = null
    let inviteToken: string | undefined

    if (isCrossOrg) {
      const rawToken = randomBytes(32).toString('hex')
      inviteTokenHash = createHash('sha256').update(rawToken).digest('hex')
      inviteToken = rawToken
    }

    const session: StoredSession = {
      id: randomUUID(),
      initiatorAgentId: parsed.data.initiatorAgentId,
      initiatorOrgId: parsed.data.initiatorOrgId,
      counterpartyAgentId: parsed.data.counterpartyAgentId,
      counterpartyOrgId: parsed.data.counterpartyOrgId,
      sessionType: parsed.data.sessionType,
      inviteTokenHash,
      status: isCrossOrg ? 'pending_acceptance' : 'active',
      sessionConfig: parsed.data.sessionConfig ?? {},
      merkleRoot: null,
      turnCount: 0,
      anchorTxHash: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    sessions.set(session.id, session)
    turns.set(session.id, [])
    if (inviteTokenHash) {
      inviteTokens.set(inviteTokenHash, session.id)
    }

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
    const orgSessions = Array.from(sessions.values()).filter(
      s => s.initiatorOrgId === auth.orgId || s.counterpartyOrgId === auth.orgId,
    )

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
    const session = sessions.get(sessionId)

    if (!session) {
      return reply.status(404).send({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        requestId: request.id,
      })
    }

    // Only allow access if the user's org is a party
    if (session.initiatorOrgId !== auth.orgId && session.counterpartyOrgId !== auth.orgId) {
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
    const session = sessions.get(sessionId)

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

    const sessionTurns = turns.get(sessionId) ?? []

    // Redact counterparty terms if cross-org
    const isInitiator = session.initiatorOrgId === auth.orgId
    const redactedTurns = sessionTurns.map(t => {
      if (session.sessionType === 'cross_org') {
        const isOwnTurn = isInitiator
          ? t.agentId === session.initiatorAgentId
          : t.agentId === session.counterpartyAgentId
        if (!isOwnTurn) {
          return { ...t, terms: { redacted: true } }
        }
      }
      return t
    })

    return reply.status(200).send({
      data: redactedTurns,
      pagination: { total: redactedTurns.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // POST /v1/sessions/:sessionId/invite
  app.post('/sessions/:sessionId/invite', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const session = sessions.get(sessionId)

    if (!session) {
      return reply.status(404).send({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        requestId: request.id,
      })
    }

    if (session.sessionType !== 'cross_org') {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invites are only for cross-org sessions',
        requestId: request.id,
      })
    }

    // Generate a new invite token
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    session.inviteTokenHash = tokenHash
    inviteTokens.set(tokenHash, sessionId)

    return reply.status(200).send({
      inviteToken: rawToken,
      sessionId,
    })
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

    const session = sessions.get(sessionId)
    if (!session) {
      return reply.status(404).send({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        requestId: request.id,
      })
    }

    if (session.status !== 'pending_acceptance') {
      return reply.status(400).send({
        code: 'SESSION_NOT_ACTIVE',
        message: 'Session is not pending acceptance',
        requestId: request.id,
      })
    }

    // Validate invite token
    const tokenHash = createHash('sha256').update(parsed.data.inviteToken).digest('hex')
    if (tokenHash !== session.inviteTokenHash) {
      return reply.status(401).send({
        code: 'INVALID_TOKEN',
        message: 'Invalid invite token',
        requestId: request.id,
      })
    }

    session.status = 'active'
    session.updatedAt = new Date().toISOString()

    return reply.status(200).send(session)
  })
}
