import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess, type AuthContext } from '../middleware/auth.js'
import { apiKeyService } from '../services/api-key.service.js'
import { recordAudit } from '../services/audit.service.js'

export async function clearApiKeyStores() {
  await apiKeyService.clearStores()
}

const createApiKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
})

export const apiKeyRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // Test-env bypass for api-key creation rate limit. Production: 10/hour per org.
  const isTestEnv = app.config.NODE_ENV === 'test' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
  const apiKeyCreateMax = isTestEnv ? 10_000 : 10

  // POST /v1/orgs/:orgId/api-keys — 10 requests per hour per org
  app.post('/orgs/:orgId/api-keys', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
    config: {
      rateLimit: {
        max: apiKeyCreateMax,
        timeWindow: '1 hour',
        // Composite orgId:ip key. Rate limiting runs on onRequest, before the
        // JWT auth preHandler, so an unauthenticated attacker who guesses an
        // org UUID could otherwise exhaust a victim org's bucket with 401s.
        // Binding to IP prevents single-source cross-tenant DoS while still
        // giving each org its own budget (per-IP within that org).
        keyGenerator: (request) => {
          const params = request.params as { orgId?: string }
          const orgId = params.orgId ?? request.ip
          return `${orgId}:${request.ip}`
        },
      },
    },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }

    const parsed = createApiKeySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { apiKey, rawKey } = await apiKeyService.create(
      orgId,
      parsed.data.name,
      parsed.data.scopes,
      parsed.data.expiresAt,
    )

    void recordAudit({
      action: 'api-key.create',
      outcome: 'success',
      userId: request.auth!.userId,
      orgId,
      actorIp: request.ip,
      resource: `ApiKey:${apiKey.id}`,
    })

    return reply.status(201).send({ ...apiKey, rawKey })
  })

  // GET /v1/orgs/:orgId/api-keys
  app.get('/orgs/:orgId/api-keys', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const keys = await apiKeyService.listByOrg(orgId)

    return reply.status(200).send({
      data: keys,
      pagination: { total: keys.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // DELETE /v1/orgs/:orgId/api-keys/:id
  app.delete('/orgs/:orgId/api-keys/:id', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string }

    const deleted = await apiKeyService.revoke(id, orgId)
    if (!deleted) {
      return reply.status(404).send({
        code: 'API_KEY_NOT_FOUND',
        message: 'API key not found',
        requestId: request.id,
      })
    }

    void recordAudit({
      action: 'api-key.revoke',
      outcome: 'success',
      userId: request.auth!.userId,
      orgId,
      actorIp: request.ip,
      resource: `ApiKey:${id}`,
    })

    return reply.status(204).send()
  })
}
