import { describe, it, expect, beforeEach } from 'vitest'
import { OrgService } from '../../src/services/org.service.js'
import type { StoredUser, StoredOrg } from '../../src/services/org.service.js'
import { clearAllStores } from '../helpers/db-cleanup.js'

describe('OrgService', () => {
  const service = new OrgService()

  beforeEach(async () => {
    await clearAllStores()
  })

  describe('slugify', () => {
    it('should convert name to URL slug', () => {
      expect(service.slugify('Hello World')).toBe('hello-world')
    })

    it('should strip leading and trailing hyphens', () => {
      expect(service.slugify('--Hello--')).toBe('hello')
    })

    it('should collapse multiple non-alphanumeric chars', () => {
      expect(service.slugify('foo   bar!!!baz')).toBe('foo-bar-baz')
    })

    it('should handle single word', () => {
      expect(service.slugify('Attestara')).toBe('attestara')
    })
  })

  describe('createOrg', () => {
    it('should create an org with a slugified name', async () => {
      const org = await service.createOrg('Acme Corp')
      expect(org.id).toBeDefined()
      expect(org.name).toBe('Acme Corp')
      expect(org.slug).toContain('acme-corp')
      expect(org.plan).toBe('starter')
    })

    it('should use custom plan when provided', async () => {
      const org = await service.createOrg('Pro Org', 'pro')
      expect(org.plan).toBe('pro')
    })

    it('should generate unique IDs', async () => {
      const org1 = await service.createOrg('Org A')
      const org2 = await service.createOrg('Org B')
      expect(org1.id).not.toBe(org2.id)
    })
  })

  describe('getOrg', () => {
    it('should return org by ID', async () => {
      const org = await service.createOrg('Test Org')
      expect(await service.getOrg(org.id)).toEqual(org)
    })

    it('should return null for unknown ID', async () => {
      expect(await service.getOrg('nonexistent')).toBeNull()
    })
  })

  describe('updateOrg', () => {
    it('should update org name', async () => {
      const org = await service.createOrg('Old Name')
      const updated = await service.updateOrg(org.id, { name: 'New Name' })
      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('New Name')
    })

    it('should update org plan', async () => {
      const org = await service.createOrg('Test')
      const updated = await service.updateOrg(org.id, { plan: 'enterprise' })
      expect(updated!.plan).toBe('enterprise')
    })

    it('should return null for unknown org', async () => {
      expect(await service.updateOrg('nonexistent', { name: 'x' })).toBeNull()
    })
  })

  describe('createUser', () => {
    it('should create a user linked to an org', async () => {
      const org = await service.createOrg('Test Org')
      const user = await service.createUser(org.id, {
        email: 'alice@example.com',
        passwordHash: 'hash123',
        walletAddress: null,
        role: 'owner',
      })
      expect(user.id).toBeDefined()
      expect(user.orgId).toBe(org.id)
      expect(user.email).toBe('alice@example.com')
      expect(user.emailVerified).toBe(false)
    })

    it('should index user by email', async () => {
      const org = await service.createOrg('Test Org')
      const user = await service.createUser(org.id, {
        email: 'bob@example.com',
        passwordHash: 'hash',
        walletAddress: null,
        role: 'member',
      })
      expect(await service.getUserByEmail('bob@example.com')).toEqual(user)
    })

    it('should index user by wallet address', async () => {
      const org = await service.createOrg('Test Org')
      const user = await service.createUser(org.id, {
        email: 'carol@example.com',
        passwordHash: 'hash',
        walletAddress: '0xABCD',
        role: 'owner',
      })
      expect(await service.getUserByWallet('0xABCD')).toEqual(user)
    })

    it('should not index wallet when null', async () => {
      const org = await service.createOrg('Test Org')
      await service.createUser(org.id, {
        email: 'no-wallet@example.com',
        passwordHash: 'hash',
        walletAddress: null,
        role: 'member',
      })
      expect(await service.getUserByWallet('anything')).toBeNull()
    })

    it('should add user to orgMembers', async () => {
      const org = await service.createOrg('Test Org')
      const user = await service.createUser(org.id, {
        email: 'member@example.com',
        passwordHash: 'hash',
        walletAddress: null,
        role: 'member',
      })
      expect(await service.listMembers(org.id)).toContain(user.id)
    })
  })

  describe('getUserByEmail', () => {
    it('should return null for unknown email', async () => {
      expect(await service.getUserByEmail('unknown@example.com')).toBeNull()
    })
  })

  describe('getUserByWallet', () => {
    it('should return null for unknown wallet', async () => {
      expect(await service.getUserByWallet('0x0000')).toBeNull()
    })
  })

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const org = await service.createOrg('Test Org')
      const user = await service.createUser(org.id, {
        email: 'dan@example.com',
        passwordHash: 'hash',
        walletAddress: null,
        role: 'owner',
      })
      expect(await service.getUserById(user.id)).toEqual(user)
    })

    it('should return null for unknown ID', async () => {
      expect(await service.getUserById('nonexistent')).toBeNull()
    })
  })

  describe('listMembers', () => {
    it('should return empty array for unknown orgId', async () => {
      expect(await service.listMembers('no-org')).toEqual([])
    })

    it('should return all member IDs for an org', async () => {
      const org = await service.createOrg('Team')
      const u1 = await service.createUser(org.id, { email: 'a@x.com', passwordHash: 'h', walletAddress: null, role: 'owner' })
      const u2 = await service.createUser(org.id, { email: 'b@x.com', passwordHash: 'h', walletAddress: null, role: 'member' })
      const members = await service.listMembers(org.id)
      expect(members).toContain(u1.id)
      expect(members).toContain(u2.id)
      expect(members).toHaveLength(2)
    })
  })

  describe('addMember', () => {
    it('should add a userId to org members', async () => {
      const org = await service.createOrg('Test')
      const org2 = await service.createOrg('Other')
      // Create user in org2, then move to org via addMember
      const user = await service.createUser(org2.id, {
        email: 'move@example.com',
        passwordHash: 'hash',
        walletAddress: null,
        role: 'member',
      })
      await service.addMember(org.id, user.id)
      expect(await service.listMembers(org.id)).toContain(user.id)
    })
  })

  describe('createInvite', () => {
    it('should create an invite and return its ID', async () => {
      const org = await service.createOrg('Test')
      const inviteId = await service.createInvite(org.id, 'new@example.com', 'member')
      expect(inviteId).toBeDefined()
      expect(typeof inviteId).toBe('string')
    })

    it('should store invite data retrievable by ID', async () => {
      const org = await service.createOrg('Test')
      const inviteId = await service.createInvite(org.id, 'inv@example.com', 'admin')
      const invite = service.getInvite(inviteId)
      expect(invite).toEqual({ orgId: org.id, email: 'inv@example.com', role: 'admin' })
    })
  })

  describe('clearStores', () => {
    it('should clear all Maps', async () => {
      const org = await service.createOrg('Test')
      await service.createUser(org.id, { email: 'x@y.com', passwordHash: 'h', walletAddress: '0x1', role: 'owner' })
      await service.createInvite(org.id, 'z@y.com', 'member')

      await clearAllStores()

      expect(await service.getOrg(org.id)).toBeNull()
      expect(await service.getUserByEmail('x@y.com')).toBeNull()
      expect(await service.getUserByWallet('0x1')).toBeNull()
      expect(await service.listMembers(org.id)).toEqual([])
    })
  })

  describe('hasEmail', () => {
    it('should return true for registered email', async () => {
      const org = await service.createOrg('Test')
      await service.createUser(org.id, { email: 'exists@x.com', passwordHash: 'h', walletAddress: null, role: 'owner' })
      expect(await service.hasEmail('exists@x.com')).toBe(true)
    })

    it('should return false for unknown email', async () => {
      expect(await service.hasEmail('nope@x.com')).toBe(false)
    })
  })
})
