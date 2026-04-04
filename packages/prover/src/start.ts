import { loadProverConfig } from './config.js'
import { buildProverServer } from './server.js'

async function main() {
  const config = loadProverConfig()
  const app = await buildProverServer({ config })

  try {
    await app.listen({ port: config.PORT, host: config.HOST })
    console.log(`Prover service listening on ${config.HOST}:${config.PORT}`)
  } catch (err) {
    console.error('Failed to start prover:', err)
    process.exit(1)
  }

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      console.log(`${signal} received, shutting down`)
      await app.close()
      process.exit(0)
    })
  }
}

main()
