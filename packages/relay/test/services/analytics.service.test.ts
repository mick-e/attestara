import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSession = { findMany: vi.fn() }
const mockTurn = { findMany: vi.fn() }
const mockCommitment = { findMany: vi.fn() }
const mockCredential = { findMany: vi.fn() }

vi.mock('../../src/utils/prisma.js', () => ({
  getPrisma: () => ({
    session: mockSession,
    turn: mockTurn,
    commitment: mockCommitment,
    credential: mockCredential,
  }),
}))

const { AnalyticsService } = await import('../../src/services/analytics.service.js')

describe('AnalyticsService', () => {
  let service: InstanceType<typeof AnalyticsService>
  const orgId = 'org_test_001'

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AnalyticsService()
  })

  describe('timeseries - sessions', () => {
    it('buckets sessions by day', async () => {
      mockSession.findMany.mockResolvedValue([
        { createdAt: new Date('2026-04-10T10:00:00Z') },
        { createdAt: new Date('2026-04-10T14:00:00Z') },
        { createdAt: new Date('2026-04-11T09:00:00Z') },
      ])
      const result = await service.timeseries(orgId, 'sessions', 14)
      expect(result).toEqual([
        { date: '2026-04-10', value: 2 },
        { date: '2026-04-11', value: 1 },
      ])
    })

    it('returns empty array when no sessions', async () => {
      mockSession.findMany.mockResolvedValue([])
      const result = await service.timeseries(orgId, 'sessions', 14)
      expect(result).toEqual([])
    })
  })

  describe('timeseries - commitments', () => {
    it('buckets commitments by day', async () => {
      mockCommitment.findMany.mockResolvedValue([
        { createdAt: new Date('2026-04-12T08:00:00Z') },
        { createdAt: new Date('2026-04-12T16:00:00Z') },
        { createdAt: new Date('2026-04-13T12:00:00Z') },
      ])
      const result = await service.timeseries(orgId, 'commitments', 14)
      expect(result).toEqual([
        { date: '2026-04-12', value: 2 },
        { date: '2026-04-13', value: 1 },
      ])
    })
  })

  describe('timeseries - credentials', () => {
    it('buckets credential issuance by day', async () => {
      mockCredential.findMany.mockResolvedValue([
        { createdAt: new Date('2026-04-14T10:00:00Z') },
      ])
      const result = await service.timeseries(orgId, 'credentials', 14)
      expect(result).toEqual([{ date: '2026-04-14', value: 1 }])
    })
  })

  describe('timeseries - gas_spent', () => {
    it('sums gas by day from proofs JSON', async () => {
      mockCommitment.findMany.mockResolvedValue([
        { createdAt: new Date('2026-04-10T10:00:00Z'), proofs: { gasUsed: 150000 } },
        { createdAt: new Date('2026-04-10T14:00:00Z'), proofs: { gasUsed: 180000 } },
      ])
      const result = await service.timeseries(orgId, 'gas_spent', 14)
      expect(result).toEqual([{ date: '2026-04-10', value: 330000 }])
    })

    it('uses default 220000 when gasUsed missing', async () => {
      mockCommitment.findMany.mockResolvedValue([
        { createdAt: new Date('2026-04-11T10:00:00Z'), proofs: {} },
      ])
      const result = await service.timeseries(orgId, 'gas_spent', 14)
      expect(result).toEqual([{ date: '2026-04-11', value: 220000 }])
    })
  })

  describe('timeseries - proof_latency_p50', () => {
    it('computes daily p50 latency', async () => {
      mockTurn.findMany.mockResolvedValue([
        { createdAt: new Date('2026-04-10T10:00:00Z'), proof: { latencyMs: 100 } },
        { createdAt: new Date('2026-04-10T11:00:00Z'), proof: { latencyMs: 200 } },
        { createdAt: new Date('2026-04-10T12:00:00Z'), proof: { latencyMs: 300 } },
        { createdAt: new Date('2026-04-10T13:00:00Z'), proof: { latencyMs: 400 } },
      ])
      const result = await service.timeseries(orgId, 'proof_latency_p50', 14)
      expect(result.length).toBe(1)
      expect(result[0].date).toBe('2026-04-10')
      expect(result[0].value).toBe(200)
    })
  })

  describe('proofLatencyByCircuit', () => {
    it('returns per-circuit p50/p95 stats', async () => {
      mockTurn.findMany.mockResolvedValue([
        { proofType: 'MandateBound', proof: { latencyMs: 100 } },
        { proofType: 'MandateBound', proof: { latencyMs: 200 } },
        { proofType: 'MandateBound', proof: { latencyMs: 300 } },
        { proofType: 'MandateBound', proof: { latencyMs: 400 } },
        { proofType: 'CredFreshness', proof: { latencyMs: 150 } },
        { proofType: 'CredFreshness', proof: { latencyMs: 250 } },
      ])
      const result = await service.proofLatencyByCircuit(orgId)
      expect(result.length).toBe(2)
      const mandate = result.find(r => r.circuit === 'MandateBound')!
      expect(mandate.count).toBe(4)
      expect(mandate.p50Ms).toBe(200)
      expect(mandate.p95Ms).toBe(400)
    })

    it('skips turns without latencyMs', async () => {
      mockTurn.findMany.mockResolvedValue([
        { proofType: 'MandateBound', proof: {} },
        { proofType: 'MandateBound', proof: null },
      ])
      const result = await service.proofLatencyByCircuit(orgId)
      expect(result).toEqual([])
    })
  })

  describe('unknown metric', () => {
    it('returns empty array', async () => {
      const result = await service.timeseries(orgId, 'unknown' as never, 14)
      expect(result).toEqual([])
    })
  })
})
