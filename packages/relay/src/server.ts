import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth.js'
import { orgRoutes } from './routes/orgs.js'
import { agentRoutes } from './routes/agents.js'
import { credentialRoutes } from './routes/credentials.js'
import { sessionRoutes } from './routes/sessions.js'
import { commitmentRoutes } from './routes/commitments.js'
import { apiKeyRoutes } from './routes/api-keys.js'
import { webhookRoutes } from './routes/webhooks.js'
import { analyticsRoutes } from './routes/analytics.js'
import { adminRoutes } from './routes/admin.js'
import { websocketPlugin } from './websocket/index.js'

export interface ServerOptions {
  corsOrigin?: string
  rateLimit?: { max: number; timeWindow: string }
  logger?: boolean
}

export async function buildServer(options: ServerOptions = {}) {
  const app = Fastify({
    logger: options.logger !== false
      ? {
          level: 'info',
          serializers: {
            req(request) {
              return {
                method: request.method,
                url: request.url,
                requestId: request.id,
              }
            },
          },
        }
      : false,
    genReqId: () => crypto.randomUUID(),
  })

  // Security plugins
  await app.register(cors, {
    origin: options.corsOrigin ?? 'http://localhost:3000',
  })

  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  await app.register(rateLimit, {
    max: options.rateLimit?.max ?? 100,
    timeWindow: options.rateLimit?.timeWindow ?? '1 minute',
  })

  // Global error handler
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    const statusCode = error.statusCode ?? 500
    const response = {
      code: error.code ?? 'INTERNAL_ERROR',
      message: statusCode >= 500 ? 'Internal server error' : error.message,
      requestId: request.id,
    }

    if (statusCode >= 500 && app.log) {
      app.log.error({ err: error, requestId: request.id }, 'Unhandled error')
    }

    reply.status(statusCode).send(response)
  })

  // Health endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Route registration
  await app.register(authRoutes, { prefix: '/v1/auth' })
  await app.register(orgRoutes, { prefix: '/v1' })
  await app.register(agentRoutes, { prefix: '/v1' })
  await app.register(credentialRoutes, { prefix: '/v1' })
  await app.register(sessionRoutes, { prefix: '/v1' })
  await app.register(commitmentRoutes, { prefix: '/v1' })
  await app.register(apiKeyRoutes, { prefix: '/v1' })
  await app.register(webhookRoutes, { prefix: '/v1' })
  await app.register(analyticsRoutes, { prefix: '/v1' })
  await app.register(adminRoutes, { prefix: '/v1' })

  // WebSocket server (must come after rate-limit plugin)
  await app.register(websocketPlugin)

  return app
}
