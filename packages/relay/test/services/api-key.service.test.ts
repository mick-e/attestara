import { describe, it, expect, beforeEach } from 'vitest'
import { ApiKeyService } from '../../src/services/api-key.service.js'
import { clearAllStores } from '../helpers/db-cleanup.js'
import { getPrisma } from '../../src/utils/prisma.js'

describe('ApiKeyService', () => {
  const service = new ApiKeyService()

  beforeEach(async () => {
    await clearAllStores()
    // Create FK parent orgs used across tests
    const db = getPrisma()
    await db.organisation.createMany({
      data: [
        { id: 'org-1', name: 'Test Org 1', slug: 'test-org-1', plan: 'starter' },
        { id: 'org-2', name: 'Test Org 2', slug: 'test-org-2', plan: 'starter' },
      ],
    })
  })

  describe('create', () => {
    it('should return a raw key and stored api key', async () => {
      const { apiKey, rawKey } = await service.create('org-1', 'My Key', ['read'])

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

    it('should generate unique ids and hashes for different keys', async () => {
      const r1 = await service.create('org-1', 'Key 1', ['read'])
      const r2 = await service.create('org-1', 'Key 2', ['write'])

      expect(r1.apiKey.id).not.toBe(r2.apiKey.id)
      expect(r1.apiKey.keyHash).not.toBe(r2.apiKey.keyHash)
      expect(r1.rawKey).not.toBe(r2.rawKey)
    })

    it('should store expiresAt when provided', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString()
      const { apiKey } = await service.create('org-1', 'Expiring Key', ['read'], expiresAt)

      expect(apiKey.expiresAt).toBe(expiresAt)
    })

    it('should default expiresAt to null when not provided', async () => {
      const { apiKey } = await service.create('org-1', 'No Expiry', [])
      expect(apiKey.expiresAt).toBeNull()
    })
  })

  describe('listByOrg', () => {
    it('should return all keys for a given org', async () => {
      await service.create('org-1', 'Key A', ['read'])
      await service.create('org-1', 'Key B', ['write'])
      await service.create('org-2', 'Key C', ['read'])

      const org1Keys = await service.listByOrg('org-1')
      expect(org1Keys).toHaveLength(2)
      expect(org1Keys.every(k => k.orgId === 'org-1')).toBe(true)
    })

    it('should return empty array when org has no keys', async () => {
      expect(await service.listByOrg('nonexistent-org')).toEqual([])
    })

    it('should not include raw key in listed results', async () => {
      await service.create('org-1', 'Key A', ['read'])
      const keys = await service.listByOrg('org-1')
      expect(keys[0]).not.toHaveProperty('rawKey')
    })
  })

  describe('revoke', () => {
    it('should delete the key and return true', async () => {
      const { apiKey } = await service.create('org-1', 'To Revoke', ['read'])
      const result = await service.revoke(apiKey.id, 'org-1')

      expect(result).toBe(true)
      expect(await service.listByOrg('org-1')).toHaveLength(0)
    })

    it('should return false when key does not exist', async () => {
      const result = await service.revoke('nonexistent-id', 'org-1')
      expect(result).toBe(false)
    })

    it('should return false when orgId does not match', async () => {
      const { apiKey } = await service.create('org-1', 'Key', ['read'])
      const result = await service.revoke(apiKey.id, 'org-2')

      expect(result).toBe(false)
      // Key should still exist for org-1
      expect(await service.listByOrg('org-1')).toHaveLength(1)
    })
  })

  describe('validateByHash', () => {
    it('should return the key when hash matches', async () => {
      const { apiKey, rawKey } = await service.create('org-1', 'Valid Key', ['read'])

      // Import hashApiKey to compute the hash for lookup
      const { createHash } = require('crypto')
      const hash = createHash('sha256').update(rawKey).digest('hex')

      const found = await service.validateByHash(hash)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(apiKey.id)
    })

    it('should update lastUsedAt on successful validation', async () => {
      const { rawKey } = await service.create('org-1', 'Key', ['read'])

      const { createHash } = require('crypto')
      const hash = createHash('sha256').update(rawKey).digest('hex')

      const before = Date.now()
      const found = await service.validateByHash(hash)
      const after = Date.now()

      expect(found).not.toBeNull()
      expect(found!.lastUsedAt).not.toBeNull()
      const lastUsedMs = new Date(found!.lastUsedAt!).getTime()
      expect(lastUsedMs).toBeGreaterThanOrEqual(before)
      expect(lastUsedMs).toBeLessThanOrEqual(after)
    })

    it('should return null when hash does not match', async () => {
      const result = await service.validateByHash('nonexistent-hash')
      expect(result).toBeNull()
    })

    it('should return null for expired key', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString()
      const { rawKey } = await service.create('org-1', 'Expired Key', ['read'], pastDate)

      const { createHash } = require('crypto')
      const hash = createHash('sha256').update(rawKey).digest('hex')

      const result = await service.validateByHash(hash)
      expect(result).toBeNull()
    })

    it('should return key when not yet expired', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString()
      const { rawKey } = await service.create('org-1', 'Future Key', ['read'], futureDate)

      const { createHash } = require('crypto')
      const hash = createHash('sha256').update(rawKey).digest('hex')

      const result = await service.validateByHash(hash)
      expect(result).not.toBeNull()
    })
  })

  describe('clearStores', () => {
    it('should remove all stored keys', async () => {
      await service.create('org-1', 'Key A', ['read'])
      await service.create('org-2', 'Key B', ['write'])

      await clearAllStores()

      expect(await service.listByOrg('org-1')).toEqual([])
      expect(await service.listByOrg('org-2')).toEqual([])
    })
  })
})
