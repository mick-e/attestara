import type {
  NegotiationStrategy,
  RuleBasedConfig,
  MandateParams,
  NegotiationTurn,
  TurnContext,
  TurnDecision,
} from '@attestara/types'

export class RuleBasedStrategy implements NegotiationStrategy {
  name = 'RuleBasedStrategy'
  private config: RuleBasedConfig
  private mandate!: MandateParams
  private turnNumber = 0

  constructor(config: RuleBasedConfig) {
    this.config = config
  }

  async initialize(mandate: MandateParams): Promise<void> {
    this.mandate = mandate
    this.turnNumber = 0
  }

  async decideTurn(_context: TurnContext): Promise<TurnDecision> {
    this.turnNumber++
    if (this.turnNumber > this.config.maxTurns) {
      return { action: 'reject', reason: 'Max turns exceeded' }
    }

    const ratio = this.config.initialOfferRatio +
      this.config.concessionRate * (this.turnNumber - 1)
    const offerValue = BigInt(Math.floor(Number(this.mandate.maxValue) * ratio))
    const cappedValue = offerValue > this.mandate.maxValue
      ? this.mandate.maxValue
      : offerValue

    return {
      action: 'counter',
      terms: { value: cappedValue, currency: this.mandate.currency },
    }
  }

  async onCounterOffer(turn: NegotiationTurn): Promise<TurnDecision> {
    if (await this.shouldAccept(turn)) {
      return { action: 'accept' }
    }
    if (this.turnNumber >= this.config.maxTurns) {
      return { action: 'reject', reason: 'Walk-away threshold exceeded' }
    }
    return this.decideTurn({} as TurnContext)
  }

  async shouldAccept(turn: NegotiationTurn): Promise<boolean> {
    return turn.terms.value <= this.mandate.maxValue
  }

  async shouldWalkAway(_context: TurnContext): Promise<boolean> {
    return this.turnNumber >= this.config.maxTurns
  }
}
