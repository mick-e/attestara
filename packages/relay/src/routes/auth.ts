import type { FastifyPluginAsync } from 'fastify'
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
import type { StoredUser, StoredOrg } from '../services/org.service.js'

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
export function clearAuthStores() {
  orgService.clearStores()
  clearNonceStore()
}

export function getAuthStores() {
  return {
    get users() {
      // Provide a Map-like interface backed by orgService for backward compat
      return {
        get: (id: string) => orgService.getUserById(id),
      }
    },
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'
const SIWE_DOMAIN = process.env.SIWE_DOMAIN ?? 'attestara.ai'
const SIWE_URI = process.env.SIWE_URI ?? 'https://attestara.ai'
const SIWE_STATEMENT = 'Sign in to Attestara'

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /v1/auth/register
  app.post('/register', async (request, reply) => {
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
    if (orgService.hasEmail(email)) {
      return reply.status(409).send({
        code: 'CONFLICT',
        message: 'Email already registered',
        requestId: request.id,
      })
    }

    // Create org
    const org = orgService.createOrg(orgName)

    // Create user
    const hash = await authService.hashPassword(password)
    const user = orgService.createUser(org.id, {
      email,
      passwordHash: hash,
      walletAddress: walletAddress ?? null,
      role: 'owner',
    })

    // Generate tokens
    const tokenPayload = { sub: user.id, orgId: org.id, email, role: user.role }
    const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
    const refreshToken = generateRefreshToken(tokenPayload, JWT_SECRET)

    return reply.status(201).send({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email, orgId: org.id, role: user.role },
    })
  })

  // POST /v1/auth/login
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { email, password } = parsed.data
    const user = orgService.getUserByEmail(email)
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

    try {
      const payload = verifyToken(parsed.data.refreshToken, JWT_SECRET)
      if (payload.type !== 'refresh') {
        return reply.status(401).send({
          code: 'INVALID_TOKEN',
          message: 'Expected refresh token',
          requestId: request.id,
        })
      }

      const tokenPayload = { sub: payload.sub, orgId: payload.orgId, email: payload.email, role: payload.role }
      const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
      const refreshToken = generateRefreshToken(tokenPayload, JWT_SECRET)

      return reply.status(200).send({
        accessToken,
        refreshToken,
        expiresIn: 900,
      })
    } catch {
      return reply.status(401).send({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token',
        requestId: request.id,
      })
    }
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
    storeNonce(nonce, checksumAddress)

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

  // POST /v1/auth/wallet/verify — Verify SIWE signature and issue tokens
  app.post('/wallet/verify', async (request, reply) => {
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
    const validation = validateSiweMessage(message, {
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

    // Upsert user by wallet address
    const address = recoveredAddress
    let user = orgService.getUserByWallet(address)

    if (!user) {
      // Auto-create org + user for wallet auth
      const org = orgService.createOrg(`Wallet ${address.slice(0, 8)}`)
      // Override slug for wallet orgs
      const orgData = orgService.getOrg(org.id)!
      ;(orgData as any).slug = `wallet-${address.slice(2, 10).toLowerCase()}`

      user = orgService.createUser(org.id, {
        email: `${address.toLowerCase()}@wallet.attestara.ai`,
        passwordHash: '',
        walletAddress: address,
        role: 'owner',
      })
    }

    const tokenPayload = { sub: user.id, orgId: user.orgId, email: user.email, role: user.role }
    const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
    const refreshToken = generateRefreshToken(tokenPayload, JWT_SECRET)

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
    const validation = validateSiweMessage(message, {
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

    // Upsert user by wallet address
    const address = recoveredAddress
    let user = orgService.getUserByWallet(address)

    if (!user) {
      const org = orgService.createOrg(`Wallet ${address.slice(0, 8)}`)
      const orgData = orgService.getOrg(org.id)!
      ;(orgData as any).slug = `wallet-${address.slice(2, 10).toLowerCase()}`

      user = orgService.createUser(org.id, {
        email: `${address.toLowerCase()}@wallet.attestara.ai`,
        passwordHash: '',
        walletAddress: address,
        role: 'owner',
      })
    }

    const tokenPayload = { sub: user.id, orgId: user.orgId, email: user.email, role: user.role }
    const accessToken = generateAccessToken(tokenPayload, JWT_SECRET)
    const refreshToken = generateRefreshToken(tokenPayload, JWT_SECRET)

    return reply.status(200).send({
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, orgId: user.orgId, role: user.role, walletAddress: address },
    })
  })
}
