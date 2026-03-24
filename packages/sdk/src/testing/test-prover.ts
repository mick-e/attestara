import type { CircuitId, ProofResult, VerificationResult, ZKProof, PublicSignals } from '@attestara/types'
import type { Prover } from '../prover/index.js'

export class TestProver implements Prover {
  async generateProof(circuit: CircuitId, inputs: Record<string, bigint | string>): Promise<ProofResult> {
    const fakeProof: ZKProof = {
      pi_a: ['0x1', '0x2'],
      pi_b: [['0x3', '0x4'], ['0x5', '0x6']],
      pi_c: ['0x7', '0x8'],
      protocol: 'groth16',
      curve: 'bn128',
    }
    const fakeSignals: PublicSignals = {
      signals: Object.values(inputs).map(v => v.toString()),
    }
    return {
      proof: fakeProof,
      publicSignals: fakeSignals,
      circuitId: circuit,
      circuitVersion: 'v1-test',
      generationTimeMs: 10,
    }
  }

  async verifyProof(circuit: CircuitId, proof: ProofResult): Promise<VerificationResult> {
    return {
      valid: true,
      circuitId: circuit,
      circuitVersion: proof.circuitVersion,
      verificationTimeMs: 1,
    }
  }
}
