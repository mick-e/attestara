import { createHash, createHmac } from 'crypto'
import type { NegotiationTurn, Terms, CircuitId, ZKProof, PublicSignals } from '@agentclear/types'

export interface TurnInput {
  sessionId: string
  agentId: string
  sequenceNumber: number
  terms: Terms
  proofType: CircuitId
  proof: ZKProof
  publicSignals: PublicSignals
  signingKey?: string
}

/**
 * Create a signed negotiation turn.
 */
export function createTurn(input: TurnInput): NegotiationTurn {
  const turnId = crypto.randomUUID()

  const payload = JSON.stringify({
    id: turnId,
    sessionId: input.sessionId,
    agentId: input.agentId,
    sequenceNumber: input.sequenceNumber,
    terms: serializeTerms(input.terms),
    proofType: input.proofType,
  })

  const signingKey = input.signingKey ?? input.agentId
  const signature = createHmac('sha256', signingKey)
    .update(payload)
    .digest('hex')

  return {
    id: turnId,
    sessionId: input.sessionId,
    agentId: input.agentId,
    sequenceNumber: input.sequenceNumber,
    terms: input.terms,
    proofType: input.proofType,
    proof: input.proof,
    publicSignals: input.publicSignals,
    signature,
    createdAt: new Date(),
  }
}

/**
 * Validate a turn's structural integrity (does not verify ZK proof).
 */
export function validateTurn(turn: NegotiationTurn, expectedSequence: number): string[] {
  const errors: string[] = []

  if (!turn.id) errors.push('Missing turn id')
  if (!turn.sessionId) errors.push('Missing session id')
  if (!turn.agentId) errors.push('Missing agent id')
  if (!turn.signature) errors.push('Missing signature')
  if (turn.sequenceNumber !== expectedSequence) {
    errors.push(`Expected sequence ${expectedSequence}, got ${turn.sequenceNumber}`)
  }
  if (!turn.terms) errors.push('Missing terms')
  if (turn.terms && !turn.terms.currency) errors.push('Missing terms currency')

  return errors
}

/**
 * Compute a hash of a turn for merkle tree inclusion.
 */
export function hashTurn(turn: NegotiationTurn): string {
  const data = JSON.stringify({
    id: turn.id,
    sessionId: turn.sessionId,
    agentId: turn.agentId,
    sequenceNumber: turn.sequenceNumber,
    terms: serializeTerms(turn.terms),
    signature: turn.signature,
  })
  return createHash('sha256').update(data).digest('hex')
}

function serializeTerms(terms: Terms): Record<string, unknown> {
  return {
    value: terms.value.toString(),
    currency: terms.currency,
    deliveryDays: terms.deliveryDays,
    paymentTerms: terms.paymentTerms,
    additionalTerms: terms.additionalTerms,
  }
}
