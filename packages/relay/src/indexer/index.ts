import { ethers } from 'ethers'
import { ChainEventListener } from './listener.js'
import { backfill } from './backfill.js'
import type { ContractAddresses, ListenerCallbacks } from './listener.js'

export interface IndexerConfig {
  rpcUrl: string
  contractAddresses?: ContractAddresses
  /** Block number to backfill from. If provided, backfill runs before live listening. */
  fromBlock?: number
  callbacks?: ListenerCallbacks
}

let activeListener: ChainEventListener | null = null

/**
 * Default event callbacks — log events to stdout.
 * Replace by supplying `config.callbacks` in production.
 */
function buildDefaultCallbacks(): ListenerCallbacks {
  return {
    onAgentRegistered(event) {
      console.info(
        { agentId: event.agentId, did: event.did, block: event.blockNumber },
        'Indexed: AgentRegistered',
      )
    },
    onCommitmentCreated(event) {
      console.info(
        {
          commitmentId: event.commitmentId,
          sessionId: event.sessionId,
          block: event.blockNumber,
        },
        'Indexed: CommitmentCreated',
      )
    },
  }
}

/**
 * Starts the chain event indexer.
 * - Only starts if `rpcUrl` is provided.
 * - Runs optional backfill for past events before attaching live listeners.
 * - Fault-tolerant: provider errors log warnings but don't crash the server.
 */
export async function startIndexer(config: IndexerConfig): Promise<void> {
  if (!config.rpcUrl) {
    console.info('Indexer skipped — no RPC URL configured')
    return
  }

  const callbacks = config.callbacks ?? buildDefaultCallbacks()
  const contractAddresses: ContractAddresses = config.contractAddresses ?? {}

  // Optional backfill of historical events
  if (config.fromBlock !== undefined && Object.keys(contractAddresses).length > 0) {
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl)
      const result = await backfill(provider, contractAddresses, callbacks, config.fromBlock)
      console.info(
        { totalCount: result.totalCount, fromBlock: config.fromBlock },
        'Backfill complete',
      )
      provider.destroy()
    } catch (err) {
      console.warn({ err }, 'Backfill failed — continuing with live listener only')
    }
  }

  // Start live listener
  activeListener = new ChainEventListener()

  try {
    await activeListener.start(config.rpcUrl, contractAddresses, callbacks)
    console.info('Chain event indexer started')
  } catch (err) {
    console.warn({ err }, 'Chain event indexer failed to start — server continues without indexer')
    activeListener = null
  }
}

/**
 * Gracefully stops the indexer, removing all listeners and disconnecting the provider.
 */
export async function stopIndexer(): Promise<void> {
  if (activeListener) {
    await activeListener.stop()
    activeListener = null
    console.info('Chain event indexer stopped')
  }
}
