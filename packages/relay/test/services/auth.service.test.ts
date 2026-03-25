import { describe, it, expect } from 'vitest'
import { AuthService } from '../../src/services/auth.service.js'

describe('AuthService', () => {
  const service = new AuthService()

  it('should hash and verify a password with bcrypt', async () => {
    const hash = await service.hashPassword('test-password')
    expect(hash).not.toContain('test-password')
    expect(await service.verifyPassword('test-password', hash)).toBe(true)
    expect(await service.verifyPassword('wrong', hash)).toBe(false)
  })

  it('should generate access and refresh tokens', () => {
    const payload = { sub: 'user-1', orgId: 'org-1', email: 'a@b.com', role: 'owner' }
    const secret = 'test-secret-at-least-32-chars-long!!'
    const access = service.generateAccessToken(payload, secret)
    const refresh = service.generateRefreshToken(payload, secret)
    expect(access).toBeTruthy()
    expect(refresh).toBeTruthy()
    expect(access).not.toBe(refresh)
  })

  it('should verify a valid access token', () => {
    const payload = { sub: 'user-1', orgId: 'org-1', email: 'a@b.com', role: 'owner' }
    const secret = 'test-secret-at-least-32-chars-long!!'
    const token = service.generateAccessToken(payload, secret)
    const decoded = service.verifyToken(token, secret)
    expect(decoded.sub).toBe('user-1')
    expect(decoded.type).toBe('access')
  })

  it('should reject an invalid token', () => {
    const secret = 'test-secret-at-least-32-chars-long!!'
    expect(() => service.verifyToken('invalid', secret)).toThrow()
  })

  it('should reject a refresh token when expecting access', () => {
    const payload = { sub: 'user-1', orgId: 'org-1', email: 'a@b.com', role: 'owner' }
    const secret = 'test-secret-at-least-32-chars-long!!'
    const refresh = service.generateRefreshToken(payload, secret)
    const decoded = service.verifyToken(refresh, secret)
    expect(decoded.type).toBe('refresh')
  })
})
