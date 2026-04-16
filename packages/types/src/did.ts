export interface AgentRecord {
  id: string
  did: string
  orgId: string
  name: string
  status: AgentStatus
  publicKey: string
  metadata: Record<string, unknown>
  registeredTxHash: string | null
  createdAt: Date
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEACTIVATED = 'deactivated',
}

export interface DIDDocument {
  id: string
  verificationMethod: VerificationMethod[]
  authentication: string[]
  service?: ServiceEndpoint[] | undefined
}

export interface VerificationMethod {
  id: string
  type: string
  controller: string
  publicKeyHex?: string | undefined
}

export interface ServiceEndpoint {
  id: string
  type: string
  serviceEndpoint: string
}
