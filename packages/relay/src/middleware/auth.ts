import { createHash, randomBytes } from 'crypto'
import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

const API_KEY_PREFIX = 'ac_'

export interface JWTPayload {
  sub: string // userId
  orgId: string
  email: string
  role: string
  type: 'access' | 'refresh'
}

export interface AuthContext {
  userId: string
  orgId: string
  email: string
  role: string
}

/**
 * Generate a JWT access token.
 */
export function generateAccessToken(
  payload: Omit<JWTPayload, 'type'>,
  secret: string,
  expiresIn: string | number = '15m',
): string {
  const options: jwt.SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  return jwt.sign({ ...payload, type: 'access' }, secret, options)
}

/**
 * Generate a JWT refresh token.
 */
export function generateRefreshToken(
  payload: Omit<JWTPayload, 'type'>,
  secret: string,
  expiresIn: string | number = '7d',
): string {
  const options: jwt.SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  return jwt.sign({ ...payload, type: 'refresh' }, secret, options)
}

/**
 * Verify a JWT token and return the payload.
 */
export function verifyToken(token: string, secret: string): JWTPayload {
  return jwt.verify(token, secret) as JWTPayload
}

/**
 * Generate a new API key with the ac_ prefix.
 * Returns the raw key (to show the user once) and its SHA-256 hash (to store).
 */
export function generateApiKey(): { raw: string; hash: string } {
  const raw = API_KEY_PREFIX + randomBytes(32).toString('hex')
  const hash = hashApiKey(raw)
  return { raw, hash }
}

/**
 * Hash an API key for storage.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Extract Bearer token from Authorization header.
 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

/**
 * Extract API key from Authorization header (ApiKey ac_xxx).
 */
export function extractApiKey(request: FastifyRequest): string | null {
  const auth = request.headers.authorization
  if (!auth?.startsWith('ApiKey ')) return null
  const key = auth.slice(7)
  if (!key.startsWith(API_KEY_PREFIX)) return null
  return key
}

/**
 * Fastify preHandler hook that requires JWT or API key authentication.
 * Decorates request with `auth` context.
 */
export function requireAuth(jwtSecret: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Try JWT first
    const token = extractBearerToken(request)
    if (token) {
      try {
        const payload = verifyToken(token, jwtSecret)
        if (payload.type !== 'access') {
          return reply.status(401).send({
            code: 'INVALID_TOKEN',
            message: 'Expected access token',
            requestId: request.id,
          })
        }
        request.auth = {
          userId: payload.sub,
          orgId: payload.orgId,
          email: payload.email,
          role: payload.role,
        }
        return
      } catch {
        return reply.status(401).send({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: request.id,
        })
      }
    }

    // Try API key
    const apiKey = extractApiKey(request)
    if (apiKey) {
      // API key validation requires database lookup — store hash for route to resolve
      request.apiKeyHash = hashApiKey(apiKey)
      return
    }

    return reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      requestId: request.id,
    })
  }
}

/**
 * Fastify preHandler that enforces org scoping.
 * Ensures the authenticated user belongs to the org specified in the route params.
 */
export function requireOrgAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.auth
    if (!auth) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId: request.id,
      })
    }

    const params = request.params as Record<string, string>
    const orgId = params.orgId
    if (orgId && orgId !== auth.orgId) {
      return reply.status(403).send({
        code: 'FORBIDDEN',
        message: 'Access denied to this organisation',
        requestId: request.id,
      })
    }
  }
}
