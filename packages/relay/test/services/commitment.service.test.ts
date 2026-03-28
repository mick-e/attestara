import { describe, it, expect, beforeEach } from 'vitest'
import { CommitmentService } from '../../src/services/commitment.service.js'
import { SessionService } from '../../src/services/session.service.js'
import { clearAllStores } from '../helpers/db-cleanup.js'
import { getPrisma } from '../../src/utils/prisma.js'

describe('CommitmentService', () => {
  const service = new CommitmentService()
  const sessionService = new SessionService()

  beforeEach(async () => {
    await clearAllStores()
    // Create FK parent orgs and agents used across tests
    const db = getPrisma()
    await db.organisation.createMany({
      data: [
        { id: 'org-1', name: 'Test Org 1', slug: 'test-org-1', plan: 'starter' },
        { id: 'org-2', name: 'Test Org 2', slug: 'test-org-2', plan: 'starter' },
        { id: 'org-3', name: 'Test Org 3', slug: 'test-org-3', plan: 'starter' },
      ],
    })
    await db.agent.createMany({
      data: [
        { id: 'agent-1', orgId: 'org-1', did: 'did:test:agent-1', name: 'Test Agent 1', publicKey: '0xtest1' },
        { id: 'agent-2', orgId: 'org-1', did: 'did:test:agent-2', name: 'Test Agent 2', publicKey: '0xtest2' },
        { id: 'a1', orgId: 'org-1', did: 'did:test:a1', name: 'Agent a1', publicKey: '0xtesta1' },
        { id: 'a2', orgId: 'org-2', did: 'did:test:a2', name: 'Agent a2', publicKey: '0xtesta2' },
        { id: 'a3', orgId: 'org-3', did: 'did:test:a3', name: 'Agent a3', publicKey: '0xtesta3' },
        { id: 'a4', orgId: 'org-1', did: 'did:test:a4', name: 'Agent a4', publicKey: '0xtesta4' },
        { id: 'a5', orgId: 'org-2', did: 'did:test:a5', name: 'Agent a5', publicKey: '0xtesta5' },
        { id: 'a6', orgId: 'org-3', did: 'did:test:a6', name: 'Agent a6', publicKey: '0xtesta6' },
      ],
    })
  })

  async function makeSession(orgId: string = 'org-1') {
    return (await sessionService.createSession({
      initiatorAgentId: 'agent-1',
      counterpartyAgentId: 'agent-2',
      initiatorOrgId: orgId,
      counterpartyOrgId: orgId,
      sessionType: 'intra_org',
    })).session
  }

  describe('create', () => {
    it('should create a commitment with all required fields', async () => {
      const session = await makeSession()
      const result = await service.create({
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

    it('should generate unique IDs for each commitment', async () => {
      const s1 = await makeSession()
      const s2 = await makeSession()

      const r1 = await service.create({ sessionId: s1.id, agreementHash: '0xa', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })
      const r2 = await service.create({ sessionId: s2.id, agreementHash: '0xb', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })

      expect((r1 as any).id).not.toBe((r2 as any).id)
    })

    it('should return error when commitment already exists for sessionId', async () => {
      const session = await makeSession()
      await service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      })

      const result = await service.create({
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
    it('should return commitment by id', async () => {
      const session = await makeSession()
      const created = await service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: ['org-1'],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      }) as any

      const found = await service.getById(created.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
    })

    it('should return null for unknown id', async () => {
      expect(await service.getById('nonexistent')).toBeNull()
    })
  })

  describe('listByOrg', () => {
    it('should return commitments where the session has orgId as a party', async () => {
      const s1 = (await sessionService.createSession({
        initiatorAgentId: 'a1',
        counterpartyAgentId: 'a2',
        initiatorOrgId: 'org-1',
        counterpartyOrgId: 'org-2',
        sessionType: 'cross_org',
      })).session

      const s2 = (await sessionService.createSession({
        initiatorAgentId: 'a3',
        counterpartyAgentId: 'a4',
        initiatorOrgId: 'org-3',
        counterpartyOrgId: 'org-1',
        sessionType: 'cross_org',
      })).session

      const s3 = (await sessionService.createSession({
        initiatorAgentId: 'a5',
        counterpartyAgentId: 'a6',
        initiatorOrgId: 'org-2',
        counterpartyOrgId: 'org-3',
        sessionType: 'cross_org',
      })).session

      await service.create({ sessionId: s1.id, agreementHash: '0x1', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })
      await service.create({ sessionId: s2.id, agreementHash: '0x2', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })
      await service.create({ sessionId: s3.id, agreementHash: '0x3', parties: [], credentialHashes: [], proofs: {}, circuitVersions: [] })

      const org1Commitments = await service.listByOrg('org-1')
      expect(org1Commitments).toHaveLength(2)

      const org3Commitments = await service.listByOrg('org-3')
      expect(org3Commitments).toHaveLength(2)
    })

    it('should return empty array when org has no commitments', async () => {
      expect(await service.listByOrg('nonexistent')).toEqual([])
    })
  })

  describe('verify', () => {
    it('should set verified=true', async () => {
      const session = await makeSession()
      const created = await service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      }) as any

      const result = await service.verify(created.id)
      expect(result).not.toBeNull()
      expect(result!.verified).toBe(true)
    })

    it('should return null for unknown id', async () => {
      expect(await service.verify('nonexistent')).toBeNull()
    })
  })

  describe('updateOnChainStatus', () => {
    it('should update txHash and blockNumber', async () => {
      const session = await makeSession()
      const created = await service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      }) as any

      const result = await service.updateOnChainStatus(created.id, '0xtxhash', 12345)
      expect(result).not.toBeNull()
      expect(result!.txHash).toBe('0xtxhash')
      expect(result!.blockNumber).toBe(12345)
    })

    it('should return null for unknown id', async () => {
      expect(await service.updateOnChainStatus('nonexistent', '0xtx', 1)).toBeNull()
    })
  })

  describe('clearStores', () => {
    it('should empty all stores', async () => {
      const session = await makeSession()
      const created = await service.create({
        sessionId: session.id,
        agreementHash: '0xabc',
        parties: [],
        credentialHashes: [],
        proofs: {},
        circuitVersions: [],
      }) as any

      await clearAllStores()

      expect(await service.getById(created.id)).toBeNull()
      expect(await service.listByOrg('org-1')).toEqual([])
    })
  })
})
