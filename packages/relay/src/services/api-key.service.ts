import { randomUUID } from 'crypto'
import { generateApiKey } from '../middleware/auth.js'

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

export class ApiKeyService {
  private keys = new Map<string, StoredApiKey>()
  private orgIndex = new Map<string, Set<string>>() // orgId -> Set<keyId>

  create(
    orgId: string,
    name: string,
    scopes: string[],
    expiresAt?: string,
  ): { apiKey: StoredApiKey; rawKey: string } {
    const { raw, hash } = generateApiKey()

    const apiKey: StoredApiKey = {
      id: randomUUID(),
      orgId,
      keyHash: hash,
      name,
      scopes,
      lastUsedAt: null,
      expiresAt: expiresAt ?? null,
      createdAt: new Date().toISOString(),
    }

    this.keys.set(apiKey.id, apiKey)

    if (!this.orgIndex.has(orgId)) {
      this.orgIndex.set(orgId, new Set())
    }
    this.orgIndex.get(orgId)!.add(apiKey.id)

    return { apiKey, rawKey: raw }
  }

  listByOrg(orgId: string): StoredApiKey[] {
    const keyIds = this.orgIndex.get(orgId)
    if (!keyIds) return []
    return Array.from(keyIds)
      .map(id => this.keys.get(id))
      .filter((k): k is StoredApiKey => k !== undefined)
  }

  revoke(id: string, orgId: string): boolean {
    const key = this.keys.get(id)
    if (!key || key.orgId !== orgId) return false

    this.keys.delete(id)
    const orgKeys = this.orgIndex.get(orgId)
    if (orgKeys) {
      orgKeys.delete(id)
    }
    return true
  }

  validateByHash(keyHash: string): StoredApiKey | null {
    for (const key of this.keys.values()) {
      if (key.keyHash === keyHash) {
        // Check expiry
        if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
          return null
        }
        // Update lastUsedAt
        key.lastUsedAt = new Date().toISOString()
        return key
      }
    }
    return null
  }

  clearStores(): void {
    this.keys.clear()
    this.orgIndex.clear()
  }
}

/** Singleton instance shared across routes */
export const apiKeyService = new ApiKeyService()
