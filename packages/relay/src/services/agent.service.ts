import { randomUUID } from 'crypto'

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

export class AgentService {
  private agents = new Map<string, StoredAgent>()
  private didIndex = new Map<string, string>() // did -> agentId

  create(orgId: string, data: CreateAgentData): StoredAgent | { error: string; code: string } {
    if (this.didIndex.has(data.did)) {
      return { error: 'DID is already registered', code: 'DID_ALREADY_REGISTERED' }
    }

    const agent: StoredAgent = {
      id: randomUUID(),
      orgId,
      did: data.did,
      name: data.name,
      status: 'active',
      metadata: data.metadata ?? {},
      publicKey: data.publicKey,
      registeredTxHash: null,
      createdAt: new Date().toISOString(),
    }

    this.agents.set(agent.id, agent)
    this.didIndex.set(agent.did, agent.id)

    return agent
  }

  listByOrg(orgId: string): StoredAgent[] {
    return Array.from(this.agents.values()).filter(a => a.orgId === orgId)
  }

  getById(agentId: string, orgId: string): StoredAgent | null {
    const agent = this.agents.get(agentId)
    if (!agent || agent.orgId !== orgId) return null
    return agent
  }

  update(agentId: string, orgId: string, updates: UpdateAgentData): StoredAgent | null {
    const agent = this.agents.get(agentId)
    if (!agent || agent.orgId !== orgId) return null

    if (updates.name !== undefined) agent.name = updates.name
    if (updates.metadata !== undefined) agent.metadata = updates.metadata
    if (updates.status !== undefined) agent.status = updates.status

    return agent
  }

  deactivate(agentId: string, orgId: string): StoredAgent | null {
    const agent = this.agents.get(agentId)
    if (!agent || agent.orgId !== orgId) return null

    agent.status = 'deactivated'
    return agent
  }

  clearStores(): void {
    this.agents.clear()
    this.didIndex.clear()
  }
}

/** Singleton instance shared across routes */
export const agentService = new AgentService()
