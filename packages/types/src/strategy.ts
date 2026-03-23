import { MandateParams } from './credentials.js'
import { NegotiationTurn, TurnContext, TurnDecision } from './negotiation.js'

export interface NegotiationStrategy {
  name: string
  initialize(mandate: MandateParams): Promise<void>
  decideTurn(context: TurnContext): Promise<TurnDecision>
  onCounterOffer(turn: NegotiationTurn): Promise<TurnDecision>
  shouldAccept(turn: NegotiationTurn): Promise<boolean>
  shouldWalkAway(context: TurnContext): Promise<boolean>
}

export interface RuleBasedConfig {
  initialOfferRatio: number
  concessionRate: number
  walkAwayThreshold: number
  maxTurns: number
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai'
  model: string
  systemPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface ScriptedConfig {
  responses: TurnDecision[]
}
