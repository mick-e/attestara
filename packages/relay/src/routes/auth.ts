import type { FastifyPluginAsync } from 'fastify'
import { createHash, randomUUID } from 'crypto'
import { z } from 'zod'
import { getAddress } from 'ethers'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../middleware/auth.js'
import {
  generateNonce,
  storeNonce,
  createSiweMessage,
  verifySiweSignature,
  validateSiweMessage,
  clearNonceStore,
} from '../utils/siwe.js'
import { AuthService } from '../services/auth.service.js'
import { orgService } from '../services/org.service.js'
import { getPrisma } from '../utils/prisma.js'
import type { StoredUser, StoredOrg } from '../services/org.service.js'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Re-export types for backward compatibility
export type { StoredUser, StoredOrg }

const authService = new AuthService()

// Zod schemas for request validation
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(1).max(100),
  walletAddress: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const walletNonceSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address'),
})

const walletVerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
})

// Keep legacy schema for backward compat on /wallet endpoint
const walletAuthSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  address: z.string().min(1),
})

// Exported for tests
export async function clearAuthStores() {
  await orgService.clearStores()
  await clearNonceStore()
}

export function getAuthStores() {
  return {
    get users() {
      // Provide a Map-like interface backed by orgService for backward compat
      return {
        get: async (id: string) => await orgService.getUserById(id),
      }
    },
  }
}

const SIWE_DOMAIN = process.env.SIWE_DOMAIN ?? 'attestara.ai'
const SIWE_URI = process.env.SIWE_URI ?? 'https://attestara.ai'
const SIWE_STATEMENT = 'Sign in to Attestara'

export const authRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // Per-endpoint rate limit tuning. In test environment (NODE_ENV=test or VITEST)
  // we use a very high ceiling to avoid throttling test runs. Production values
  // are enforced per-route below (register 3/hr, login & wallet/verify 5/15min).
  const isTestEnv = app.config.NODE_ENV === 'test' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
  const registerMax = isTestEnv ? 10_000 : 3
  const loginMax = isTestEnv ? 10_000 : 5
  const walletVerifyMax = isTestEnv ? 10_000 : 5

  // POST /v1/auth/register — 3 requests per hour per IP
  app.post('/register', {
    config: {
      rateLimit: {
        max: registerMax,
        timeWindow: '1 hour',
        keyGenerator: (request) => request.ip,
      },
    },
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { email, password, orgName, walletAddress } = parsed.data

    // Check for existing email
    if (await orgService.hasEmail(email)) {
      return reply.status(409).send({
        code: 'CONFLICT',
        message: 'Email already registered',
        requestId: request.id,
      })
    }

    // Create org
    const org = await orgService.createOrg(orgName)

    // Create user
    const hash = await authService.hashPassword(password)
    const user = await orgService.createUser(org.id, {
      email,
      passwordHash: hash,
      walletAddress: walletAddress ?? null,
      role: 'owner',
    })

    // Generate tokens
    const tokenPayload = { sub: user.id, orgId: org.id, email, role: user.role }
    const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
    const refreshToken = generateRefreshToken(tokenPayload, JWT_SECRET)

    // Store refresh token hash for rotation tracking
    const family = randomUUID()
    await getPrisma().refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return reply.status(201).send({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email, orgId: org.id, role: user.role },
    })
  })

  // POST /v1/auth/login — 5 requests per 15 minutes per IP
  app.post('/login', {
    config: {
      rateLimit: {
        max: loginMax,
        timeWindow: '15 minutes',
        keyGenerator: (request) => request.ip,
      },
    },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { email, password } = parsed.data
    const user = await orgService.getUserByEmail(email)
    if (!user) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
        requestId: request.id,
      })
    }

    if (!await authService.verifyPassword(password, user.passwordHash)) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
        requestId: request.id,
      })
    }

    const tokenPayload = { sub: user.id, orgId: user.orgId, email: user.email, role: user.role }
    const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
    const refreshToken = generateRefreshToken(tokenPayload, JWT_SECRET)

    // Store refresh token hash for rotation tracking
    const family = randomUUID()
    await getPrisma().refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return reply.status(200).send({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, orgId: user.orgId, role: user.role },
    })
  })

  // POST /v1/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Missing refresh token',
        requestId: request.id,
      })
    }

    const { refreshToken: incomingToken } = parsed.data

    // Verify JWT first
    let payload: ReturnType<typeof verifyToken>
    try {
      payload = verifyToken(incomingToken, JWT_SECRET)
      if (payload.type !== 'refresh') {
        return reply.status(401).send({
          code: 'INVALID_TOKEN',
          message: 'Expected refresh token',
          requestId: request.id,
        })
      }
    } catch {
      return reply.status(401).send({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token',
        requestId: request.id,
      })
    }

    // Look up by hash
    const tokenHash = hashToken(incomingToken)
    const stored = await getPrisma().refreshToken.findUnique({ where: { tokenHash } })

    if (!stored) {
      return reply.status(401).send({
        code: 'INVALID_TOKEN',
        message: 'Refresh token not found',
        requestId: request.id,
      })
    }

    if (stored.revoked) {
      // TOKEN REUSE DETECTED — revoke entire family
      await getPrisma().refreshToken.updateMany({
        where: { family: stored.family },
        data: { revoked: true },
      })
      return reply.status(401).send({
        code: 'TOKEN_REUSE',
        message: 'Token reuse detected, all sessions revoked',
        requestId: request.id,
      })
    }

    // Rotate: revoke old, issue new
    await getPrisma().refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    })

    const newPayload = { sub: payload.sub, orgId: payload.orgId, email: payload.email, role: payload.role }
    const newAccessToken = generateAccessToken(newPayload, JWT_SECRET)
    const newRefreshToken = generateRefreshToken(newPayload, JWT_SECRET)

    await getPrisma().refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: hashToken(newRefreshToken),
        family: stored.family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return reply.status(200).send({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    })
  })

  // POST /v1/auth/wallet/nonce — Generate a nonce for SIWE
  app.post('/wallet/nonce', async (request, reply) => {
    const parsed = walletNonceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { address } = parsed.data
    const checksumAddress = getAddress(address)
    const nonce = generateNonce()
    await storeNonce(nonce, checksumAddress)

    // Build the SIWE message for the client to sign
    const issuedAt = new Date().toISOString()
    const message = createSiweMessage({
      domain: SIWE_DOMAIN,
      address: checksumAddress,
      statement: SIWE_STATEMENT,
      uri: SIWE_URI,
      version: '1',
      chainId: 1,
      nonce,
      issuedAt,
    })

    return reply.status(200).send({ nonce, message })
  })

  // POST /v1/auth/wallet/verify — Verify SIWE signature and issue tokens.
  // 5 requests per 15 minutes per IP (same threshold as /login).
  app.post('/wallet/verify', {
    config: {
      rateLimit: {
        max: walletVerifyMax,
        timeWindow: '15 minutes',
        keyGenerator: (request) => request.ip,
      },
    },
  }, async (request, reply) => {
    const parsed = walletVerifySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { message, signature } = parsed.data

    // Validate the SIWE message structure, domain, statement, nonce
    const validation = await validateSiweMessage(message, {
      expectedDomain: SIWE_DOMAIN,
      expectedStatement: SIWE_STATEMENT,
    })
    if (!validation.ok) {
      return reply.status(401).send({
        code: 'SIWE_VALIDATION_FAILED',
        message: validation.error,
        requestId: request.id,
      })
    }

    // Verify the signature recovers the claimed address
    let recoveredAddress: string
    try {
      recoveredAddress = verifySiweSignature(message, signature)
    } catch {
      return reply.status(401).send({
        code: 'INVALID_SIGNATURE',
        message: 'Signature verification failed',
        requestId: request.id,
      })
    }

    const expectedAddress = getAddress(validation.params.address)
    if (recoveredAddress !== expectedAddress) {
      return reply.status(401).send({
        code: 'ADDRESS_MISMATCH',
        message: 'Recovered address does not match claimed address',
        requestId: request.id,
      })
    }

    // Look up user by wallet address — do NOT auto-create
    const address = recoveredAddress
    const user = await orgService.getUserByWallet(address)

    if (!user) {
      return reply.status(202).send({
        code: 'WALLET_NOT_LINKED',
        message: 'No account linked to this wallet. Register first with walletAddress field, then sign in with wallet.',
        walletAddress: address,
        requestId: request.id,
      })
    }

    const tokenPayload = { sub: user.id, orgId: user.orgId, email: user.email, role: user.role }
    const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
    const refreshToken = generateRefreshToken(tokenPayload, JWT_SECRET)

    // Store refresh token hash for rotation tracking
    const family = randomUUID()
    await getPrisma().refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return reply.status(200).send({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, orgId: user.orgId, role: user.role, walletAddress: address },
    })
  })

  // POST /v1/auth/wallet (legacy — now requires real SIWE validation)
  app.post('/wallet', async (request, reply) => {
    const parsed = walletAuthSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { message, signature } = parsed.data

    // Validate the SIWE message structure, domain, statement, nonce
    const validation = await validateSiweMessage(message, {
      expectedDomain: SIWE_DOMAIN,
      expectedStatement: SIWE_STATEMENT,
    })
    if (!validation.ok) {
      return reply.status(401).send({
        code: 'SIWE_VALIDATION_FAILED',
        message: validation.error,
        requestId: request.id,
      })
    }

    // Verify the signature recovers the claimed address
    let recoveredAddress: string
    try {
      recoveredAddress = verifySiweSignature(message, signature)
    } catch {
      return reply.status(401).send({
        code: 'INVALID_SIGNATURE',
        message: 'Signature verification failed',
        requestId: request.id,
      })
    }

    const expectedAddress = getAddress(validation.params.address)
    if (recoveredAddress !== expectedAddress) {
      return reply.status(401).send({
        code: 'ADDRESS_MISMATCH',
        message: 'Recovered address does not match claimed address',
        requestId: request.id,
      })
    }

    // Look up user by wallet address — do NOT auto-create
    const address = recoveredAddress
    const user = await orgService.getUserByWallet(address)

    if (!user) {
      return reply.status(202).send({
        code: 'WALLET_NOT_LINKED',
        message: 'No account linked to this wallet. Register first with walletAddress field, then sign in with wallet.',
        walletAddress: address,
        requestId: request.id,
      })
    }

    const tokenPayload = { sub: user.id, orgId: user.orgId, email: user.email, role: user.role }
    const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
    const refreshToken = generateRefreshToken(tokenPayload, JWT_SECRET)

    // Store refresh token hash for rotation tracking
    const familyId = randomUUID()
    await getPrisma().refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family: familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return reply.status(200).send({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, orgId: user.orgId, role: user.role, walletAddress: address },
    })
  })
}
