// @attestara/prover — ZK proof generation service
import { buildProverServer } from './server.js'
import { loadProverConfig } from './config.js'

export { buildProverServer } from './server.js'
export type { ProverServerOptions } from './server.js'
export { loadProverConfig } from './config.js'
export type { ProverConfig } from './config.js'
export { CircuitManager } from './circuits.js'
export type { CircuitArtifacts, CircuitMetadata } from './circuits.js'
export { WorkerPool } from './workers/pool.js'
export { RedisProverCache, InMemoryProverCache } from './cache.js'
export type { ProverCache } from './cache.js'
export { ProverError, CircuitNotFoundError, ProofGenerationError, ProofVerificationError, ValidationError, WorkerPoolError } from './errors.js'

/** Start the prover service from environment configuration */
export async function startProver(): Promise<void> {
  const config = loadProverConfig()
  const app = await buildProverServer({ config })

  try {
    await app.listen({ port: config.PORT, host: config.HOST })
    console.log(`Prover service listening on ${config.HOST}:${config.PORT}`)
  } catch (err) {
    console.error('Failed to start prover:', err)
    process.exit(1)
  }
}
