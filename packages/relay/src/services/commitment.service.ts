import type { Prisma } from '@prisma/client'
import { getPrisma } from '../utils/prisma.js'
import { isUniqueViolation } from '../utils/prisma-errors.js'

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

function toStoredCommitment(row: {
  id: string
  sessionId: string
  agreementHash: string
  parties: string[]
  credentialHashes: string[]
  proofs: unknown
  circuitVersions: string[]
  txHash: string | null
  blockNumber: number | null
  verified: boolean
  createdAt: Date
}): StoredCommitment {
  return {
    id: row.id,
    sessionId: row.sessionId,
    agreementHash: row.agreementHash,
    parties: row.parties,
    credentialHashes: row.credentialHashes,
    proofs: (row.proofs as Record<string, unknown>) ?? {},
    circuitVersions: row.circuitVersions,
    txHash: row.txHash,
    blockNumber: row.blockNumber,
    verified: row.verified,
    createdAt: row.createdAt.toISOString(),
  }
}

export class CommitmentService {
  async create(data: CreateCommitmentData): Promise<StoredCommitment | { error: string; code: string }> {
    try {
      const row = await getPrisma().commitment.create({
        data: {
          sessionId: data.sessionId,
          agreementHash: data.agreementHash,
          parties: data.parties,
          credentialHashes: data.credentialHashes,
          proofs: data.proofs as Prisma.InputJsonValue,
          circuitVersions: data.circuitVersions,
        },
      })
      return toStoredCommitment(row)
    } catch (err) {
      if (isUniqueViolation(err)) {
        return {
          error: 'Commitment already exists for this session',
          code: 'DUPLICATE_SESSION_COMMITMENT',
        }
      }
      throw err
    }
  }

  async getById(id: string): Promise<StoredCommitment | null> {
    const row = await getPrisma().commitment.findUnique({ where: { id } })
    return row ? toStoredCommitment(row) : null
  }

  async listByOrg(
    orgId: string,
    opts?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'> }
  ): Promise<StoredCommitment[]> {
    const rows = await getPrisma().commitment.findMany({
      where: {
        session: {
          OR: [
            { initiatorOrgId: orgId },
            { counterpartyOrgId: orgId },
          ],
        },
      },
      ...(opts?.skip !== undefined ? { skip: opts.skip } : {}),
      ...(opts?.take !== undefined ? { take: opts.take } : {}),
      orderBy: opts?.orderBy ?? { createdAt: 'desc' },
    })
    return rows.map(toStoredCommitment)
  }

  async countByOrg(orgId: string): Promise<number> {
    return getPrisma().commitment.count({
      where: {
        session: {
          OR: [
            { initiatorOrgId: orgId },
            { counterpartyOrgId: orgId },
          ],
        },
      },
    })
  }

  async verify(id: string): Promise<StoredCommitment | null> {
    const existing = await getPrisma().commitment.findUnique({ where: { id } })
    if (!existing) return null

    const row = await getPrisma().commitment.update({
      where: { id },
      data: { verified: true },
    })
    return toStoredCommitment(row)
  }

  async updateOnChainStatus(id: string, txHash: string, blockNumber: number): Promise<StoredCommitment | null> {
    const existing = await getPrisma().commitment.findUnique({ where: { id } })
    if (!existing) return null

    const row = await getPrisma().commitment.update({
      where: { id },
      data: { txHash, blockNumber },
    })
    return toStoredCommitment(row)
  }

  async clearStores(): Promise<void> {
    await getPrisma().commitment.deleteMany()
  }
}

/** Singleton instance shared across routes */
export const commitmentService = new CommitmentService()
