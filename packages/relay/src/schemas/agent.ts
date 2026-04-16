import { z } from 'zod'

export const provisionDidSchema = z.object({
  name: z.string().min(1).max(255),
})

export const createAgentSchema = z.object({
  did: z.string().regex(/^did:[a-z]+:.+$/, 'Invalid DID format (expected did:method:identifier)'),
  name: z.string().min(1).max(255),
  publicKey: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Public key must be hex-encoded with 0x prefix').optional().default('0x00'),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export type ProvisionDidInput = z.infer<typeof provisionDidSchema>
export type CreateAgentInput = z.infer<typeof createAgentSchema>
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
