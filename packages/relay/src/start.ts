import { loadConfig } from './config.js'
import { buildServer } from './server.js'

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

  // Graceful shutdown
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      app.log.info(`${signal} received, shutting down`)
      await app.close()
      process.exit(0)
    })
  }
}

main()
