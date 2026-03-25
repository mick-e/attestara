import { describe, it, expect, beforeEach } from 'vitest'
import { AgentService } from '../../src/services/agent.service.js'
import type { StoredAgent } from '../../src/services/agent.service.js'

describe('AgentService', () => {
  const service = new AgentService()

  beforeEach(() => {
    service.clearStores()
  })

  describe('create', () => {
    it('should create an agent with valid DID and return agent with id, orgId, status=active', () => {
      const agent = service.create('org-1', {
        did: 'did:ethr:0xAAA',
        name: 'Agent 1',
        publicKey: '0xpubkey123',
      }) as StoredAgent

      expect(agent.id).toBeDefined()
      expect(agent.orgId).toBe('org-1')
      expect(agent.did).toBe('did:ethr:0xAAA')
      expect(agent.name).toBe('Agent 1')
      expect(agent.status).toBe('active')
      expect(agent.publicKey).toBe('0xpubkey123')
      expect(agent.metadata).toEqual({})
      expect(agent.registeredTxHash).toBeNull()
      expect(agent.createdAt).toBeDefined()
    })

    it('should store optional metadata when provided', () => {
      const agent = service.create('org-1', {
        did: 'did:ethr:0xBBB',
        name: 'Agent 2',
        publicKey: '0xpubkey456',
        metadata: { env: 'production' },
      }) as StoredAgent

      expect(agent.metadata).toEqual({ env: 'production' })
    })

    it('should return error for duplicate DID', () => {
      service.create('org-1', { did: 'did:ethr:0xDUP', name: 'Agent A', publicKey: '0xkey' })
      const result = service.create('org-2', { did: 'did:ethr:0xDUP', name: 'Agent B', publicKey: '0xkey2' })

      expect(result).toEqual({
        error: 'DID is already registered',
        code: 'DID_ALREADY_REGISTERED',
      })
    })

    it('should generate unique IDs for each agent', () => {
      const a1 = service.create('org-1', { did: 'did:ethr:0x111', name: 'A1', publicKey: 'k1' }) as StoredAgent
      const a2 = service.create('org-1', { did: 'did:ethr:0x222', name: 'A2', publicKey: 'k2' }) as StoredAgent

      expect(a1.id).not.toBe(a2.id)
    })
  })

  describe('listByOrg', () => {
    it('should return only agents belonging to the given org', () => {
      service.create('org-1', { did: 'did:ethr:0x111', name: 'A1', publicKey: 'k1' })
      service.create('org-1', { did: 'did:ethr:0x222', name: 'A2', publicKey: 'k2' })
      service.create('org-2', { did: 'did:ethr:0x333', name: 'A3', publicKey: 'k3' })

      const org1Agents = service.listByOrg('org-1')
      expect(org1Agents).toHaveLength(2)
      expect(org1Agents.every(a => a.orgId === 'org-1')).toBe(true)
    })

    it('should return empty array when org has no agents', () => {
      expect(service.listByOrg('nonexistent-org')).toEqual([])
    })
  })

  describe('getById', () => {
    it('should return the agent when id and orgId match', () => {
      const created = service.create('org-1', { did: 'did:ethr:0xAAA', name: 'Agent', publicKey: 'k' }) as StoredAgent
      const fetched = service.getById(created.id, 'org-1')

      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
    })

    it('should return null when orgId does not match', () => {
      const created = service.create('org-1', { did: 'did:ethr:0xBBB', name: 'Agent', publicKey: 'k' }) as StoredAgent
      expect(service.getById(created.id, 'org-2')).toBeNull()
    })

    it('should return null for unknown agentId', () => {
      expect(service.getById('nonexistent', 'org-1')).toBeNull()
    })
  })

  describe('update', () => {
    it('should update agent name and reflect change', () => {
      const agent = service.create('org-1', { did: 'did:ethr:0xCCC', name: 'Original', publicKey: 'k' }) as StoredAgent
      const updated = service.update(agent.id, 'org-1', { name: 'Updated' })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('Updated')
    })

    it('should update agent metadata', () => {
      const agent = service.create('org-1', { did: 'did:ethr:0xDDD', name: 'Agent', publicKey: 'k' }) as StoredAgent
      const updated = service.update(agent.id, 'org-1', { metadata: { version: '2' } })

      expect(updated!.metadata).toEqual({ version: '2' })
    })

    it('should update agent status', () => {
      const agent = service.create('org-1', { did: 'did:ethr:0xEEE', name: 'Agent', publicKey: 'k' }) as StoredAgent
      const updated = service.update(agent.id, 'org-1', { status: 'inactive' })

      expect(updated!.status).toBe('inactive')
    })

    it('should return null when orgId does not match', () => {
      const agent = service.create('org-1', { did: 'did:ethr:0xFFF', name: 'Agent', publicKey: 'k' }) as StoredAgent
      expect(service.update(agent.id, 'org-2', { name: 'Hacked' })).toBeNull()
    })

    it('should return null for unknown agentId', () => {
      expect(service.update('nonexistent', 'org-1', { name: 'X' })).toBeNull()
    })
  })

  describe('deactivate', () => {
    it('should set agent status to deactivated', () => {
      const agent = service.create('org-1', { did: 'did:ethr:0x999', name: 'Agent', publicKey: 'k' }) as StoredAgent
      const result = service.deactivate(agent.id, 'org-1')

      expect(result).not.toBeNull()
      expect(result!.status).toBe('deactivated')
    })

    it('should return null when orgId does not match', () => {
      const agent = service.create('org-1', { did: 'did:ethr:0x888', name: 'Agent', publicKey: 'k' }) as StoredAgent
      expect(service.deactivate(agent.id, 'org-2')).toBeNull()
    })

    it('should return null for unknown agentId', () => {
      expect(service.deactivate('nonexistent', 'org-1')).toBeNull()
    })
  })

  describe('clearStores', () => {
    it('should empty all data so agents and DID index are cleared', () => {
      const agent = service.create('org-1', { did: 'did:ethr:0x777', name: 'Agent', publicKey: 'k' }) as StoredAgent

      service.clearStores()

      expect(service.listByOrg('org-1')).toEqual([])
      expect(service.getById(agent.id, 'org-1')).toBeNull()

      // DID should be available again after clear
      const recreated = service.create('org-1', { did: 'did:ethr:0x777', name: 'Agent', publicKey: 'k' })
      expect((recreated as StoredAgent).id).toBeDefined()
    })
  })
})
