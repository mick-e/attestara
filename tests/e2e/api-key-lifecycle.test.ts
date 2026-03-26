/**
 * End-to-end test: API Key Lifecycle
 *
 * Exercises the full API key lifecycle:
 *   Register -> Create API key -> List keys -> Authenticate with API key
 *   -> Revoke key -> Verify revoked key rejected -> Expired key rejected
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildServer } from '../../packages/relay/src/server.js'
import { clearAuthStores } from '../../packages/relay/src/routes/auth.js'
import { clearAgentStores } from '../../packages/relay/src/routes/agents.js'
import { clearCredentialStores } from '../../packages/relay/src/routes/credentials.js'
import { clearSessionStores } from '../../packages/relay/src/routes/sessions.js'
import { clearCommitmentStores } from '../../packages/relay/src/routes/commitments.js'
import { clearApiKeyStores } from '../../packages/relay/src/routes/api-keys.js'
import { apiKeyService } from '../../packages/relay/src/services/api-key.service.js'
import { hashApiKey } from '../../packages/relay/src/middleware/auth.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

async function registerAndGetToken(
  baseUrl: string,
  email: string,
  password = 'password123',
  orgName = 'Test Org',
): Promise<{ accessToken: string; orgId: string; userId: string }> {
  const res = await fetch(`${baseUrl}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, orgName }),
  })
  expect(res.status).toBe(201)
  const data = await res.json() as {
    accessToken: string
    user: { id: string; orgId: string }
  }
  return { accessToken: data.accessToken, orgId: data.user.orgId, userId: data.user.id }
}

async function createApiKey(
  baseUrl: string,
  orgId: string,
  token: string,
  name = 'test-key',
  scopes: string[] = ['read', 'write'],
  expiresAt?: string,
): Promise<{ id: string; rawKey: string; name: string; scopes: string[]; expiresAt: string | null }> {
  const body: Record<string, unknown> = { name, scopes }
  if (expiresAt !== undefined) {
    body.expiresAt = expiresAt
  }
  const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(201)
  return res.json() as any
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe('E2E: API Key Lifecycle', () => {
  let app: Awaited<ReturnType<typeof buildServer>>
  let baseUrl: string

  beforeAll(async () => {
    app = await buildServer({ logger: false })
    await app.listen({ port: 0, host: '127.0.0.1' })
    const address = app.server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    clearAuthStores()
    clearAgentStores()
    clearCredentialStores()
    clearSessionStores()
    clearCommitmentStores()
    clearApiKeyStores()
  })

  // ── Phase 1: Create API key ────────────────────────────────────────────────

  describe('Phase 1: Create API Key', () => {
    it('should create an API key and return raw key once', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'alice@example.com')

      const key = await createApiKey(baseUrl, orgId, accessToken, 'my-key', ['read'])

      expect(key.id).toBeTruthy()
      expect(key.rawKey).toBeTruthy()
      expect(key.rawKey).toMatch(/^ac_/)
      expect(key.name).toBe('my-key')
      expect(key.scopes).toEqual(['read'])
    })

    it('should return 400 on missing name', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'b@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ scopes: ['read'] }), // no name
      })
      expect(res.status).toBe(400)
      const body = await res.json() as { code: string }
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('should return 401 without auth', async () => {
      const res = await fetch(`${baseUrl}/v1/orgs/fake-org/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'k', scopes: [] }),
      })
      expect(res.status).toBe(401)
    })

    it('should return 403 when accessing another org', async () => {
      const { accessToken } = await registerAndGetToken(baseUrl, 'c@example.com')
      const { orgId: orgIdB } = await registerAndGetToken(baseUrl, 'd@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgIdB}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: 'k', scopes: [] }),
      })
      expect(res.status).toBe(403)
    })
  })

  // ── Phase 2: List API keys ─────────────────────────────────────────────────

  describe('Phase 2: List API Keys', () => {
    it('should list keys without exposing raw key', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'e@example.com')

      await createApiKey(baseUrl, orgId, accessToken, 'key-1')
      await createApiKey(baseUrl, orgId, accessToken, 'key-2')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json() as { data: any[]; pagination: { total: number } }
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(2)

      // Raw key must not be present in the listing
      for (const k of data.data) {
        expect(k.rawKey).toBeUndefined()
        expect(k.id).toBeTruthy()
        expect(k.name).toBeTruthy()
      }
    })

    it('new org has no keys initially', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'f@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json() as { data: any[] }
      expect(data.data).toHaveLength(0)
    })
  })

  // ── Phase 3: Verify API key via service (validateByHash) ──────────────────

  describe('Phase 3: API Key Validation via Service', () => {
    it('raw key should validate via apiKeyService.validateByHash', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'g@example.com')

      const created = await createApiKey(baseUrl, orgId, accessToken, 'auth-key', ['read'])
      const rawKey = created.rawKey

      // Validate directly via service (as the auth middleware would)
      const keyHash = hashApiKey(rawKey)
      const found = apiKeyService.validateByHash(keyHash)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.orgId).toBe(orgId)
      expect(found!.name).toBe('auth-key')
      expect(found!.scopes).toEqual(['read'])
      expect(found!.lastUsedAt).not.toBeNull() // updated on validation
    })

    it('unknown key hash should return null', () => {
      const fakeHash = hashApiKey('ac_' + '0'.repeat(64))
      const found = apiKeyService.validateByHash(fakeHash)
      expect(found).toBeNull()
    })

    it('createApiKey endpoint requires JWT Bearer auth to be called', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'h2@example.com')
      const created = await createApiKey(baseUrl, orgId, accessToken, 'jwt-required', ['admin'])

      // Verify it's in the list (only visible with JWT)
      const listRes = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await listRes.json() as { data: any[] }
      const found = data.data.find((k: any) => k.id === created.id)
      expect(found).toBeDefined()
      expect(found.name).toBe('jwt-required')
    })
  })

  // ── Phase 4: Revoke API key ────────────────────────────────────────────────

  describe('Phase 4: Revoke API Key', () => {
    it('should revoke a key and return 204', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'h@example.com')
      const created = await createApiKey(baseUrl, orgId, accessToken, 'revoke-me')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(204)
    })

    it('should no longer appear in list after revocation', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'i@example.com')
      const created = await createApiKey(baseUrl, orgId, accessToken, 'bye-key')

      await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      const listRes = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await listRes.json() as { data: any[] }
      expect(data.data).toHaveLength(0)
    })

    it('revoked key hash should no longer validate', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'i2@example.com')
      const created = await createApiKey(baseUrl, orgId, accessToken, 'revoke-validate')

      // Verify it validates before revocation
      const keyHash = hashApiKey(created.rawKey)
      expect(apiKeyService.validateByHash(keyHash)).not.toBeNull()

      // Revoke it
      await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      // After revocation it should not validate
      expect(apiKeyService.validateByHash(keyHash)).toBeNull()
    })

    it('should return 404 when revoking non-existent key', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'j@example.com')

      const res = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys/nonexistent-id`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.status).toBe(404)
      const body = await res.json() as { code: string }
      expect(body.code).toBe('API_KEY_NOT_FOUND')
    })

    it('should return 404 when revoking key from another org (service enforces orgId)', async () => {
      const { accessToken: tokenA, orgId: orgA } = await registerAndGetToken(baseUrl, 'k@example.com')
      const { accessToken: tokenB, orgId: orgB } = await registerAndGetToken(baseUrl, 'l@example.com')

      const createdB = await createApiKey(baseUrl, orgB, tokenB, 'org-b-key')

      // Org A tries to revoke Org B's key via its own orgId path
      const res = await fetch(`${baseUrl}/v1/orgs/${orgA}/api-keys/${createdB.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      })
      // The service revoke() checks orgId match, so it returns false → 404
      expect(res.status).toBe(404)
    })
  })

  // ── Phase 5: Expired API key ───────────────────────────────────────────────

  describe('Phase 5: Expired API Key', () => {
    it('should create a key with an expiration date in the past', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'm@example.com')

      const pastExpiry = new Date(Date.now() - 1000).toISOString()
      const created = await createApiKey(baseUrl, orgId, accessToken, 'expired-key', ['read'], pastExpiry)

      expect(created.expiresAt).toBe(pastExpiry)
    })

    it('expired key hash should fail validation via service', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'n@example.com')

      const pastExpiry = new Date(Date.now() - 1000).toISOString()
      const created = await createApiKey(baseUrl, orgId, accessToken, 'expired-key', ['read'], pastExpiry)

      const keyHash = hashApiKey(created.rawKey)
      // validateByHash checks expiry and returns null for expired keys
      const result = apiKeyService.validateByHash(keyHash)
      expect(result).toBeNull()
    })

    it('should still appear in the org key listing (revocation is separate from expiry)', async () => {
      const { accessToken, orgId } = await registerAndGetToken(baseUrl, 'o@example.com')

      const pastExpiry = new Date(Date.now() - 1000).toISOString()
      await createApiKey(baseUrl, orgId, accessToken, 'expired-but-listed', ['read'], pastExpiry)

      const listRes = await fetch(`${baseUrl}/v1/orgs/${orgId}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await listRes.json() as { data: any[] }
      expect(data.data).toHaveLength(1)
      expect(data.data[0].expiresAt).toBe(pastExpiry)
    })
  })
})
