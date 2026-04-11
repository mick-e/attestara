import { describe, it, expect, beforeEach } from 'vitest'
import { Wallet } from 'ethers'
import { buildServer } from '../src/server.js'
import { clearAllStores } from './helpers/db-cleanup.js'
import {
  generateNonce,
  createSiweMessage,
  parseSiweMessage,
  storeNonce,
} from '../src/utils/siwe.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'test-secret-at-least-32-chars-long!!'
const SIWE_DOMAIN = 'attestara.ai'
const SIWE_URI = 'https://attestara.ai'
const SIWE_STATEMENT = 'Sign in to Attestara'

async function createApp() {
  return buildServer({ logger: false })
}

/**
 * Helper: request a nonce from the server, then sign the SIWE message with a wallet.
 */
async function getNonceAndSign(app: any, wallet: Wallet) {
  const nonceRes = await app.inject({
    method: 'POST',
    url: '/v1/auth/wallet/nonce',
    payload: { address: wallet.address },
  })
  const nonceBody = JSON.parse(nonceRes.payload)
  const signature = await wallet.signMessage(nonceBody.message)
  return { nonce: nonceBody.nonce, message: nonceBody.message, signature }
}

describe('SIWE Utility', () => {
  it('generateNonce returns 64-char hex string', () => {
    const nonce = generateNonce()
    expect(nonce).toMatch(/^[0-9a-f]{64}$/)
    // Each call should produce a different nonce
    const nonce2 = generateNonce()
    expect(nonce).not.toBe(nonce2)
  })

  it('createSiweMessage produces EIP-4361 compliant format', () => {
    const params = {
      domain: 'attestara.ai',
      address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      statement: 'Sign in to Attestara',
      uri: 'https://attestara.ai',
      version: '1',
      chainId: 1,
      nonce: 'abc123',
      issuedAt: '2026-01-01T00:00:00.000Z',
    }
    const msg = createSiweMessage(params)
    expect(msg).toContain('attestara.ai wants you to sign in with your Ethereum account:')
    expect(msg).toContain(params.address)
    expect(msg).toContain('Sign in to Attestara')
    expect(msg).toContain('URI: https://attestara.ai')
    expect(msg).toContain('Version: 1')
    expect(msg).toContain('Chain ID: 1')
    expect(msg).toContain('Nonce: abc123')
    expect(msg).toContain('Issued At: 2026-01-01T00:00:00.000Z')
  })

  it('parseSiweMessage round-trips with createSiweMessage', () => {
    const params = {
      domain: 'attestara.ai',
      address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      statement: 'Sign in to Attestara',
      uri: 'https://attestara.ai',
      version: '1',
      chainId: 1,
      nonce: 'abc123',
      issuedAt: '2026-01-01T00:00:00.000Z',
    }
    const msg = createSiweMessage(params)
    const parsed = parseSiweMessage(msg)
    expect(parsed).toEqual(params)
  })

  it('parseSiweMessage returns null for invalid message', () => {
    expect(parseSiweMessage('not a valid message')).toBeNull()
    expect(parseSiweMessage('')).toBeNull()
  })
})

describe('POST /v1/auth/wallet/nonce', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  it('should return a nonce and SIWE message for a valid address', async () => {
    const app = await createApp()
    const wallet = Wallet.createRandom()

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/wallet/nonce',
      payload: { address: wallet.address },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.nonce).toMatch(/^[0-9a-f]{64}$/)
    expect(body.message).toContain('attestara.ai wants you to sign in with your Ethereum account:')
    expect(body.message).toContain(wallet.address)
    expect(body.message).toContain('Sign in to Attestara')
  })

  it('should reject an invalid Ethereum address', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/wallet/nonce',
      payload: { address: 'not-an-address' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /v1/auth/wallet/verify', () => {
  beforeEach(async () => {
    await clearAllStores()
  })

  it('should create user and return tokens for valid signature', async () => {
    const app = await createApp()
    const wallet = Wallet.createRandom()
    const { message, signature } = await getNonceAndSign(app, wallet)

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/wallet/verify',
      payload: { message, signature },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.accessToken).toBeDefined()
    expect(body.refreshToken).toBeDefined()
    expect(body.expiresIn).toBe(900)
    expect(body.user.walletAddress).toBe(wallet.address)
    expect(body.user.orgId).toBeDefined()
    expect(body.user.role).toBe('owner')
  })

  it('should return 401 for invalid signature', async () => {
    const app = await createApp()
    const wallet = Wallet.createRandom()
    const { message } = await getNonceAndSign(app, wallet)

    // Use a different wallet to sign (wrong private key)
    const wrongWallet = Wallet.createRandom()
    const badSignature = await wrongWallet.signMessage(message)

    // Need a fresh nonce since the first one was consumed in getNonceAndSign's verify attempt
    // Actually getNonceAndSign only calls /nonce, not /verify, so the nonce is still stored.
    // But validateSiweMessage consumed the nonce. Let's get a new nonce.
    const { message: msg2 } = await getNonceAndSign(app, wallet)
    const badSig2 = await wrongWallet.signMessage(msg2)

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/wallet/verify',
      payload: { message: msg2, signature: badSig2 },
    })

    expect(res.statusCode).toBe(401)
    const body = JSON.parse(res.payload)
    expect(body.code).toBe('ADDRESS_MISMATCH')
  })

  it('should return 401 for unknown (never-stored) nonce', async () => {
    const app = await createApp()
    const wallet = Wallet.createRandom()

    // Build a message with a nonce that was never stored in Redis
    const nonce = generateNonce()
    const message = createSiweMessage({
      domain: SIWE_DOMAIN,
      address: wallet.address,
      statement: SIWE_STATEMENT,
      uri: SIWE_URI,
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
    expect(body.message).toContain('Invalid or expired nonce')
  })

  it('should return 401 for wrong domain', async () => {
    const app = await createApp()
    const wallet = Wallet.createRandom()

    // Create a nonce manually and store it in Redis
    const nonce = generateNonce()
    await storeNonce(nonce, wallet.address)

    // Build a message with a wrong domain
    const message = createSiweMessage({
      domain: 'evil.com',
      address: wallet.address,
      statement: SIWE_STATEMENT,
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

  it('should return same user for repeated wallet auth (no duplicates)', async () => {
    const app = await createApp()
    const wallet = Wallet.createRandom()

    // First auth
    const first = await getNonceAndSign(app, wallet)
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/wallet/verify',
      payload: { message: first.message, signature: first.signature },
    })
    expect(res1.statusCode).toBe(200)
    const body1 = JSON.parse(res1.payload)

    // Second auth (new nonce)
    const second = await getNonceAndSign(app, wallet)
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/wallet/verify',
      payload: { message: second.message, signature: second.signature },
    })
    expect(res2.statusCode).toBe(200)
    const body2 = JSON.parse(res2.payload)

    // Same user ID, not duplicated
    expect(body1.user.id).toBe(body2.user.id)
    expect(body1.user.orgId).toBe(body2.user.orgId)
  })

  it('should return JWT tokens with correct claims', async () => {
    const app = await createApp()
    const wallet = Wallet.createRandom()
    const { message, signature } = await getNonceAndSign(app, wallet)

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/wallet/verify',
      payload: { message, signature },
    })

    const body = JSON.parse(res.payload)

    // Decode access token
    const accessPayload = jwt.verify(body.accessToken, JWT_SECRET) as any
    expect(accessPayload.sub).toBe(body.user.id)
    expect(accessPayload.orgId).toBe(body.user.orgId)
    expect(accessPayload.role).toBe('owner')
    expect(accessPayload.type).toBe('access')

    // Decode refresh token
    const refreshPayload = jwt.verify(body.refreshToken, JWT_SECRET) as any
    expect(refreshPayload.sub).toBe(body.user.id)
    expect(refreshPayload.type).toBe('refresh')
  })

  it('should return 401 for completely invalid SIWE message format', async () => {
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/wallet/verify',
      payload: { message: 'this is not a SIWE message', signature: '0x1234' },
    })

    expect(res.statusCode).toBe(401)
    const body = JSON.parse(res.payload)
    expect(body.code).toBe('SIWE_VALIDATION_FAILED')
  })
})
