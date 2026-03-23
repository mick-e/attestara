import type { CircuitId, ProofResult, VerificationResult } from '@agentclear/types'
import type { Prover } from './index.js'

export class LocalProver implements Prover {
  constructor(private circuitDir?: string) {}

  async generateProof(circuit: CircuitId, inputs: Record<string, bigint | string>): Promise<ProofResult> {
    // Real snarkjs integration will be added when circuit artifacts are available (Track 1)
    // For now, throw if no circuit dir is configured
    if (!this.circuitDir) {
      throw new Error('Circuit directory not configured. Use TestProver for testing or configure circuitDir.')
    }
    // TODO: Real snarkjs.groth16.fullProve() call
    throw new Error('Real proof generation not yet implemented — waiting for circuit artifacts from Track 1')
  }

  async verifyProof(circuit: CircuitId, proof: ProofResult): Promise<VerificationResult> {
    if (!this.circuitDir) {
      throw new Error('Circuit directory not configured.')
    }
    throw new Error('Real proof verification not yet implemented')
  }
}
