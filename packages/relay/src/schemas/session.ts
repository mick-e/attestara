import { z } from 'zod'

export const createSessionSchema = z.object({
  initiatorAgentId: z.string().min(1),
  counterpartyAgentId: z.string().min(1).nullable().optional(),
  initiatorOrgId: z.string().min(1),
  counterpartyOrgId: z.string().min(1),
  sessionType: z.enum(['intra_org', 'cross_org']).default('intra_org'),
  sessionConfig: z.record(z.unknown()).optional(),
})

export const acceptSchema = z.object({
  inviteToken: z.string().min(1),
})

export const createTurnSchema = z.object({
  agentId: z.string().min(1),
  terms: z.record(z.unknown()),
  proofType: z.string().min(1),
  proof: z.record(z.unknown()),
  publicSignals: z.record(z.unknown()),
  signature: z.string().min(1),
})

export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type AcceptSessionInput = z.infer<typeof acceptSchema>
export type CreateTurnInput = z.infer<typeof createTurnSchema>
