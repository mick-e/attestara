import { z } from 'zod'

const envSchema = z.object({
  PROVER_INTERNAL_SECRET: z.string().min(16),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CIRCUIT_DIR: z.string().default('./circuits/build'),
  WORKER_POOL_SIZE: z.coerce.number().default(4),
  PORT: z.coerce.number().default(3002),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type ProverConfig = z.infer<typeof envSchema>

export function loadProverConfig(): ProverConfig {
  return envSchema.parse(process.env)
}
