import type { AgentClearConfig } from '@agentclear/types'
import { DIDManager } from './identity/index.js'
import { CredentialManager } from './credentials/index.js'
import { ProverManager } from './prover/index.js'
import { SessionManager } from './negotiation/index.js'
import { CommitmentManager } from './commitment/index.js'

export class AgentClearClient {
  readonly identity: DIDManager
  readonly credentials: CredentialManager
  readonly prover: ProverManager
  readonly negotiation: SessionManager
  readonly commitment: CommitmentManager

  constructor(config: AgentClearConfig) {
    this.identity = new DIDManager(config.network)
    this.credentials = new CredentialManager()
    this.prover = new ProverManager(config.prover)
    this.negotiation = new SessionManager()
    this.commitment = new CommitmentManager()
  }
}
