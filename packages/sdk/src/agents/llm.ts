import type {
  NegotiationStrategy,
  LLMConfig,
  MandateParams,
  NegotiationTurn,
  TurnContext,
  TurnDecision,
} from '@agentclear/types'

export class LLMStrategy implements NegotiationStrategy {
  name = 'LLMStrategy'
  private config: LLMConfig
  private mandate!: MandateParams

  constructor(config: LLMConfig) {
    this.config = config
  }

  async initialize(mandate: MandateParams): Promise<void> {
    this.mandate = mandate
  }

  async decideTurn(context: TurnContext): Promise<TurnDecision> {
    const response = await this.callLLM(context)
    return this.parseDecision(response)
  }

  async onCounterOffer(turn: NegotiationTurn): Promise<TurnDecision> {
    if (turn.terms.value <= this.mandate.maxValue) {
      return { action: 'accept' }
    }
    return this.decideTurn({ turnHistory: [turn] } as unknown as TurnContext)
  }

  async shouldAccept(turn: NegotiationTurn): Promise<boolean> {
    return turn.terms.value <= this.mandate.maxValue
  }

  async shouldWalkAway(context: TurnContext): Promise<boolean> {
    return context.currentTurnNumber > 15
  }

  /**
   * Call the LLM API. Override this method in tests or subclasses to provide
   * a mock implementation.
   */
  async callLLM(_context: TurnContext): Promise<string> {
    const _apiUrl = this.config.provider === 'anthropic'
      ? 'https://api.anthropic.com/v1/messages'
      : 'https://api.openai.com/v1/chat/completions'
    // Real implementation will call the API — for now require a mock
    throw new Error('LLM API call not configured - use mock in tests')
  }

  parseDecision(response: string): TurnDecision {
    try {
      return JSON.parse(response) as TurnDecision
    } catch {
      return { action: 'reject', reason: 'Failed to parse LLM response' }
    }
  }
}
