import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChainCommitmentClient } from '../src/commitment/chain.js'

/**
 * Tests for the on-chain commitment client.
 *
 * ethers.JsonRpcProvider is used without network connectivity — constructor
 * itself does not dial the RPC, so we can instantiate freely. Methods that
 * would contact the chain are exercised via mocked contract behaviour.
 */

describe('ChainCommitmentClient', () => {
  describe('construction', () => {
    it('should construct without signer when no private key provided', () => {
      const client = new ChainCommitmentClient('http://localhost:8545')
      expect(client).toBeInstanceOf(ChainCommitmentClient)
    })

    it('should construct with signer when private key provided', () => {
      const pk = '0x' + '11'.repeat(32)
      const client = new ChainCommitmentClient(
        'http://localhost:8545',
        '0x' + '0'.repeat(40),
        pk,
      )
      expect(client).toBeInstanceOf(ChainCommitmentClient)
    })
  })

  describe('submit()', () => {
    it('should reject when contract address is not configured', async () => {
      const client = new ChainCommitmentClient('http://localhost:8545')
      await expect(
        client.submit({
          agreementHash: '0xabc',
          parties: ['did:ethr:0xAAA'],
          merkleRoot: '0xroot',
          credentialHashes: ['0xcred'],
        }),
      ).rejects.toThrow('Commitment contract address not configured')
    })

    it('should reject when signer is not configured', async () => {
      const client = new ChainCommitmentClient(
        'http://localhost:8545',
        '0x' + '1'.repeat(40),
      )
      await expect(
        client.submit({
          agreementHash: '0xabc',
          parties: ['did:ethr:0xAAA'],
          merkleRoot: '0xroot',
          credentialHashes: ['0xcred'],
        }),
      ).rejects.toThrow('Signer (private key) required')
    })
  })

  describe('verifyOnChain()', () => {
    it('should throw when contract address not configured', async () => {
      // getContract() is called before the try/catch in verifyOnChain,
      // so a missing contract address surfaces as a thrown error.
      const client = new ChainCommitmentClient('http://localhost:8545')
      await expect(client.verifyOnChain('some-id')).rejects.toThrow(
        'Commitment contract address not configured',
      )
    })

    it('should return null when the chain call fails', async () => {
      const client = new ChainCommitmentClient(
        'http://localhost:8545',
        '0x' + '1'.repeat(40),
      )
      const result = await client.verifyOnChain('id-1')
      expect(result).toBeNull()
    })
  })

  describe('getChainId()', () => {
    it('should return the numeric chain ID', async () => {
      const client = new ChainCommitmentClient('http://localhost:8545')
      const spy = vi
        // @ts-expect-error - accessing private provider for test
        .spyOn(client['provider'], 'getNetwork')
        .mockResolvedValue({ chainId: 421614n } as any)

      const id = await client.getChainId()
      expect(id).toBe(421614)
      expect(typeof id).toBe('number')
      spy.mockRestore()
    })
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })
})
