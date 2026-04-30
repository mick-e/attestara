import type {
  NegotiationStrategy,
  ScriptedConfig,
  MandateParams,
  NegotiationTurn,
  TurnContext,
  TurnDecision,
} from '@attestara/types'

export class ScriptedStrategy implements NegotiationStrategy {
  name = 'ScriptedStrategy'
  private responses: TurnDecision[]
  private index = 0

  constructor(config: ScriptedConfig) {
    this.responses = config.responses
  }

  async initialize(_mandate: MandateParams): Promise<void> {
    this.index = 0
  }

  async decideTurn(_context: TurnContext): Promise<TurnDecision> {
    const response = this.responses[this.index]
    if (!response || this.index >= this.responses.length) {
      return { action: 'reject', reason: 'No more scripted responses' }
    }
    this.index++
    return response
  }

  async onCounterOffer(_turn: NegotiationTurn): Promise<TurnDecision> {
    return this.decideTurn({} as TurnContext)
  }

  async shouldAccept(_turn: NegotiationTurn): Promise<boolean> {
    const next = this.responses[this.index]
    return next?.action === 'accept'
  }

  async shouldWalkAway(_context: TurnContext): Promise<boolean> {
    return this.index >= this.responses.length
  }
}
