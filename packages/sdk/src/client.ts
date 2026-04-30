import type { AttestaraConfig } from '@attestara/types'
import { DIDManager } from './identity/index.js'
import { CredentialManager, PinataIPFSClient, MemoryIPFSClient } from './credentials/index.js'
import type { IPFSClient } from './credentials/index.js'
import { ProverManager } from './prover/index.js'
import { SessionManager } from './negotiation/index.js'
import { CommitmentManager } from './commitment/index.js'

function resolveIPFS(_config: AttestaraConfig): IPFSClient {
  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  const gatewayUrl = process.env.IPFS_GATEWAY_URL

  if (apiKey) {
    return new PinataIPFSClient(apiKey, apiSecret, gatewayUrl)
  }
  return new MemoryIPFSClient()
}

export class AttestaraClient {
  readonly identity: DIDManager
  readonly credentials: CredentialManager
  readonly prover: ProverManager
  readonly negotiation: SessionManager
  readonly commitment: CommitmentManager

  constructor(config: AttestaraConfig) {
    this.identity = new DIDManager(config.network)
    this.credentials = new CredentialManager(resolveIPFS(config))
    this.prover = new ProverManager(config.prover)
    this.negotiation = new SessionManager(config.relay)
    const rpcUrl: string | undefined = Array.isArray(config.network.rpcUrl) ? config.network.rpcUrl[0] : config.network.rpcUrl
    this.commitment = new CommitmentManager({
      rpcUrl,
      contractAddress: config.network.contracts?.commitmentContract,
      privateKey: process.env.DEPLOYER_PRIVATE_KEY,
    })
  }
}
