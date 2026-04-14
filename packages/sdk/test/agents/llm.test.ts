import { describe, it, expect, vi } from 'vitest'
import { LLMStrategy } from '../../src/agents/llm.js'
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

const fakeSignals: PublicSignals = { signals: ['100'] }

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

function ctx(turnNumber: number): TurnContext {
  return {
    session: {} as any,
    turnHistory: [],
    mandate: { maxValue: 10_000n, currency: 'USDC' },
    currentTurnNumber: turnNumber,
  }
}

describe('LLMStrategy', () => {
  it('should expose the correct strategy name', () => {
    const s = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'You are a negotiator.',
    })
    expect(s.name).toBe('LLMStrategy')
  })

  it('should accept a counter-offer that is within mandate without calling the LLM', async () => {
    const s = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    await s.initialize(mandate)
    const llmSpy = vi.spyOn(s, 'callLLM')

    const decision = await s.onCounterOffer(turnAt(9_000n))
    expect(decision.action).toBe('accept')
    expect(llmSpy).not.toHaveBeenCalled()
  })

  it('should delegate above-mandate counter-offers to the LLM', async () => {
    const s = new LLMStrategy({
      provider: 'openai',
      model: 'gpt-4o-mini',
      systemPrompt: 'Negotiate.',
    })
    await s.initialize(mandate)

    vi.spyOn(s, 'callLLM').mockResolvedValue(
      JSON.stringify({ action: 'reject', reason: 'above mandate' }),
    )

    const decision = await s.onCounterOffer(turnAt(20_000n))
    expect(decision.action).toBe('reject')
    if (decision.action === 'reject') {
      expect(decision.reason).toBe('above mandate')
    }
  })

  it('should throw from the default callLLM implementation', async () => {
    const s = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    await s.initialize(mandate)
    await expect(s.decideTurn(ctx(1))).rejects.toThrow(
      /LLM API call not configured/,
    )
  })

  it('should decide based on a mocked LLM response', async () => {
    const s = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    await s.initialize(mandate)

    vi.spyOn(s, 'callLLM').mockResolvedValue('{"action":"accept"}')

    const decision = await s.decideTurn(ctx(1))
    expect(decision.action).toBe('accept')
  })

  it('should treat unparseable LLM output as a reject', () => {
    const s = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    const decision = s.parseDecision('<<not json>>')
    expect(decision.action).toBe('reject')
    if (decision.action === 'reject') {
      expect(decision.reason).toBe('Failed to parse LLM response')
    }
  })

  it('should accept offers <= mandate.maxValue in shouldAccept', async () => {
    const s = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    await s.initialize(mandate)
    expect(await s.shouldAccept(turnAt(10_000n))).toBe(true)
    expect(await s.shouldAccept(turnAt(10_001n))).toBe(false)
  })

  it('should walk away only after 15 turns', async () => {
    const s = new LLMStrategy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'Negotiate.',
    })
    await s.initialize(mandate)
    expect(await s.shouldWalkAway(ctx(1))).toBe(false)
    expect(await s.shouldWalkAway(ctx(15))).toBe(false)
    expect(await s.shouldWalkAway(ctx(16))).toBe(true)
  })
})
