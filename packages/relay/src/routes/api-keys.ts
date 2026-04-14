import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess, type AuthContext } from '../middleware/auth.js'
import { apiKeyService } from '../services/api-key.service.js'

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

  // POST /v1/orgs/:orgId/api-keys
  app.post('/orgs/:orgId/api-keys', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
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

    return reply.status(204).send()
  })
}
