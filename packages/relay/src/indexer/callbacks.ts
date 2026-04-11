import { prisma } from '../database.js'
import type { ListenerCallbacks } from './listener.js'

/**
 * Build Prisma-backed callbacks for on-chain event processing.
 *
 * When the indexer detects an AgentRegistered or CommitmentCreated event
 * on-chain, these callbacks update the corresponding relay database rows.
 */
export function buildPrismaCallbacks(): ListenerCallbacks {
  return {
    async onAgentRegistered(event) {
      try {
        const result = await prisma.agent.updateMany({
          where: { did: event.did },
          data: { registeredTxHash: event.txHash, status: 'REGISTERED' },
        })
        console.log(
          { did: event.did, txHash: event.txHash, count: result.count },
          'Indexed AgentRegistered event',
        )
      } catch (err) {
        console.warn({ err, did: event.did }, 'Failed to index AgentRegistered event')
      }
    },

    async onCommitmentCreated(event) {
      try {
        const result = await prisma.commitment.updateMany({
          where: { agreementHash: event.agreementHash },
          data: {
            verified: true,
            blockNumber: event.blockNumber,
            txHash: event.txHash,
          },
        })
        console.log(
          { agreementHash: event.agreementHash, txHash: event.txHash, count: result.count },
          'Indexed CommitmentCreated event',
        )
      } catch (err) {
        console.warn(
          { err, agreementHash: event.agreementHash },
          'Failed to index CommitmentCreated event',
        )
      }
    },
  }
}
