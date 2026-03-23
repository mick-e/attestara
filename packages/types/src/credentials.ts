export interface MandateParams {
  maxValue: bigint
  currency: string
  domain: string
  parameterFloor?: bigint
  parameterCeiling?: bigint
  allowedCounterparties?: string[]
}

export interface AuthorityCredential {
  id: string
  type: string[]
  issuer: string
  issuanceDate: string
  expirationDate: string
  credentialSubject: {
    id: string
    mandateParams: MandateParams
  }
  proof: CredentialProof
}

export interface CredentialProof {
  type: string
  created: string
  verificationMethod: string
  proofPurpose: string
  jws: string
}

export interface CredentialRecord {
  id: string
  orgId: string
  agentId: string
  credentialHash: string
  schemaHash: string
  ipfsCid: string | null
  mandateParamsEncrypted: Buffer | null
  expiry: Date
  revoked: boolean
  registeredTxHash: string | null
  createdAt: Date
}

export enum CredentialStatus {
  VALID = 'valid',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}
