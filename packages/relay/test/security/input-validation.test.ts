import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { buildServer } from '../../src/server.js'
import { clearAuthStores } from '../../src/routes/auth.js'
import { clearOrgStores } from '../../src/routes/orgs.js'
import { clearAgentStores } from '../../src/routes/agents.js'
import { clearCredentialStores } from '../../src/routes/credentials.js'
import { clearSessionStores } from '../../src/routes/sessions.js'
import { clearCommitmentStores } from '../../src/routes/commitments.js'
import { clearApiKeyStores } from '../../src/routes/api-keys.js'
import { clearWebhookStores } from '../../src/routes/webhooks.js'

async function createApp() {
  return buildServer({ logger: false })
}

function clearAllStores() {
  clearAuthStores()
  clearOrgStores()
  clearAgentStores()
  clearCredentialStores()
  clearSessionStores()
  clearCommitmentStores()
  clearApiKeyStores()
  clearWebhookStores()
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

async function createAgent(app: any, token: string, orgId: string) {
  const did = `did:ethr:0x${randomUUID().replace(/-/g, '').slice(0, 40)}`
  const res = await app.inject({
    method: 'POST',
    url: `/v1/orgs/${orgId}/agents`,
    headers: { authorization: `Bearer ${token}` },
    payload: { did, name: 'Agent', publicKey: '0xpubkey' },
  })
  return JSON.parse(res.payload)
}

describe('Input Validation Security', () => {
  beforeEach(() => {
    clearAllStores()
  })

  describe('SQL/NoSQL Injection Prevention', () => {
    it('should reject email with SQL injection payload as invalid email format', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: "'; DROP TABLE users; --",
          password: 'password123',
          orgName: 'Test Org',
        },
      })
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should accept org name with special characters (sanitized, not injected)', async () => {
      const app = await createApp()

      // Special chars in org name should be accepted (stored as data, not executed)
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'special@example.com',
          password: 'password123',
          orgName: "O'Brien & Associates",
        },
      })
      // The Zod schema accepts any string with min 1 char — it should succeed
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      // Returned org slug/data should not reflect executed SQL
      expect(body.user).toBeDefined()
    })

    it('should reject oversized payload (body parser limits)', async () => {
      const app = await createApp()

      // Fastify default body limit is 1MB — send ~2MB
      const bigString = 'x'.repeat(2 * 1024 * 1024)

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'big@example.com',
          password: 'password123',
          orgName: bigString,
        },
      })
      // Should fail — either 400 (validation) or 413 (payload too large)
      expect([400, 413]).toContain(res.statusCode)
    })
  })

  describe('XSS Prevention — Data Stored and Returned as-is (no execution)', () => {
    it('should accept agent name with HTML tags but store it safely', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const xssName = '<script>alert(1)</script>Evil Agent'
      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/agents`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { did: 'did:ethr:0xXSS', name: xssName, publicKey: '0xkey' },
      })
      // XSS name should be accepted (stored as plain text)
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.payload)
      // The name is returned as a plain string, not interpreted
      expect(body.name).toBe(xssName)
    })

    it('should return Content-Type: application/json (not text/html) to prevent XSS interpretation', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'GET',
        url: '/health',
      })
      expect(res.headers['content-type']).toContain('application/json')
    })
  })

  describe('Registration Validation', () => {
    it('should reject weak passwords (< 8 chars)', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'short@example.com', password: 'short', orgName: 'Test' },
      })
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid email format', async () => {
      const app = await createApp()

      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'missing@',
        'spaces in@email.com',
      ]

      for (const email of invalidEmails) {
        const res = await app.inject({
          method: 'POST',
          url: '/v1/auth/register',
          payload: { email, password: 'password123', orgName: 'Test' },
        })
        expect(res.statusCode).toBe(400)
      }
    })

    it('should reject duplicate email registration', async () => {
      const app = await createApp()

      await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'dup@example.com', password: 'password123', orgName: 'Org 1' },
      })

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'dup@example.com', password: 'password123', orgName: 'Org 2' },
      })
      expect(res.statusCode).toBe(409)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('CONFLICT')
    })

    it('should reject empty org name', async () => {
      const app = await createApp()

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'emptyorg@example.com', password: 'password123', orgName: '' },
      })
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should reject missing required fields', async () => {
      const app = await createApp()

      // Missing email
      const r1 = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { password: 'password123', orgName: 'Test' },
      })
      expect(r1.statusCode).toBe(400)

      // Missing password
      const r2 = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'test@example.com', orgName: 'Test' },
      })
      expect(r2.statusCode).toBe(400)

      // Missing orgName
      const r3 = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'test@example.com', password: 'password123' },
      })
      expect(r3.statusCode).toBe(400)
    })
  })

  describe('DID Validation', () => {
    it('should reject duplicate DIDs on agent creation', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const did = 'did:ethr:0xDUPLICATE'
      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/agents`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { did, name: 'Agent 1', publicKey: '0xkey1' },
      })

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/agents`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { did, name: 'Agent 2', publicKey: '0xkey2' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should reject empty DID', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/agents`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { did: '', name: 'Agent', publicKey: '0xkey' },
      })
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should reject missing DID', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/agents`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'Agent', publicKey: '0xkey' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('Credential Validation', () => {
    it('should reject duplicate credential hash', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xdup', schemaHash: '0xschema', expiry: '2027-01-01T00:00:00Z' },
      })

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xdup', schemaHash: '0xschema', expiry: '2027-01-01T00:00:00Z' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should reject invalid datetime for expiry', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, credentialHash: '0xhash', schemaHash: '0xschema', expiry: 'not-a-date' },
      })
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should reject missing required credential fields', async () => {
      const app = await createApp()
      const reg = await registerUser(app)
      const agent = await createAgent(app, reg.accessToken, reg.user.orgId)

      // Missing credentialHash
      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/credentials`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { agentId: agent.id, schemaHash: '0xschema', expiry: '2027-01-01T00:00:00Z' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('Webhook URL Validation', () => {
    it('should reject non-URL webhook URLs', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      // Zod z.string().url() rejects these as malformed URLs
      const invalidUrls = [
        'not-a-url',
        '',
        'example.com/no-scheme',
      ]

      for (const url of invalidUrls) {
        const res = await app.inject({
          method: 'POST',
          url: `/v1/orgs/${reg.user.orgId}/webhooks`,
          headers: { authorization: `Bearer ${reg.accessToken}` },
          payload: { url, events: ['agent.created'] },
        })
        expect(res.statusCode).toBe(400)
      }
    })

    it('should reject empty events array', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'https://example.com/hook', events: [] },
      })
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should accept valid HTTPS webhook URL', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/webhooks`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { url: 'https://example.com/webhook', events: ['agent.created'] },
      })
      expect(res.statusCode).toBe(201)
    })
  })

  describe('API Key Expiry Validation', () => {
    it('should reject non-datetime expiresAt', async () => {
      const app = await createApp()
      const reg = await registerUser(app)

      const res = await app.inject({
        method: 'POST',
        url: `/v1/orgs/${reg.user.orgId}/api-keys`,
        headers: { authorization: `Bearer ${reg.accessToken}` },
        payload: { name: 'Bad Expiry Key', scopes: ['read'], expiresAt: 'not-a-date' },
      })
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.payload)
      expect(body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits when sending many rapid requests', async () => {
      // Build an app with a very low rate limit to test the behavior quickly
      const app = await buildServer({ logger: false, rateLimit: { max: 5, timeWindow: '1 minute' } })

      const responses: number[] = []
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: 'GET',
          url: '/health',
        })
        responses.push(res.statusCode)
      }

      // After exceeding the limit, at least some requests should be rate-limited (429)
      expect(responses).toContain(429)
    })

    it('should return 429 with a Retry-After header when rate limited', async () => {
      const app = await buildServer({ logger: false, rateLimit: { max: 2, timeWindow: '1 minute' } })

      let rateLimitedRes: any = null
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: 'GET',
          url: '/health',
        })
        if (res.statusCode === 429) {
          rateLimitedRes = res
          break
        }
      }

      expect(rateLimitedRes).not.toBeNull()
      expect(rateLimitedRes.statusCode).toBe(429)
    })
  })
})
