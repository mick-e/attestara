import type { FastifyRequest, FastifyReply } from 'fastify'
import { loadConfig } from '../config.js'

/**
 * Rejects requests whose Host header is not in ALLOWED_HOSTS.
 *
 * Enforced only in production (NODE_ENV === 'production') so dev/test remain unaffected.
 * In production, an empty allowlist is already rejected at config load time
 * (see ALLOWED_HOSTS refine in config.ts), but this is defensive-coded to no-op
 * in case that invariant is ever relaxed.
 *
 * Returns HTTP 400 with `code: 'INVALID_HOST'` on mismatch.
 */
export async function validateHost(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const config = loadConfig()
  if (config.NODE_ENV !== 'production') return
  const allowed = config.ALLOWED_HOSTS
  if (allowed.length === 0) return // defensive: config refine should have caught this

  const host = request.headers.host
  if (!host || !allowed.includes(host)) {
    reply.code(400).send({
      code: 'INVALID_HOST',
      message: 'Host header not allowed',
      requestId: request.id,
    })
  }
}
