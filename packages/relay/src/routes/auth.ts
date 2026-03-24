import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createHash, randomUUID } from 'crypto'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../middleware/auth.js'

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

const walletAuthSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  address: z.string().min(1),
})

/**
 * Simple password hashing using SHA-256 with a salt.
 * In production, use bcrypt — this avoids native dependencies for testing.
 */
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? randomUUID()
  const hash = createHash('sha256').update(`${s}:${password}`).digest('hex')
  return { hash: `${s}:${hash}`, salt: s }
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt] = storedHash.split(':')
  const { hash } = hashPassword(password, salt)
  return hash === storedHash
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// In-memory stores for testing (Prisma will replace these)
interface StoredUser {
  id: string
  orgId: string
  email: string
  passwordHash: string
  walletAddress: string | null
  role: string
  emailVerified: boolean
}

interface StoredOrg {
  id: string
  name: string
  slug: string
  plan: string
}

const users = new Map<string, StoredUser>()
const orgs = new Map<string, StoredOrg>()
const emailIndex = new Map<string, string>() // email -> userId
const walletIndex = new Map<string, string>() // walletAddress -> userId

// Exported for tests
export function clearAuthStores() {
  users.clear()
  orgs.clear()
  emailIndex.clear()
  walletIndex.clear()
}

export function getAuthStores() {
  return { users, orgs, emailIndex, walletIndex }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'

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
    if (emailIndex.has(email)) {
      return reply.status(409).send({
        code: 'CONFLICT',
        message: 'Email already registered',
        requestId: request.id,
      })
    }

    // Create org
    const org: StoredOrg = {
      id: randomUUID(),
      name: orgName,
      slug: slugify(orgName) + '-' + randomUUID().slice(0, 6),
      plan: 'starter',
    }
    orgs.set(org.id, org)

    // Create user
    const { hash } = hashPassword(password)
    const user: StoredUser = {
      id: randomUUID(),
      orgId: org.id,
      email,
      passwordHash: hash,
      walletAddress: walletAddress ?? null,
      role: 'owner',
      emailVerified: false,
    }
    users.set(user.id, user)
    emailIndex.set(email, user.id)
    if (walletAddress) walletIndex.set(walletAddress, user.id)

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
    const userId = emailIndex.get(email)
    if (!userId) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
        requestId: request.id,
      })
    }

    const user = users.get(userId)!
    if (!verifyPassword(password, user.passwordHash)) {
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

  // POST /v1/auth/wallet
  app.post('/wallet', async (request, reply) => {
    const parsed = walletAuthSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { address } = parsed.data
    // TODO: Validate SIWE message + signature using ethers

    // Find existing user by wallet or create one
    let userId = walletIndex.get(address)
    let user: StoredUser

    if (userId) {
      user = users.get(userId)!
    } else {
      // Auto-create org + user for wallet auth
      const org: StoredOrg = {
        id: randomUUID(),
        name: `Wallet ${address.slice(0, 8)}`,
        slug: `wallet-${address.slice(2, 10).toLowerCase()}`,
        plan: 'starter',
      }
      orgs.set(org.id, org)

      user = {
        id: randomUUID(),
        orgId: org.id,
        email: `${address.toLowerCase()}@wallet.attestara.ai`,
        passwordHash: '',
        walletAddress: address,
        role: 'owner',
        emailVerified: false,
      }
      users.set(user.id, user)
      walletIndex.set(address, user.id)
      emailIndex.set(user.email, user.id)
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
}
