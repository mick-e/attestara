import { describe, it, expect, vi } from 'vitest'
import { NegotiationSession, type NegotiationSessionParams } from '../src/negotiation/session.js'
import type { CircuitId, ZKProof, PublicSignals } from '@attestara/types'

const mockProof: ZKProof = {
  pi_a: ['1', '2'],
  pi_b: [['3', '4'], ['5', '6']],
  pi_c: ['7', '8'],
  protocol: 'groth16',
  curve: 'bn128',
}

const mockSignals: PublicSignals = { signals: ['100'] }

function makeParams(overrides: Partial<NegotiationSessionParams> = {}): NegotiationSessionParams {
  return {
    id: 'sess-001',
    initiatorAgentId: 'did:ethr:0x111',
    counterpartyAgentId: 'did:ethr:0x222',
    initiatorOrgId: 'org-1',
    counterpartyOrgId: 'org-2',
    ...overrides,
  }
}

describe('NegotiationSession', () => {
  it('creates a session with correct initial state', () => {
    const session = new NegotiationSession(makeParams())
    expect(session.id).toBe('sess-001')
    expect(session.status).toBe('active')
    expect(session.turns).toHaveLength(0)
  })

  it('adds a turn to the session', () => {
    const session = new NegotiationSession(makeParams())
    session.addTurn({
      agentId: 'did:ethr:0x111',
      terms: { value: 400000n, currency: 'EUR' },
      proofType: 'MandateBound' as CircuitId,
      proof: mockProof,
      publicSignals: mockSignals,
      signature: 'sig-1',
    })

    expect(session.turns).toHaveLength(1)
    expect(session.turns[0]?.terms.value).toBe(400000n)
  })

  it('accepts the session after a turn', () => {
    const session = new NegotiationSession(makeParams())
    session.addTurn({
      agentId: 'did:ethr:0x111',
      terms: { value: 400000n, currency: 'EUR' },
      proofType: 'MandateBound' as CircuitId,
      proof: mockProof,
      publicSignals: mockSignals,
      signature: 'sig-1',
    })

    session.accept('did:ethr:0x222')
    expect(session.status).toBe('completed')
  })

  it('rejects accepting own proposal', () => {
    const session = new NegotiationSession(makeParams())
    session.addTurn({
      agentId: 'did:ethr:0x111',
      terms: { value: 400000n, currency: 'EUR' },
      proofType: 'MandateBound' as CircuitId,
      proof: mockProof,
      publicSignals: mockSignals,
      signature: 'sig-1',
    })

    expect(() => session.accept('did:ethr:0x111')).toThrow('own proposal')
  })

  it('rejects accepting when no turns exist', () => {
    const session = new NegotiationSession(makeParams())
    expect(() => session.accept('did:ethr:0x222')).toThrow('no turns')
  })

  it('emits events on turn addition', () => {
    const session = new NegotiationSession(makeParams())
    const handler = vi.fn()
    session.on('event', handler)

    session.addTurn({
      agentId: 'did:ethr:0x111',
      terms: { value: 400000n, currency: 'EUR' },
      proofType: 'MandateBound' as CircuitId,
      proof: mockProof,
      publicSignals: mockSignals,
      signature: 'sig-1',
    })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'turn.proposed' }),
    )
  })

  it('rejects negotiation with reason', () => {
    const session = new NegotiationSession(makeParams())
    session.reject('Terms unacceptable')
    expect(session.status).toBe('rejected')
  })
})
