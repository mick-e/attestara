import type { Prisma } from '@prisma/client'
import { getPrisma } from '../utils/prisma.js'
import { isUniqueViolation } from '../utils/prisma-errors.js'

export interface StoredCredential {
  id: string
  orgId: string
  agentId: string
  credentialHash: string
  schemaHash: string
  ipfsCid: string | null
  credentialDataCached: Record<string, unknown> | null
  expiry: string
  revoked: boolean
  registeredTxHash: string | null
  createdAt: string
}

export interface CreateCredentialData {
  agentId: string
  credentialHash: string
  schemaHash: string
  ipfsCid?: string
  credentialData?: Record<string, unknown>
  expiry: string
}

function toStoredCredential(row: {
  id: string
  orgId: string
  agentId: string
  credentialHash: string
  schemaHash: string
  ipfsCid: string | null
  credentialDataCached: unknown
  expiry: Date
  revoked: boolean
  registeredTxHash: string | null
  createdAt: Date
}): StoredCredential {
  return {
    id: row.id,
    orgId: row.orgId,
    agentId: row.agentId,
    credentialHash: row.credentialHash,
    schemaHash: row.schemaHash,
    ipfsCid: row.ipfsCid,
    credentialDataCached: (row.credentialDataCached as Record<string, unknown>) ?? null,
    expiry: row.expiry.toISOString(),
    revoked: row.revoked,
    registeredTxHash: row.registeredTxHash,
    createdAt: row.createdAt.toISOString(),
  }
}

export class CredentialService {
  async create(orgId: string, data: CreateCredentialData): Promise<StoredCredential | { error: string; code: string }> {
    try {
      const row = await getPrisma().credential.create({
        data: {
          orgId,
          agentId: data.agentId,
          credentialHash: data.credentialHash,
          schemaHash: data.schemaHash,
          ipfsCid: data.ipfsCid ?? null,
          credentialDataCached: (data.credentialData ?? undefined) as Prisma.InputJsonValue | undefined,
          expiry: new Date(data.expiry),
        },
      })
      return toStoredCredential(row)
    } catch (err) {
      if (isUniqueViolation(err)) {
        return { error: 'Credential hash already exists', code: 'DUPLICATE_CREDENTIAL_HASH' }
      }
      throw err
    }
  }

  async listByOrg(
    orgId: string,
    opts?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'> }
  ): Promise<StoredCredential[]> {
    const rows = await getPrisma().credential.findMany({
      where: { orgId, deletedAt: null },
      skip: opts?.skip,
      take: opts?.take,
      orderBy: opts?.orderBy ?? { createdAt: 'desc' },
    })
    return rows.map(toStoredCredential)
  }

  async countByOrg(orgId: string): Promise<number> {
    return getPrisma().credential.count({ where: { orgId, deletedAt: null } })
  }

  async getById(id: string, orgId: string): Promise<StoredCredential | null> {
    const row = await getPrisma().credential.findFirst({ where: { id, orgId, deletedAt: null } })
    return row ? toStoredCredential(row) : null
  }

  async revoke(id: string, orgId: string): Promise<StoredCredential | null> {
    const existing = await getPrisma().credential.findFirst({ where: { id, orgId, deletedAt: null } })
    if (!existing) return null

    const row = await getPrisma().credential.update({
      where: { id },
      data: { revoked: true },
    })
    return toStoredCredential(row)
  }

  async clearStores(): Promise<void> {
    await getPrisma().credential.deleteMany()
  }
}

/** Singleton instance shared across routes */
export const credentialService = new CredentialService()
