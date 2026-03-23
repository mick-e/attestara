import { randomUUID } from 'crypto'
import type { Commitment, CommitmentProof } from '@agentclear/types'

export interface CommitmentFilter {
  sessionId?: string
  agentId?: string
  fromDate?: Date
  toDate?: Date
}

export class CommitmentManager {
  private commitments: Map<string, Commitment> = new Map()

  async create(params: {
    sessionId: string
    agreementHash: string
    parties: string[]
    credentialHashes: string[]
    proofs: CommitmentProof[]
  }): Promise<Commitment> {
    const commitment: Commitment = {
      id: randomUUID(),
      sessionId: params.sessionId,
      agreementHash: params.agreementHash,
      parties: params.parties,
      credentialHashes: params.credentialHashes,
      proofs: params.proofs,
      txHash: null,
      blockNumber: null,
      verified: false,
      createdAt: new Date(),
    }
    this.commitments.set(commitment.id, commitment)
    return commitment
  }

  async get(commitmentId: string): Promise<Commitment | undefined> {
    return this.commitments.get(commitmentId)
  }

  async list(filters?: CommitmentFilter): Promise<Commitment[]> {
    let results = Array.from(this.commitments.values())
    if (filters?.sessionId) {
      results = results.filter(c => c.sessionId === filters.sessionId)
    }
    if (filters?.fromDate) {
      results = results.filter(c => c.createdAt >= filters.fromDate!)
    }
    if (filters?.toDate) {
      results = results.filter(c => c.createdAt <= filters.toDate!)
    }
    return results
  }

  async verify(commitmentId: string): Promise<boolean> {
    const commitment = this.commitments.get(commitmentId)
    if (!commitment) return false
    // Real verification will call on-chain contract
    commitment.verified = true
    return true
  }
}
