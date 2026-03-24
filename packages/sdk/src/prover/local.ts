import { readFile } from 'fs/promises'
import { join } from 'path'
import type {
  CircuitId,
  ProofResult,
  VerificationResult,
  ZKProof,
  PublicSignals,
} from '@attestara/types'
import type { Prover } from './index.js'

/**
 * Circuit artifact file names per circuit.
 * Each circuit needs a WASM file (for witness generation) and a zkey file (for proving).
 * Verification requires a verification_key.json.
 */
const CIRCUIT_FILES: Record<string, { wasm: string; zkey: string; vkey: string }> = {
  MandateBound: {
    wasm: 'MandateBound_js/MandateBound.wasm',
    zkey: 'MandateBound_final.zkey',
    vkey: 'MandateBound_verification_key.json',
  },
  ParameterRange: {
    wasm: 'ParameterRange_js/ParameterRange.wasm',
    zkey: 'ParameterRange_final.zkey',
    vkey: 'ParameterRange_verification_key.json',
  },
  CredentialFreshness: {
    wasm: 'CredentialFreshness_js/CredentialFreshness.wasm',
    zkey: 'CredentialFreshness_final.zkey',
    vkey: 'CredentialFreshness_verification_key.json',
  },
  IdentityBinding: {
    wasm: 'IdentityBinding_js/IdentityBinding.wasm',
    zkey: 'IdentityBinding_final.zkey',
    vkey: 'IdentityBinding_verification_key.json',
  },
}

/** Circuit version string embedded in proof results */
const CIRCUIT_VERSION = 'v1'

/**
 * Normalize circuit inputs: convert all values to strings for snarkjs.
 * Handles bigint, string, and array inputs (for IdentityBinding's tuple signals).
 */
function normalizeInputs(inputs: Record<string, unknown>): Record<string, string | string[]> {
  const normalized: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(inputs)) {
    if (Array.isArray(value)) {
      normalized[key] = value.map((v) => String(v))
    } else {
      normalized[key] = String(value)
    }
  }
  return normalized
}

/**
 * LocalProver generates and verifies Groth16 ZK proofs using snarkjs locally.
 *
 * Requires compiled circuit artifacts (WASM + zkey + verification key) to be
 * present in the configured circuitDir. These are produced by the Circom
 * compilation and trusted setup ceremony (see 01-zk-circuit-poc.md).
 */
export class LocalProver implements Prover {
  private snarkjs: typeof import('snarkjs') | null = null

  constructor(private circuitDir?: string) {}

  /**
   * Lazily load snarkjs to avoid import issues when the module is not installed.
   */
  private async getSnarkjs(): Promise<typeof import('snarkjs')> {
    if (!this.snarkjs) {
      try {
        this.snarkjs = await import('snarkjs')
      } catch {
        throw new Error(
          'snarkjs is not installed. Run: npm install snarkjs'
        )
      }
    }
    return this.snarkjs
  }

  /**
   * Resolve the file paths for a circuit's artifacts.
   */
  private getCircuitPaths(circuit: CircuitId): { wasmPath: string; zkeyPath: string; vkeyPath: string } {
    const files = CIRCUIT_FILES[circuit]
    if (!files) {
      throw new Error(`Unknown circuit: ${circuit}. Valid circuits: ${Object.keys(CIRCUIT_FILES).join(', ')}`)
    }
    return {
      wasmPath: join(this.circuitDir!, files.wasm),
      zkeyPath: join(this.circuitDir!, files.zkey),
      vkeyPath: join(this.circuitDir!, files.vkey),
    }
  }

  /**
   * Load a verification key JSON file.
   */
  private async loadVerificationKey(vkeyPath: string): Promise<unknown> {
    try {
      const raw = await readFile(vkeyPath, 'utf-8')
      return JSON.parse(raw)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to load verification key at ${vkeyPath}: ${message}`)
    }
  }

  /**
   * Verify that required circuit artifact files exist before attempting proof generation.
   */
  private async assertArtifactsExist(wasmPath: string, zkeyPath: string): Promise<void> {
    const errors: string[] = []
    try {
      await readFile(wasmPath)
    } catch {
      errors.push(`WASM file not found: ${wasmPath}`)
    }
    try {
      await readFile(zkeyPath, { flag: 'r' })
    } catch {
      errors.push(`zkey file not found: ${zkeyPath}`)
    }
    if (errors.length > 0) {
      throw new Error(
        `Missing circuit artifacts for proof generation:\n  ${errors.join('\n  ')}\n` +
        'Ensure circuits are compiled and trusted setup is complete. See 01-zk-circuit-poc.md.'
      )
    }
  }

  /**
   * Generate a Groth16 ZK proof for the specified circuit.
   *
   * @param circuit - Which circuit to prove (MandateBound, ParameterRange, etc.)
   * @param inputs - All circuit inputs (public + private). Keys must match the
   *                 signal names in the .circom file exactly.
   * @returns ProofResult with the Groth16 proof, public signals, and timing info.
   *
   * @throws If circuitDir is not configured, artifacts are missing, or witness
   *         generation fails (e.g., constraint violation from invalid inputs).
   */
  async generateProof(circuit: CircuitId, inputs: Record<string, bigint | string>): Promise<ProofResult> {
    if (!this.circuitDir) {
      throw new Error('Circuit directory not configured. Use TestProver for testing or configure circuitDir.')
    }

    const snarkjs = await this.getSnarkjs()
    const { wasmPath, zkeyPath } = this.getCircuitPaths(circuit)

    await this.assertArtifactsExist(wasmPath, zkeyPath)

    const normalizedInputs = normalizeInputs(inputs)

    const start = Date.now()
    let proof: unknown
    let publicSignals: string[]

    try {
      const result = await snarkjs.groth16.fullProve(normalizedInputs, wasmPath, zkeyPath)
      proof = result.proof
      publicSignals = result.publicSignals
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // snarkjs throws when witness generation fails (constraint violation)
      if (message.includes('Assert Failed') || message.includes('Error in template')) {
        throw new Error(
          `Proof generation failed for ${circuit}: constraint violation. ` +
          `The provided inputs do not satisfy the circuit constraints. ` +
          `Details: ${message}`
        )
      }
      throw new Error(`Proof generation failed for ${circuit}: ${message}`)
    }

    const generationTimeMs = Date.now() - start

    // Map snarkjs proof format to our ZKProof type
    const snarkProof = proof as {
      pi_a: string[]
      pi_b: string[][]
      pi_c: string[]
      protocol: string
      curve: string
    }

    const zkProof: ZKProof = {
      pi_a: [snarkProof.pi_a[0], snarkProof.pi_a[1]],
      pi_b: [
        [snarkProof.pi_b[0][0], snarkProof.pi_b[0][1]],
        [snarkProof.pi_b[1][0], snarkProof.pi_b[1][1]],
      ],
      pi_c: [snarkProof.pi_c[0], snarkProof.pi_c[1]],
      protocol: 'groth16',
      curve: 'bn128',
    }

    const publicSignalsResult: PublicSignals = {
      signals: publicSignals,
    }

    return {
      proof: zkProof,
      publicSignals: publicSignalsResult,
      circuitId: circuit,
      circuitVersion: CIRCUIT_VERSION,
      generationTimeMs,
    }
  }

  /**
   * Verify a Groth16 ZK proof locally using the circuit's verification key.
   *
   * @param circuit - Which circuit the proof was generated for.
   * @param proof - The ProofResult to verify.
   * @returns VerificationResult indicating whether the proof is valid.
   */
  async verifyProof(circuit: CircuitId, proof: ProofResult): Promise<VerificationResult> {
    if (!this.circuitDir) {
      throw new Error('Circuit directory not configured.')
    }

    const snarkjs = await this.getSnarkjs()
    const { vkeyPath } = this.getCircuitPaths(circuit)
    const vkey = await this.loadVerificationKey(vkeyPath)

    // Reconstruct the snarkjs proof format from our ZKProof type.
    // snarkjs expects the homogeneous coordinate '1' as the third element
    // for pi_a and pi_c (projective coordinates on BN128).
    const snarkProof = {
      pi_a: [...proof.proof.pi_a, '1'],
      pi_b: [...proof.proof.pi_b.map((pair) => [...pair]), ['1', '0']],
      pi_c: [...proof.proof.pi_c, '1'],
      protocol: proof.proof.protocol,
      curve: proof.proof.curve,
    }

    const start = Date.now()
    let valid: boolean

    try {
      valid = await snarkjs.groth16.verify(
        vkey,
        proof.publicSignals.signals,
        snarkProof
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Proof verification failed for ${circuit}: ${message}`)
    }

    const verificationTimeMs = Date.now() - start

    return {
      valid,
      circuitId: circuit,
      circuitVersion: proof.circuitVersion,
      verificationTimeMs,
    }
  }
}
