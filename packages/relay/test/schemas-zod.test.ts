import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema, refreshSchema, walletNonceSchema } from '../src/schemas/auth.js'
import { createAgentSchema, updateAgentSchema, provisionDidSchema } from '../src/schemas/agent.js'
import { createCredentialSchema } from '../src/schemas/credential.js'
import { createSessionSchema, createTurnSchema } from '../src/schemas/session.js'
import { createCommitmentSchema } from '../src/schemas/commitment.js'
import { createOrgSchema, inviteSchema } from '../src/schemas/org.js'
import { createApiKeySchema } from '../src/schemas/api-key.js'
import { registerWebhookSchema } from '../src/schemas/webhook.js'
import { paginationQuery } from '../src/schemas/pagination.js'

describe('auth schemas', () => {
  it('validates register input', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'securepass',
      orgName: 'Test Org',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      orgName: 'Test Org',
    })
    expect(result.success).toBe(false)
  })

  it('validates login input', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'x' })
    expect(result.success).toBe(true)
  })

  it('validates wallet nonce', () => {
    const valid = walletNonceSchema.safeParse({ address: '0x' + 'aA'.repeat(20) })
    expect(valid.success).toBe(true)

    const invalid = walletNonceSchema.safeParse({ address: 'not-an-address' })
    expect(invalid.success).toBe(false)
  })
})

describe('agent schemas', () => {
  it('validates create agent with DID', () => {
    const result = createAgentSchema.safeParse({
      did: 'did:ethr:0x1234567890abcdef',
      name: 'test-agent',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid DID format', () => {
    const result = createAgentSchema.safeParse({
      did: 'invalid-did',
      name: 'test-agent',
    })
    expect(result.success).toBe(false)
  })

  it('validates provision DID', () => {
    const result = provisionDidSchema.safeParse({ name: 'agent-1' })
    expect(result.success).toBe(true)
  })
})

describe('session schemas', () => {
  it('validates create session', () => {
    const result = createSessionSchema.safeParse({
      initiatorAgentId: 'did:ethr:0x111',
      initiatorOrgId: 'org-1',
      counterpartyOrgId: 'org-2',
    })
    expect(result.success).toBe(true)
  })

  it('validates create turn', () => {
    const result = createTurnSchema.safeParse({
      agentId: 'did:ethr:0x111',
      terms: { value: 100000, currency: 'EUR' },
      proofType: 'MandateBound',
      proof: {},
      publicSignals: {},
      signature: 'sig-123',
    })
    expect(result.success).toBe(true)
  })
})

describe('commitment schema', () => {
  it('validates create commitment', () => {
    const result = createCommitmentSchema.safeParse({
      agreementHash: '0xabc',
      parties: ['did:ethr:0x111'],
      credentialHashes: ['0xcred1'],
      proofs: {},
      circuitVersions: ['1.0.0'],
    })
    expect(result.success).toBe(true)
  })
})

describe('org schemas', () => {
  it('validates create org', () => {
    const result = createOrgSchema.safeParse({ name: 'Acme Corp' })
    expect(result.success).toBe(true)
  })

  it('validates invite', () => {
    const result = inviteSchema.safeParse({ email: 'new@example.com' })
    expect(result.success).toBe(true)
  })
})

describe('api-key schema', () => {
  it('validates create API key', () => {
    const result = createApiKeySchema.safeParse({ name: 'CI Key' })
    expect(result.success).toBe(true)
  })
})

describe('webhook schema', () => {
  it('validates register webhook', () => {
    const result = registerWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['session.completed'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty events array', () => {
    const result = registerWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('pagination schema', () => {
  it('uses defaults', () => {
    const result = paginationQuery.parse({})
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(50)
    expect(result.sortOrder).toBe('desc')
  })

  it('coerces string numbers', () => {
    const result = paginationQuery.parse({ page: '3', pageSize: '10' })
    expect(result.page).toBe(3)
    expect(result.pageSize).toBe(10)
  })
})
