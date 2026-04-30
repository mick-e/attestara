import { describe, it, expect } from 'vitest'
import { createTurn, validateTurn, hashTurn, type TurnInput } from '../src/negotiation/turn.js'
import type { CircuitId, ZKProof, PublicSignals } from '@attestara/types'

const mockProof: ZKProof = {
  pi_a: ['1', '2'],
  pi_b: [['3', '4'], ['5', '6']],
  pi_c: ['7', '8'],
  protocol: 'groth16',
  curve: 'bn128',
}

const mockSignals: PublicSignals = {
  signals: ['100'],
}

function makeTurnInput(overrides: Partial<TurnInput> = {}): TurnInput {
  return {
    sessionId: 'sess-001',
    agentId: 'did:ethr:0x111',
    sequenceNumber: 1,
    terms: { value: 100000n, currency: 'EUR' },
    proofType: 'MandateBound' as CircuitId,
    proof: mockProof,
    publicSignals: mockSignals,
    ...overrides,
  }
}

describe('createTurn', () => {
  it('creates a turn with all required fields', () => {
    const turn = createTurn(makeTurnInput())

    expect(turn.id).toBeTruthy()
    expect(turn.sessionId).toBe('sess-001')
    expect(turn.agentId).toBe('did:ethr:0x111')
    expect(turn.sequenceNumber).toBe(1)
    expect(turn.terms.value).toBe(100000n)
    expect(turn.terms.currency).toBe('EUR')
    expect(turn.proofType).toBe('MandateBound')
    expect(turn.proof).toEqual(mockProof)
    expect(turn.publicSignals).toEqual(mockSignals)
    expect(turn.signature).toBeTruthy()
    expect(turn.createdAt).toBeInstanceOf(Date)
  })

  it('generates unique turn IDs', () => {
    const turn1 = createTurn(makeTurnInput())
    const turn2 = createTurn(makeTurnInput())
    expect(turn1.id).not.toBe(turn2.id)
  })

  it('uses custom signing key when provided', () => {
    const turn1 = createTurn(makeTurnInput({ signingKey: 'key-a' }))
    const turn2 = createTurn(makeTurnInput({ signingKey: 'key-b' }))
    expect(turn1.signature).not.toBe(turn2.signature)
  })
})

describe('validateTurn', () => {
  it('returns no errors for a valid turn', () => {
    const turn = createTurn(makeTurnInput())
    const errors = validateTurn(turn, 1)
    expect(errors).toHaveLength(0)
  })

  it('detects wrong sequence number', () => {
    const turn = createTurn(makeTurnInput({ sequenceNumber: 3 }))
    const errors = validateTurn(turn, 1)
    expect(errors.some(e => e.includes('sequence'))).toBe(true)
  })

  it('detects missing fields', () => {
    const turn = createTurn(makeTurnInput())
    turn.agentId = ''
    const errors = validateTurn(turn, 1)
    expect(errors.some(e => e.includes('agent'))).toBe(true)
  })
})

describe('hashTurn', () => {
  it('returns a hex string hash', () => {
    const turn = createTurn(makeTurnInput())
    const hash = hashTurn(turn)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different hashes for different turns', () => {
    const turn1 = createTurn(makeTurnInput({ sequenceNumber: 1 }))
    const turn2 = createTurn(makeTurnInput({ sequenceNumber: 2 }))
    expect(hashTurn(turn1)).not.toBe(hashTurn(turn2))
  })

  it('produces deterministic hash for same turn', () => {
    const turn = createTurn(makeTurnInput())
    expect(hashTurn(turn)).toBe(hashTurn(turn))
  })
})
