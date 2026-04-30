import { ethers } from 'ethers'
import type { CommitmentRecord } from '@attestara/types'

// Minimal ABI for the functions we call
const COMMITMENT_ABI = [
  'function createCommitment(bytes32 sessionId, bytes32 agreementHash, bytes32[] parties, bytes32[] credentialHashes, uint256[8][] proofs, uint256[][] publicSignals, bytes32[] proofTypes, bytes[] signatures) returns (bytes32 commitmentId)',
  'function getCommitment(bytes32 commitmentId) view returns (tuple(bytes32 commitmentId, bytes32 sessionId, bytes32 agreementHash, bytes32[] parties, bytes32[] credentialHashes, bytes32[] proofTypes, bytes32 merkleRoot, bool verified, uint256 createdAt))',
  'function getSessionCommitments(bytes32 sessionId) view returns (bytes32[])',
]

/**
 * On-chain commitment operations via ethers.js.
 */
export class ChainCommitmentClient {
  private provider: ethers.JsonRpcProvider
  private contractAddress: string | null
  private signer: ethers.Wallet | null

  constructor(rpcUrl: string, contractAddress?: string, privateKey?: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.contractAddress = contractAddress ?? null
    this.signer = privateKey
      ? new ethers.Wallet(privateKey, this.provider)
      : null
  }

  private getContract(writable = false): ethers.Contract {
    if (!this.contractAddress) {
      throw new Error('Commitment contract address not configured')
    }
    const signerOrProvider = writable && this.signer ? this.signer : this.provider
    return new ethers.Contract(this.contractAddress, COMMITMENT_ABI, signerOrProvider)
  }

  /**
   * Submit a commitment to the on-chain contract.
   * Returns the transaction hash and block number once mined.
   */
  async submit(params: {
    agreementHash: string
    parties: string[]
    merkleRoot: string
    credentialHashes: string[]
    sessionId?: string
    proofs?: Array<{ proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] }; publicSignals: { signals: string[] }; proofType: string; signature: string }>
  }): Promise<{ txHash: string; blockNumber: number; commitmentId: string }> {
    if (!this.contractAddress) {
      throw new Error('Commitment contract address not configured')
    }
    if (!this.signer) {
      throw new Error('Signer (private key) required for on-chain submission')
    }

    const contract = this.getContract(true)

    // Convert string IDs to bytes32
    const sessionId = toBytes32(params.sessionId ?? params.agreementHash)
    const agreementHash = toBytes32(params.agreementHash)
    const parties = params.parties.map(toBytes32)
    const credentialHashes = params.credentialHashes.map(toBytes32)

    // Convert proofs to on-chain format
    const proofEntries = params.proofs ?? []
    const onChainProofs = proofEntries.map(p => flattenProof(p.proof))
    const publicSignals = proofEntries.map(p => p.publicSignals.signals.map(s => BigInt(s)))
    const proofTypes = proofEntries.map(p => toBytes32(p.proofType))
    const signatures = proofEntries.map(p => ethers.toUtf8Bytes(p.signature ?? ''))

    const tx = await contract.createCommitment!(
      sessionId,
      agreementHash,
      parties,
      credentialHashes,
      onChainProofs,
      publicSignals,
      proofTypes,
      signatures,
    )

    const receipt = await tx.wait()

    // Extract commitmentId from return value (or compute from event/hash)
    const commitmentId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'bytes32'],
        [sessionId, agreementHash],
      ),
    )

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      commitmentId,
    }
  }

  /**
   * Verify a commitment exists on-chain and matches the expected data.
   */
  async verifyOnChain(commitmentId: string): Promise<CommitmentRecord | null> {
    const contract = this.getContract()
    try {
      const record = await contract.getCommitment!(toBytes32(commitmentId))
      // Check if the commitment exists (commitmentId != zero)
      if (record.commitmentId === ethers.ZeroHash) {
        return null
      }
      return {
        commitmentId: record.commitmentId,
        sessionId: record.sessionId,
        agreementHash: record.agreementHash,
        parties: record.parties as string[],
        credentialHashes: record.credentialHashes as string[],
        proofTypes: record.proofTypes as string[],
        merkleRoot: record.merkleRoot,
        verified: record.verified,
        createdAt: Number(record.createdAt),
      } as unknown as CommitmentRecord
    } catch (_err: unknown) {
      return null
    }
  }

  /**
   * Get the chain ID of the connected network.
   */
  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork()
    return Number(network.chainId)
  }
}

/** Pad or hash a string to bytes32 */
function toBytes32(value: string): string {
  if (value.startsWith('0x') && value.length === 66) {
    return value // already bytes32
  }
  return ethers.keccak256(ethers.toUtf8Bytes(value))
}

/** Flatten a Groth16 proof (pi_a, pi_b, pi_c) into uint256[8] */
function flattenProof(proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] }): bigint[] {
  const pi_b_0 = proof.pi_b[0]
  const pi_b_1 = proof.pi_b[1]
  if (!pi_b_0 || !pi_b_1) throw new Error('Invalid proof: pi_b must have at least 2 elements')
  return [
    BigInt(proof.pi_a[0] ?? '0'),
    BigInt(proof.pi_a[1] ?? '0'),
    BigInt(pi_b_0[0] ?? '0'),
    BigInt(pi_b_0[1] ?? '0'),
    BigInt(pi_b_1[0] ?? '0'),
    BigInt(pi_b_1[1] ?? '0'),
    BigInt(proof.pi_c[0] ?? '0'),
    BigInt(proof.pi_c[1] ?? '0'),
  ]
}
