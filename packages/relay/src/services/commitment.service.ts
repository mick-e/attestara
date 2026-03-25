import { randomUUID } from 'crypto'
import type { SessionService } from './session.service.js'

export interface StoredCommitment {
  id: string
  sessionId: string
  agreementHash: string
  parties: string[]
  credentialHashes: string[]
  proofs: Record<string, unknown>
  circuitVersions: string[]
  txHash: string | null
  blockNumber: number | null
  verified: boolean
  createdAt: string
}

export interface CreateCommitmentData {
  sessionId: string
  agreementHash: string
  parties: string[]
  credentialHashes: string[]
  proofs: Record<string, unknown>
  circuitVersions: string[]
}

export class CommitmentService {
  private commitments = new Map<string, StoredCommitment>()
  private sessionIndex = new Map<string, string>() // sessionId -> commitmentId

  create(data: CreateCommitmentData): StoredCommitment | { error: string; code: string } {
    if (this.sessionIndex.has(data.sessionId)) {
      return {
        error: 'Commitment already exists for this session',
        code: 'DUPLICATE_SESSION_COMMITMENT',
      }
    }

    const commitment: StoredCommitment = {
      id: randomUUID(),
      sessionId: data.sessionId,
      agreementHash: data.agreementHash,
      parties: data.parties,
      credentialHashes: data.credentialHashes,
      proofs: data.proofs,
      circuitVersions: data.circuitVersions,
      txHash: null,
      blockNumber: null,
      verified: false,
      createdAt: new Date().toISOString(),
    }

    this.commitments.set(commitment.id, commitment)
    this.sessionIndex.set(data.sessionId, commitment.id)

    return commitment
  }

  getById(id: string): StoredCommitment | null {
    return this.commitments.get(id) ?? null
  }

  listByOrg(orgId: string, sessionService: SessionService): StoredCommitment[] {
    return Array.from(this.commitments.values()).filter(c => {
      const session = sessionService.getSession(c.sessionId)
      if (!session) return false
      return session.initiatorOrgId === orgId || session.counterpartyOrgId === orgId
    })
  }

  verify(id: string): StoredCommitment | null {
    const commitment = this.commitments.get(id)
    if (!commitment) return null
    commitment.verified = true
    return commitment
  }

  updateOnChainStatus(id: string, txHash: string, blockNumber: number): StoredCommitment | null {
    const commitment = this.commitments.get(id)
    if (!commitment) return null
    commitment.txHash = txHash
    commitment.blockNumber = blockNumber
    return commitment
  }

  clearStores(): void {
    this.commitments.clear()
    this.sessionIndex.clear()
  }
}

/** Singleton instance shared across routes */
export const commitmentService = new CommitmentService()
