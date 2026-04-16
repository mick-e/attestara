import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireOrgAccess } from '../middleware/auth.js'
import { webhookService } from '../services/webhook.service.js'
import {
  webhookSchema,
  registerWebhookBody,
  errorResponse,
  paginatedResponse,
} from '../schemas/openapi.js'

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
    schema: {
      tags: ['Webhooks'],
      summary: 'Register a webhook',
      description: 'Registers a new webhook URL to receive event notifications. Returns the webhook secret for signature verification.',
      body: registerWebhookBody,
      response: { 201: webhookSchema, 400: errorResponse },
    },
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
    schema: {
      tags: ['Webhooks'],
      summary: 'List webhooks',
      description: 'Returns all registered webhooks for the organisation.',
      response: { 200: paginatedResponse(webhookSchema) },
    },
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
    schema: {
      tags: ['Webhooks'],
      summary: 'Delete a webhook',
      description: 'Deactivates a webhook so it no longer receives event notifications.',
      response: { 204: { type: 'null' as const, description: 'Webhook deleted' }, 404: errorResponse },
    },
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
    schema: {
      tags: ['Webhooks'],
      summary: 'List webhook deliveries',
      description: 'Returns the delivery history for a specific webhook.',
      response: {
        200: paginatedResponse({ type: 'object' as const, properties: { id: { type: 'string' as const }, event: { type: 'string' as const }, statusCode: { type: 'number' as const }, deliveredAt: { type: 'string' as const } } }),
        404: errorResponse,
      },
    },
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

  // POST /v1/orgs/:orgId/webhooks/:id/test
  app.post('/orgs/:orgId/webhooks/:id/test', {
    schema: {
      tags: ['Webhooks'],
      summary: 'Test a webhook',
      description: 'Sends a test event to the webhook URL and returns the delivery result.',
      response: {
        200: { type: 'object' as const, properties: { success: { type: 'boolean' as const }, statusCode: { type: 'number' as const } } },
        404: errorResponse,
      },
    },
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string }

    const result = await webhookService.testWebhook(id, orgId)
    if (result === null) {
      return reply.status(404).send({
        code: 'WEBHOOK_NOT_FOUND',
        message: 'Webhook not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send(result)
  })

  // POST /v1/orgs/:orgId/webhooks/deliveries/:deliveryId/retry
  app.post('/orgs/:orgId/webhooks/deliveries/:deliveryId/retry', {
    schema: {
      tags: ['Webhooks'],
      summary: 'Retry a webhook delivery',
      description: 'Retries a failed webhook delivery.',
      response: {
        200: { type: 'object' as const, properties: { success: { type: 'boolean' as const }, statusCode: { type: 'number' as const } } },
        404: errorResponse,
      },
    },
    preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  }, async (request, reply) => {
    const { orgId, deliveryId } = request.params as { orgId: string; deliveryId: string }

    const result = await webhookService.retryDelivery(deliveryId, orgId)
    if (result === null) {
      return reply.status(404).send({
        code: 'DELIVERY_NOT_FOUND',
        message: 'Webhook delivery not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send(result)
  })
}
