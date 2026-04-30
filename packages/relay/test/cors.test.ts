import { describe, it, expect } from 'vitest'
import { buildServer } from '../src/server.js'

describe('CORS allowlist enforcement', () => {
  it('disallowed origin receives no access-control-allow-origin header', async () => {
    const app = await buildServer({
      logger: false,
      corsOrigin: ['https://allowed.example.com'],
    })

    const res = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://evil.example.com',
        'access-control-request-method': 'GET',
      },
    })

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
    await app.close()
  })

  it('allowed origin receives reflected access-control-allow-origin header', async () => {
    const app = await buildServer({
      logger: false,
      corsOrigin: ['https://allowed.example.com'],
    })

    const res = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://allowed.example.com',
        'access-control-request-method': 'GET',
      },
    })

    expect(res.headers['access-control-allow-origin']).toBe('https://allowed.example.com')
    await app.close()
  })

  it('multi-origin allowlist reflects each listed origin', async () => {
    const app = await buildServer({
      logger: false,
      corsOrigin: ['https://a.example.com', 'https://b.example.com'],
    })

    const resA = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: 'https://a.example.com', 'access-control-request-method': 'GET' },
    })
    const resB = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: 'https://b.example.com', 'access-control-request-method': 'GET' },
    })
    const resC = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: 'https://c.example.com', 'access-control-request-method': 'GET' },
    })

    expect(resA.headers['access-control-allow-origin']).toBe('https://a.example.com')
    expect(resB.headers['access-control-allow-origin']).toBe('https://b.example.com')
    expect(resC.headers['access-control-allow-origin']).toBeUndefined()
    await app.close()
  })
})

describe('CORS config parsing', () => {
  it('parses comma-separated CORS_ORIGIN into string[]', async () => {
    const prev = process.env.CORS_ORIGIN
    process.env.CORS_ORIGIN = 'https://a.example.com, https://b.example.com ,https://c.example.com'
    try {
      const { loadConfig } = await import('../src/config.js')
      const cfg = loadConfig()
      expect(cfg.CORS_ORIGIN).toEqual([
        'https://a.example.com',
        'https://b.example.com',
        'https://c.example.com',
      ])
    } finally {
      if (prev === undefined) delete process.env.CORS_ORIGIN
      else process.env.CORS_ORIGIN = prev
    }
  })

  it('fails to load config when NODE_ENV=production and CORS_ORIGIN is unset', async () => {
    const prevEnv = process.env.NODE_ENV
    const prevOrigin = process.env.CORS_ORIGIN
    process.env.NODE_ENV = 'production'
    delete process.env.CORS_ORIGIN
    try {
      const { loadConfig } = await import('../src/config.js')
      expect(() => loadConfig()).toThrow(/CORS_ORIGIN/)
    } finally {
      process.env.NODE_ENV = prevEnv
      if (prevOrigin !== undefined) process.env.CORS_ORIGIN = prevOrigin
    }
  })
})
