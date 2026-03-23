export enum CircuitId {
  MANDATE_BOUND = 'MandateBound',
  PARAMETER_RANGE = 'ParameterRange',
  CREDENTIAL_FRESHNESS = 'CredentialFreshness',
  IDENTITY_BINDING = 'IdentityBinding',
}

export interface ZKProof {
  pi_a: [string, string]
  pi_b: [[string, string], [string, string]]
  pi_c: [string, string]
  protocol: 'groth16'
  curve: 'bn128'
}

export interface PublicSignals {
  signals: string[]
}

export interface ProofRequest {
  circuit: CircuitId
  publicInputs: Record<string, string | bigint>
  privateInputs: Record<string, string | bigint>
}

export interface ProofResult {
  proof: ZKProof
  publicSignals: PublicSignals
  circuitId: CircuitId
  circuitVersion: string
  generationTimeMs: number
}

export interface VerificationResult {
  valid: boolean
  circuitId: CircuitId
  circuitVersion: string
  verificationTimeMs: number
}
