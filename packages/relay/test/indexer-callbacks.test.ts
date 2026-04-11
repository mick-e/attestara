import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Prisma BEFORE importing the module under test.
// vi.hoisted() returns values available inside the hoisted vi.mock factory.
// ---------------------------------------------------------------------------

const { mockUpdateManyAgent, mockUpdateManyCommitment } = vi.hoisted(() => ({
  mockUpdateManyAgent: vi.fn(),
  mockUpdateManyCommitment: vi.fn(),
}))

vi.mock('../src/database.js', () => ({
  prisma: {
    agent: { updateMany: mockUpdateManyAgent },
    commitment: { updateMany: mockUpdateManyCommitment },
  },
}))

import { buildPrismaCallbacks } from '../src/indexer/callbacks.js'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildPrismaCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('onAgentRegistered', () => {
    it('calls prisma.agent.updateMany with correct where and data', async () => {
      mockUpdateManyAgent.mockResolvedValue({ count: 1 })

      const callbacks = buildPrismaCallbacks()
      await callbacks.onAgentRegistered!({
        agentId: '0xagentId01',
        did: 'did:ethr:0xABC',
        orgAdmin: '0xorgAdmin',
        blockNumber: 100,
        txHash: '0xtx01',
      })

      expect(mockUpdateManyAgent).toHaveBeenCalledOnce()
      expect(mockUpdateManyAgent).toHaveBeenCalledWith({
        where: { did: 'did:ethr:0xABC' },
        data: { registeredTxHash: '0xtx01', status: 'REGISTERED' },
      })
    })

    it('does not throw when zero rows match', async () => {
      mockUpdateManyAgent.mockResolvedValue({ count: 0 })

      const callbacks = buildPrismaCallbacks()
      await expect(
        callbacks.onAgentRegistered!({
          agentId: '0xunknown',
          did: 'did:ethr:0xNONE',
          orgAdmin: '0xorgAdmin',
          blockNumber: 999,
          txHash: '0xtxNone',
        }),
      ).resolves.not.toThrow()
    })

    it('catches and logs errors without throwing', async () => {
      mockUpdateManyAgent.mockRejectedValue(new Error('DB down'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const callbacks = buildPrismaCallbacks()
      await expect(
        callbacks.onAgentRegistered!({
          agentId: '0xfail',
          did: 'did:ethr:0xFAIL',
          orgAdmin: '0xorgAdmin',
          blockNumber: 1,
          txHash: '0xtxFail',
        }),
      ).resolves.not.toThrow()

      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('onCommitmentCreated', () => {
    it('calls prisma.commitment.updateMany with correct where and data', async () => {
      mockUpdateManyCommitment.mockResolvedValue({ count: 1 })

      const callbacks = buildPrismaCallbacks()
      await callbacks.onCommitmentCreated!({
        commitmentId: '0xcommitId01',
        sessionId: '0xsessionId01',
        agreementHash: '0xagreementHash',
        blockNumber: 200,
        txHash: '0xtx02',
      })

      expect(mockUpdateManyCommitment).toHaveBeenCalledOnce()
      expect(mockUpdateManyCommitment).toHaveBeenCalledWith({
        where: { agreementHash: '0xagreementHash' },
        data: { verified: true, blockNumber: 200, txHash: '0xtx02' },
      })
    })

    it('does not throw when zero rows match', async () => {
      mockUpdateManyCommitment.mockResolvedValue({ count: 0 })

      const callbacks = buildPrismaCallbacks()
      await expect(
        callbacks.onCommitmentCreated!({
          commitmentId: '0xunknown',
          sessionId: '0xunknown',
          agreementHash: '0xNONE',
          blockNumber: 999,
          txHash: '0xtxNone',
        }),
      ).resolves.not.toThrow()
    })

    it('catches and logs errors without throwing', async () => {
      mockUpdateManyCommitment.mockRejectedValue(new Error('DB down'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const callbacks = buildPrismaCallbacks()
      await expect(
        callbacks.onCommitmentCreated!({
          commitmentId: '0xfail',
          sessionId: '0xfail',
          agreementHash: '0xFAIL',
          blockNumber: 1,
          txHash: '0xtxFail',
        }),
      ).resolves.not.toThrow()

      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })
})
