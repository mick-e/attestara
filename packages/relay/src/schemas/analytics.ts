import { z } from 'zod'
import type { TimeseriesMetric } from '../services/analytics.service.js'

export const VALID_METRICS: TimeseriesMetric[] = [
  'sessions',
  'proof_latency_p50',
  'proof_latency_p95',
  'gas_spent',
  'commitments',
  'credentials',
]

export const timeseriesQuerySchema = z.object({
  metric: z.enum(VALID_METRICS as [TimeseriesMetric, ...TimeseriesMetric[]]),
  days: z.coerce.number().int().min(1).max(365).default(14),
})

export type TimeseriesQueryInput = z.infer<typeof timeseriesQuerySchema>
