import { ethers } from 'ethers'
import {
  AGENT_REGISTRY_ABI,
  COMMITMENT_CONTRACT_ABI,
  type AgentRegisteredEvent,
  type CommitmentCreatedEvent,
  type ContractAddresses,
  type ListenerCallbacks,
} from './listener.js'

export interface BackfillResult {
  agentRegisteredCount: number
  commitmentCreatedCount: number
  totalCount: number
}

/**
 * Query past events in a block range and process them through the same callbacks as the listener.
 * @param provider  ethers provider
 * @param contractAddresses  addresses of the contracts to query
 * @param callbacks  event callbacks (same interface as listener)
 * @param fromBlock  start of block range (inclusive)
 * @param toBlock    end of block range (inclusive), defaults to 'latest'
 * @returns counts of events processed
 */
export async function backfill(
  provider: ethers.JsonRpcProvider,
  contractAddresses: ContractAddresses,
  callbacks: ListenerCallbacks,
  fromBlock: number,
  toBlock: number | 'latest' = 'latest',
): Promise<BackfillResult> {
  let agentRegisteredCount = 0
  let commitmentCreatedCount = 0

  if (contractAddresses.agentRegistry && callbacks.onAgentRegistered) {
    const contract = new ethers.Contract(
      contractAddresses.agentRegistry,
      AGENT_REGISTRY_ABI,
      provider,
    )

    const filter = contract.filters.AgentRegistered()
    const events = await contract.queryFilter(filter, fromBlock, toBlock) as ethers.EventLog[]

    for (const event of events) {
      const [agentId, did, orgAdmin] = event.args as unknown as [string, string, string]
      try {
        await callbacks.onAgentRegistered({
          agentId,
          did,
          orgAdmin,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        } satisfies AgentRegisteredEvent)
        agentRegisteredCount++
      } catch (err) {
        console.warn({ err }, 'Error processing backfilled AgentRegistered event')
      }
    }
  }

  if (contractAddresses.commitmentContract && callbacks.onCommitmentCreated) {
    const contract = new ethers.Contract(
      contractAddresses.commitmentContract,
      COMMITMENT_CONTRACT_ABI,
      provider,
    )

    const filter = contract.filters.CommitmentCreated()
    const events = await contract.queryFilter(filter, fromBlock, toBlock) as ethers.EventLog[]

    for (const event of events) {
      const [commitmentId, sessionId, agreementHash] = event.args as unknown as [string, string, string]
      try {
        await callbacks.onCommitmentCreated({
          commitmentId,
          sessionId,
          agreementHash,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        } satisfies CommitmentCreatedEvent)
        commitmentCreatedCount++
      } catch (err) {
        console.warn({ err }, 'Error processing backfilled CommitmentCreated event')
      }
    }
  }

  return {
    agentRegisteredCount,
    commitmentCreatedCount,
    totalCount: agentRegisteredCount + commitmentCreatedCount,
  }
}
