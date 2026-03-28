import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { WebhookService } from '../../src/services/webhook.service.js'
import { clearAllStores } from '../helpers/db-cleanup.js'
import { getPrisma } from '../../src/utils/prisma.js'

describe('WebhookService', () => {
  const service = new WebhookService()

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

  describe('register', () => {
    it('should return a webhook view and a raw secret', async () => {
      const { webhook, secret } = await service.register('org-1', 'https://example.com/hook', ['agent.created'])

      expect(webhook.id).toBeDefined()
      expect(webhook.orgId).toBe('org-1')
      expect(webhook.url).toBe('https://example.com/hook')
      expect(webhook.events).toEqual(['agent.created'])
      expect(webhook.active).toBe(true)
      expect(webhook.createdAt).toBeDefined()

      expect(secret).toMatch(/^whsec_[0-9a-f]{64}$/)
    })

    it('should not expose secrets in the webhook view', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com/hook', ['agent.created'])

      expect(webhook).not.toHaveProperty('rawSecretEncrypted')
      expect(webhook).not.toHaveProperty('secretHash')
    })

    it('should generate unique ids and secrets for each registration', async () => {
      const r1 = await service.register('org-1', 'https://a.example.com', ['event.a'])
      const r2 = await service.register('org-1', 'https://b.example.com', ['event.b'])

      expect(r1.webhook.id).not.toBe(r2.webhook.id)
      expect(r1.secret).not.toBe(r2.secret)
    })
  })

  describe('listByOrg', () => {
    it('should return webhooks for the given org only', async () => {
      await service.register('org-1', 'https://a.example.com', ['event.a'])
      await service.register('org-1', 'https://b.example.com', ['event.b'])
      await service.register('org-2', 'https://c.example.com', ['event.c'])

      const org1 = await service.listByOrg('org-1')
      expect(org1).toHaveLength(2)
      expect(org1.every(w => w.orgId === 'org-1')).toBe(true)
    })

    it('should return empty array when org has no webhooks', async () => {
      expect(await service.listByOrg('unknown-org')).toEqual([])
    })

    it('should not include secrets in list results', async () => {
      await service.register('org-1', 'https://example.com', ['event'])
      const list = await service.listByOrg('org-1')
      expect(list[0]).not.toHaveProperty('rawSecretEncrypted')
      expect(list[0]).not.toHaveProperty('secretHash')
    })
  })

  describe('deactivate', () => {
    it('should set active to false and return true', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['event'])
      const result = await service.deactivate(webhook.id, 'org-1')

      expect(result).toBe(true)
      const list = await service.listByOrg('org-1')
      expect(list[0].active).toBe(false)
    })

    it('should return false for nonexistent webhook', async () => {
      expect(await service.deactivate('nonexistent', 'org-1')).toBe(false)
    })

    it('should return false when orgId does not match', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['event'])
      const result = await service.deactivate(webhook.id, 'org-2')

      expect(result).toBe(false)
      // Should still be active for org-1
      const list = await service.listByOrg('org-1')
      expect(list[0].active).toBe(true)
    })
  })

  describe('deliver', () => {
    it('should create a delivery record with status pending', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['agent.created'])
      const payload = { agentId: 'agent-123' }

      const delivery = await service.deliver(webhook.id, 'agent.created', payload)

      expect(delivery).not.toBeNull()
      expect(delivery!.id).toBeDefined()
      expect(delivery!.webhookId).toBe(webhook.id)
      expect(delivery!.event).toBe('agent.created')
      expect(delivery!.payload).toEqual(payload)
      expect(delivery!.status).toBe('pending')
      expect(delivery!.attempts).toBe(1)
      expect(delivery!.lastAttemptedAt).toBeDefined()
      expect(delivery!.deliveredAt).toBeNull()
      expect(delivery!.createdAt).toBeDefined()
    })

    it('should return null for a nonexistent webhook', async () => {
      const result = await service.deliver('nonexistent', 'agent.created', {})
      expect(result).toBeNull()
    })

    it('should accumulate multiple delivery records', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['event'])
      await service.deliver(webhook.id, 'event', { n: 1 })
      await service.deliver(webhook.id, 'event', { n: 2 })

      const history = (await service.getDeliveryHistory(webhook.id, 'org-1'))!
      expect(history).toHaveLength(2)
    })
  })

  describe('getDeliveryHistory', () => {
    it('should return deliveries for a webhook', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['event'])
      await service.deliver(webhook.id, 'event', { x: 1 })

      const history = await service.getDeliveryHistory(webhook.id, 'org-1')
      expect(history).toHaveLength(1)
      expect(history![0].event).toBe('event')
    })

    it('should return empty array when no deliveries exist', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['event'])
      expect(await service.getDeliveryHistory(webhook.id, 'org-1')).toEqual([])
    })

    it('should return null when webhook does not belong to org', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['event'])
      expect(await service.getDeliveryHistory(webhook.id, 'org-2')).toBeNull()
    })

    it('should return null for nonexistent webhook', async () => {
      expect(await service.getDeliveryHistory('nonexistent', 'org-1')).toBeNull()
    })
  })

  describe('signPayload', () => {
    it('should produce a valid HMAC-SHA256 signature', async () => {
      const { webhook, secret } = await service.register('org-1', 'https://example.com', ['event'])
      const payload = { data: 'hello world' }

      const sig = await service.signPayload(webhook.id, payload)

      expect(sig).not.toBeNull()
      // Verify: recompute with the raw secret
      const expected = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
      expect(sig).toBe(expected)
    })

    it('should produce different signatures for different payloads', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['event'])

      const sig1 = await service.signPayload(webhook.id, { a: 1 })
      const sig2 = await service.signPayload(webhook.id, { a: 2 })

      expect(sig1).not.toBe(sig2)
    })

    it('should return null for nonexistent webhook', async () => {
      expect(await service.signPayload('nonexistent', { x: 1 })).toBeNull()
    })
  })

  describe('clearStores', () => {
    it('should remove all webhooks and deliveries', async () => {
      const { webhook } = await service.register('org-1', 'https://example.com', ['event'])
      await service.deliver(webhook.id, 'event', {})

      await clearAllStores()

      expect(await service.listByOrg('org-1')).toEqual([])
      expect(await service.getDeliveryHistory(webhook.id, 'org-1')).toBeNull()
    })
  })
})
