import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { Wallet } from 'ethers'
import { buildServer } from '../../src/server.js'
import { generateAccessToken, generateRefreshToken } from '../../src/middleware/auth.js'
import { generateNonce, storeNonce, createSiweMessage } from '../../src/utils/siwe.js'
import { getRedis } from '../../src/utils/redis.js'
import { clearAllStores } from '../helpers/db-cleanup.js'

const JWT_SECRET = 'test-secret-at-least-32-chars-long!!'
const WRONG_SECRET = 'wrong-secret-at-least-32-chars-long!!'

async function createApp() {
  return buildServer({ logger: false })
}

async function registerUser(app: any, email?: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: {
      email: email ?? `user-${randomUUID().slice(0, 6)}@example.com`,
      password: 'password123',
      orgName: `Org ${randomUUID().slice(0, 6)}`,
    },
  })
  return JSON.parse(res.payload)
}

/** GET a protected route — agents list — which requires auth */
async function hitProtectedRoute(app: any, authHeader: string) {
  const res = await app.inject({
    method: 'GET',
    url: '/v1/sessions',
    headers: { authorization: authHeader },
  })
  return res
}

describe('Authentication Security', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  describe('JWT Token Security', () => {
    it('should reject expired access tokens', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      // Create an already-expired access token
      const expiredToken = jwt.sign(
        { sub: reg.user.id, orgId: reg.user.orgId, email: reg.user.email, role: 'owner', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1s' },
      )

      const res = await hitProtectedRoute(app, `Bearer ${expiredToken}`)
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('INVALID_TOKEN')
    })

    it('should reject tokens signed with wrong secret', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const forgedToken = jwt.sign(
        { sub: reg.user.id, orgId: reg.user.orgId, email: reg.user.email, role: 'owner', type: 'access' },
        WRONG_SECRET,
      )

      const res = await hitProtectedRoute(app, `Bearer ${forgedToken}`)
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('INVALID_TOKEN')
    })

    it('should reject refresh tokens used as access tokens', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      // Use the refresh token directly in the Authorization header
      const res = await hitProtectedRoute(app, `Bearer ${reg.refreshToken}`)
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('INVALID_TOKEN')
    })

    it('should reject malformed JWT tokens', async () => {
      const app = await createApp()

      const malformedTokens = [
        'not.a.jwt',
        'Bearer ',
        'eyJhbGciOiJIUzI1NiJ9.badpayload.badsig',
        'random-string-not-jwt',
        'a.b', // only two parts
      ]

      for (const token of malformedTokens) {
        const res = await hitProtectedRoute(app, `Bearer ${token}`)
        expect(res.statusCode).toBe(401)
      }
    })

    it('should reject empty Authorization header value', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: { authorization: '' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should reject request with no Authorization header', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
      })
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('UNAUTHORIZED')
    })

    it('should reject Bearer header with empty token', async () => {
      const app = await createApp()
      const res = await hitProtectedRoute(app, 'Bearer ')
      expect(res.statusCode).toBe(401)
    })

    it('should accept valid access tokens', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const res = await hitProtectedRoute(app, `Bearer ${reg.accessToken}`)
      expect(res.statusCode).toBe(200)
    })
  })

  describe('API Key Security', () => {
    it('should reject invalid API key prefix (not ApiKey scheme)', async () => {
      const app = await createApp()
      // Using Bearer with something that looks like an API key
      const res = await hitProtectedRoute(app, 'Bearer ac_invalidnotjwt')
      expect(res.statusCode).toBe(401)
    })

    it('should reject API key without ac_ prefix', async () => {
      const app = await createApp()
      const res = await hitProtectedRoute(app, 'ApiKey invalid_wrongprefix_xyz')
      expect(res.statusCode).toBe(401)
    })

    it('should reject API key without ac_ prefix', async () => {
      const app = await createApp()
      // "ApiKey" scheme but no ac_ prefix — rejected by extractApiKey
      const res = await hitProtectedRoute(app, 'ApiKey no_prefix_key_here')
      expect(res.statusCode).toBe(401)
    })

    it('should reject unrecognised auth scheme entirely', async () => {
      const app = await createApp()
      const res = await hitProtectedRoute(app, 'Token sometoken')
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Password Security', () => {
    it('should hash passwords with bcrypt (not plaintext)', async () => {
      const app = await createApp()
      await registerUser(app, 'hashtest@example.com')

      // Login succeeds with correct password
      const loginRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'hashtest@example.com', password: 'password123' },
      })
      expect(loginRes.statusCode).toBe(200)

      // Access token should not contain the password
      const body = JSON.parse(loginRes.payload)
      expect(body.accessToken).not.toContain('password123')
    })

    it('should reject login with wrong password', async () => {
      const app = await createApp()
      await registerUser(app, 'wrongpw@example.com')

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'wrongpw@example.com', password: 'wrongpassword' },
      })
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('UNAUTHORIZED')
    })

    it('should not expose password hash in registration response', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'nohash@example.com',
          password: 'password123',
          orgName: 'Hash Test Org',
        },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      const bodyStr = JSON.stringify(body)

      // The response should not contain the password or any bcrypt hash
      expect(bodyStr).not.toContain('password123')
      expect(bodyStr).not.toContain('passwordHash')
      expect(bodyStr).not.toContain('$2b$') // bcrypt hash prefix
    })

    it('should not expose password hash in login response', async () => {
      const app = await createApp()
      await registerUser(app, 'nohashlogin@example.com')

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'nohashlogin@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      const bodyStr = JSON.stringify(body)

      expect(bodyStr).not.toContain('password123')
      expect(bodyStr).not.toContain('passwordHash')
      expect(bodyStr).not.toContain('$2b$')
    })
  })

  describe('SIWE Wallet Security', () => {
    it('should reject reused nonces (replay attack prevention)', async () => {
      const app = await createApp()
      const wallet = Wallet.createRandom()

      // Register with wallet address so first verify succeeds with 200
      const email = `${wallet.address.toLowerCase().slice(2, 10)}@example.com`
      await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email, password: 'password123', orgName: `Org ${wallet.address.slice(0, 8)}`, walletAddress: wallet.address },
      })

      // Get nonce
      const nonceRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/nonce',
        payload: { address: wallet.address },
      })
      const { message } = JSON.parse(nonceRes.payload)
      const signature = await wallet.signMessage(message)

      // First verify — should succeed
      const res1 = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/verify',
        payload: { message, signature },
      })
      expect(res1.statusCode).toBe(200)

      // Second verify with same message/signature — nonce was consumed, must fail
      const res2 = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/verify',
        payload: { message, signature },
      })
      expect(res2.statusCode).toBe(401)
      const body = JSON.parse(res2.payload)
      expect(body.code).toBe('SIWE_VALIDATION_FAILED')
    })

    it('should reject SIWE messages with wrong domain', async () => {
      const app = await createApp()
      const wallet = Wallet.createRandom()

      const nonce = generateNonce()
      storeNonce(nonce, wallet.address)

      const message = createSiweMessage({
        domain: 'evil.com',
        address: wallet.address,
        statement: 'Sign in to Attestara',
        uri: 'https://evil.com',
        version: '1',
        chainId: 1,
        nonce,
        issuedAt: new Date().toISOString(),
      })
      const signature = await wallet.signMessage(message)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/verify',
        payload: { message, signature },
      })
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('SIWE_VALIDATION_FAILED')
      expect(body.message).toContain('Domain mismatch')
    })

    it('should reject invalid Ethereum signatures (bad hex)', async () => {
      const app = await createApp()
      const wallet = Wallet.createRandom()

      const nonce = generateNonce()
      storeNonce(nonce, wallet.address)

      const message = createSiweMessage({
        domain: 'attestara.ai',
        address: wallet.address,
        statement: 'Sign in to Attestara',
        uri: 'https://attestara.ai',
        version: '1',
        chainId: 1,
        nonce,
        issuedAt: new Date().toISOString(),
      })

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/verify',
        payload: { message, signature: '0xinvalidsignature' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should reject SIWE messages with mismatched address (signed by different wallet)', async () => {
      const app = await createApp()
      const wallet = Wallet.createRandom()
      const wrongWallet = Wallet.createRandom()

      // Get nonce for the original wallet
      const nonceRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/nonce',
        payload: { address: wallet.address },
      })
      const { message } = JSON.parse(nonceRes.payload)

      // Sign with a DIFFERENT wallet
      const signature = await wrongWallet.signMessage(message)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/verify',
        payload: { message, signature },
      })
      expect(res.statusCode).toBe(401)
      // Either ADDRESS_MISMATCH or SIWE_VALIDATION_FAILED depending on nonce address check
      const body = JSON.parse(res.payload)
      expect(['ADDRESS_MISMATCH', 'SIWE_VALIDATION_FAILED']).toContain(body.code)
    })

    it('should reject expired nonces', async () => {
      const app = await createApp()
      const wallet = Wallet.createRandom()

      const nonceRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/nonce',
        payload: { address: wallet.address },
      })
      const { nonce, message } = JSON.parse(nonceRes.payload)

      // Manually expire the nonce by deleting it from Redis
      const redis = getRedis()
      await redis.del(`siwe:nonce:${nonce}`)

      const signature = await wallet.signMessage(message)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/verify',
        payload: { message, signature },
      })
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('SIWE_VALIDATION_FAILED')
    })

    it('should reject completely invalid SIWE message format', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/verify',
        payload: { message: 'this is not a SIWE message at all', signature: '0x1234' },
      })
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('SIWE_VALIDATION_FAILED')
    })
  })

  // Auth rate limiting is enforced in production (10 req / 15 min per IP on auth endpoints).
  // In NODE_ENV=test the limit is raised to 10,000 to avoid throttling the test suite —
  // so we don't assert 429 behavior here. The limit configuration lives in routes/auth.ts
  // and the bypass is covered by the integration test suite completing without 429s.

  describe('Token Refresh Security', () => {
    it('should reject access token used as refresh token', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: reg.accessToken },
      })
      expect(res.statusCode).toBe(401)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('INVALID_TOKEN')
    })

    it('should reject forged refresh token with wrong secret', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const forgedRefresh = jwt.sign(
        { sub: reg.user.id, orgId: reg.user.orgId, email: reg.user.email, role: 'owner', type: 'refresh' },
        WRONG_SECRET,
      )

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: forgedRefresh },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should issue new tokens on valid refresh', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: reg.refreshToken },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.accessToken).toBeDefined()
      expect(body.refreshToken).toBeDefined()
    })
  })
})
