import type { Prisma } from '@prisma/client'
import { getPrisma } from '../utils/prisma.js'
import { isUniqueViolation } from '../utils/prisma-errors.js'

export interface StoredAgent {
  id: string
  orgId: string
  did: string
  name: string
  status: string
  metadata: Record<string, unknown>
  publicKey: string
  registeredTxHash: string | null
  createdAt: string
}

export interface CreateAgentData {
  did: string
  name: string
  publicKey: string
  metadata?: Record<string, unknown>
}

export interface UpdateAgentData {
  name?: string
  metadata?: Record<string, unknown>
  status?: string
}

function toStoredAgent(row: {
  id: string
  orgId: string
  did: string
  name: string
  status: string
  metadata: unknown
  publicKey: string
  registeredTxHash: string | null
  createdAt: Date
}): StoredAgent {
  return {
    id: row.id,
    orgId: row.orgId,
    did: row.did,
    name: row.name,
    status: row.status,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    publicKey: row.publicKey,
    registeredTxHash: row.registeredTxHash,
    createdAt: row.createdAt.toISOString(),
  }
}

export class AgentService {
  async create(orgId: string, data: CreateAgentData): Promise<StoredAgent | { error: string; code: string }> {
    try {
      const row = await getPrisma().agent.create({
        data: {
          orgId,
          did: data.did,
          name: data.name,
          status: 'active',
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
          publicKey: data.publicKey,
        },
      })
      return toStoredAgent(row)
    } catch (err) {
      if (isUniqueViolation(err)) {
        return { error: 'DID is already registered', code: 'DID_ALREADY_REGISTERED' }
      }
      throw err
    }
  }

  async listByOrg(
    orgId: string,
    opts?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'> }
  ): Promise<StoredAgent[]> {
    const rows = await getPrisma().agent.findMany({
      where: { orgId },
      skip: opts?.skip,
      take: opts?.take,
      orderBy: opts?.orderBy ?? { createdAt: 'desc' },
    })
    return rows.map(toStoredAgent)
  }

  async countByOrg(orgId: string): Promise<number> {
    return getPrisma().agent.count({ where: { orgId } })
  }

  async getById(agentId: string, orgId: string): Promise<StoredAgent | null> {
    const row = await getPrisma().agent.findFirst({ where: { id: agentId, orgId } })
    return row ? toStoredAgent(row) : null
  }

  async update(agentId: string, orgId: string, updates: UpdateAgentData): Promise<StoredAgent | null> {
    const existing = await getPrisma().agent.findFirst({ where: { id: agentId, orgId } })
    if (!existing) return null

    const row = await getPrisma().agent.update({
      where: { id: agentId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.metadata !== undefined && { metadata: updates.metadata as Prisma.InputJsonValue }),
        ...(updates.status !== undefined && { status: updates.status }),
      },
    })
    return toStoredAgent(row)
  }

  async deactivate(agentId: string, orgId: string): Promise<StoredAgent | null> {
    const existing = await getPrisma().agent.findFirst({ where: { id: agentId, orgId } })
    if (!existing) return null

    const row = await getPrisma().agent.update({
      where: { id: agentId },
      data: { status: 'deactivated' },
    })
    return toStoredAgent(row)
  }

  async clearStores(): Promise<void> {
    await getPrisma().agent.deleteMany()
  }
}

/** Singleton instance shared across routes */
export const agentService = new AgentService()
