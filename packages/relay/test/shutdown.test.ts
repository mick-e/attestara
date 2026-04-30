import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createShutdownController, SHUTDOWN_STEPS } from '../src/shutdown.js'

// -- Mocks for dependencies ---------------------------------------------------

vi.mock('../src/indexer/index.js', () => ({
  stopIndexer: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/database.js', () => ({
  disconnectDatabase: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/utils/redis.js', () => ({
  closeRedis: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/websocket/index.js', () => ({
  getPubSubAdapter: vi.fn().mockReturnValue(null),
}))

// -- Helpers ------------------------------------------------------------------

function createMockApp() {
  const closeFn = vi.fn().mockResolvedValue(undefined)
  return {
    close: closeFn,
    websocketServer: {
      clients: new Set(),
    },
  } as any
}

// -- Tests --------------------------------------------------------------------

describe('Graceful Shutdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes cleanup in the correct order', async () => {
    const app = createMockApp()
    const steps: string[] = []

    const { stopIndexer } = await import('../src/indexer/index.js')
    const { disconnectDatabase } = await import('../src/database.js')
    const { closeRedis } = await import('../src/utils/redis.js')

    // Track call order via the log callback
    const controller = createShutdownController(app, {
      log: (msg) => {
        if (msg.includes('stopping new connections')) steps.push('stop-accepting')
        if (msg.includes('draining WebSocket')) steps.push('drain-websockets')
        if (msg.includes('stopping indexer')) steps.push('stop-indexer')
        if (msg.includes('closing pub/sub')) steps.push('close-pubsub')
        if (msg.includes('closing server')) steps.push('close-server')
        if (msg.includes('disconnecting database')) steps.push('disconnect-prisma')
        if (msg.includes('disconnecting Redis')) steps.push('disconnect-redis')
      },
    })

    await controller.execute()

    // Verify correct ordering
    expect(steps).toEqual([
      'stop-accepting',
      'drain-websockets',
      'stop-indexer',
      'close-pubsub',
      'close-server',
      'disconnect-prisma',
      'disconnect-redis',
    ])

    // Verify all dependency functions were called
    expect(stopIndexer).toHaveBeenCalledOnce()
    expect(app.close).toHaveBeenCalledOnce()
    expect(disconnectDatabase).toHaveBeenCalledOnce()
    expect(closeRedis).toHaveBeenCalledOnce()
  })

  it('is idempotent: calling execute() twice runs cleanup only once', async () => {
    const app = createMockApp()
    const { disconnectDatabase } = await import('../src/database.js')

    const controller = createShutdownController(app, { log: () => {} })

    await Promise.all([controller.execute(), controller.execute()])

    expect(disconnectDatabase).toHaveBeenCalledOnce()
  })

  it('sets isShuttingDown flag', async () => {
    const app = createMockApp()
    const controller = createShutdownController(app, { log: () => {} })

    expect(controller.isShuttingDown).toBe(false)

    const promise = controller.execute()
    expect(controller.isShuttingDown).toBe(true)

    await promise
    expect(controller.isShuttingDown).toBe(true)
  })

  it('continues shutdown even if indexer stop fails', async () => {
    const app = createMockApp()
    const { stopIndexer } = await import('../src/indexer/index.js')
    const { disconnectDatabase } = await import('../src/database.js')

    vi.mocked(stopIndexer).mockRejectedValueOnce(new Error('indexer error'))

    const controller = createShutdownController(app, { log: () => {} })
    await controller.execute()

    // Should still reach later steps
    expect(app.close).toHaveBeenCalledOnce()
    expect(disconnectDatabase).toHaveBeenCalledOnce()
  })

  it('continues shutdown even if database disconnect fails', async () => {
    const app = createMockApp()
    const { disconnectDatabase } = await import('../src/database.js')
    const { closeRedis } = await import('../src/utils/redis.js')

    vi.mocked(disconnectDatabase).mockRejectedValueOnce(new Error('db error'))

    const controller = createShutdownController(app, { log: () => {} })
    await controller.execute()

    // Redis should still be disconnected
    expect(closeRedis).toHaveBeenCalledOnce()
  })

  it('SHUTDOWN_STEPS constant lists all steps', () => {
    expect(SHUTDOWN_STEPS).toEqual([
      'stop-accepting',
      'drain-websockets',
      'stop-indexer',
      'close-pubsub',
      'close-server',
      'disconnect-prisma',
      'disconnect-redis',
    ])
  })
})
