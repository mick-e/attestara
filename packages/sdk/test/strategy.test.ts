import { describe, it, expect, vi } from 'vitest'
import { RuleBasedStrategy } from '../src/agents/rule-based.js'
import { LLMStrategy } from '../src/agents/llm.js'
import { ScriptedStrategy } from '../src/agents/scripted.js'
import { CircuitId } from '@agentclear/types'
import type {
  NegotiationStrategy,
  NegotiationTurn,
  TurnContext,
  TurnDecision,
  MandateParams,
  ZKProof,
  PublicSignals,
} from '@agentclear/types'

const mandate: MandateParams = {
  maxValue: 10000n,
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

function makeTurn(value: bigint): NegotiationTurn {
  return {
    id: 'turn-1',
    sessionId: 'session-1',
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

function makeTurnContext(turnNumber: number): TurnContext {
  return {
    session: {} as any,
    turnHistory: [],
    mandate: { maxValue: 10000n, currency: 'USDC' },
    currentTurnNumber: turnNumber,
  }
}

describe('RuleBasedStrategy', () => {
  it('should implement NegotiationStrategy interface', () => {
    const strategy: NegotiationStrategy = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    expect(strategy.name).toBe('RuleBasedStrategy')
    expect(strategy.initialize).toBeTypeOf('function')
    expect(strategy.decideTurn).toBeTypeOf('function')
    expect(strategy.onCounterOffer).toBeTypeOf('function')
    expect(strategy.shouldAccept).toBeTypeOf('function')
    expect(strategy.shouldWalkAway).toBeTypeOf('function')
  })

  it('should start with initial offer ratio', async () => {
    const strategy = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    await strategy.initialize(mandate)

    const decision = await strategy.decideTurn(makeTurnContext(1))
    expect(decision.action).toBe('counter')
    if (decision.action === 'counter') {
      // First turn: 10000 * 0.5 = 5000
      expect(decision.terms.value).toBe(5000n)
      expect(decision.terms.currency).toBe('USDC')
    }
  })

  it('should follow concession rate across turns', async () => {
    const strategy = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    await strategy.initialize(mandate)

    const d1 = await strategy.decideTurn(makeTurnContext(1))
    const d2 = await strategy.decideTurn(makeTurnContext(2))
    const d3 = await strategy.decideTurn(makeTurnContext(3))

    expect(d1.action).toBe('counter')
    expect(d2.action).toBe('counter')
    expect(d3.action).toBe('counter')

    if (d1.action === 'counter' && d2.action === 'counter' && d3.action === 'counter') {
      // Turn 1: 10000 * 0.5 = 5000
      // Turn 2: 10000 * 0.6 = 6000
      // Turn 3: 10000 * 0.7 = 7000
      expect(d1.terms.value).toBe(5000n)
      expect(d2.terms.value).toBe(6000n)
      expect(d3.terms.value).toBe(7000n)
    }
  })

  it('should cap value at mandate maxValue', async () => {
    const strategy = new RuleBasedStrategy({
      initialOfferRatio: 0.9,
      concessionRate: 0.2,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    await strategy.initialize(mandate)

    // Turn 1: 0.9 = 9000, Turn 2: 1.1 → capped at 10000
    await strategy.decideTurn(makeTurnContext(1))
    const d2 = await strategy.decideTurn(makeTurnContext(2))
    if (d2.action === 'counter') {
      expect(d2.terms.value).toBe(10000n)
    }
  })

  it('should reject when max turns exceeded', async () => {
    const strategy = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 2,
    })
    await strategy.initialize(mandate)

    await strategy.decideTurn(makeTurnContext(1))
    await strategy.decideTurn(makeTurnContext(2))
    const d3 = await strategy.decideTurn(makeTurnContext(3))
    expect(d3.action).toBe('reject')
    if (d3.action === 'reject') {
      expect(d3.reason).toBe('Max turns exceeded')
    }
  })

  it('should accept a counter-offer within mandate', async () => {
    const strategy = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 5,
    })
    await strategy.initialize(mandate)

    const decision = await strategy.onCounterOffer(makeTurn(8000n))
    expect(decision.action).toBe('accept')
  })

  it('should walk away at max turns', async () => {
    const strategy = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 3,
    })
    await strategy.initialize(mandate)

    // Simulate 3 turns
    await strategy.decideTurn(makeTurnContext(1))
    await strategy.decideTurn(makeTurnContext(2))
    await strategy.decideTurn(makeTurnContext(3))

    const walkAway = await strategy.shouldWalkAway(makeTurnContext(3))
    expect(walkAway).toBe(true)
  })

  it('should reset turn count on re-initialize', async () => {
    const strategy = new RuleBasedStrategy({
      initialOfferRatio: 0.5,
      concessionRate: 0.1,
      walkAwayThreshold: 0.9,
      maxTurns: 2,
    })
    await strategy.initialize(mandate)
    await strategy.decideTurn(makeTurnContext(1))
    await strategy.decideTurn(makeTurnContext(2))

    // Re-initialize
    await strategy.initialize(mandate)
    const decision = await strategy.decideTurn(makeTurnContext(1))
    expect(decision.action).toBe('counter')
    if (decision.action === 'counter') {
      expect(decision.terms.value).toBe(5000n)
    }
  })
})

describe('ScriptedStrategy', () => {
  it('should implement NegotiationStrategy interface', () => {
    const strategy: NegotiationStrategy = new ScriptedStrategy({
      responses: [{ action: 'accept' }],
    })
    expect(strategy.name).toBe('ScriptedStrategy')
  })

  it('should replay scripted responses in order', async () => {
    const responses: TurnDecision[] = [
      { action: 'counter', terms: { value: 5000n, currency: 'USDC' } },
      { action: 'counter', terms: { value: 7000n, currency: 'USDC' } },
      { action: 'accept' },
    ]
    const strategy = new ScriptedStrategy({ responses })
    await strategy.initialize(mandate)

    const d1 = await strategy.decideTurn(makeTurnContext(1))
    expect(d1.action).toBe('counter')
    if (d1.action === 'counter') expect(d1.terms.value).toBe(5000n)

    const d2 = await strategy.decideTurn(makeTurnContext(2))
    expect(d2.action).toBe('counter')
    if (d2.action === 'counter') expect(d2.terms.value).toBe(7000n)

    const d3 = await strategy.decideTurn(makeTurnContext(3))
    expect(d3.action).toBe('accept')
  })

  it('should reject when no more scripted responses', async () => {
    const strategy = new ScriptedStrategy({
      responses: [{ action: 'accept' }],
    })
    await strategy.initialize(mandate)

    await strategy.decideTurn(makeTurnContext(1))
    const d2 = await strategy.decideTurn(makeTurnContext(2))
    expect(d2.action).toBe('reject')
    if (d2.action === 'reject') {
      expect(d2.reason).toBe('No more scripted responses')
    }
  })

  it('should reset index on re-initialize', async () => {
    const strategy = new ScriptedStrategy({
      responses: [{ action: 'accept' }],
    })
    await strategy.initialize(mandate)
    await strategy.decideTurn(makeTurnContext(1))

    // Re-initialize
    await strategy.initialize(mandate)
    const d = await strategy.decideTurn(makeTurnContext(1))
    expect(d.action).toBe('accept')
  })

  it('should use decideTurn for onCounterOffer', async () => {
    const strategy = new ScriptedStrategy({
      responses: [
        { action: 'counter', terms: { value: 6000n, currency: 'USDC' } },
        { action: 'accept' },
      ],
    })
    await strategy.initialize(mandate)

    const d1 = await strategy.onCounterOffer(makeTurn(5000n))
    expect(d1.action).toBe('counter')

    const d2 = await strategy.onCounterOffer(makeTurn(7000n))
    expect(d2.action).toBe('accept')
  })

  it('should report shouldAccept based on next response', async () => {
    const strategy = new ScriptedStrategy({
      responses: [
        { action: 'counter', terms: { value: 6000n, currency: 'USDC' } },
        { action: 'accept' },
      ],
    })
    await strategy.initialize(mandate)

    expect(await strategy.shouldAccept(makeTurn(5000n))).toBe(false) // next is counter
    await strategy.decideTurn(makeTurnContext(1)) // consume first
    expect(await strategy.shouldAccept(makeTurn(5000n))).toBe(true) // next is accept
  })

  it('should report shouldWalkAway when exhausted', async () => {
    const strategy = new ScriptedStrategy({
      responses: [{ action: 'accept' }],
    })
    await strategy.initialize(mandate)

    expect(await strategy.shouldWalkAway(makeTurnContext(1))).toBe(false)
    await strategy.decideTurn(makeTurnContext(1))
    expect(await strategy.shouldWalkAway(makeTurnContext(2))).toBe(true)
  })
})

describe('LLMStrategy', () => {
  it('should implement NegotiationStrategy interface', () => {
    const strategy: NegotiationStrategy = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'You are a negotiation agent.',
    })
    expect(strategy.name).toBe('LLMStrategy')
  })

  it('should accept counter-offers within mandate', async () => {
    const strategy = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    await strategy.initialize(mandate)

    const decision = await strategy.onCounterOffer(makeTurn(8000n))
    expect(decision.action).toBe('accept')
  })

  it('should reject counter-offers above mandate via LLM', async () => {
    const strategy = new LLMStrategy({
      provider: 'openai',
      model: 'gpt-4',
      systemPrompt: 'Negotiate.',
    })
    await strategy.initialize(mandate)

    // Mock callLLM to return a counter decision
    vi.spyOn(strategy, 'callLLM').mockResolvedValue(
      JSON.stringify({ action: 'counter', terms: { value: '9000', currency: 'USDC' } }),
    )

    const decision = await strategy.onCounterOffer(makeTurn(15000n))
    expect(decision.action).toBe('counter')
  })

  it('should throw without mock when calling LLM', async () => {
    const strategy = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    await strategy.initialize(mandate)

    await expect(strategy.decideTurn(makeTurnContext(1))).rejects.toThrow(
      'LLM API call not configured',
    )
  })

  it('should parse valid JSON response', () => {
    const strategy = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })

    const decision = strategy.parseDecision('{"action":"accept"}')
    expect(decision.action).toBe('accept')
  })

  it('should reject on invalid JSON response', () => {
    const strategy = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })

    const decision = strategy.parseDecision('not valid json')
    expect(decision.action).toBe('reject')
    if (decision.action === 'reject') {
      expect(decision.reason).toBe('Failed to parse LLM response')
    }
  })

  it('should walk away after 15 turns', async () => {
    const strategy = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    await strategy.initialize(mandate)

    expect(await strategy.shouldWalkAway(makeTurnContext(15))).toBe(false)
    expect(await strategy.shouldWalkAway(makeTurnContext(16))).toBe(true)
  })
})
