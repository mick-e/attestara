import { z } from 'zod'

export const createCredentialSchema = z.object({
  agentId: z.string().uuid(),
  credentialHash: z.string().min(1),
  schemaHash: z.string().min(1),
  ipfsCid: z.string().optional(),
  credentialData: z.record(z.unknown()).optional(),
  expiry: z.string().datetime(),
})

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>
