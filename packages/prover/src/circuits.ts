import { readFile, access, readdir } from 'fs/promises'
import { join } from 'path'
import { CircuitNotFoundError } from './errors.js'

export interface CircuitArtifacts {
  wasmPath: string
  zkeyPath: string
  verificationKey: Record<string, unknown>
}

export interface CircuitMetadata {
  id: string
  name: string
  version: string
  constraintCount: number
  publicInputs: string[]
  privateInputs: string[]
  available: boolean
}

const CIRCUIT_METADATA: Record<string, Omit<CircuitMetadata, 'available'>> = {
  MandateBound: {
    id: 'MandateBound',
    name: 'Mandate Bound',
    version: '1.0.0',
    constraintCount: 350,
    publicInputs: ['commitment', 'proposed'],
    privateInputs: ['max_value', 'randomness'],
  },
  ParameterRange: {
    id: 'ParameterRange',
    name: 'Parameter Range',
    version: '1.0.0',
    constraintCount: 550,
    publicInputs: ['commitment_floor', 'commitment_ceiling', 'proposed'],
    privateInputs: ['floor_val', 'ceiling_val', 'r1', 'r2'],
  },
  CredentialFreshness: {
    id: 'CredentialFreshness',
    name: 'Credential Freshness',
    version: '1.0.0',
    constraintCount: 430,
    publicInputs: ['credential_hash', 'current_timestamp'],
    privateInputs: ['issuance_timestamp', 'expiry_timestamp', 'credential_data_hash', 'r'],
  },
  IdentityBinding: {
    id: 'IdentityBinding',
    name: 'Identity Binding',
    version: '1.0.0',
    constraintCount: 932,
    publicInputs: ['did_public_key', 'session_commitment'],
    privateInputs: ['did_private_key', 'session_id', 'session_public_key'],
  },
}

// Map circuit IDs to their directory names
const CIRCUIT_DIR_NAMES: Record<string, string> = {
  MandateBound: 'mandate_bound',
  ParameterRange: 'parameter_range',
  CredentialFreshness: 'credential_freshness',
  IdentityBinding: 'identity_binding',
}

export class CircuitManager {
  private artifacts = new Map<string, CircuitArtifacts>()
  private circuitDir: string

  constructor(circuitDir: string) {
    this.circuitDir = circuitDir
  }

  async initialize(): Promise<void> {
    for (const [circuitId, dirName] of Object.entries(CIRCUIT_DIR_NAMES)) {
      try {
        const artifacts = await this.loadCircuitArtifacts(circuitId, dirName)
        this.artifacts.set(circuitId, artifacts)
      } catch (err: unknown) {
        console.warn(`[CircuitManager] Artifacts for ${circuitId} not available — skipping`, err)
      }
    }
  }

  private async loadCircuitArtifacts(circuitId: string, dirName: string): Promise<CircuitArtifacts> {
    const wasmPath = join(this.circuitDir, `${dirName}_js`, `${dirName}.wasm`)
    const zkeyPath = join(this.circuitDir, `${dirName}_final.zkey`)
    const vkeyPath = join(this.circuitDir, 'verification_keys', `${dirName}_vkey.json`)

    // Verify files exist
    await access(wasmPath)
    await access(zkeyPath)
    await access(vkeyPath)

    const vkeyData = await readFile(vkeyPath, 'utf-8')
    const verificationKey = JSON.parse(vkeyData) as Record<string, unknown>

    return { wasmPath, zkeyPath, verificationKey }
  }

  getArtifacts(circuitId: string): CircuitArtifacts {
    const artifacts = this.artifacts.get(circuitId)
    if (!artifacts) {
      throw new CircuitNotFoundError(circuitId)
    }
    return artifacts
  }

  hasCircuit(circuitId: string): boolean {
    return this.artifacts.has(circuitId)
  }

  getAvailableCircuits(): CircuitMetadata[] {
    return Object.entries(CIRCUIT_METADATA).map(([id, meta]) => ({
      ...meta,
      available: this.artifacts.has(id),
    }))
  }

  getMetadata(circuitId: string): CircuitMetadata | undefined {
    const meta = CIRCUIT_METADATA[circuitId]
    if (!meta) return undefined
    return { ...meta, available: this.artifacts.has(circuitId) }
  }

  getVerificationKey(circuitId: string): Record<string, unknown> {
    return this.getArtifacts(circuitId).verificationKey
  }

  get loadedCount(): number {
    return this.artifacts.size
  }
}
