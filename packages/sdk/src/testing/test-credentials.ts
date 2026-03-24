import type { AuthorityCredential, MandateParams } from '@attestara/types'
import { CredentialManager, MemoryIPFSClient } from '../credentials/index.js'

const manager = new CredentialManager(new MemoryIPFSClient())

/**
 * Factory functions for creating test credentials with sensible defaults.
 */
export const TestCredentials = {
  /**
   * Create a basic valid credential for testing.
   */
  async create(
    agentDid: string,
    overrides: Partial<MandateParams> = {},
  ): Promise<AuthorityCredential> {
    const mandate: MandateParams = {
      maxValue: overrides.maxValue ?? 10000n,
      currency: overrides.currency ?? 'USDC',
      domain: overrides.domain ?? 'testing',
      parameterFloor: overrides.parameterFloor,
      parameterCeiling: overrides.parameterCeiling,
      allowedCounterparties: overrides.allowedCounterparties,
    }
    return manager.issue(agentDid, mandate)
  },

  /**
   * Create a credential that is already expired.
   */
  async createExpired(agentDid: string): Promise<AuthorityCredential> {
    const credential = await manager.issue(agentDid, {
      maxValue: 10000n,
      currency: 'USDC',
      domain: 'testing',
    })
    // Set expiration to the past
    credential.expirationDate = new Date(Date.now() - 86400000).toISOString()
    return credential
  },

  /**
   * Create a credential with specific bounds.
   */
  async createWithBounds(
    agentDid: string,
    floor: bigint,
    ceiling: bigint,
  ): Promise<AuthorityCredential> {
    return manager.issue(agentDid, {
      maxValue: ceiling,
      currency: 'USDC',
      domain: 'testing',
      parameterFloor: floor,
      parameterCeiling: ceiling,
    })
  },

  /**
   * Create a credential restricted to specific counterparties.
   */
  async createRestricted(
    agentDid: string,
    allowedCounterparties: string[],
  ): Promise<AuthorityCredential> {
    return manager.issue(agentDid, {
      maxValue: 10000n,
      currency: 'USDC',
      domain: 'testing',
      allowedCounterparties,
    })
  },

  /**
   * Hash a credential.
   */
  hash(credential: AuthorityCredential): string {
    return manager.hashCredential(credential)
  },

  /**
   * Verify a credential.
   */
  async verify(credential: AuthorityCredential): Promise<{ valid: boolean; errors: string[] }> {
    return manager.verify(credential)
  },
}
