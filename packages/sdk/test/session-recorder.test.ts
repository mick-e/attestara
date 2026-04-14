import { describe, it, expect, vi } from 'vitest'
import { NegotiationSession } from '../src/negotiation/session.js'
import { CircuitId } from '@attestara/types'
import type {
  SessionConfig,
  SessionEvent,
  ZKProof,
  PublicSignals,
  Terms,
} from '@attestara/types'

/**
 * NegotiationSession acts as the SDK's session recorder: it records turns,
 * maintains a merkle log, and emits lifecycle events. These tests focus on
 * the recorder's lifecycle / history semantics (complementing the broader
 * coverage in negotiation.test.ts).
 */

const fakeProof: ZKProof = {
  pi_a: ['0x1', '0x2'],
  pi_b: [['0x3', '0x4'], ['0x5', '0x6']],
  pi_c: ['0x7', '0x8'],
  protocol: 'groth16',
  curve: 'bn128',
}

const fakeSignals: PublicSignals = { signals: ['100'] }

const baseConfig: SessionConfig = {
  maxTurns: 10,
  turnTimeoutSeconds: 60,
  sessionTimeoutSeconds: 600,
  requiredProofs: [CircuitId.MANDATE_BOUND],
}

function termsOf(value: bigint): Terms {
  return { value, currency: 'USDC', deliveryDays: 7 }
}

function newRecorder(overrides: Partial<SessionConfig> = {}) {
  return new NegotiationSession({
    id: 'rec-1',
    initiatorAgentId: 'did:ethr:0xAAA',
    counterpartyAgentId: 'did:ethr:0xBBB',
    sessionConfig: { ...baseConfig, ...overrides },
  })
}

function proposeFrom(session: NegotiationSession, agent: string, value: bigint) {
  return session.proposeTurn({
    agentId: agent,
    terms: termsOf(value),
    proofType: CircuitId.MANDATE_BOUND,
    proof: fakeProof,
    publicSignals: fakeSignals,
  })
}

describe('NegotiationSession as session recorder', () => {
  it('should expose immutable turn history in sequence order', () => {
    const s = newRecorder()
    proposeFrom(s, 'did:ethr:0xAAA', 5000n)
    proposeFrom(s, 'did:ethr:0xBBB', 4500n)
    proposeFrom(s, 'did:ethr:0xAAA', 4800n)

    expect(s.turns).toHaveLength(3)
    expect(s.turns[0].sequenceNumber).toBe(1)
    expect(s.turns[1].sequenceNumber).toBe(2)
    expect(s.turns[2].sequenceNumber).toBe(3)
    expect(s.turns[0].terms.value).toBe(5000n)
  })

  it('should record a createdAt timestamp on construction', () => {
    const s = newRecorder()
    expect(s.createdAt).toBeInstanceOf(Date)
    expect(Date.now() - s.createdAt.getTime()).toBeLessThan(5000)
  })

  it('should bind each turn to the session id and produce a signature', () => {
    const s = newRecorder()
    const turn = proposeFrom(s, 'did:ethr:0xAAA', 7000n)
    expect(turn.sessionId).toBe('rec-1')
    expect(turn.signature).toBeDefined()
    expect(turn.signature.length).toBeGreaterThan(0)
  })

  it('should emit events with the recorded turn attached', () => {
    const s = newRecorder()
    const handler = vi.fn()
    s.on('event', handler)

    const turn = proposeFrom(s, 'did:ethr:0xAAA', 5000n)

    const event = handler.mock.calls[0][0] as SessionEvent
    expect(event.type).toBe('turn.proposed')
    if (event.type === 'turn.proposed') {
      expect(event.turn.id).toBe(turn.id)
    }
  })

  it('should update the merkle root monotonically as turns are recorded', () => {
    const s = newRecorder()
    const r0 = s.merkleRoot
    proposeFrom(s, 'did:ethr:0xAAA', 5000n)
    const r1 = s.merkleRoot
    proposeFrom(s, 'did:ethr:0xBBB', 4500n)
    const r2 = s.merkleRoot

    expect(new Set([r0, r1, r2]).size).toBe(3)
  })

  it('should refuse to record after the session has completed', () => {
    const s = newRecorder()
    proposeFrom(s, 'did:ethr:0xAAA', 5000n)
    s.accept('did:ethr:0xBBB')

    expect(() => proposeFrom(s, 'did:ethr:0xAAA', 4000n)).toThrow(
      'Session is not active',
    )
  })

  it('should refuse to record while paused and resume cleanly', () => {
    const s = newRecorder()
    proposeFrom(s, 'did:ethr:0xAAA', 5000n)
    s.pause()

    expect(() => proposeFrom(s, 'did:ethr:0xBBB', 4500n)).toThrow(
      'Session is not active',
    )

    s.resume()
    const turn = proposeFrom(s, 'did:ethr:0xBBB', 4500n)
    expect(turn.sequenceNumber).toBe(2)
  })
})
