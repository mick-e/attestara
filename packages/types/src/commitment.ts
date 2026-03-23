import { ZKProof, PublicSignals } from './zk.js'

export interface Commitment {
  id: string
  sessionId: string
  agreementHash: string
  parties: string[]
  credentialHashes: string[]
  proofs: CommitmentProof[]
  txHash: string | null
  blockNumber: number | null
  verified: boolean
  createdAt: Date
}

export interface CommitmentProof {
  circuitId: string
  circuitVersion: string
  proof: ZKProof
  publicSignals: PublicSignals
}

export interface CommitmentRecord {
  commitmentId: string
  sessionId: string
  agreementHash: string
  parties: string[]
  merkleRoot: string
  txHash: string
  blockNumber: number
  chainId: number
  timestamp: Date
}
