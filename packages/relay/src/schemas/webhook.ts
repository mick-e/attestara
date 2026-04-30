import { z } from 'zod'

export const registerWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
})

export type RegisterWebhookInput = z.infer<typeof registerWebhookSchema>
