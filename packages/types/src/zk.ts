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

/**
 * Circuit-specific input types matching the actual Circom circuit signals.
 */

/** MandateBound circuit: proves proposed <= max_value without revealing max_value */
export interface MandateBoundInputs {
  proposed: bigint | string
  commitment: bigint | string
  max_value: bigint | string
  randomness: bigint | string
}

/** ParameterRange circuit: proves floor <= proposed <= ceiling without revealing bounds */
export interface ParameterRangeInputs {
  proposed: bigint | string
  commitment: bigint | string
  floor: bigint | string
  ceiling: bigint | string
  randomness: bigint | string
}

/** CredentialFreshness circuit: proves credential is valid at current_timestamp */
export interface CredentialFreshnessInputs {
  current_timestamp: bigint | string
  credential_commitment: bigint | string
  issuance_timestamp: bigint | string
  expiry_timestamp: bigint | string
  credential_data_hash: bigint | string
  blinding_factor: bigint | string
}

/** IdentityBinding circuit: proves session key is controlled by DID key owner */
export interface IdentityBindingInputs {
  did_public_key: [bigint | string, bigint | string]
  session_commitment: bigint | string
  did_private_key: bigint | string
  session_id: bigint | string
  session_public_key: [bigint | string, bigint | string]
}

/** Map from CircuitId to its typed inputs */
export type CircuitInputMap = {
  [CircuitId.MANDATE_BOUND]: MandateBoundInputs
  [CircuitId.PARAMETER_RANGE]: ParameterRangeInputs
  [CircuitId.CREDENTIAL_FRESHNESS]: CredentialFreshnessInputs
  [CircuitId.IDENTITY_BINDING]: IdentityBindingInputs
}

/** A bundled set of ZK proofs for a single negotiation turn */
export interface TurnProofBundle {
  proofs: ProofResult[]
  sessionId: string
  turnSequence: number
  bundleHash: string
  generatedAt: Date
  totalGenerationTimeMs: number
}
