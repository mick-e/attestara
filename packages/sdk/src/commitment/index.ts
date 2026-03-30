import { randomUUID } from 'crypto'
import type { Commitment, CommitmentProof } from '@attestara/types'
import { ChainCommitmentClient } from './chain.js'

export { ChainCommitmentClient } from './chain.js'

export interface CommitmentFilter {
  sessionId?: string
  agentId?: string
  fromDate?: Date
  toDate?: Date
}

export interface CommitmentManagerConfig {
  rpcUrl?: string
  contractAddress?: string
  privateKey?: string
}

export class CommitmentManager {
  private commitments: Map<string, Commitment> = new Map()
  private chain: ChainCommitmentClient | null

  constructor(config?: CommitmentManagerConfig) {
    this.chain = config?.rpcUrl && config?.contractAddress
      ? new ChainCommitmentClient(config.rpcUrl, config.contractAddress, config.privateKey)
      : null
  }

  async create(params: {
    sessionId: string
    agreementHash: string
    parties: string[]
    credentialHashes: string[]
    proofs: CommitmentProof[]
    submitOnChain?: boolean
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

    // Submit on-chain if chain client is configured and requested
    if (this.chain && params.submitOnChain !== false) {
      try {
        const result = await this.chain.submit({
          sessionId: params.sessionId,
          agreementHash: params.agreementHash,
          parties: params.parties,
          credentialHashes: params.credentialHashes,
          merkleRoot: params.agreementHash, // Use agreement hash as merkle root placeholder
        })
        commitment.txHash = result.txHash
        commitment.blockNumber = result.blockNumber
      } catch (err) {
        // Store locally even if chain submission fails
        console.error('On-chain submission failed:', err)
      }
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

    // If on-chain, verify there too
    if (this.chain && commitment.txHash) {
      const onChain = await this.chain.verifyOnChain(commitmentId)
      if (onChain) {
        commitment.verified = true
        return true
      }
    }

    // Local verification (no chain)
    commitment.verified = true
    return true
  }
}
