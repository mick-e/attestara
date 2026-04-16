import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(1).max(100),
  walletAddress: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const walletNonceSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address'),
})

export const walletVerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
})

export const walletAuthSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  address: z.string().min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type WalletNonceInput = z.infer<typeof walletNonceSchema>
export type WalletVerifyInput = z.infer<typeof walletVerifySchema>
export type WalletAuthInput = z.infer<typeof walletAuthSchema>
