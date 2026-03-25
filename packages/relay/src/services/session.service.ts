import { createHash, randomBytes, randomUUID } from 'crypto'

export interface StoredSession {
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
  counterpartyAgentId: string
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

export class SessionService {
  private sessions = new Map<string, StoredSession>()
  private turns = new Map<string, StoredTurn[]>()
  private inviteTokens = new Map<string, string>() // tokenHash -> sessionId

  createSession(data: CreateSessionData): { session: StoredSession; inviteToken?: string } {
    const isCrossOrg = data.sessionType === 'cross_org'
    let inviteTokenHash: string | null = null
    let inviteToken: string | undefined

    if (isCrossOrg) {
      const rawToken = randomBytes(32).toString('hex')
      inviteTokenHash = createHash('sha256').update(rawToken).digest('hex')
      inviteToken = rawToken
    }

    const session: StoredSession = {
      id: randomUUID(),
      initiatorAgentId: data.initiatorAgentId,
      initiatorOrgId: data.initiatorOrgId,
      counterpartyAgentId: data.counterpartyAgentId,
      counterpartyOrgId: data.counterpartyOrgId,
      sessionType: data.sessionType,
      inviteTokenHash,
      status: isCrossOrg ? 'pending_acceptance' : 'active',
      sessionConfig: data.sessionConfig ?? {},
      merkleRoot: null,
      turnCount: 0,
      anchorTxHash: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.sessions.set(session.id, session)
    this.turns.set(session.id, [])
    if (inviteTokenHash) {
      this.inviteTokens.set(inviteTokenHash, session.id)
    }

    return { session, inviteToken }
  }

  getSession(sessionId: string): StoredSession | null {
    return this.sessions.get(sessionId) ?? null
  }

  getSessionWithOrgCheck(sessionId: string, orgId: string): StoredSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    if (session.initiatorOrgId !== orgId && session.counterpartyOrgId !== orgId) return null
    return session
  }

  listByOrg(orgId: string): StoredSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.initiatorOrgId === orgId || s.counterpartyOrgId === orgId,
    )
  }

  acceptSession(sessionId: string, rawInviteToken: string): StoredSession | { error: string; code: string } {
    const session = this.sessions.get(sessionId)
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

    session.status = 'active'
    session.updatedAt = new Date().toISOString()
    return session
  }

  generateInviteToken(sessionId: string): { inviteToken: string; sessionId: string } | { error: string; code: string } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { error: 'Session not found', code: 'SESSION_NOT_FOUND' }
    }

    if (session.sessionType !== 'cross_org') {
      return { error: 'Invites are only for cross-org sessions', code: 'VALIDATION_ERROR' }
    }

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    session.inviteTokenHash = tokenHash
    this.inviteTokens.set(tokenHash, sessionId)

    return { inviteToken: rawToken, sessionId }
  }

  appendTurn(sessionId: string, data: AppendTurnData): StoredTurn | { error: string; code: string } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { error: 'Session not found', code: 'SESSION_NOT_FOUND' }
    }

    if (session.status !== 'active') {
      return { error: 'Session is not active', code: 'SESSION_NOT_ACTIVE' }
    }

    if (data.agentId !== session.initiatorAgentId && data.agentId !== session.counterpartyAgentId) {
      return { error: 'Agent is not a party to this session', code: 'AGENT_NOT_PARTY' }
    }

    const sessionTurns = this.turns.get(sessionId) ?? []
    const sequenceNumber = sessionTurns.length + 1

    const turn: StoredTurn = {
      id: randomUUID(),
      sessionId,
      agentId: data.agentId,
      sequenceNumber,
      terms: data.terms,
      proofType: data.proofType,
      proof: data.proof,
      publicSignals: data.publicSignals,
      signature: data.signature,
      createdAt: new Date().toISOString(),
    }

    sessionTurns.push(turn)
    this.turns.set(sessionId, sessionTurns)
    session.turnCount = sequenceNumber
    session.updatedAt = new Date().toISOString()

    return turn
  }

  getTurns(sessionId: string, requestingOrgId: string): (StoredTurn | (Omit<StoredTurn, 'terms'> & { terms: Record<string, unknown> }))[] {
    const session = this.sessions.get(sessionId)
    if (!session) return []

    const sessionTurns = this.turns.get(sessionId) ?? []

    if (session.sessionType !== 'cross_org') {
      return sessionTurns
    }

    // Redact counterparty terms for cross-org sessions
    const isInitiator = session.initiatorOrgId === requestingOrgId
    return sessionTurns.map(t => {
      const isOwnTurn = isInitiator
        ? t.agentId === session.initiatorAgentId
        : t.agentId === session.counterpartyAgentId
      if (!isOwnTurn) {
        return { ...t, terms: { redacted: true } }
      }
      return t
    })
  }

  clearStores(): void {
    this.sessions.clear()
    this.turns.clear()
    this.inviteTokens.clear()
  }
}

/** Singleton instance shared across routes */
export const sessionService = new SessionService()
