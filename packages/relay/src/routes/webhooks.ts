import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess } from '../middleware/auth.js'
import { webhookService } from '../services/webhook.service.js'

export async function clearWebhookStores() {
  await webhookService.clearStores()
}

const registerWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
})

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // POST /v1/orgs/:orgId/webhooks
  app.post('/orgs/:orgId/webhooks', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }

    const parsed = registerWebhookSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { webhook, secret } = await webhookService.register(orgId, parsed.data.url, parsed.data.events)

    return reply.status(201).send({ ...webhook, secret })
  })

  // GET /v1/orgs/:orgId/webhooks
  app.get('/orgs/:orgId/webhooks', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string }
    const webhooks = await webhookService.listByOrg(orgId)

    return reply.status(200).send({
      data: webhooks,
      pagination: { total: webhooks.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // DELETE /v1/orgs/:orgId/webhooks/:id
  app.delete('/orgs/:orgId/webhooks/:id', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string }

    const deactivated = await webhookService.deactivate(id, orgId)
    if (!deactivated) {
      return reply.status(404).send({
        code: 'WEBHOOK_NOT_FOUND',
        message: 'Webhook not found',
        requestId: request.id,
      })
    }

    return reply.status(204).send()
  })

  // GET /v1/orgs/:orgId/webhooks/:id/deliveries
  app.get('/orgs/:orgId/webhooks/:id/deliveries', {
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string }

    const history = await webhookService.getDeliveryHistory(id, orgId)
    if (history === null) {
      return reply.status(404).send({
        code: 'WEBHOOK_NOT_FOUND',
        message: 'Webhook not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send({
      data: history,
      pagination: { total: history.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })
}
