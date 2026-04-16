import { z } from 'zod'

export const createCommitmentSchema = z.object({
  agreementHash: z.string().min(1),
  parties: z.array(z.string()),
  credentialHashes: z.array(z.string()),
  proofs: z.record(z.unknown()),
  circuitVersions: z.array(z.string()),
})

export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>
