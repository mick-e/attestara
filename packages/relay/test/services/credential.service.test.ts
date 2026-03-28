import { describe, it, expect, beforeEach } from 'vitest'
import { CredentialService } from '../../src/services/credential.service.js'
import type { StoredCredential } from '../../src/services/credential.service.js'
import { clearAllStores } from '../helpers/db-cleanup.js'
import { getPrisma } from '../../src/utils/prisma.js'

describe('CredentialService', () => {
  const service = new CredentialService()

  beforeEach(async () => {
    await clearAllStores()
    // Create FK parent orgs and agents used across tests
    const db = getPrisma()
    await db.organisation.createMany({
      data: [
        { id: 'org-1', name: 'Test Org 1', slug: 'test-org-1', plan: 'starter' },
        { id: 'org-2', name: 'Test Org 2', slug: 'test-org-2', plan: 'starter' },
      ],
    })
    await db.agent.createMany({
      data: [
        { id: 'agent-1', orgId: 'org-1', did: 'did:test:agent-1', name: 'Test Agent 1', publicKey: '0xtest1' },
        { id: 'agent-2', orgId: 'org-2', did: 'did:test:agent-2', name: 'Test Agent 2', publicKey: '0xtest2' },
        { id: 'a1', orgId: 'org-1', did: 'did:test:a1', name: 'Agent a1', publicKey: '0xtesta1' },
        { id: 'a2', orgId: 'org-2', did: 'did:test:a2', name: 'Agent a2', publicKey: '0xtesta2' },
      ],
    })
  })

  describe('create', () => {
    it('should create a credential and return it with id, orgId, revoked=false', async () => {
      const result = await service.create('org-1', {
        agentId: 'agent-1',
        credentialHash: '0xhash123',
        schemaHash: '0xschema456',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      expect(result.id).toBeDefined()
      expect(result.orgId).toBe('org-1')
      expect(result.agentId).toBe('agent-1')
      expect(result.credentialHash).toBe('0xhash123')
      expect(result.schemaHash).toBe('0xschema456')
      expect(result.expiry).toBe('2027-01-01T00:00:00.000Z')
      expect(result.revoked).toBe(false)
      expect(result.ipfsCid).toBeNull()
      expect(result.credentialDataCached).toBeNull()
      expect(result.registeredTxHash).toBeNull()
      expect(result.createdAt).toBeDefined()
    })

    it('should store optional ipfsCid and credentialData when provided', async () => {
      const result = await service.create('org-1', {
        agentId: 'agent-1',
        credentialHash: '0xhash-with-opts',
        schemaHash: '0xschema',
        expiry: '2027-01-01T00:00:00.000Z',
        ipfsCid: 'QmFoo',
        credentialData: { key: 'value' },
      }) as StoredCredential

      expect(result.ipfsCid).toBe('QmFoo')
      expect(result.credentialDataCached).toEqual({ key: 'value' })
    })

    it('should return error for duplicate credential hash', async () => {
      await service.create('org-1', {
        agentId: 'agent-1',
        credentialHash: '0xdup',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      })

      const result = await service.create('org-2', {
        agentId: 'agent-2',
        credentialHash: '0xdup',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      })

      expect(result).toEqual({
        error: 'Credential hash already exists',
        code: 'DUPLICATE_CREDENTIAL_HASH',
      })
    })

    it('should generate unique IDs for each credential', async () => {
      const c1 = await service.create('org-1', {
        agentId: 'agent-1',
        credentialHash: '0xhash-a',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      const c2 = await service.create('org-1', {
        agentId: 'agent-1',
        credentialHash: '0xhash-b',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      expect(c1.id).not.toBe(c2.id)
    })
  })

  describe('listByOrg', () => {
    it('should return only credentials belonging to the given org', async () => {
      await service.create('org-1', { agentId: 'a1', credentialHash: '0xh1', schemaHash: '0xs', expiry: '2027-01-01T00:00:00.000Z' })
      await service.create('org-1', { agentId: 'a1', credentialHash: '0xh2', schemaHash: '0xs', expiry: '2027-01-01T00:00:00.000Z' })
      await service.create('org-2', { agentId: 'a2', credentialHash: '0xh3', schemaHash: '0xs', expiry: '2027-01-01T00:00:00.000Z' })

      const org1Creds = await service.listByOrg('org-1')
      expect(org1Creds).toHaveLength(2)
      expect(org1Creds.every(c => c.orgId === 'org-1')).toBe(true)
    })

    it('should return empty array when org has no credentials', async () => {
      expect(await service.listByOrg('nonexistent-org')).toEqual([])
    })
  })

  describe('getById', () => {
    it('should return the credential when id and orgId match', async () => {
      const created = await service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xgetById',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      const fetched = await service.getById(created.id, 'org-1')
      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
    })

    it('should return null when orgId does not match', async () => {
      const created = await service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xwrong-org',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      expect(await service.getById(created.id, 'org-2')).toBeNull()
    })

    it('should return null for unknown id', async () => {
      expect(await service.getById('nonexistent', 'org-1')).toBeNull()
    })
  })

  describe('revoke', () => {
    it('should set revoked=true and return the credential', async () => {
      const created = await service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xrevoke',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      const result = await service.revoke(created.id, 'org-1')
      expect(result).not.toBeNull()
      expect(result!.revoked).toBe(true)

      // Verify the change persists in store
      const fetched = await service.getById(created.id, 'org-1')
      expect(fetched!.revoked).toBe(true)
    })

    it('should return null when orgId does not match', async () => {
      const created = await service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xrevoke-wrong-org',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      expect(await service.revoke(created.id, 'org-2')).toBeNull()
    })

    it('should return null for unknown id', async () => {
      expect(await service.revoke('nonexistent', 'org-1')).toBeNull()
    })
  })

  describe('clearStores', () => {
    it('should empty all credentials so they cannot be retrieved', async () => {
      const created = await service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xclear',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      await clearAllStores()

      expect(await service.listByOrg('org-1')).toEqual([])
      expect(await service.getById(created.id, 'org-1')).toBeNull()

      // Hash should be reusable after clear — recreate FK parents first
      const db = getPrisma()
      await db.organisation.create({ data: { id: 'org-1', name: 'Test Org 1', slug: 'test-org-1', plan: 'starter' } })
      await db.agent.create({ data: { id: 'a1', orgId: 'org-1', did: 'did:test:a1', name: 'Agent a1', publicKey: '0xtesta1' } })

      const recreated = await service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xclear',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      })
      expect((recreated as StoredCredential).id).toBeDefined()
    })
  })
})
