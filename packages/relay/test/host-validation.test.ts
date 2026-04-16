import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../src/server.js'

describe('Host header validation (production)', () => {
  let originalEnv: string | undefined
  let originalHosts: string | undefined
  let originalCors: string | undefined

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV
    originalHosts = process.env.ALLOWED_HOSTS
    originalCors = process.env.CORS_ORIGIN
    process.env.NODE_ENV = 'production'
    process.env.ALLOWED_HOSTS = 'attestara.ai,relay.attestara.ai'
    // CORS_ORIGIN must also be set in production (fail-closed refine)
    if (!process.env.CORS_ORIGIN) {
      process.env.CORS_ORIGIN = 'https://attestara.ai'
    }
  })

  afterAll(() => {
    if (originalEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnv
    if (originalHosts === undefined) delete process.env.ALLOWED_HOSTS
    else process.env.ALLOWED_HOSTS = originalHosts
    if (originalCors === undefined) delete process.env.CORS_ORIGIN
    else process.env.CORS_ORIGIN = originalCors
  })

  it('rejects request with forged Host header', async () => {
    const app = await buildServer({ logger: false })
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { host: 'evil.com' },
      })
      expect(res.statusCode).toBe(400)
      expect(res.json()).toMatchObject({ code: 'INVALID_HOST' })
    } finally {
      await app.close()
    }
  })

  it('accepts request with allowed Host header', async () => {
    const app = await buildServer({ logger: false })
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { host: 'attestara.ai' },
      })
      expect(res.statusCode).toBe(200)
    } finally {
      await app.close()
    }
  })

  it('accepts second host in the allowlist', async () => {
    const app = await buildServer({ logger: false })
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { host: 'relay.attestara.ai' },
      })
      expect(res.statusCode).toBe(200)
    } finally {
      await app.close()
    }
  })
})

describe('Host validation config', () => {
  it('fails to load config when NODE_ENV=production and ALLOWED_HOSTS is unset', async () => {
    const prevEnv = process.env.NODE_ENV
    const prevHosts = process.env.ALLOWED_HOSTS
    const prevCors = process.env.CORS_ORIGIN
    process.env.NODE_ENV = 'production'
    delete process.env.ALLOWED_HOSTS
    if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = 'https://attestara.ai'
    try {
      const { loadConfig } = await import('../src/config.js')
      expect(() => loadConfig()).toThrow(/ALLOWED_HOSTS/)
    } finally {
      if (prevEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = prevEnv
      if (prevHosts !== undefined) process.env.ALLOWED_HOSTS = prevHosts
      if (prevCors === undefined) delete process.env.CORS_ORIGIN
      else process.env.CORS_ORIGIN = prevCors
    }
  })

  it('parses comma-separated TRUSTED_PROXIES into string[]', async () => {
    const prev = process.env.TRUSTED_PROXIES
    process.env.TRUSTED_PROXIES = '10.0.0.0/8, 192.168.0.0/16'
    try {
      const { loadConfig } = await import('../src/config.js')
      const cfg = loadConfig()
      expect(cfg.TRUSTED_PROXIES).toEqual(['10.0.0.0/8', '192.168.0.0/16'])
    } finally {
      if (prev === undefined) delete process.env.TRUSTED_PROXIES
      else process.env.TRUSTED_PROXIES = prev
    }
  })

  it('defaults TRUSTED_PROXIES to false when unset', async () => {
    const prev = process.env.TRUSTED_PROXIES
    delete process.env.TRUSTED_PROXIES
    try {
      const { loadConfig } = await import('../src/config.js')
      const cfg = loadConfig()
      expect(cfg.TRUSTED_PROXIES).toBe(false)
    } finally {
      if (prev !== undefined) process.env.TRUSTED_PROXIES = prev
    }
  })
})
