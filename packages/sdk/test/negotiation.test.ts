import { describe, it, expect, vi } from 'vitest'
import { SessionManager, NegotiationSession, MerkleAccumulator } from '../src/negotiation/index.js'
import { CircuitId } from '@agentclear/types'
import type { Terms, ZKProof, PublicSignals, SessionConfig, SessionEvent } from '@agentclear/types'

const fakeProof: ZKProof = {
  pi_a: ['0x1', '0x2'],
  pi_b: [['0x3', '0x4'], ['0x5', '0x6']],
  pi_c: ['0x7', '0x8'],
  protocol: 'groth16',
  curve: 'bn128',
}

const fakeSignals: PublicSignals = {
  signals: ['10000'],
}

const defaultConfig: SessionConfig = {
  maxTurns: 10,
  turnTimeoutSeconds: 300,
  sessionTimeoutSeconds: 3600,
  requiredProofs: [CircuitId.MANDATE_BOUND],
}

function makeTerms(value: bigint): Terms {
  return { value, currency: 'USDC', deliveryDays: 7 }
}

describe('SessionManager', () => {
  it('should create a session', async () => {
    const manager = new SessionManager()
    const session = await manager.create({
      initiatorAgentId: 'did:ethr:0xAAA',
      counterpartyAgentId: 'did:ethr:0xBBB',
      sessionConfig: defaultConfig,
    })

    expect(session.id).toBeDefined()
    expect(session.status).toBe('active')
    expect(session.initiatorAgentId).toBe('did:ethr:0xAAA')
    expect(session.counterpartyAgentId).toBe('did:ethr:0xBBB')
  })

  it('should retrieve a session by id', async () => {
    const manager = new SessionManager()
    const session = await manager.create({
      initiatorAgentId: 'did:ethr:0xAAA',
      counterpartyAgentId: 'did:ethr:0xBBB',
      sessionConfig: defaultConfig,
    })

    const retrieved = manager.get(session.id)
    expect(retrieved).toBe(session)
  })

  it('should list all sessions', async () => {
    const manager = new SessionManager()
    await manager.create({
      initiatorAgentId: 'did:ethr:0xAAA',
      counterpartyAgentId: 'did:ethr:0xBBB',
      sessionConfig: defaultConfig,
    })
    await manager.create({
      initiatorAgentId: 'did:ethr:0xCCC',
      counterpartyAgentId: 'did:ethr:0xDDD',
      sessionConfig: defaultConfig,
    })

    expect(manager.list()).toHaveLength(2)
  })

  it('should return undefined for unknown session id', () => {
    const manager = new SessionManager()
    expect(manager.get('nonexistent')).toBeUndefined()
  })
})

describe('NegotiationSession', () => {
  function createSession() {
    return new NegotiationSession({
      id: 'test-session-1',
      initiatorAgentId: 'did:ethr:0xAAA',
      counterpartyAgentId: 'did:ethr:0xBBB',
      sessionConfig: defaultConfig,
    })
  }

  it('should start with active status', () => {
    const session = createSession()
    expect(session.status).toBe('active')
    expect(session.turnCount).toBe(0)
  })

  it('should propose a turn and increment sequence number', () => {
    const session = createSession()
    const turn = session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: makeTerms(5000n),
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    expect(turn.sequenceNumber).toBe(1)
    expect(turn.agentId).toBe('did:ethr:0xAAA')
    expect(turn.terms.value).toBe(5000n)
    expect(turn.signature).toBeDefined()
    expect(session.turnCount).toBe(1)
  })

  it('should update merkle root after each turn', () => {
    const session = createSession()
    const emptyRoot = session.merkleRoot
    expect(emptyRoot).toBe('0x' + '0'.repeat(64))

    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: makeTerms(5000n),
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })
    const rootAfterFirst = session.merkleRoot
    expect(rootAfterFirst).not.toBe(emptyRoot)

    session.proposeTurn({
      agentId: 'did:ethr:0xBBB',
      terms: makeTerms(4500n),
      proofType: CircuitId.PARAMETER_RANGE,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })
    const rootAfterSecond = session.merkleRoot
    expect(rootAfterSecond).not.toBe(rootAfterFirst)
  })

  it('should accept and complete the session', () => {
    const session = createSession()
    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: makeTerms(5000n),
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    session.accept('did:ethr:0xBBB')
    expect(session.status).toBe('completed')
  })

  it('should reject the session', () => {
    const session = createSession()
    session.reject('Terms unacceptable')
    expect(session.status).toBe('rejected')
  })

  it('should not allow proposing turns after rejection', () => {
    const session = createSession()
    session.reject('No deal')

    expect(() => {
      session.proposeTurn({
        agentId: 'did:ethr:0xAAA',
        terms: makeTerms(5000n),
        proofType: CircuitId.MANDATE_BOUND,
        proof: fakeProof,
        publicSignals: fakeSignals,
      })
    }).toThrow('Session is not active')
  })

  it('should not allow accepting with no turns', () => {
    const session = createSession()
    expect(() => session.accept('did:ethr:0xBBB')).toThrow('no turns have been proposed')
  })

  it('should not allow self-acceptance', () => {
    const session = createSession()
    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: makeTerms(5000n),
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    expect(() => session.accept('did:ethr:0xAAA')).toThrow('Cannot accept your own proposal')
  })

  it('should enforce max turns limit', () => {
    const session = new NegotiationSession({
      id: 'limited-session',
      initiatorAgentId: 'did:ethr:0xAAA',
      counterpartyAgentId: 'did:ethr:0xBBB',
      sessionConfig: { ...defaultConfig, maxTurns: 2 },
    })

    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: makeTerms(5000n),
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })
    session.proposeTurn({
      agentId: 'did:ethr:0xBBB',
      terms: makeTerms(4500n),
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    expect(() => {
      session.proposeTurn({
        agentId: 'did:ethr:0xAAA',
        terms: makeTerms(4000n),
        proofType: CircuitId.MANDATE_BOUND,
        proof: fakeProof,
        publicSignals: fakeSignals,
      })
    }).toThrow('Maximum turns (2) reached')
  })

  it('should support pause and resume', () => {
    const session = createSession()
    session.pause()
    expect(session.status).toBe('paused')

    session.resume()
    expect(session.status).toBe('active')
  })

  it('should not resume a non-paused session', () => {
    const session = createSession()
    expect(() => session.resume()).toThrow('Cannot resume session in active state')
  })

  describe('events', () => {
    it('should emit turn.proposed on first turn', () => {
      const session = createSession()
      const handler = vi.fn()
      session.on('event', handler)

      session.proposeTurn({
        agentId: 'did:ethr:0xAAA',
        terms: makeTerms(5000n),
        proofType: CircuitId.MANDATE_BOUND,
        proof: fakeProof,
        publicSignals: fakeSignals,
      })

      expect(handler).toHaveBeenCalledOnce()
      const event = handler.mock.calls[0][0] as SessionEvent
      expect(event.type).toBe('turn.proposed')
    })

    it('should emit turn.countered on subsequent turns', () => {
      const session = createSession()
      const handler = vi.fn()
      session.on('event', handler)

      session.proposeTurn({
        agentId: 'did:ethr:0xAAA',
        terms: makeTerms(5000n),
        proofType: CircuitId.MANDATE_BOUND,
        proof: fakeProof,
        publicSignals: fakeSignals,
      })
      session.proposeTurn({
        agentId: 'did:ethr:0xBBB',
        terms: makeTerms(4500n),
        proofType: CircuitId.MANDATE_BOUND,
        proof: fakeProof,
        publicSignals: fakeSignals,
      })

      expect(handler).toHaveBeenCalledTimes(2)
      const event2 = handler.mock.calls[1][0] as SessionEvent
      expect(event2.type).toBe('turn.countered')
    })

    it('should emit turn.accepted on accept', () => {
      const session = createSession()
      const handler = vi.fn()

      session.proposeTurn({
        agentId: 'did:ethr:0xAAA',
        terms: makeTerms(5000n),
        proofType: CircuitId.MANDATE_BOUND,
        proof: fakeProof,
        publicSignals: fakeSignals,
      })

      session.on('event', handler)
      session.accept('did:ethr:0xBBB')

      expect(handler).toHaveBeenCalledOnce()
      const event = handler.mock.calls[0][0] as SessionEvent
      expect(event.type).toBe('turn.accepted')
    })

    it('should emit turn.rejected on reject', () => {
      const session = createSession()
      const handler = vi.fn()
      session.on('event', handler)

      session.reject('Too expensive')

      expect(handler).toHaveBeenCalledOnce()
      const event = handler.mock.calls[0][0] as SessionEvent
      expect(event.type).toBe('turn.rejected')
      if (event.type === 'turn.rejected') {
        expect(event.reason).toBe('Too expensive')
      }
    })
  })
})

describe('MerkleAccumulator', () => {
  it('should return zero root when empty', () => {
    const merkle = new MerkleAccumulator()
    expect(merkle.getRoot()).toBe('0x' + '0'.repeat(64))
    expect(merkle.leafCount).toBe(0)
  })

  it('should compute root for single leaf', () => {
    const merkle = new MerkleAccumulator()
    merkle.addLeaf('hello')
    expect(merkle.getRoot()).toBeDefined()
    expect(merkle.getRoot().length).toBe(64) // SHA-256 hex
    expect(merkle.leafCount).toBe(1)
  })

  it('should compute root for multiple leaves', () => {
    const merkle = new MerkleAccumulator()
    merkle.addLeaf('leaf1')
    const rootOne = merkle.getRoot()

    merkle.addLeaf('leaf2')
    const rootTwo = merkle.getRoot()

    expect(rootTwo).not.toBe(rootOne)
    expect(merkle.leafCount).toBe(2)
  })

  it('should produce deterministic roots', () => {
    const m1 = new MerkleAccumulator()
    const m2 = new MerkleAccumulator()

    m1.addLeaf('a')
    m1.addLeaf('b')
    m2.addLeaf('a')
    m2.addLeaf('b')

    expect(m1.getRoot()).toBe(m2.getRoot())
  })

  it('should handle odd number of leaves', () => {
    const merkle = new MerkleAccumulator()
    merkle.addLeaf('a')
    merkle.addLeaf('b')
    merkle.addLeaf('c')
    expect(merkle.getRoot()).toBeDefined()
    expect(merkle.leafCount).toBe(3)
  })
})
