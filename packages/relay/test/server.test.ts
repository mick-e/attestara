import { describe, it, expect, beforeEach } from 'vitest'
import { Wallet } from 'ethers'
import { buildServer } from '../src/server.js'
import { clearAllStores } from './helpers/db-cleanup.js'

async function createApp() {
  const app = await buildServer({ logger: false })
  return app
}

async function registerUser(app: any, email = 'test@example.com', password = 'password123', orgName = 'Test Org') {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password, orgName },
  })
  return JSON.parse(res.payload)
}

describe('Health endpoint', () => {
  it('GET /health returns ok', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })
})

describe('Auth routes', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  describe('POST /v1/auth/register', () => {
    it('should register a new user and org', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'alice@example.com', password: 'password123', orgName: 'Alice Corp' },
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      expect(body.accessToken).toBeDefined()
      expect(body.refreshToken).toBeDefined()
      expect(body.expiresIn).toBe(900)
      expect(body.user.email).toBe('alice@example.com')
      expect(body.user.orgId).toBeDefined()
      expect(body.user.role).toBe('owner')
    })

    it('should reject duplicate email', async () => {
      const app = await createApp()
      await registerUser(app, 'dup@example.com')
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'dup@example.com', password: 'password123', orgName: 'Dup Org' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should reject invalid email', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'invalid', password: 'password123', orgName: 'Test' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should reject short password', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'x@example.com', password: 'short', orgName: 'Test' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const app = await createApp()
      await registerUser(app)
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.accessToken).toBeDefined()
      expect(body.refreshToken).toBeDefined()
    })

    it('should reject wrong password', async () => {
      const app = await createApp()
      await registerUser(app)
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'test@example.com', password: 'wrong' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should reject unknown email', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'nobody@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /v1/auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
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

    it('should reject access token as refresh', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: reg.accessToken },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should reject invalid refresh token', async () => {
      const app = await createApp()
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        payload: { refreshToken: 'invalid-token' },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /v1/auth/wallet', () => {
    async function registerWallet(app: any, wallet: Wallet) {
      const email = `${wallet.address.toLowerCase().slice(2, 10)}@example.com`
      const regRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email, password: 'password123', orgName: `Org ${wallet.address.slice(0, 8)}`, walletAddress: wallet.address },
      })
      return JSON.parse(regRes.payload)
    }

    async function walletAuthFlow(app: any, wallet: Wallet) {
      // Step 1: Get nonce
      const nonceRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/wallet/nonce',
        payload: { address: wallet.address },
      })
      const { message } = JSON.parse(nonceRes.payload)
      // Step 2: Sign and verify via legacy /wallet endpoint
      const signature = await wallet.signMessage(message)
      return app.inject({
        method: 'POST',
        url: '/v1/auth/wallet',
        payload: { message, signature, address: wallet.address },
      })
    }

    it('should return 202 for unlinked wallet', async () => {
      const app = await createApp()
      const wallet = Wallet.createRandom()
      const res = await walletAuthFlow(app, wallet)
      expect(res.statusCode).toBe(202)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('WALLET_NOT_LINKED')
    })

    it('should authenticate with wallet address after registration', async () => {
      const app = await createApp()
      const wallet = Wallet.createRandom()
      await registerWallet(app, wallet)
      const res = await walletAuthFlow(app, wallet)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.payload)
      expect(body.accessToken).toBeDefined()
      expect(body.user.orgId).toBeDefined()
    })

    it('should return same user for repeated wallet auth', async () => {
      const app = await createApp()
      const wallet = Wallet.createRandom()
      await registerWallet(app, wallet)
      const r1 = await walletAuthFlow(app, wallet)
      const r2 = await walletAuthFlow(app, wallet)
      const b1 = JSON.parse(r1.payload)
      const b2 = JSON.parse(r2.payload)
      expect(b1.user.id).toBe(b2.user.id)
    })
  })
})

describe('Auth middleware', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  it('should reject requests without auth header', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/v1/sessions' })
    expect(res.statusCode).toBe(401)
  })

  it('should reject invalid Bearer token', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/sessions',
      headers: { authorization: 'Bearer invalid.token.here' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('should accept valid Bearer token', async () => {
    const app = await createApp()
    const reg = await registerUser(app)
    const res = await app.inject({
      method: 'GET',
      url: '/v1/sessions',
      headers: { authorization: `Bearer ${reg.accessToken}` },
    })
    expect(res.statusCode).toBe(200)
  })
})
