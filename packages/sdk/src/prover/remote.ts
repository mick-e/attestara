import type { CircuitId, ProofResult, VerificationResult } from '@attestara/types'
import type { Prover } from './index.js'

const CIRCUIT_ENDPOINTS: Record<string, string> = {
  MandateBound: '/prove/mandate-bound',
  ParameterRange: '/prove/parameter-range',
  CredentialFreshness: '/prove/credential-freshness',
  IdentityBinding: '/prove/identity-binding',
}

export class RemoteProver implements Prover {
  constructor(private baseUrl: string) {}

  async generateProof(circuit: CircuitId, inputs: Record<string, bigint | string>): Promise<ProofResult> {
    const endpoint = CIRCUIT_ENDPOINTS[circuit]
    if (!endpoint) throw new Error(`Unknown circuit: ${circuit}`)

    const start = Date.now()
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: serializeInputs(inputs) }),
    })
    if (!res.ok) throw new Error(`Proof generation failed: ${res.statusText}`)
    const data = (await res.json()) as Omit<ProofResult, 'generationTimeMs'>
    return { ...data, generationTimeMs: Date.now() - start }
  }

  async verifyProof(circuit: CircuitId, proof: ProofResult): Promise<VerificationResult> {
    const start = Date.now()
    const res = await fetch(`${this.baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circuit, proof: proof.proof, publicSignals: proof.publicSignals }),
    })
    if (!res.ok) throw new Error(`Verification failed: ${res.statusText}`)
    const data = (await res.json()) as Omit<VerificationResult, 'verificationTimeMs'>
    return { ...data, verificationTimeMs: Date.now() - start }
  }
}

function serializeInputs(inputs: Record<string, bigint | string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(inputs).map(([k, v]) => [k, v.toString()])
  )
}
