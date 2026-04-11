import { createHash, randomBytes } from 'crypto'
import type { Prisma } from '@prisma/client'
import { getPrisma } from '../utils/prisma.js'

export interface StoredSession {
  id: string
  initiatorAgentId: string
  initiatorOrgId: string
  counterpartyAgentId: string | null
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

export interface StoredTurn {
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

export interface CreateSessionData {
  initiatorAgentId: string
  counterpartyAgentId?: string | null
  initiatorOrgId: string
  counterpartyOrgId: string
  sessionType: string
  sessionConfig?: Record<string, unknown>
}

export interface AppendTurnData {
  agentId: string
  terms: Record<string, unknown>
  proofType: string
  proof: Record<string, unknown>
  publicSignals: Record<string, unknown>
  signature: string
}

function toStoredSession(row: {
  id: string
  initiatorAgentId: string
  initiatorOrgId: string
  counterpartyAgentId: string | null
  counterpartyOrgId: string
  sessionType: string
  inviteTokenHash: string | null
  status: string
  sessionConfig: unknown
  merkleRoot: string | null
  turnCount: number
  anchorTxHash: string | null
  createdAt: Date
  updatedAt: Date
}): StoredSession {
  return {
    id: row.id,
    initiatorAgentId: row.initiatorAgentId,
    initiatorOrgId: row.initiatorOrgId,
    counterpartyAgentId: row.counterpartyAgentId,
    counterpartyOrgId: row.counterpartyOrgId,
    sessionType: row.sessionType,
    inviteTokenHash: row.inviteTokenHash,
    status: row.status,
    sessionConfig: (row.sessionConfig as Record<string, unknown>) ?? {},
    merkleRoot: row.merkleRoot,
    turnCount: row.turnCount,
    anchorTxHash: row.anchorTxHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toStoredTurn(row: {
  id: string
  sessionId: string
  agentId: string
  sequenceNumber: number
  terms: unknown
  proofType: string
  proof: unknown
  publicSignals: unknown
  signature: string
  createdAt: Date
}): StoredTurn {
  return {
    id: row.id,
    sessionId: row.sessionId,
    agentId: row.agentId,
    sequenceNumber: row.sequenceNumber,
    terms: (row.terms as Record<string, unknown>) ?? {},
    proofType: row.proofType,
    proof: (row.proof as Record<string, unknown>) ?? {},
    publicSignals: (row.publicSignals as Record<string, unknown>) ?? {},
    signature: row.signature,
    createdAt: row.createdAt.toISOString(),
  }
}

export class SessionService {
  async createSession(data: CreateSessionData): Promise<{ session: StoredSession; inviteToken?: string }> {
    const isCrossOrg = data.sessionType === 'cross_org'
    let inviteTokenHash: string | null = null
    let inviteToken: string | undefined

    if (isCrossOrg) {
      const rawToken = randomBytes(32).toString('hex')
      inviteTokenHash = createHash('sha256').update(rawToken).digest('hex')
      inviteToken = rawToken
    }

    const row = await getPrisma().session.create({
      data: {
        initiatorAgentId: data.initiatorAgentId,
        initiatorOrgId: data.initiatorOrgId,
        counterpartyAgentId: data.counterpartyAgentId ?? null,
        counterpartyOrgId: data.counterpartyOrgId,
        sessionType: data.sessionType,
        inviteTokenHash,
        status: isCrossOrg ? 'pending_acceptance' : 'active',
        sessionConfig: (data.sessionConfig ?? {}) as Prisma.InputJsonValue,
      },
    })

    return { session: toStoredSession(row), inviteToken }
  }

  async getSession(sessionId: string): Promise<StoredSession | null> {
    const row = await getPrisma().session.findUnique({ where: { id: sessionId } })
    return row ? toStoredSession(row) : null
  }

  async getSessionWithOrgCheck(sessionId: string, orgId: string): Promise<StoredSession | null> {
    const row = await getPrisma().session.findFirst({
      where: {
        id: sessionId,
        OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }],
      },
    })
    return row ? toStoredSession(row) : null
  }

  async listByOrg(orgId: string): Promise<StoredSession[]> {
    const rows = await getPrisma().session.findMany({
      where: { OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }] },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toStoredSession)
  }

  async acceptSession(sessionId: string, rawInviteToken: string): Promise<StoredSession | { error: string; code: string }> {
    const session = await getPrisma().session.findUnique({ where: { id: sessionId } })
    if (!session) {
      return { error: 'Session not found', code: 'SESSION_NOT_FOUND' }
    }

    if (session.status !== 'pending_acceptance') {
      return { error: 'Session is not pending acceptance', code: 'SESSION_NOT_ACTIVE' }
    }

    const tokenHash = createHash('sha256').update(rawInviteToken).digest('hex')
    if (tokenHash !== session.inviteTokenHash) {
      return { error: 'Invalid invite token', code: 'INVALID_TOKEN' }
    }

    const row = await getPrisma().session.update({
      where: { id: sessionId },
      data: { status: 'active' },
    })
    return toStoredSession(row)
  }

  async generateInviteToken(sessionId: string): Promise<{ inviteToken: string; sessionId: string } | { error: string; code: string }> {
    const session = await getPrisma().session.findUnique({ where: { id: sessionId } })
    if (!session) {
      return { error: 'Session not found', code: 'SESSION_NOT_FOUND' }
    }

    if (session.sessionType !== 'cross_org') {
      return { error: 'Invites are only for cross-org sessions', code: 'VALIDATION_ERROR' }
    }

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    await getPrisma().session.update({
      where: { id: sessionId },
      data: { inviteTokenHash: tokenHash },
    })

    return { inviteToken: rawToken, sessionId }
  }

  async appendTurn(sessionId: string, data: AppendTurnData): Promise<StoredTurn | { error: string; code: string }> {
    const session = await getPrisma().session.findUnique({ where: { id: sessionId } })
    if (!session) {
      return { error: 'Session not found', code: 'SESSION_NOT_FOUND' }
    }

    if (session.status !== 'active') {
      return { error: 'Session is not active', code: 'SESSION_NOT_ACTIVE' }
    }

    if (data.agentId !== session.initiatorAgentId && data.agentId !== session.counterpartyAgentId) {
      return { error: 'Agent is not a party to this session', code: 'AGENT_NOT_PARTY' }
    }

    // Use transaction for atomic turn creation + session update
    const sequenceNumber = session.turnCount + 1

    const [turn] = await getPrisma().$transaction([
      getPrisma().turn.create({
        data: {
          sessionId,
          agentId: data.agentId,
          sequenceNumber,
          terms: data.terms as Prisma.InputJsonValue,
          proofType: data.proofType,
          proof: data.proof as Prisma.InputJsonValue,
          publicSignals: data.publicSignals as Prisma.InputJsonValue,
          signature: data.signature,
        },
      }),
      getPrisma().session.update({
        where: { id: sessionId },
        data: { turnCount: sequenceNumber },
      }),
    ])

    return toStoredTurn(turn)
  }

  async getTurns(sessionId: string, requestingOrgId: string): Promise<StoredTurn[]> {
    const session = await getPrisma().session.findUnique({ where: { id: sessionId } })
    if (!session) return []

    const rows = await getPrisma().turn.findMany({
      where: { sessionId },
      orderBy: { sequenceNumber: 'asc' },
    })
    const turns = rows.map(toStoredTurn)

    if (session.sessionType !== 'cross_org') {
      return turns
    }

    // Redact counterparty terms for cross-org sessions
    const isInitiator = session.initiatorOrgId === requestingOrgId
    return turns.map(t => {
      const isOwnTurn = isInitiator
        ? t.agentId === session.initiatorAgentId
        : t.agentId === session.counterpartyAgentId
      if (!isOwnTurn) {
        return { ...t, terms: { redacted: true } }
      }
      return t
    })
  }

  async clearStores(): Promise<void> {
    await getPrisma().turn.deleteMany()
    await getPrisma().session.deleteMany()
  }
}

/** Singleton instance shared across routes */
export const sessionService = new SessionService()
