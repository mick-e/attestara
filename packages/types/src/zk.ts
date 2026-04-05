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

/**
 * Circuit name to identifier string mapping for on-chain VerifierRegistry.
 * The circuit ID is computed as keccak256("<name>-<semver>") where the
 * semver has no 'v' prefix. This mapping defines the canonical names.
 */
export const CIRCUIT_NAMES: Record<CircuitId, string> = {
  [CircuitId.MANDATE_BOUND]: 'mandate-bound',
  [CircuitId.PARAMETER_RANGE]: 'parameter-range',
  [CircuitId.CREDENTIAL_FRESHNESS]: 'credential-freshness',
  [CircuitId.IDENTITY_BINDING]: 'identity-binding',
}

/**
 * Derive the on-chain circuit identifier (bytes32) from a circuit name and version.
 * Matches the VerifierRegistry's keccak256(abi.encodePacked("<name>-<semver>")) scheme.
 *
 * @param circuitName - Canonical circuit name (e.g., "mandate-bound")
 * @param version - Semantic version with optional 'v' prefix (e.g., "v1.0.0" or "1.0.0")
 * @returns The identifier string to be hashed with keccak256 (e.g., "mandate-bound-1.0.0")
 */
export function deriveCircuitIdString(circuitName: string, version: string): string {
  const semver = version.startsWith('v') ? version.slice(1) : version
  return `${circuitName}-${semver}`
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
