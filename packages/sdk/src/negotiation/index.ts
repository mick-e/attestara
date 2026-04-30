import type { SessionConfig, SessionType, NegotiationTurn, Terms, CircuitId, ZKProof, PublicSignals } from '@attestara/types'
import { NegotiationSession } from './session.js'

export { NegotiationSession } from './session.js'
export { MerkleAccumulator } from './merkle.js'
export { createTurn, validateTurn, hashTurn } from './turn.js'

/** Relay session shape returned by the API */
export interface RelaySession {
  id: string
  initiatorAgentId: string
  initiatorOrgId: string
  counterpartyAgentId: string
  counterpartyOrgId: string
  sessionType: string
  status: string
  sessionConfig: Record<string, unknown>
  merkleRoot: string | null
  turnCount: number
  anchorTxHash: string | null
  createdAt: string
  updatedAt: string
}

interface RelayConfig {
  url: string
  apiKey?: string | undefined
}

export class SessionManager {
  private sessions: Map<string, NegotiationSession> = new Map()
  private relay: RelayConfig | null

  constructor(relay?: RelayConfig) {
    this.relay = relay?.url ? relay : null
  }

  async create(config: {
    initiatorAgentId: string
    counterpartyAgentId: string
    sessionConfig: SessionConfig
    sessionType?: SessionType
    initiatorOrgId?: string
    counterpartyOrgId?: string
  }): Promise<NegotiationSession> {
    if (this.relay) {
      const body = {
        initiatorAgentId: config.initiatorAgentId,
        counterpartyAgentId: config.counterpartyAgentId,
        initiatorOrgId: config.initiatorOrgId ?? '',
        counterpartyOrgId: config.counterpartyOrgId ?? '',
        sessionType: config.sessionType ?? 'intra_org',
        sessionConfig: config.sessionConfig,
      }
      const res = await this.relayFetch('/v1/sessions', { method: 'POST', body })
      return this.wrapRelaySession(res as RelaySession, config.sessionConfig)
    }

    const session = new NegotiationSession({
      id: crypto.randomUUID(),
      ...config,
    })
    this.sessions.set(session.id, session)
    return session
  }

  async get(sessionId: string): Promise<NegotiationSession | undefined> {
    if (this.relay) {
      try {
        const res = await this.relayFetch(`/v1/sessions/${sessionId}`)
        return this.wrapRelaySession(res as RelaySession)
      } catch (_err: unknown) {
        return undefined
      }
    }
    return this.sessions.get(sessionId)
  }

  async list(): Promise<NegotiationSession[]> {
    if (this.relay) {
      const res = await this.relayFetch('/v1/sessions')
      const sessions = res as RelaySession[]
      return sessions.map(s => this.wrapRelaySession(s))
    }
    return Array.from(this.sessions.values())
  }

  /**
   * Submit a turn to the relay API.
   * Only available when relay is configured.
   */
  async submitTurn(sessionId: string, params: {
    agentId: string
    terms: Terms
    proofType: CircuitId
    proof: ZKProof
    publicSignals: PublicSignals
    signature: string
  }): Promise<NegotiationTurn> {
    if (!this.relay) {
      throw new Error('submitTurn requires relay configuration')
    }
    const res = await this.relayFetch(`/v1/sessions/${sessionId}/turns`, {
      method: 'POST',
      body: params,
    })
    return res as NegotiationTurn
  }

  /**
   * Get turns for a session from the relay API.
   */
  async getTurns(sessionId: string): Promise<NegotiationTurn[]> {
    if (!this.relay) {
      const session = this.sessions.get(sessionId)
      return session ? [...session.turns] : []
    }
    const res = await this.relayFetch(`/v1/sessions/${sessionId}/turns`)
    return res as NegotiationTurn[]
  }

  /**
   * Accept a cross-org session via invite token.
   */
  async acceptSession(sessionId: string, inviteToken: string): Promise<RelaySession> {
    if (!this.relay) {
      throw new Error('acceptSession requires relay configuration')
    }
    return await this.relayFetch(`/v1/sessions/${sessionId}/accept`, {
      method: 'POST',
      body: { inviteToken },
    }) as RelaySession
  }

  private async relayFetch(path: string, opts?: { method?: string; body?: unknown }): Promise<unknown> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.relay!.apiKey) {
      headers['Authorization'] = `Bearer ${this.relay!.apiKey}`
    }
    const res = await fetch(`${this.relay!.url}${path}`, {
      method: opts?.method ?? 'GET',
      headers,
      ...(opts?.body ? { body: JSON.stringify(opts.body) } : {}),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error((err as { error: string }).error ?? `Relay API error: ${res.status}`)
    }
    return res.json()
  }

  private wrapRelaySession(relay: RelaySession, config?: SessionConfig): NegotiationSession {
    return new NegotiationSession({
      id: relay.id,
      initiatorAgentId: relay.initiatorAgentId,
      counterpartyAgentId: relay.counterpartyAgentId,
      sessionConfig: config ?? (relay.sessionConfig as unknown as SessionConfig),
      sessionType: relay.sessionType as SessionType,
    })
  }
}
