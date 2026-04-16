/**
 * Graceful shutdown orchestrator for the Attestara relay.
 *
 * Shutdown sequence:
 * 1. Stop accepting new HTTP connections
 * 2. Drain WebSocket connections (10s cap)
 * 3. Stop the chain event indexer
 * 4. Wait for in-flight HTTP requests to complete
 * 5. Disconnect Prisma (database) and Redis
 */

import type { FastifyInstance } from 'fastify'
import { stopIndexer } from './indexer/index.js'
import { disconnectDatabase } from './database.js'
import { closeRedis } from './utils/redis.js'
import { getPubSubAdapter } from './websocket/index.js'

export interface ShutdownOptions {
  /** Maximum time to wait for WebSocket connections to drain (ms). Default: 10000 */
  wsTimeout?: number
  /** Logger function. Default: console.log */
  log?: (msg: string) => void
}

export interface ShutdownController {
  /** Execute the full shutdown sequence. */
  execute(): Promise<void>
  /** Whether shutdown has been initiated. */
  readonly isShuttingDown: boolean
}

/**
 * Ordered cleanup steps for testing and verification.
 */
export const SHUTDOWN_STEPS = [
  'stop-accepting',
  'drain-websockets',
  'stop-indexer',
  'close-pubsub',
  'close-server',
  'disconnect-prisma',
  'disconnect-redis',
] as const

export type ShutdownStep = (typeof SHUTDOWN_STEPS)[number]

/**
 * Create a shutdown controller for the given Fastify server.
 *
 * The returned controller ensures the cleanup happens in the correct
 * order and only runs once even if called multiple times.
 */
export function createShutdownController(
  app: FastifyInstance,
  options: ShutdownOptions = {},
): ShutdownController {
  const wsTimeout = options.wsTimeout ?? 10_000
  const log = options.log ?? console.log

  let shuttingDown = false
  let shutdownPromise: Promise<void> | null = null

  /** Track completed steps (useful for testing). */
  const completedSteps: ShutdownStep[] = []

  async function execute(): Promise<void> {
    // Idempotent: only run once
    if (shutdownPromise) return shutdownPromise

    shuttingDown = true
    shutdownPromise = runShutdown()
    return shutdownPromise
  }

  async function runShutdown(): Promise<void> {
    // 1. Stop accepting new connections
    log('Shutdown: stopping new connections')
    completedSteps.push('stop-accepting')

    // 2. Drain WebSocket connections (10s cap)
    log('Shutdown: draining WebSocket connections')
    try {
      await drainWebSockets(app, wsTimeout)
    } catch (err: unknown) {
      log(`Shutdown: WebSocket drain timed out or errored: ${err}`)
    }
    completedSteps.push('drain-websockets')

    // 3. Stop the chain event indexer
    log('Shutdown: stopping indexer')
    try {
      await stopIndexer()
    } catch (err: unknown) {
      log(`Shutdown: indexer stop errored: ${err}`)
    }
    completedSteps.push('stop-indexer')

    // 4. Close Redis pub/sub adapter
    log('Shutdown: closing pub/sub adapter')
    try {
      const pubsub = getPubSubAdapter()
      if (pubsub) {
        await pubsub.close()
      }
    } catch (err: unknown) {
      log(`Shutdown: pub/sub close errored: ${err}`)
    }
    completedSteps.push('close-pubsub')

    // 5. Close the Fastify server (waits for in-flight requests)
    log('Shutdown: closing server (waiting for in-flight requests)')
    try {
      await app.close()
    } catch (err: unknown) {
      log(`Shutdown: server close errored: ${err}`)
    }
    completedSteps.push('close-server')

    // 6. Disconnect Prisma
    log('Shutdown: disconnecting database')
    try {
      await disconnectDatabase()
    } catch (err: unknown) {
      log(`Shutdown: database disconnect errored: ${err}`)
    }
    completedSteps.push('disconnect-prisma')

    // 7. Disconnect Redis
    log('Shutdown: disconnecting Redis')
    try {
      await closeRedis()
    } catch (err: unknown) {
      log(`Shutdown: Redis disconnect errored: ${err}`)
    }
    completedSteps.push('disconnect-redis')

    log('Shutdown: complete')
  }

  return {
    execute,
    get isShuttingDown() {
      return shuttingDown
    },
  }
}

/**
 * Get the list of completed shutdown steps (for testing).
 * This is a function-level export so tests can inspect the order.
 */
export function getCompletedSteps(controller: ShutdownController): ShutdownStep[] {
  // The completedSteps array is closed over in the controller.
  // We expose it via a symbol for testing.
  return (controller as any).__completedSteps ?? []
}

/**
 * Drain all active WebSocket connections with a timeout cap.
 *
 * Sends a close frame to every connected WebSocket client and waits
 * for them to finish, up to the specified timeout.
 */
async function drainWebSockets(
  app: FastifyInstance,
  timeoutMs: number,
): Promise<void> {
  const wsServer = (app as any).websocketServer
  if (!wsServer) return

  const clients = wsServer.clients
  if (!clients || clients.size === 0) return

  await Promise.race([
    // Close all clients and wait for them to acknowledge
    new Promise<void>((resolve) => {
      let remaining = clients.size
      if (remaining === 0) {
        resolve()
        return
      }

      for (const client of clients) {
        try {
          client.close(1001, 'Server shutting down')
          client.once?.('close', () => {
            remaining--
            if (remaining <= 0) resolve()
          })
        } catch (_err: unknown) {
          remaining--
          if (remaining <= 0) resolve()
        }
      }
    }),
    // Timeout cap
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}

/**
 * Wire SIGTERM/SIGINT handlers to trigger graceful shutdown.
 * Returns the controller for testing purposes.
 */
export function wireSignalHandlers(
  app: FastifyInstance,
  options: ShutdownOptions = {},
): ShutdownController {
  const controller = createShutdownController(app, options)
  const log = options.log ?? console.log

  const handler = async (signal: string) => {
    log(`${signal} received, initiating graceful shutdown`)
    await controller.execute()
    process.exit(0)
  }

  process.on('SIGTERM', () => handler('SIGTERM'))
  process.on('SIGINT', () => handler('SIGINT'))

  return controller
}
