import { z } from 'zod'

export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  plan: z.string().optional(),
})

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  plan: z.string().optional(),
})

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.string().default('member'),
})

export type CreateOrgInput = z.infer<typeof createOrgSchema>
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>
export type InviteInput = z.infer<typeof inviteSchema>
