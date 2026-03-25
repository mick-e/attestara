import { ethers } from 'ethers'

// Minimal ABI fragments for events we care about
// Matches actual Solidity: AgentRegistry.sol / IAgentRegistry.sol
export const AGENT_REGISTRY_ABI = [
  'event AgentRegistered(bytes32 indexed agentId, string did, address indexed orgAdmin)',
  'event AgentUpdated(bytes32 indexed agentId, string metadata)',
  'event KeyRotated(bytes32 indexed agentId, bytes newPublicKey)',
  'event AgentDeactivated(bytes32 indexed agentId)',
]

// Matches actual Solidity: CommitmentContract.sol / ICommitmentContract.sol
export const COMMITMENT_CONTRACT_ABI = [
  'event SessionAnchored(bytes32 indexed sessionId, bytes32 merkleRoot, bytes32[] parties, uint256 turnCount)',
  'event CommitmentCreated(bytes32 indexed commitmentId, bytes32 indexed sessionId, bytes32 agreementHash)',
  'event CommitmentFlagged(bytes32 indexed commitmentId, address flaggedBy, string reason)',
]

export interface AgentRegisteredEvent {
  agentId: string
  did: string
  orgAdmin: string
  blockNumber: number
  txHash: string
}

export interface CommitmentCreatedEvent {
  commitmentId: string
  sessionId: string
  agreementHash: string
  blockNumber: number
  txHash: string
}

export interface ContractAddresses {
  agentRegistry?: string
  commitmentContract?: string
}

export type AgentRegisteredCallback = (event: AgentRegisteredEvent) => void | Promise<void>
export type CommitmentCreatedCallback = (event: CommitmentCreatedEvent) => void | Promise<void>

export interface ListenerCallbacks {
  onAgentRegistered?: AgentRegisteredCallback
  onCommitmentCreated?: CommitmentCreatedCallback
}

export class ChainEventListener {
  private provider: ethers.JsonRpcProvider | null = null
  private agentRegistryContract: ethers.Contract | null = null
  private commitmentContract: ethers.Contract | null = null
  private callbacks: ListenerCallbacks = {}

  setCallbacks(callbacks: ListenerCallbacks): void {
    this.callbacks = callbacks
  }

  async start(
    rpcUrl: string,
    contractAddresses: ContractAddresses,
    callbacks?: ListenerCallbacks,
  ): Promise<void> {
    if (callbacks) {
      this.callbacks = callbacks
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl)

    if (contractAddresses.agentRegistry) {
      this.agentRegistryContract = new ethers.Contract(
        contractAddresses.agentRegistry,
        AGENT_REGISTRY_ABI,
        this.provider,
      )

      this.agentRegistryContract.on(
        'AgentRegistered',
        async (agentId: string, did: string, orgAdmin: string, eventObj: ethers.EventLog) => {
          if (!this.callbacks.onAgentRegistered) return
          try {
            await this.callbacks.onAgentRegistered({
              agentId,
              did,
              orgAdmin,
              blockNumber: eventObj.blockNumber,
              txHash: eventObj.transactionHash,
            })
          } catch (err) {
            // Log but don't throw — listener must remain stable
            console.warn({ err }, 'Error processing AgentRegistered event')
          }
        },
      )
    }

    if (contractAddresses.commitmentContract) {
      this.commitmentContract = new ethers.Contract(
        contractAddresses.commitmentContract,
        COMMITMENT_CONTRACT_ABI,
        this.provider,
      )

      this.commitmentContract.on(
        'CommitmentCreated',
        async (
          commitmentId: string,
          sessionId: string,
          agreementHash: string,
          eventObj: ethers.EventLog,
        ) => {
          if (!this.callbacks.onCommitmentCreated) return
          try {
            await this.callbacks.onCommitmentCreated({
              commitmentId,
              sessionId,
              agreementHash,
              blockNumber: eventObj.blockNumber,
              txHash: eventObj.transactionHash,
            })
          } catch (err) {
            console.warn({ err }, 'Error processing CommitmentCreated event')
          }
        },
      )
    }
  }

  async stop(): Promise<void> {
    if (this.agentRegistryContract) {
      this.agentRegistryContract.removeAllListeners()
      this.agentRegistryContract = null
    }

    if (this.commitmentContract) {
      this.commitmentContract.removeAllListeners()
      this.commitmentContract = null
    }

    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }
  }
}
