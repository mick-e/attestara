import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'

// ── In-memory usage store (Redis replacement for dev/test) ──────────────────

interface OrgUsage {
  credits: number
  creditsUsed: number
  plan: string
  periodStart: string
  periodEnd: string
  metrics: Map<string, number>
}

const usageStore = new Map<string, OrgUsage>()

function getOrCreateUsage(orgId: string): OrgUsage {
  let u = usageStore.get(orgId)
  if (!u) {
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() + 30)
    u = {
      credits: 1000,
      creditsUsed: 0,
      plan: 'starter',
      periodStart: now.toISOString(),
      periodEnd: end.toISOString(),
      metrics: new Map([
        ['api_calls', 0],
        ['proof_generations', 0],
        ['commitment_submissions', 0],
      ]),
    }
    usageStore.set(orgId, u)
  }
  return u
}

// ── x402 Envelope ───────────────────────────────────────────────────────────

export interface X402Envelope {
  status: 402
  accepts: {
    scheme: string
    network: string
    address: string
    asset: string
    amount: string
    extra: Record<string, string>
  }[]
  message: string
}

function buildX402Envelope(creditsNeeded: number): X402Envelope {
  return {
    status: 402,
    accepts: [
      {
        scheme: 'exact',
        network: 'arbitrum-sepolia',
        address: '0x0000000000000000000000000000000000000000',
        asset: 'USDC',
        amount: String(creditsNeeded * 0.01),
        extra: { description: `Top up ${creditsNeeded} Attestara credits` },
      },
    ],
    message: `Insufficient credits. Top up at least ${creditsNeeded} credits to continue.`,
  }
}

// ── Meter hook ──────────────────────────────────────────────────────────────

const METERED_PREFIXES = [
  '/v1/sessions',
  '/v1/commitments',
  '/v1/orgs/',
]

const COST_PER_REQUEST = 1 // 1 credit per metered API call

export function billingMeterHook() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.auth
    if (!auth) return // unauthenticated requests pass through to auth middleware

    const url = request.url
    const isMetered = METERED_PREFIXES.some(p => url.startsWith(p))
    if (!isMetered) return

    const usage = getOrCreateUsage(auth.orgId)

    if (usage.creditsUsed >= usage.credits) {
      const needed = COST_PER_REQUEST
      const envelope = buildX402Envelope(needed)
      return reply.status(402).send(envelope)
    }

    // Increment usage
    usage.creditsUsed += COST_PER_REQUEST
    const metric = 'api_calls'
    usage.metrics.set(metric, (usage.metrics.get(metric) ?? 0) + 1)
  }
}

// ── Billing routes ──────────────────────────────────────────────────────────

const topupSchema = z.object({
  credits: z.number().int().min(1).max(100000),
})

export const billingRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // GET /v1/billing/usage
  app.get('/billing/usage', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required', requestId: request.id })
    }

    const usage = getOrCreateUsage(auth.orgId)
    const usageMetrics = Array.from(usage.metrics.entries()).map(([metric, count]) => ({
      metric,
      count,
      limit: usage.credits,
    }))

    return reply.status(200).send({
      orgId: auth.orgId,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      usage: usageMetrics,
      totalCreditsUsed: usage.creditsUsed,
      creditsRemaining: Math.max(0, usage.credits - usage.creditsUsed),
    })
  })

  // GET /v1/billing/plan
  app.get('/billing/plan', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required', requestId: request.id })
    }

    const usage = getOrCreateUsage(auth.orgId)
    return reply.status(200).send({
      orgId: auth.orgId,
      plan: usage.plan,
      credits: usage.credits,
      creditsUsed: usage.creditsUsed,
      renewsAt: usage.periodEnd,
    })
  })

  // POST /v1/billing/topup
  app.post('/billing/topup', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const auth = request.auth
    if (!auth) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required', requestId: request.id })
    }

    const parsed = topupSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const usage = getOrCreateUsage(auth.orgId)
    usage.credits += parsed.data.credits
    return reply.status(200).send({
      credits: usage.credits,
      message: `Added ${parsed.data.credits} credits. New balance: ${usage.credits - usage.creditsUsed}`,
    })
  })
}

/** Reset usage store for tests */
export function clearBillingStore(): void {
  usageStore.clear()
}
