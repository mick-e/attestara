import { describe, it, expect } from 'vitest'
import { buildServer } from '../src/server.js'

describe('Content-Security-Policy header', () => {
  it('relay /health response carries content-security-policy', async () => {
    const app = await buildServer()
    try {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.statusCode).toBe(200)
      const csp = res.headers['content-security-policy']
      expect(csp).toBeTruthy()
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
      expect(csp).toContain("base-uri 'self'")
    } finally {
      await app.close()
    }
  })
})
