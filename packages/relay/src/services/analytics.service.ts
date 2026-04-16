import { getPrisma } from '../utils/prisma.js'

export interface TimeseriesPoint {
  date: string
  value: number
}

export interface ProofLatencyStats {
  circuit: string
  p50Ms: number
  p95Ms: number
  count: number
}

export type TimeseriesMetric =
  | 'sessions'
  | 'proof_latency_p50'
  | 'proof_latency_p95'
  | 'gas_spent'
  | 'commitments'
  | 'credentials'

export class AnalyticsService {
  async timeseries(
    orgId: string,
    metric: TimeseriesMetric,
    days = 14,
  ): Promise<TimeseriesPoint[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    switch (metric) {
      case 'sessions':
        return this.sessionsOverTime(orgId, since)
      case 'proof_latency_p50':
        return this.proofLatencyOverTime(orgId, since, 0.5)
      case 'proof_latency_p95':
        return this.proofLatencyOverTime(orgId, since, 0.95)
      case 'gas_spent':
        return this.gasSpentOverTime(orgId, since)
      case 'commitments':
        return this.commitmentsOverTime(orgId, since)
      case 'credentials':
        return this.credentialIssuanceOverTime(orgId, since)
      default:
        return []
    }
  }

  async proofLatencyByCircuit(orgId: string): Promise<ProofLatencyStats[]> {
    const prisma = getPrisma()
    const turns = await prisma.turn.findMany({
      where: {
        session: {
          OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }],
        },
      },
      select: { proofType: true, proof: true },
    })

    const grouped = new Map<string, number[]>()
    for (const t of turns) {
      const circuit = t.proofType
      const proofData = t.proof as Record<string, unknown> | null
      const latency = typeof proofData?.latencyMs === 'number' ? proofData.latencyMs : null
      if (latency !== null) {
        const arr = grouped.get(circuit) ?? []
        arr.push(latency)
        grouped.set(circuit, arr)
      }
    }

    const stats: ProofLatencyStats[] = []
    for (const [circuit, latencies] of grouped) {
      latencies.sort((a, b) => a - b)
      stats.push({
        circuit,
        p50Ms: this.percentile(latencies, 0.5),
        p95Ms: this.percentile(latencies, 0.95),
        count: latencies.length,
      })
    }
    return stats
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0
    const idx = Math.ceil(p * sorted.length) - 1
    return sorted[Math.max(0, idx)]
  }

  private async sessionsOverTime(orgId: string, since: Date): Promise<TimeseriesPoint[]> {
    const sessions = await getPrisma().session.findMany({
      where: {
        createdAt: { gte: since },
        OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }],
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return this.bucketByDay(sessions.map(s => s.createdAt))
  }

  private async proofLatencyOverTime(orgId: string, since: Date, pct: number): Promise<TimeseriesPoint[]> {
    const turns = await getPrisma().turn.findMany({
      where: {
        createdAt: { gte: since },
        session: {
          OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }],
        },
      },
      select: { createdAt: true, proof: true },
      orderBy: { createdAt: 'asc' },
    })

    const byDay = new Map<string, number[]>()
    for (const t of turns) {
      const day = t.createdAt.toISOString().slice(0, 10)
      const proofData = t.proof as Record<string, unknown> | null
      const latency = typeof proofData?.latencyMs === 'number' ? proofData.latencyMs : null
      if (latency !== null) {
        const arr = byDay.get(day) ?? []
        arr.push(latency)
        byDay.set(day, arr)
      }
    }

    return Array.from(byDay.entries()).map(([date, vals]) => {
      vals.sort((a, b) => a - b)
      return { date, value: this.percentile(vals, pct) }
    })
  }

  private async gasSpentOverTime(orgId: string, since: Date): Promise<TimeseriesPoint[]> {
    const commitments = await getPrisma().commitment.findMany({
      where: {
        createdAt: { gte: since },
        session: {
          OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }],
        },
        blockNumber: { not: null },
      },
      select: { createdAt: true, proofs: true },
      orderBy: { createdAt: 'asc' },
    })

    const byDay = new Map<string, number>()
    for (const c of commitments) {
      const day = c.createdAt.toISOString().slice(0, 10)
      const proofData = c.proofs as Record<string, unknown> | null
      const gas = typeof proofData?.gasUsed === 'number' ? proofData.gasUsed : 220000
      byDay.set(day, (byDay.get(day) ?? 0) + gas)
    }
    return Array.from(byDay.entries()).map(([date, value]) => ({ date, value }))
  }

  private async commitmentsOverTime(orgId: string, since: Date): Promise<TimeseriesPoint[]> {
    const commitments = await getPrisma().commitment.findMany({
      where: {
        createdAt: { gte: since },
        session: {
          OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }],
        },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return this.bucketByDay(commitments.map(c => c.createdAt))
  }

  private async credentialIssuanceOverTime(orgId: string, since: Date): Promise<TimeseriesPoint[]> {
    const credentials = await getPrisma().credential.findMany({
      where: {
        createdAt: { gte: since },
        orgId,
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return this.bucketByDay(credentials.map(c => c.createdAt))
  }

  private bucketByDay(dates: Date[]): TimeseriesPoint[] {
    const counts = new Map<string, number>()
    for (const d of dates) {
      const day = d.toISOString().slice(0, 10)
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }))
  }
}

export const analyticsService = new AnalyticsService()
