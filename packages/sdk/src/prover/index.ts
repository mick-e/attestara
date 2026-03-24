import { createHash } from 'crypto'
import type {
  CircuitId,
  ProofResult,
  ProverConfig,
  TurnProofBundle,
  VerificationResult,
} from '@attestara/types'
import { LocalProver } from './local.js'
import { RemoteProver } from './remote.js'

export interface Prover {
  generateProof(circuit: CircuitId, inputs: Record<string, bigint | string>): Promise<ProofResult>
  verifyProof(circuit: CircuitId, proof: ProofResult): Promise<VerificationResult>
}

/** Input specification for a single circuit proof within a bundle */
export interface BundleProofRequest {
  circuit: CircuitId
  inputs: Record<string, bigint | string>
}

export class ProverManager implements Prover {
  private prover: Prover

  constructor(config: ProverConfig) {
    this.prover = config.mode === 'remote'
      ? new RemoteProver(config.remoteUrl!)
      : new LocalProver(config.circuitDir)
  }

  async generateProof(circuit: CircuitId, inputs: Record<string, bigint | string>): Promise<ProofResult> {
    return this.prover.generateProof(circuit, inputs)
  }

  async verifyProof(circuit: CircuitId, proof: ProofResult): Promise<VerificationResult> {
    return this.prover.verifyProof(circuit, proof)
  }

  /**
   * Generate a TurnProofBundle by proving multiple circuits for a single negotiation turn.
   *
   * All requested circuit proofs are generated in parallel. If any proof fails,
   * the entire bundle generation fails (atomic — all must succeed).
   *
   * @param sessionId - The negotiation session ID this bundle belongs to
   * @param turnSequence - The turn sequence number
   * @param requests - Array of circuit proof requests (circuit + inputs)
   * @returns A TurnProofBundle containing all generated proofs
   */
  async generateTurnProofBundle(
    sessionId: string,
    turnSequence: number,
    requests: BundleProofRequest[]
  ): Promise<TurnProofBundle> {
    if (requests.length === 0) {
      throw new Error('At least one proof request is required for a TurnProofBundle')
    }

    const start = Date.now()

    // Generate all proofs in parallel
    const proofs = await Promise.all(
      requests.map((req) => this.prover.generateProof(req.circuit, req.inputs))
    )

    const totalGenerationTimeMs = Date.now() - start

    // Compute a hash over all proofs to create a bundle anchor
    const bundleHash = computeBundleHash(sessionId, turnSequence, proofs)

    return {
      proofs,
      sessionId,
      turnSequence,
      bundleHash,
      generatedAt: new Date(),
      totalGenerationTimeMs,
    }
  }

  /**
   * Verify all proofs in a TurnProofBundle.
   *
   * Returns verification results for each proof. The bundle is considered valid
   * only if ALL proofs verify successfully.
   *
   * @param bundle - The TurnProofBundle to verify
   * @returns Array of VerificationResults (one per proof) and an overall valid flag
   */
  async verifyTurnProofBundle(
    bundle: TurnProofBundle
  ): Promise<{ valid: boolean; results: VerificationResult[] }> {
    // Verify bundle hash integrity
    const expectedHash = computeBundleHash(bundle.sessionId, bundle.turnSequence, bundle.proofs)
    if (expectedHash !== bundle.bundleHash) {
      throw new Error('TurnProofBundle hash mismatch — bundle may have been tampered with')
    }

    // Verify all proofs in parallel
    const results = await Promise.all(
      bundle.proofs.map((proof) => this.prover.verifyProof(proof.circuitId, proof))
    )

    const valid = results.every((r) => r.valid)

    return { valid, results }
  }
}

/**
 * Compute a deterministic hash over a bundle's contents for integrity verification.
 */
function computeBundleHash(
  sessionId: string,
  turnSequence: number,
  proofs: ProofResult[]
): string {
  const data = JSON.stringify({
    sessionId,
    turnSequence,
    proofs: proofs.map((p) => ({
      circuitId: p.circuitId,
      publicSignals: p.publicSignals.signals,
      pi_a: p.proof.pi_a,
      pi_b: p.proof.pi_b,
      pi_c: p.proof.pi_c,
    })),
  })
  return createHash('sha256').update(data).digest('hex')
}
