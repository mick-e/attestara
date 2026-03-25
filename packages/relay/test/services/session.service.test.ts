import { describe, it, expect, beforeEach } from 'vitest'
import { SessionService } from '../../src/services/session.service.js'
import type { StoredSession, StoredTurn } from '../../src/services/session.service.js'
import { createHash } from 'crypto'

describe('SessionService', () => {
  const service = new SessionService()

  beforeEach(() => {
    service.clearStores()
  })

  describe('createSession', () => {
    it('should create intra_org session with status=active and no invite token', () => {
      const result = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
        sessionConfig: { maxTurns: 10 },
      })

      expect(result.session.id).toBeDefined()
      expect(result.session.status).toBe('active')
      expect(result.session.sessionType).toBe('intra_org')
      expect(result.session.inviteTokenHash).toBeNull()
      expect(result.session.initiatorAgentId).toBe('agent-1')
      expect(result.session.counterpartyAgentId).toBe('agent-2')
      expect(result.session.initiatorOrgId).toBe('org-1')
      expect(result.session.counterpartyOrgId).toBe('org-1')
      expect(result.session.sessionConfig).toEqual({ maxTurns: 10 })
      expect(result.session.merkleRoot).toBeNull()
      expect(result.session.turnCount).toBe(0)
      expect(result.session.anchorTxHash).toBeNull()
      expect(result.session.createdAt).toBeDefined()
      expect(result.session.updatedAt).toBeDefined()
      expect(result.inviteToken).toBeUndefined()
    })

    it('should create cross_org session with status=pending_acceptance and invite token', () => {
      const result = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      expect(result.session.status).toBe('pending_acceptance')
      expect(result.session.inviteTokenHash).toBeDefined()
      expect(result.inviteToken).toBeDefined()
      expect(result.inviteToken!.length).toBe(64) // 32 bytes hex

      // Verify token hash matches
      const expectedHash = createHash('sha256').update(result.inviteToken!).digest('hex')
      expect(result.session.inviteTokenHash).toBe(expectedHash)
    })

    it('should default sessionConfig to empty object', () => {
      const result = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      expect(result.session.sessionConfig).toEqual({})
    })

    it('should generate unique IDs for each session', () => {
      const r1 = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })
      const r2 = service.createSession({
        initiatorAgentId: 'agent-3',
        counterpartyAgentId: 'agent-4',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      expect(r1.session.id).not.toBe(r2.session.id)
    })
  })

  describe('getSession', () => {
    it('should return session by id', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      expect(service.getSession(session.id)).toEqual(session)
    })

    it('should return null for unknown id', () => {
      expect(service.getSession('nonexistent')).toBeNull()
    })
  })

  describe('getSessionWithOrgCheck', () => {
    it('should return session when org is initiator', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      expect(service.getSessionWithOrgCheck(session.id, 'org-1')).toEqual(session)
    })

    it('should return session when org is counterparty', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      expect(service.getSessionWithOrgCheck(session.id, 'org-2')).toEqual(session)
    })

    it('should return null for non-party org', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      expect(service.getSessionWithOrgCheck(session.id, 'org-3')).toBeNull()
    })

    it('should return null for unknown session id', () => {
      expect(service.getSessionWithOrgCheck('nonexistent', 'org-1')).toBeNull()
    })
  })

  describe('listByOrg', () => {
    it('should return sessions where org is either party', () => {
      service.createSession({
        initiatorAgentId: 'a1',
        counterpartyAgentId: 'a2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })
      service.createSession({
        initiatorAgentId: 'a3',
        counterpartyAgentId: 'a4',
        initiatorOrgId: 'org-3',
        counterpartyOrgId: 'org-1',
        sessionType: 'cross_org',
      })
      service.createSession({
        initiatorAgentId: 'a5',
        counterpartyAgentId: 'a6',
        initiatorOrgId: 'org-2',
        counterpartyOrgId: 'org-3',
        sessionType: 'cross_org',
      })

      const org1Sessions = service.listByOrg('org-1')
      expect(org1Sessions).toHaveLength(2)
    })

    it('should return empty array when org has no sessions', () => {
      expect(service.listByOrg('nonexistent')).toEqual([])
    })
  })

  describe('acceptSession', () => {
    it('should accept with valid token and set status=active', () => {
      const { session, inviteToken } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      const result = service.acceptSession(session.id, inviteToken!)
      expect('error' in result).toBe(false)
      expect((result as StoredSession).status).toBe('active')
    })

    it('should return error for invalid token', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      const result = service.acceptSession(session.id, 'wrong-token')
      expect(result).toEqual({ error: 'Invalid invite token', code: 'INVALID_TOKEN' })
    })

    it('should return error for non-pending session', () => {
      const { session, inviteToken } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      // Accept first
      service.acceptSession(session.id, inviteToken!)

      // Try again
      const result = service.acceptSession(session.id, inviteToken!)
      expect(result).toEqual({ error: 'Session is not pending acceptance', code: 'SESSION_NOT_ACTIVE' })
    })

    it('should return error for unknown session', () => {
      const result = service.acceptSession('nonexistent', 'some-token')
      expect(result).toEqual({ error: 'Session not found', code: 'SESSION_NOT_FOUND' })
    })
  })

  describe('generateInviteToken', () => {
    it('should generate new invite token for cross_org session', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      const result = service.generateInviteToken(session.id)
      expect('error' in result).toBe(false)
      const data = result as { inviteToken: string; sessionId: string }
      expect(data.inviteToken).toBeDefined()
      expect(data.inviteToken.length).toBe(64)
      expect(data.sessionId).toBe(session.id)

      // Verify the new token hash is stored
      const updated = service.getSession(session.id)!
      const expectedHash = createHash('sha256').update(data.inviteToken).digest('hex')
      expect(updated.inviteTokenHash).toBe(expectedHash)
    })

    it('should return error for intra_org session', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      const result = service.generateInviteToken(session.id)
      expect(result).toEqual({ error: 'Invites are only for cross-org sessions', code: 'VALIDATION_ERROR' })
    })

    it('should return error for unknown session', () => {
      const result = service.generateInviteToken('nonexistent')
      expect(result).toEqual({ error: 'Session not found', code: 'SESSION_NOT_FOUND' })
    })
  })

  describe('appendTurn', () => {
    it('should append turn to active session with auto-incrementing sequence', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      const turn1 = service.appendTurn(session.id, {
        agentId: 'agent-1',
        terms: { price: 100 },
        proofType: 'mandate_bound',
        proof: { pi_a: [] },
        publicSignals: { max: 500 },
        signature: '0xsig1',
      })

      expect('error' in turn1).toBe(false)
      const t1 = turn1 as StoredTurn
      expect(t1.id).toBeDefined()
      expect(t1.sessionId).toBe(session.id)
      expect(t1.agentId).toBe('agent-1')
      expect(t1.sequenceNumber).toBe(1)
      expect(t1.terms).toEqual({ price: 100 })
      expect(t1.proofType).toBe('mandate_bound')
      expect(t1.proof).toEqual({ pi_a: [] })
      expect(t1.publicSignals).toEqual({ max: 500 })
      expect(t1.signature).toBe('0xsig1')
      expect(t1.createdAt).toBeDefined()

      const turn2 = service.appendTurn(session.id, {
        agentId: 'agent-2',
        terms: { price: 90 },
        proofType: 'mandate_bound',
        proof: { pi_a: [] },
        publicSignals: { max: 400 },
        signature: '0xsig2',
      })

      expect((turn2 as StoredTurn).sequenceNumber).toBe(2)
    })

    it('should return error for non-active session', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      const result = service.appendTurn(session.id, {
        agentId: 'agent-1',
        terms: { price: 100 },
        proofType: 'mandate_bound',
        proof: {},
        publicSignals: {},
        signature: '0xsig',
      })

      expect(result).toEqual({ error: 'Session is not active', code: 'SESSION_NOT_ACTIVE' })
    })

    it('should return error for non-party agent', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      const result = service.appendTurn(session.id, {
        agentId: 'agent-999',
        terms: { price: 100 },
        proofType: 'mandate_bound',
        proof: {},
        publicSignals: {},
        signature: '0xsig',
      })

      expect(result).toEqual({ error: 'Agent is not a party to this session', code: 'AGENT_NOT_PARTY' })
    })

    it('should return error for unknown session', () => {
      const result = service.appendTurn('nonexistent', {
        agentId: 'agent-1',
        terms: {},
        proofType: 'x',
        proof: {},
        publicSignals: {},
        signature: '0x',
      })

      expect(result).toEqual({ error: 'Session not found', code: 'SESSION_NOT_FOUND' })
    })
  })

  describe('getTurns', () => {
    it('should return all turns for intra_org session with full terms visible', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      service.appendTurn(session.id, {
        agentId: 'agent-1',
        terms: { price: 100 },
        proofType: 'mandate_bound',
        proof: {},
        publicSignals: {},
        signature: '0xsig1',
      })
      service.appendTurn(session.id, {
        agentId: 'agent-2',
        terms: { price: 90 },
        proofType: 'mandate_bound',
        proof: {},
        publicSignals: {},
        signature: '0xsig2',
      })

      const turns = service.getTurns(session.id, 'org-1')
      expect(turns).toHaveLength(2)
      expect(turns[0].terms).toEqual({ price: 100 })
      expect(turns[1].terms).toEqual({ price: 90 })
    })

    it('should redact counterparty terms for cross_org session (initiator perspective)', () => {
      const { session, inviteToken } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })

      // Accept to make active
      service.acceptSession(session.id, inviteToken!)

      service.appendTurn(session.id, {
        agentId: 'agent-1',
        terms: { price: 100 },
        proofType: 'mandate_bound',
        proof: {},
        publicSignals: {},
        signature: '0xsig1',
      })
      service.appendTurn(session.id, {
        agentId: 'agent-2',
        terms: { price: 90 },
        proofType: 'mandate_bound',
        proof: {},
        publicSignals: {},
        signature: '0xsig2',
      })

      // Initiator sees own terms, counterparty terms redacted
      const turnsForOrg1 = service.getTurns(session.id, 'org-1')
      expect(turnsForOrg1[0].terms).toEqual({ price: 100 }) // own turn
      expect(turnsForOrg1[1].terms).toEqual({ redacted: true }) // counterparty turn

      // Counterparty sees own terms, initiator terms redacted
      const turnsForOrg2 = service.getTurns(session.id, 'org-2')
      expect(turnsForOrg2[0].terms).toEqual({ redacted: true }) // initiator turn
      expect(turnsForOrg2[1].terms).toEqual({ price: 90 }) // own turn
    })

    it('should return empty array for session with no turns', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      expect(service.getTurns(session.id, 'org-1')).toEqual([])
    })

    it('should return empty array for unknown session', () => {
      expect(service.getTurns('nonexistent', 'org-1')).toEqual([])
    })
  })

  describe('clearStores', () => {
    it('should empty all stores', () => {
      const { session } = service.createSession({
        initiatorAgentId: 'agent-1',
        counterpartyAgentId: 'agent-2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-1',
        sessionType: 'intra_org',
      })

      service.appendTurn(session.id, {
        agentId: 'agent-1',
        terms: {},
        proofType: 'x',
        proof: {},
        publicSignals: {},
        signature: '0x',
      })

      service.clearStores()

      expect(service.getSession(session.id)).toBeNull()
      expect(service.listByOrg('org-1')).toEqual([])
      expect(service.getTurns(session.id, 'org-1')).toEqual([])
    })
  })
})
