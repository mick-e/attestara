import { loadConfig } from './config.js'
import { buildServer } from './server.js'
import { wireSignalHandlers } from './shutdown.js'

async function main() {
  const config = loadConfig()

  const app = await buildServer({
    corsOrigin: config.CORS_ORIGIN,
    logger: true,
  })

  try {
    await app.listen({ port: config.PORT, host: config.HOST })
    app.log.info(`Relay listening on ${config.HOST}:${config.PORT}`)
  } catch (err) {
    app.log.error(err, 'Failed to start relay')
    process.exit(1)
  }

  // Graceful shutdown: drains WebSocket, stops indexer, waits for
  // in-flight requests, then disconnects Prisma + Redis.
  wireSignalHandlers(app, {
    log: (msg) => app.log.info(msg),
  })
}

main()
