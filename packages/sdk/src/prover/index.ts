import type { CircuitId, ProofResult, ProverConfig, VerificationResult } from '@attestara/types'
import { LocalProver } from './local.js'
import { RemoteProver } from './remote.js'

export interface Prover {
  generateProof(circuit: CircuitId, inputs: Record<string, bigint | string>): Promise<ProofResult>
  verifyProof(circuit: CircuitId, proof: ProofResult): Promise<VerificationResult>
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
}
