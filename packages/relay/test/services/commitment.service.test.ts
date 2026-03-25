import { describe, it, expect, beforeEach } from 'vitest'
import { CommitmentService } from '../../src/services/commitment.service.js'
import { SessionService } from '../../src/services/session.service.js'

describe('CommitmentService', () => {
  const service = new CommitmentService()
  const sessionService = new SessionService()

  beforeEach(() => {
    service.clearStores()
    sessionService.clearStores()
  })

  function makeSession(orgId: string = 'org-1') {
    return sessionService.createSession({
      initiatorAgentId: 'agent-1',
      counterpartyAgentId: 'agent-2',
      initiatorOrgId: orgId,
      counterpartyOrgId: orgId,
      sessionType: 'intra_org',
    }).session
  }

  describe('create', () => {
    it('should create a commitment with all required fields', () => {
      const session = makeSession()
      const result = service.create({
        sessionId: session.id,
        agreementHash: '0xabc123',
        parties: ['org-1', 'org-2'],
        credentialHashes: ['0xcred1', '0xcred2'],
        proofs: { pi_a: [] },
        circuitVersions: ['v1.0'],
      })

      expect('error' in result).toBe(false)
      const commitment = result as any
      expect(commitment.id).toBeDefined()
      expect(commitment.sessionId).toBe(session.id)
      expect(commitment.agreementHash).toBe('0xabc123')
      expect(commitment.parties).toEqual(['org-1', 'org-2'])
      expect(commitment.credentialHashes).toEqual(['0xcred1', '0xcred2'])
      expect(commitment.proofs).toEqual({ pi_a: [] })
      expect(commitment.circuitVersions).toEqual(['v1.0'])
      expect(commitment.txHash).toBeNull()
      expect(commitment.blockNumber).toBeNull()
      expect(commitment.verified).toBe(false)
      expect(commitment.createdAt).toBeDefined()
    })

    it('should generate unique IDs for each commitment', () => {
      const s1 = makeSession()
      const s2 = makeSession()

      const r1 = service.create({ sessionId: s1.id, agreementHash: '0xa', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })
      const r2 = service.create({ sessionId: s2.id, agreementHash: '0xb', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })

      expect((r1 as any).id).not.toBe((r2 as any).id)
    })

    it('should return error when commitment already exists for sessionId', () => {
      const session = makeSession()
      service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      })

      const result = service.create({
        sessionId: session.id,
        agreementHash: '0xdef',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      })

      expect(result).toEqual({
        error: 'Commitment already exists for this session',
        code: 'DUPLICATE_SESSION_COMMITMENT',
      })
    })
  })

  describe('getById', () => {
    it('should return commitment by id', () => {
      const session = makeSession()
      const created = service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: ['org-1'],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      }) as any

      const found = service.getById(created.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
    })

    it('should return null for unknown id', () => {
      expect(service.getById('nonexistent')).toBeNull()
    })
  })

  describe('listByOrg', () => {
    it('should return commitments where the session has orgId as a party', () => {
      const s1 = sessionService.createSession({
        initiatorAgentId: 'a1',
        counterpartyAgentId: 'a2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      }).session

      const s2 = sessionService.createSession({
        initiatorAgentId: 'a3',
        counterpartyAgentId: 'a4',
        initiatorOrgId: 'org-3',
        counterpartyOrgId: 'org-1',
        sessionType: 'cross_org',
      }).session

      const s3 = sessionService.createSession({
        initiatorAgentId: 'a5',
        counterpartyAgentId: 'a6',
        initiatorOrgId: 'org-2',
        counterpartyOrgId: 'org-3',
        sessionType: 'cross_org',
      }).session

      service.create({ sessionId: s1.id, agreementHash: '0x1', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })
      service.create({ sessionId: s2.id, agreementHash: '0x2', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })
      service.create({ sessionId: s3.id, agreementHash: '0x3', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })

      const org1Commitments = service.listByOrg('org-1', sessionService)
      expect(org1Commitments).toHaveLength(2)

      const org3Commitments = service.listByOrg('org-3', sessionService)
      expect(org3Commitments).toHaveLength(2)
    })

    it('should return empty array when org has no commitments', () => {
      expect(service.listByOrg('nonexistent', sessionService)).toEqual([])
    })
  })

  describe('verify', () => {
    it('should set verified=true', () => {
      const session = makeSession()
      const created = service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      }) as any

      const result = service.verify(created.id)
      expect(result).not.toBeNull()
      expect(result!.verified).toBe(true)
    })

    it('should return null for unknown id', () => {
      expect(service.verify('nonexistent')).toBeNull()
    })
  })

  describe('updateOnChainStatus', () => {
    it('should update txHash and blockNumber', () => {
      const session = makeSession()
      const created = service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      }) as any

      const result = service.updateOnChainStatus(created.id, '0xtxhash', 12345)
      expect(result).not.toBeNull()
      expect(result!.txHash).toBe('0xtxhash')
      expect(result!.blockNumber).toBe(12345)
    })

    it('should return null for unknown id', () => {
      expect(service.updateOnChainStatus('nonexistent', '0xtx', 1)).toBeNull()
    })
  })

  describe('clearStores', () => {
    it('should empty all stores', () => {
      const session = makeSession()
      const created = service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      }) as any

      service.clearStores()

      expect(service.getById(created.id)).toBeNull()
      expect(service.listByOrg('org-1', sessionService)).toEqual([])
    })
  })
})
