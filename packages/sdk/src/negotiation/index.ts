import type { SessionConfig, SessionType } from '@attestara/types'
import { NegotiationSession } from './session.js'

export { NegotiationSession } from './session.js'
export { MerkleAccumulator } from './merkle.js'
export { createTurn, validateTurn, hashTurn } from './turn.js'

export class SessionManager {
  private sessions: Map<string, NegotiationSession> = new Map()

  async create(config: {
    initiatorAgentId: string
    counterpartyAgentId: string
    sessionConfig: SessionConfig
    sessionType?: SessionType
  }): Promise<NegotiationSession> {
    const session = new NegotiationSession({
      id: crypto.randomUUID(),
      ...config,
    })
    this.sessions.set(session.id, session)
    return session
  }

  get(sessionId: string): NegotiationSession | undefined {
    return this.sessions.get(sessionId)
  }

  list(): NegotiationSession[] {
    return Array.from(this.sessions.values())
  }
}
