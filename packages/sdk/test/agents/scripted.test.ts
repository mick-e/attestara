import { describe, it, expect } from 'vitest'
import { ScriptedStrategy } from '../../src/agents/scripted.js'
import { CircuitId } from '@attestara/types'
import type {
  MandateParams,
  NegotiationTurn,
  TurnContext,
  TurnDecision,
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

const fakeSignals: PublicSignals = { signals: ['1'] }

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

describe('ScriptedStrategy', () => {
  it('should expose the correct strategy name', () => {
    const s = new ScriptedStrategy({ responses: [{ action: 'accept' }] })
    expect(s.name).toBe('ScriptedStrategy')
  })

  it('should replay scripted responses in order', async () => {
    const responses: TurnDecision[] = [
      { action: 'counter', terms: { value: 4_000n, currency: 'USDC' } },
      { action: 'counter', terms: { value: 6_000n, currency: 'USDC' } },
      { action: 'accept' },
    ]
    const s = new ScriptedStrategy({ responses })
    await s.initialize(mandate)

    const d1 = await s.decideTurn(ctx(1))
    const d2 = await s.decideTurn(ctx(2))
    const d3 = await s.decideTurn(ctx(3))

    expect(d1.action).toBe('counter')
    expect(d2.action).toBe('counter')
    expect(d3.action).toBe('accept')
  })

  it('should reject once the script is exhausted', async () => {
    const s = new ScriptedStrategy({ responses: [{ action: 'accept' }] })
    await s.initialize(mandate)
    await s.decideTurn(ctx(1))
    const d = await s.decideTurn(ctx(2))
    expect(d.action).toBe('reject')
    if (d.action === 'reject') {
      expect(d.reason).toBe('No more scripted responses')
    }
  })

  it('should reset index on re-initialize', async () => {
    const s = new ScriptedStrategy({
      responses: [
        { action: 'counter', terms: { value: 5_000n, currency: 'USDC' } },
        { action: 'accept' },
      ],
    })
    await s.initialize(mandate)
    await s.decideTurn(ctx(1))
    await s.decideTurn(ctx(2))

    await s.initialize(mandate)
    const first = await s.decideTurn(ctx(1))
    expect(first.action).toBe('counter')
  })

  it('should share its queue with onCounterOffer', async () => {
    const s = new ScriptedStrategy({
      responses: [
        { action: 'counter', terms: { value: 5_000n, currency: 'USDC' } },
        { action: 'accept' },
      ],
    })
    await s.initialize(mandate)
    const d1 = await s.onCounterOffer(turnAt(8_000n))
    expect(d1.action).toBe('counter')
    const d2 = await s.onCounterOffer(turnAt(8_000n))
    expect(d2.action).toBe('accept')
  })

  it('should report shouldAccept based on the NEXT queued response', async () => {
    const s = new ScriptedStrategy({
      responses: [
        { action: 'counter', terms: { value: 5_000n, currency: 'USDC' } },
        { action: 'accept' },
      ],
    })
    await s.initialize(mandate)
    expect(await s.shouldAccept(turnAt(5_000n))).toBe(false)
    await s.decideTurn(ctx(1))
    expect(await s.shouldAccept(turnAt(5_000n))).toBe(true)
  })

  it('should report shouldWalkAway only once the script is exhausted', async () => {
    const s = new ScriptedStrategy({ responses: [{ action: 'accept' }] })
    await s.initialize(mandate)
    expect(await s.shouldWalkAway(ctx(1))).toBe(false)
    await s.decideTurn(ctx(1))
    expect(await s.shouldWalkAway(ctx(2))).toBe(true)
  })
})
