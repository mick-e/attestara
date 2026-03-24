import { EventEmitter } from 'events'
import type {
  SessionStatus,
  SessionConfig,
  SessionType,
  SessionEvent,
  NegotiationTurn,
  Terms,
  CircuitId,
  ZKProof,
  PublicSignals,
} from '@attestara/types'
import { MerkleAccumulator } from './merkle.js'
import { createTurn, validateTurn, hashTurn } from './turn.js'

export interface NegotiationSessionInit {
  id: string
  initiatorAgentId: string
  counterpartyAgentId: string
  sessionConfig: SessionConfig
  sessionType?: SessionType
}

export class NegotiationSession extends EventEmitter {
  readonly id: string
  readonly initiatorAgentId: string
  readonly counterpartyAgentId: string
  readonly sessionType: SessionType
  readonly config: SessionConfig

  private _status: SessionStatus
  private _turns: NegotiationTurn[] = []
  private merkle: MerkleAccumulator = new MerkleAccumulator()
  private _createdAt: Date = new Date()

  constructor(init: NegotiationSessionInit) {
    super()
    this.id = init.id
    this.initiatorAgentId = init.initiatorAgentId
    this.counterpartyAgentId = init.counterpartyAgentId
    this.config = init.sessionConfig
    this.sessionType = init.sessionType ?? ('cross_org' as SessionType)
    this._status = 'active' as SessionStatus
  }

  get status(): SessionStatus {
    return this._status
  }

  get turns(): ReadonlyArray<NegotiationTurn> {
    return this._turns
  }

  get turnCount(): number {
    return this._turns.length
  }

  get merkleRoot(): string {
    return this.merkle.getRoot()
  }

  get createdAt(): Date {
    return this._createdAt
  }

  /**
   * Propose a new turn in the negotiation.
   */
  proposeTurn(params: {
    agentId: string
    terms: Terms
    proofType: CircuitId
    proof: ZKProof
    publicSignals: PublicSignals
  }): NegotiationTurn {
    this.assertActive()

    if (this._turns.length >= this.config.maxTurns) {
      throw new Error(`Maximum turns (${this.config.maxTurns}) reached`)
    }

    const nextSequence = this._turns.length + 1
    const turn = createTurn({
      sessionId: this.id,
      agentId: params.agentId,
      sequenceNumber: nextSequence,
      terms: params.terms,
      proofType: params.proofType,
      proof: params.proof,
      publicSignals: params.publicSignals,
    })

    const errors = validateTurn(turn, nextSequence)
    if (errors.length > 0) {
      throw new Error(`Invalid turn: ${errors.join(', ')}`)
    }

    this._turns.push(turn)
    this.merkle.addLeaf(hashTurn(turn))

    const eventType = nextSequence === 1 ? 'turn.proposed' : 'turn.countered'
    const event: SessionEvent = { type: eventType, turn }
    this.emit('event', event)

    return turn
  }

  /**
   * Accept the latest proposed terms, completing the negotiation.
   */
  accept(agentId: string): void {
    this.assertActive()

    if (this._turns.length === 0) {
      throw new Error('Cannot accept — no turns have been proposed')
    }

    const lastTurn = this._turns[this._turns.length - 1]
    if (lastTurn.agentId === agentId) {
      throw new Error('Cannot accept your own proposal')
    }

    this._status = 'completed' as SessionStatus

    const event: SessionEvent = { type: 'turn.accepted', turn: lastTurn }
    this.emit('event', event)
  }

  /**
   * Reject the negotiation.
   */
  reject(reason: string): void {
    this.assertActive()
    this._status = 'rejected' as SessionStatus

    const event: SessionEvent = { type: 'turn.rejected', reason }
    this.emit('event', event)
  }

  /**
   * Pause the session.
   */
  pause(): void {
    this.assertActive()
    this._status = 'paused' as SessionStatus
  }

  /**
   * Resume a paused session.
   */
  resume(): void {
    if (this._status !== ('paused' as SessionStatus)) {
      throw new Error(`Cannot resume session in ${this._status} state`)
    }
    this._status = 'active' as SessionStatus
  }

  private assertActive(): void {
    if (this._status !== ('active' as SessionStatus)) {
      throw new Error(`Session is not active (status: ${this._status})`)
    }
  }
}
