import { describe, it, expect } from 'vitest'
import { RuleBasedStrategy } from '../../src/agents/rule-based.js'
import { CircuitId } from '@attestara/types'
import type {
  MandateParams,
  NegotiationTurn,
  TurnContext,
  ZKProof,
  PublicSignals,
} from '@attestara/types'

const mandate: MandateParams = {
  maxValue: 10_000n,
  currency: 'USDC',
  domain: 'procurement',
}

const fakeProof: ZKProof = {
  pi_a: ['0x1', '0x2'],
  pi_b: [['0x3', '0x4'], ['0x5', '0x6']],
  pi_c: ['0x7', '0x8'],
  protocol: 'groth16',
  curve: 'bn128',
}

const fakeSignals: PublicSignals = { signals: ['5000'] }

function turnAt(value: bigint): NegotiationTurn {
  return {
    id: 't',
    sessionId: 's',
    agentId: 'did:ethr:0xBBB',
    sequenceNumber: 1,
    terms: { value, currency: 'USDC' },
    proofType: CircuitId.MANDATE_BOUND,
    proof: fakeProof,
    publicSignals: fakeSignals,
    signature: 'sig',
    createdAt: new Date(),
  }
}

function ctx(n: number): TurnContext {
  return {
    session: {} as any,
    turnHistory: [],
    mandate: { maxValue: 10_000n, currency: 'USDC' },
    currentTurnNumber: n,
  }
}

describe('RuleBasedStrategy', () => {
  it('should expose the correct strategy name', () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    expect(s.name).toBe('RuleBasedStrategy')
  })

  it('should issue an initial counter offer at the configured ratio', async () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.3,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    await s.initialize(mandate)

    const d = await s.decideTurn(ctx(1))
    expect(d.action).toBe('counter')
    if (d.action === 'counter') {
      expect(d.terms.value).toBe(3_000n)
      expect(d.terms.currency).toBe('USDC')
    }
  })

  it('should concede on each subsequent turn at the configured rate', async () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.4,
      concessionRate: 0.15,
      walkAwayThreshold: 0.9,
      maxTurns: 10,
    })
    await s.initialize(mandate)

    const values: bigint[] = []
    for (let i = 0; i < 3; i++) {
      const d = await s.decideTurn(ctx(i + 1))
      if (d.action === 'counter') values.push(d.terms.value)
    }
    // 0.40 → 0.55 → 0.70
    expect(values).toEqual([4_000n, 5_500n, 7_000n])
  })

  it('should cap offers at the mandate maxValue', async () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.95,
      concessionRate: 0.5,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    await s.initialize(mandate)

    await s.decideTurn(ctx(1)) // 0.95 = 9500
    const d2 = await s.decideTurn(ctx(2)) // 1.45 → capped
    if (d2.action === 'counter') {
      expect(d2.terms.value).toBe(10_000n)
    }
  })

  it('should reject once the configured max turns are exceeded', async () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 2,
    })
    await s.initialize(mandate)
    await s.decideTurn(ctx(1))
    await s.decideTurn(ctx(2))

    const d = await s.decideTurn(ctx(3))
    expect(d.action).toBe('reject')
    if (d.action === 'reject') {
      expect(d.reason).toBe('Max turns exceeded')
    }
  })

  it('should accept any counter-offer within the mandate via shouldAccept', async () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    await s.initialize(mandate)
    expect(await s.shouldAccept(turnAt(9_000n))).toBe(true)
    expect(await s.shouldAccept(turnAt(10_001n))).toBe(false)
  })

  it('should walk away once maxTurns has been reached', async () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 2,
    })
    await s.initialize(mandate)
    expect(await s.shouldWalkAway(ctx(1))).toBe(false)
    await s.decideTurn(ctx(1))
    await s.decideTurn(ctx(2))
    expect(await s.shouldWalkAway(ctx(2))).toBe(true)
  })

  it('should fall back to proposing a counter on onCounterOffer when above mandate', async () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    await s.initialize(mandate)
    const d = await s.onCounterOffer(turnAt(15_000n))
    expect(d.action).toBe('counter')
  })

  it('should reset internal turn counter on re-initialize', async () => {
    const s = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 1,
    })
    await s.initialize(mandate)
    const first = await s.decideTurn(ctx(1))
    expect(first.action).toBe('counter')

    const exhausted = await s.decideTurn(ctx(2))
    expect(exhausted.action).toBe('reject')

    await s.initialize(mandate)
    const afterReset = await s.decideTurn(ctx(1))
    expect(afterReset.action).toBe('counter')
  })
})
