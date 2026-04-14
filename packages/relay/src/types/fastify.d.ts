import type { AuthContext } from '../middleware/auth.js'
import type { Config } from '../config.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: Config
  }
  interface FastifyRequest {
    auth?: AuthContext
    apiKeyHash?: string
  }
}
