import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateApiKey,
  hashApiKey,
  extractBearerToken,
  extractApiKey,
} from '../../src/middleware/auth.js'
import type { FastifyRequest } from 'fastify'

const SECRET = 'test-secret-at-least-32-chars-long!!'
const PAYLOAD = {
  sub: 'user-1',
  orgId: 'org-1',
  email: 'test@example.com',
  role: 'owner',
}

function makeRequest(authHeader: string | undefined): FastifyRequest {
  return {
    headers: { authorization: authHeader },
  } as unknown as FastifyRequest
}

describe('Auth Middleware Unit Tests', () => {
  describe('Token Generation', () => {
    it('should generate different access and refresh tokens', () => {
      const access = generateAccessToken(PAYLOAD, SECRET)
      const refresh = generateRefreshToken(PAYLOAD, SECRET)
      expect(access).not.toBe(refresh)
    })

    it('should embed type=access in access tokens', () => {
      const token = generateAccessToken(PAYLOAD, SECRET)
      const decoded = jwt.decode(token) as any
      expect(decoded.type).toBe('access')
    })

    it('should embed type=refresh in refresh tokens', () => {
      const token = generateRefreshToken(PAYLOAD, SECRET)
      const decoded = jwt.decode(token) as any
      expect(decoded.type).toBe('refresh')
    })

    it('should embed sub, orgId, email, role in access tokens', () => {
      const token = generateAccessToken(PAYLOAD, SECRET)
      const decoded = jwt.decode(token) as any
      expect(decoded.sub).toBe(PAYLOAD.sub)
      expect(decoded.orgId).toBe(PAYLOAD.orgId)
      expect(decoded.email).toBe(PAYLOAD.email)
      expect(decoded.role).toBe(PAYLOAD.role)
    })

    it('should respect custom expiry — short-lived token expires quickly', () => {
      const token = generateAccessToken(PAYLOAD, SECRET, '1s')
      const decoded = jwt.decode(token) as any
      // iat and exp should be within 2 seconds of each other
      expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(2)
    })

    it('should default access token expiry to 15 minutes', () => {
      const token = generateAccessToken(PAYLOAD, SECRET)
      const decoded = jwt.decode(token) as any
      const diffSeconds = decoded.exp - decoded.iat
      expect(diffSeconds).toBe(900) // 15 * 60
    })

    it('should default refresh token expiry to 7 days', () => {
      const token = generateRefreshToken(PAYLOAD, SECRET)
      const decoded = jwt.decode(token) as any
      const diffSeconds = decoded.exp - decoded.iat
      expect(diffSeconds).toBe(7 * 24 * 3600)
    })
  })

  describe('Token Verification', () => {
    it('should verify and return payload for valid token', () => {
      const token = generateAccessToken(PAYLOAD, SECRET)
      const payload = verifyToken(token, SECRET)
      expect(payload.sub).toBe(PAYLOAD.sub)
      expect(payload.orgId).toBe(PAYLOAD.orgId)
      expect(payload.type).toBe('access')
    })

    it('should throw on expired token', () => {
      const token = generateAccessToken(PAYLOAD, SECRET, '-1s')
      expect(() => verifyToken(token, SECRET)).toThrow()
    })

    it('should throw on tampered token payload', () => {
      const token = generateAccessToken(PAYLOAD, SECRET)
      // Replace the payload segment with a base64-encoded tampered payload
      const parts = token.split('.')
      const tamperedPayload = Buffer.from(JSON.stringify({ ...PAYLOAD, role: 'admin', type: 'access' })).toString('base64url')
      const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`
      expect(() => verifyToken(tampered, SECRET)).toThrow()
    })

    it('should throw on wrong secret', () => {
      const token = generateAccessToken(PAYLOAD, SECRET)
      expect(() => verifyToken(token, 'different-secret-at-least-32-chars!!')).toThrow()
    })

    it('should throw on completely invalid token string', () => {
      expect(() => verifyToken('not.a.jwt', SECRET)).toThrow()
      expect(() => verifyToken('', SECRET)).toThrow()
    })
  })

  describe('API Key Generation', () => {
    it('should generate key with ac_ prefix', () => {
      const { raw } = generateApiKey()
      expect(raw).toMatch(/^ac_[0-9a-f]{64}$/)
    })

    it('should return different raw key and hash', () => {
      const { raw, hash } = generateApiKey()
      expect(raw).not.toBe(hash)
    })

    it('should produce consistent hash for same key', () => {
      const { raw, hash } = generateApiKey()
      const rehashedHash = hashApiKey(raw)
      expect(rehashedHash).toBe(hash)
    })

    it('should generate unique keys on each call', () => {
      const key1 = generateApiKey()
      const key2 = generateApiKey()
      expect(key1.raw).not.toBe(key2.raw)
      expect(key1.hash).not.toBe(key2.hash)
    })

    it('should produce different hashes for different keys', () => {
      const hash1 = hashApiKey('ac_' + 'a'.repeat(64))
      const hash2 = hashApiKey('ac_' + 'b'.repeat(64))
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Header Extraction — extractBearerToken', () => {
    it('should extract Bearer token from Authorization header', () => {
      const req = makeRequest('Bearer mytoken123')
      expect(extractBearerToken(req)).toBe('mytoken123')
    })

    it('should return null for missing Authorization header', () => {
      const req = makeRequest(undefined)
      expect(extractBearerToken(req)).toBeNull()
    })

    it('should return null for non-Bearer auth scheme', () => {
      const req = makeRequest('Basic dXNlcjpwYXNz')
      expect(extractBearerToken(req)).toBeNull()
    })

    it('should return null for ApiKey auth scheme', () => {
      const req = makeRequest('ApiKey ac_' + 'a'.repeat(64))
      expect(extractBearerToken(req)).toBeNull()
    })

    it('should return empty string when Bearer has empty token', () => {
      const req = makeRequest('Bearer ')
      // "Bearer " — slice(7) yields ''
      expect(extractBearerToken(req)).toBe('')
    })
  })

  describe('Header Extraction — extractApiKey', () => {
    it('should extract ApiKey token with ac_ prefix', () => {
      const key = 'ac_' + 'f'.repeat(64)
      const req = makeRequest(`ApiKey ${key}`)
      expect(extractApiKey(req)).toBe(key)
    })

    it('should return null for missing Authorization header', () => {
      const req = makeRequest(undefined)
      expect(extractApiKey(req)).toBeNull()
    })

    it('should return null for Bearer auth scheme', () => {
      const req = makeRequest('Bearer sometoken')
      expect(extractApiKey(req)).toBeNull()
    })

    it('should return null for API key without ac_ prefix', () => {
      const req = makeRequest('ApiKey invalid_key_without_prefix')
      expect(extractApiKey(req)).toBeNull()
    })

    it('should return null for empty ApiKey value', () => {
      const req = makeRequest('ApiKey ')
      // empty string doesn't start with 'ac_'
      expect(extractApiKey(req)).toBeNull()
    })
  })
})
