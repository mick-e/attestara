import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { loadConfig } from './config.js'
import { initWebhookConfig } from './services/webhook.service.js'
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
import { billingRoutes } from './billing/x402.js'
import { websocketPlugin } from './websocket/index.js'
import { validateHost } from './middleware/host-validation.js'
import { metricsPlugin } from './metrics.js'

export interface ServerOptions {
  corsOrigin?: string[]
  rateLimit?: { max: number; timeWindow: string }
  logger?: boolean
}

export async function buildServer(options: ServerOptions = {}) {
  // Load and validate config (fails fast if env vars missing).
  // Must happen before Fastify instantiation so trustProxy can be configured.
  const config = loadConfig()
  const isProduction = config.NODE_ENV === 'production'

  const app = Fastify({
    logger: options.logger !== false
      ? {
          level: isProduction ? 'info' : 'debug',
          serializers: {
            req(request) {
              return {
                method: request.method,
                url: request.url,
                requestId: request.id,
              }
            },
            res(reply) {
              return {
                statusCode: reply.statusCode,
              }
            },
          },
          ...(isProduction
            ? {}
            : {
                transport: {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                  },
                },
              }),
        }
      : false,
    genReqId: () => crypto.randomUUID(),
    trustProxy: config.TRUSTED_PROXIES,
  })

  app.decorate('config', config)

  // Initialize services that need config
  initWebhookConfig(config.ORG_MASTER_KEY_SECRET)

  // Security plugins
  await app.register(cors, {
    origin: options.corsOrigin ?? config.CORS_ORIGIN,
  })

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],  // needed for Swagger UI
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  })

  await app.register(rateLimit, {
    max: options.rateLimit?.max ?? 100,
    timeWindow: options.rateLimit?.timeWindow ?? '1 minute',
  })

  // Host header validation (production-only). Placed after helmet/rate-limit so we
  // don't emit security headers or consume rate-limit budget for forged-host requests
  // — but before routes so no handler logic runs on a rejected host.
  app.addHook('onRequest', validateHost)

  // OpenAPI / Swagger documentation
  await app.register(import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Attestara Relay API',
        description: 'Cryptographic trust protocol for autonomous AI agent commerce. Provides REST endpoints for agents, credentials, sessions, commitments, webhooks, and analytics.',
        version: '0.1.0',
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Development' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
            description: 'Use format: `ApiKey ac_xxxxxx...`',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentication and session management' },
        { name: 'Orgs', description: 'Organization management' },
        { name: 'Agents', description: 'Agent provisioning and management' },
        { name: 'Credentials', description: 'W3C Verifiable Credentials' },
        { name: 'Sessions', description: 'Negotiation sessions' },
        { name: 'Commitments', description: 'On-chain settlement' },
        { name: 'ApiKeys', description: 'API key management' },
        { name: 'Webhooks', description: 'Event webhook delivery' },
        { name: 'Analytics', description: 'Organization analytics' },
        { name: 'Admin', description: 'Admin-only operations' },
      ],
    },
  })

  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
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
  await app.register(billingRoutes, { prefix: '/v1' })
  await app.register(adminRoutes, { prefix: '/v1' })

  // Prometheus metrics (GET /metrics)
  await app.register(metricsPlugin)

  // WebSocket server (must come after rate-limit plugin)
  await app.register(websocketPlugin)

  // Start indexer if RPC URL configured (non-blocking)
  if (config.ARBITRUM_SEPOLIA_RPC_URL) {
    const rpcUrl = config.ARBITRUM_SEPOLIA_RPC_URL
    // Load deployed contract addresses for event indexing
    const loadContractAddresses = async () => {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const deploymentsPath = path.resolve(
          import.meta.dirname ?? '.',
          '../../contracts/deployments.arbitrum-sepolia.json',
        )
        if (fs.existsSync(deploymentsPath)) {
          return JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'))
        }
      } catch {
        // Fall through -- indexer runs without addresses (no event filtering)
      }
      return {}
    }

    loadContractAddresses().then(addresses =>
      import('./indexer/index.js').then(async m => {
        const { buildPrismaCallbacks } = await import('./indexer/callbacks.js')
        return m.startIndexer({
          rpcUrl,
          contractAddresses: {
            agentRegistry: addresses.agentRegistry,
            commitmentContract: addresses.commitmentContract,
          },
          callbacks: buildPrismaCallbacks(app.log),
        })
      })
    ).catch(err => app.log?.warn({ err }, 'Indexer failed to start'))
  }

  return app
}
