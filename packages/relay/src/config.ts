import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  PROVER_INTERNAL_SECRET: z.string().min(16),
  PROVER_URL: z.string().url().default('http://localhost:3002'),
  ORG_MASTER_KEY_SECRET: z.string().min(32),
  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((v, ctx) => {
      const isProduction = process.env.NODE_ENV === 'production'
      // In production, CORS_ORIGIN must be set explicitly (fail-closed).
      // In other environments, fall back to localhost:3000 for convenience.
      const raw = v ?? (isProduction ? undefined : 'http://localhost:3000')
      if (!raw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CORS_ORIGIN must be set explicitly in production (comma-separated allowlist)',
        })
        return z.NEVER
      }
      const origins = raw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
      if (origins.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CORS_ORIGIN must contain at least one non-empty origin',
        })
        return z.NEVER
      }
      return origins
    }),
  PINATA_API_KEY: z.string().optional(),
  PINATA_API_SECRET: z.string().optional(),
  IPFS_GATEWAY_URL: z.string().default('http://localhost:8080'),
  ARBITRUM_SEPOLIA_RPC_URL: z.string().optional(),
  ARBITRUM_ONE_RPC_URL: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Config = z.infer<typeof envSchema>

export function loadConfig(): Config {
  return envSchema.parse(process.env)
}
