import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionManager } from '../src/negotiation/index.js'

// Mock fetch for relay mode
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('SessionManager', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('local mode (no relay)', () => {
    it('creates a session locally', async () => {
      const manager = new SessionManager()
      const session = await manager.create({
        initiatorAgentId: 'did:ethr:0x111',
        counterpartyAgentId: 'did:ethr:0x222',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
      })

      expect(session.id).toBeTruthy()
      expect(session.status).toBe('active')
    })

    it('lists sessions', async () => {
      const manager = new SessionManager()
      await manager.create({
        initiatorAgentId: 'did:ethr:0x111',
        counterpartyAgentId: 'did:ethr:0x222',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
      })

      const sessions = await manager.list()
      expect(sessions.length).toBeGreaterThanOrEqual(1)
    })

    it('gets a session by ID', async () => {
      const manager = new SessionManager()
      const created = await manager.create({
        initiatorAgentId: 'did:ethr:0x111',
        counterpartyAgentId: 'did:ethr:0x222',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
      })

      const fetched = await manager.get(created.id)
      expect(fetched).toBeTruthy()
      expect(fetched?.id).toBe(created.id)
    })

    it('returns undefined for non-existent session', async () => {
      const manager = new SessionManager()
      const result = await manager.get('nonexistent')
      expect(result).toBeUndefined()
    })
  })
})
