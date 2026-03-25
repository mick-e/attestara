import { describe, it, expect, beforeEach } from 'vitest'
import { CredentialService } from '../../src/services/credential.service.js'
import type { StoredCredential } from '../../src/services/credential.service.js'

describe('CredentialService', () => {
  const service = new CredentialService()

  beforeEach(() => {
    service.clearStores()
  })

  describe('create', () => {
    it('should create a credential and return it with id, orgId, revoked=false', () => {
      const result = service.create('org-1', {
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

    it('should store optional ipfsCid and credentialData when provided', () => {
      const result = service.create('org-1', {
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

    it('should return error for duplicate credential hash', () => {
      service.create('org-1', {
        agentId: 'agent-1',
        credentialHash: '0xdup',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      })

      const result = service.create('org-2', {
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

    it('should generate unique IDs for each credential', () => {
      const c1 = service.create('org-1', {
        agentId: 'agent-1',
        credentialHash: '0xhash-a',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      const c2 = service.create('org-1', {
        agentId: 'agent-1',
        credentialHash: '0xhash-b',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      expect(c1.id).not.toBe(c2.id)
    })
  })

  describe('listByOrg', () => {
    it('should return only credentials belonging to the given org', () => {
      service.create('org-1', { agentId: 'a1', credentialHash: '0xh1', schemaHash: '0xs', expiry: '2027-01-01T00:00:00.000Z' })
      service.create('org-1', { agentId: 'a1', credentialHash: '0xh2', schemaHash: '0xs', expiry: '2027-01-01T00:00:00.000Z' })
      service.create('org-2', { agentId: 'a2', credentialHash: '0xh3', schemaHash: '0xs', expiry: '2027-01-01T00:00:00.000Z' })

      const org1Creds = service.listByOrg('org-1')
      expect(org1Creds).toHaveLength(2)
      expect(org1Creds.every(c => c.orgId === 'org-1')).toBe(true)
    })

    it('should return empty array when org has no credentials', () => {
      expect(service.listByOrg('nonexistent-org')).toEqual([])
    })
  })

  describe('getById', () => {
    it('should return the credential when id and orgId match', () => {
      const created = service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xgetById',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      const fetched = service.getById(created.id, 'org-1')
      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
    })

    it('should return null when orgId does not match', () => {
      const created = service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xwrong-org',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      expect(service.getById(created.id, 'org-2')).toBeNull()
    })

    it('should return null for unknown id', () => {
      expect(service.getById('nonexistent', 'org-1')).toBeNull()
    })
  })

  describe('revoke', () => {
    it('should set revoked=true and return the credential', () => {
      const created = service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xrevoke',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      const result = service.revoke(created.id, 'org-1')
      expect(result).not.toBeNull()
      expect(result!.revoked).toBe(true)

      // Verify the change persists in store
      const fetched = service.getById(created.id, 'org-1')
      expect(fetched!.revoked).toBe(true)
    })

    it('should return null when orgId does not match', () => {
      const created = service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xrevoke-wrong-org',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      expect(service.revoke(created.id, 'org-2')).toBeNull()
    })

    it('should return null for unknown id', () => {
      expect(service.revoke('nonexistent', 'org-1')).toBeNull()
    })
  })

  describe('clearStores', () => {
    it('should empty all credentials so they cannot be retrieved', () => {
      const created = service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xclear',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      }) as StoredCredential

      service.clearStores()

      expect(service.listByOrg('org-1')).toEqual([])
      expect(service.getById(created.id, 'org-1')).toBeNull()

      // Hash should be reusable after clear
      const recreated = service.create('org-1', {
        agentId: 'a1',
        credentialHash: '0xclear',
        schemaHash: '0xs',
        expiry: '2027-01-01T00:00:00.000Z',
      })
      expect((recreated as StoredCredential).id).toBeDefined()
    })
  })
})
