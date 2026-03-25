import { randomUUID } from 'crypto'

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

export class CredentialService {
  private credentials = new Map<string, StoredCredential>()

  create(orgId: string, data: CreateCredentialData): StoredCredential | { error: string; code: string } {
    // Check for duplicate hash (global uniqueness)
    for (const cred of this.credentials.values()) {
      if (cred.credentialHash === data.credentialHash) {
        return { error: 'Credential hash already exists', code: 'DUPLICATE_CREDENTIAL_HASH' }
      }
    }

    const credential: StoredCredential = {
      id: randomUUID(),
      orgId,
      agentId: data.agentId,
      credentialHash: data.credentialHash,
      schemaHash: data.schemaHash,
      ipfsCid: data.ipfsCid ?? null,
      credentialDataCached: data.credentialData ?? null,
      expiry: data.expiry,
      revoked: false,
      registeredTxHash: null,
      createdAt: new Date().toISOString(),
    }

    this.credentials.set(credential.id, credential)
    return credential
  }

  listByOrg(orgId: string): StoredCredential[] {
    return Array.from(this.credentials.values()).filter(c => c.orgId === orgId)
  }

  getById(id: string, orgId: string): StoredCredential | null {
    const credential = this.credentials.get(id)
    if (!credential || credential.orgId !== orgId) return null
    return credential
  }

  revoke(id: string, orgId: string): StoredCredential | null {
    const credential = this.credentials.get(id)
    if (!credential || credential.orgId !== orgId) return null
    credential.revoked = true
    return credential
  }

  clearStores(): void {
    this.credentials.clear()
  }
}

/** Singleton instance shared across routes */
export const credentialService = new CredentialService()
