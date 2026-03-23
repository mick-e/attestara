import { createHash, createHmac, randomUUID } from 'crypto'
import type { AuthorityCredential, MandateParams, CredentialProof } from '@agentclear/types'
import type { IPFSClient } from './ipfs.js'
import { AGENT_AUTHORITY_CREDENTIAL_TYPE, CREDENTIAL_CONTEXT } from './schemas.js'

export { AGENT_AUTHORITY_CREDENTIAL_TYPE, CREDENTIAL_CONTEXT } from './schemas.js'
export { IPFSClient, PinataIPFSClient, MemoryIPFSClient } from './ipfs.js'

export interface IssueOptions {
  expiresInSeconds?: number
  signingKey?: string
}

export class CredentialManager {
  private revokedHashes: Set<string> = new Set()
  private ipfs: IPFSClient | null

  constructor(ipfs?: IPFSClient) {
    this.ipfs = ipfs ?? null
  }

  /**
   * Issue a W3C Verifiable Credential encoding agent authority (mandate).
   */
  async issue(
    agentDid: string,
    mandate: MandateParams,
    options: IssueOptions = {},
  ): Promise<AuthorityCredential> {
    const now = new Date()
    const expiresIn = options.expiresInSeconds ?? 86400 * 30 // 30 days default
    const expiration = new Date(now.getTime() + expiresIn * 1000)

    const credentialId = `urn:uuid:${randomUUID()}`

    // Serialize mandate for hashing (bigint → string)
    const mandateSerialized: Record<string, unknown> = {
      maxValue: mandate.maxValue.toString(),
      currency: mandate.currency,
      domain: mandate.domain,
    }
    if (mandate.parameterFloor !== undefined) {
      mandateSerialized.parameterFloor = mandate.parameterFloor.toString()
    }
    if (mandate.parameterCeiling !== undefined) {
      mandateSerialized.parameterCeiling = mandate.parameterCeiling.toString()
    }
    if (mandate.allowedCounterparties) {
      mandateSerialized.allowedCounterparties = mandate.allowedCounterparties
    }

    // Build proof (simplified JWS-like signature for MVP)
    const proofPayload = JSON.stringify({
      id: credentialId,
      issuer: agentDid,
      subject: agentDid,
      mandate: mandateSerialized,
      issuanceDate: now.toISOString(),
      expirationDate: expiration.toISOString(),
    })

    const signingKey = options.signingKey ?? agentDid
    const jws = createHmac('sha256', signingKey)
      .update(proofPayload)
      .digest('base64url')

    const proof: CredentialProof = {
      type: 'Ed25519Signature2020',
      created: now.toISOString(),
      verificationMethod: `${agentDid}#keys-1`,
      proofPurpose: 'assertionMethod',
      jws,
    }

    const credential: AuthorityCredential = {
      id: credentialId,
      type: ['VerifiableCredential', AGENT_AUTHORITY_CREDENTIAL_TYPE],
      issuer: agentDid,
      issuanceDate: now.toISOString(),
      expirationDate: expiration.toISOString(),
      credentialSubject: {
        id: agentDid,
        mandateParams: mandate,
      },
      proof,
    }

    return credential
  }

  /**
   * Verify the structural validity and signature of a credential.
   */
  async verify(credential: AuthorityCredential): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    // Check required fields
    if (!credential.id) errors.push('Missing credential id')
    if (!credential.issuer) errors.push('Missing issuer')
    if (!credential.issuanceDate) errors.push('Missing issuance date')
    if (!credential.expirationDate) errors.push('Missing expiration date')
    if (!credential.credentialSubject) errors.push('Missing credential subject')
    if (!credential.proof) errors.push('Missing proof')

    // Check type
    if (
      !credential.type ||
      !credential.type.includes('VerifiableCredential') ||
      !credential.type.includes(AGENT_AUTHORITY_CREDENTIAL_TYPE)
    ) {
      errors.push('Invalid credential type')
    }

    // Check expiration
    if (credential.expirationDate) {
      const expiry = new Date(credential.expirationDate)
      if (expiry < new Date()) {
        errors.push('Credential has expired')
      }
    }

    // Check revocation
    const hash = this.hashCredential(credential)
    if (this.revokedHashes.has(hash)) {
      errors.push('Credential has been revoked')
    }

    // Check mandate params
    if (credential.credentialSubject?.mandateParams) {
      const mp = credential.credentialSubject.mandateParams
      if (!mp.currency) errors.push('Missing mandate currency')
      if (!mp.domain) errors.push('Missing mandate domain')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Store a credential on IPFS and return the CID.
   */
  async store(credential: AuthorityCredential): Promise<string> {
    if (!this.ipfs) {
      throw new Error('No IPFS client configured')
    }
    // Serialize bigints for JSON storage
    const serializable = this.toSerializable(credential)
    return this.ipfs.store(serializable)
  }

  /**
   * Retrieve a credential from IPFS by CID.
   */
  async retrieve(cid: string): Promise<AuthorityCredential> {
    if (!this.ipfs) {
      throw new Error('No IPFS client configured')
    }
    const data = await this.ipfs.retrieve(cid)
    return this.fromSerializable(data as Record<string, unknown>)
  }

  /**
   * Revoke a credential by its hash (off-chain for MVP; on-chain in contract integration).
   */
  async revoke(credentialHash: string): Promise<void> {
    this.revokedHashes.add(credentialHash)
  }

  /**
   * Compute the SHA-256 hash of a credential.
   */
  hashCredential(credential: AuthorityCredential): string {
    const serializable = this.toSerializable(credential)
    return createHash('sha256')
      .update(JSON.stringify(serializable))
      .digest('hex')
  }

  private toSerializable(credential: AuthorityCredential): Record<string, unknown> {
    return {
      ...credential,
      credentialSubject: {
        ...credential.credentialSubject,
        mandateParams: {
          ...credential.credentialSubject.mandateParams,
          maxValue: credential.credentialSubject.mandateParams.maxValue.toString(),
          parameterFloor: credential.credentialSubject.mandateParams.parameterFloor?.toString(),
          parameterCeiling: credential.credentialSubject.mandateParams.parameterCeiling?.toString(),
        },
      },
    }
  }

  private fromSerializable(data: Record<string, unknown>): AuthorityCredential {
    const cred = data as unknown as AuthorityCredential
    const mp = (data as any).credentialSubject?.mandateParams
    if (mp) {
      mp.maxValue = BigInt(mp.maxValue)
      if (mp.parameterFloor !== undefined && mp.parameterFloor !== null) {
        mp.parameterFloor = BigInt(mp.parameterFloor)
      }
      if (mp.parameterCeiling !== undefined && mp.parameterCeiling !== null) {
        mp.parameterCeiling = BigInt(mp.parameterCeiling)
      }
    }
    return cred
  }
}
