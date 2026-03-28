import { randomUUID } from 'crypto'
import { generateApiKey } from '../middleware/auth.js'
import { getPrisma } from '../utils/prisma.js'
import type { ApiKey } from '@prisma/client'

export interface StoredApiKey {
  id: string
  orgId: string
  keyHash: string
  name: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

function toStoredApiKey(record: ApiKey): StoredApiKey {
  return {
    id: record.id,
    orgId: record.orgId,
    keyHash: record.keyHash,
    name: record.name,
    scopes: record.scopes,
    lastUsedAt: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  }
}

export class ApiKeyService {
  async create(
    orgId: string,
    name: string,
    scopes: string[],
    expiresAt?: string,
  ): Promise<{ apiKey: StoredApiKey; rawKey: string }> {
    const { raw, hash } = generateApiKey()

    const record = await getPrisma().apiKey.create({
      data: {
        id: randomUUID(),
        orgId,
        keyHash: hash,
        name,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return { apiKey: toStoredApiKey(record), rawKey: raw }
  }

  async validateByHash(keyHash: string): Promise<StoredApiKey | null> {
    const record = await getPrisma().apiKey.findUnique({
      where: { keyHash },
    })

    if (!record) return null

    if (record.expiresAt && record.expiresAt < new Date()) {
      return null
    }

    const updated = await getPrisma().apiKey.update({
      where: { keyHash },
      data: { lastUsedAt: new Date() },
    })

    return toStoredApiKey(updated)
  }

  async listByOrg(orgId: string): Promise<StoredApiKey[]> {
    const records = await getPrisma().apiKey.findMany({
      where: { orgId },
    })

    return records.map(toStoredApiKey)
  }

  async revoke(id: string, orgId: string): Promise<boolean> {
    const record = await getPrisma().apiKey.findUnique({
      where: { id },
    })

    if (!record || record.orgId !== orgId) return false

    await getPrisma().apiKey.delete({
      where: { id },
    })

    return true
  }

  async clearStores(): Promise<void> {
    await getPrisma().apiKey.deleteMany()
  }
}

/** Singleton instance shared across routes */
export const apiKeyService = new ApiKeyService()
