import { ZKProof, PublicSignals, CircuitId } from './zk.js'

export interface Terms {
  value: bigint
  currency: string
  deliveryDays?: number
  paymentTerms?: string
  additionalTerms?: Record<string, unknown>
}

export interface NegotiationTurn {
  id: string
  sessionId: string
  agentId: string
  sequenceNumber: number
  terms: Terms
  proofType: CircuitId
  proof: ZKProof
  publicSignals: PublicSignals
  signature: string
  createdAt: Date
}

export enum SessionStatus {
  PENDING_ACCEPTANCE = 'pending_acceptance',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  COMMITTED = 'committed',
  PAUSED = 'paused',
}

export enum SessionType {
  INTRA_ORG = 'intra_org',
  CROSS_ORG = 'cross_org',
}

export interface Session {
  id: string
  initiatorAgentId: string
  initiatorOrgId: string
  counterpartyAgentId: string
  counterpartyOrgId: string
  sessionType: SessionType
  status: SessionStatus
  config: SessionConfig
  merkleRoot: string | null
  turnCount: number
  anchorTxHash: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SessionConfig {
  maxTurns: number
  turnTimeoutSeconds: number
  sessionTimeoutSeconds: number
  requiredProofs: CircuitId[]
}

export interface TurnContext {
  session: Session
  turnHistory: NegotiationTurn[]
  mandate: {
    maxValue: bigint
    currency: string
    floor?: bigint
    ceiling?: bigint
  }
  currentTurnNumber: number
}

export type TurnDecision =
  | { action: 'counter'; terms: Terms }
  | { action: 'accept' }
  | { action: 'reject'; reason: string }

export type SessionEvent =
  | { type: 'turn.proposed'; turn: NegotiationTurn }
  | { type: 'turn.countered'; turn: NegotiationTurn }
  | { type: 'turn.accepted'; turn: NegotiationTurn }
  | { type: 'turn.rejected'; reason: string }
  | { type: 'proof.verified'; turnId: string; valid: boolean }
  | { type: 'commitment.created'; commitmentId: string; txHash: string }
  | { type: 'turn.proof_failed'; turnId: string; error: string }
