import { describe, it, expect, beforeEach } from 'vitest'
import { ApiKeyService } from '../../src/services/api-key.service.js'

describe('ApiKeyService', () => {
  const service = new ApiKeyService()

  beforeEach(() => {
    service.clearStores()
  })

  describe('create', () => {
    it('should return a raw key and stored api key', () => {
      const { apiKey, rawKey } = service.create('org-1', 'My Key', ['read'])

      expect(rawKey).toMatch(/^ac_[0-9a-f]{64}$/)
      expect(apiKey.id).toBeDefined()
      expect(apiKey.orgId).toBe('org-1')
      expect(apiKey.name).toBe('My Key')
      expect(apiKey.scopes).toEqual(['read'])
      expect(apiKey.keyHash).toBeDefined()
      expect(apiKey.keyHash).not.toBe(rawKey)
      expect(apiKey.lastUsedAt).toBeNull()
      expect(apiKey.expiresAt).toBeNull()
      expect(apiKey.createdAt).toBeDefined()
    })

    it('should generate unique ids and hashes for different keys', () => {
      const r1 = service.create('org-1', 'Key 1', ['read'])
      const r2 = service.create('org-1', 'Key 2', ['write'])

      expect(r1.apiKey.id).not.toBe(r2.apiKey.id)
      expect(r1.apiKey.keyHash).not.toBe(r2.apiKey.keyHash)
      expect(r1.rawKey).not.toBe(r2.rawKey)
    })

    it('should store expiresAt when provided', () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      const { apiKey } = service.create('org-1', 'Expiring Key', ['read'], expiresAt)

      expect(apiKey.expiresAt).toBe(expiresAt)
    })

    it('should default expiresAt to null when not provided', () => {
      const { apiKey } = service.create('org-1', 'No Expiry', [])
      expect(apiKey.expiresAt).toBeNull()
    })
  })

  describe('listByOrg', () => {
    it('should return all keys for a given org', () => {
      service.create('org-1', 'Key A', ['read'])
      service.create('org-1', 'Key B', ['write'])
      service.create('org-2', 'Key C', ['read'])

      const org1Keys = service.listByOrg('org-1')
      expect(org1Keys).toHaveLength(2)
      expect(org1Keys.every(k => k.orgId === 'org-1')).toBe(true)
    })

    it('should return empty array when org has no keys', () => {
      expect(service.listByOrg('nonexistent-org')).toEqual([])
    })

    it('should not include raw key in listed results', () => {
      service.create('org-1', 'Key A', ['read'])
      const keys = service.listByOrg('org-1')
      expect(keys[0]).not.toHaveProperty('rawKey')
    })
  })

  describe('revoke', () => {
    it('should delete the key and return true', () => {
      const { apiKey } = service.create('org-1', 'To Revoke', ['read'])
      const result = service.revoke(apiKey.id, 'org-1')

      expect(result).toBe(true)
      expect(service.listByOrg('org-1')).toHaveLength(0)
    })

    it('should return false when key does not exist', () => {
      const result = service.revoke('nonexistent-id', 'org-1')
      expect(result).toBe(false)
    })

    it('should return false when orgId does not match', () => {
      const { apiKey } = service.create('org-1', 'Key', ['read'])
      const result = service.revoke(apiKey.id, 'org-2')

      expect(result).toBe(false)
      // Key should still exist for org-1
      expect(service.listByOrg('org-1')).toHaveLength(1)
    })
  })

  describe('validateByHash', () => {
    it('should return the key when hash matches', () => {
      const { apiKey, rawKey } = service.create('org-1', 'Valid Key', ['read'])

      // Import hashApiKey to compute the hash for lookup
      const { createHash } = require('crypto')
      const hash = createHash('sha256').update(rawKey).digest('hex')

      const found = service.validateByHash(hash)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(apiKey.id)
    })

    it('should update lastUsedAt on successful validation', () => {
      const { rawKey } = service.create('org-1', 'Key', ['read'])

      const { createHash } = require('crypto')
      const hash = createHash('sha256').update(rawKey).digest('hex')

      const before = Date.now()
      const found = service.validateByHash(hash)
      const after = Date.now()

      expect(found).not.toBeNull()
      expect(found!.lastUsedAt).not.toBeNull()
      const lastUsedMs = new Date(found!.lastUsedAt!).getTime()
      expect(lastUsedMs).toBeGreaterThanOrEqual(before)
      expect(lastUsedMs).toBeLessThanOrEqual(after)
    })

    it('should return null when hash does not match', () => {
      const result = service.validateByHash('nonexistent-hash')
      expect(result).toBeNull()
    })

    it('should return null for expired key', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString()
      const { rawKey } = service.create('org-1', 'Expired Key', ['read'], pastDate)

      const { createHash } = require('crypto')
      const hash = createHash('sha256').update(rawKey).digest('hex')

      const result = service.validateByHash(hash)
      expect(result).toBeNull()
    })

    it('should return key when not yet expired', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString()
      const { rawKey } = service.create('org-1', 'Future Key', ['read'], futureDate)

      const { createHash } = require('crypto')
      const hash = createHash('sha256').update(rawKey).digest('hex')

      const result = service.validateByHash(hash)
      expect(result).not.toBeNull()
    })
  })

  describe('clearStores', () => {
    it('should remove all stored keys', () => {
      service.create('org-1', 'Key A', ['read'])
      service.create('org-2', 'Key B', ['write'])

      service.clearStores()

      expect(service.listByOrg('org-1')).toEqual([])
      expect(service.listByOrg('org-2')).toEqual([])
    })
  })
})
