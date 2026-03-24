import { randomUUID, createHash } from 'crypto'
import type { AuthorityCredential, MandateParams } from '@attestara/types'
import { CredentialManager, MemoryIPFSClient } from '../credentials/index.js'

export interface MockAgentOptions {
  name?: string
  mandate?: MandateParams
}

const DEFAULT_MANDATE: MandateParams = {
  maxValue: 10000n,
  currency: 'USDC',
  domain: 'testing',
}

/**
 * A self-contained agent for testing, with in-memory DID, keys, and credentials.
 * No network calls required.
 */
export class MockAgent {
  readonly did: string
  readonly name: string
  readonly publicKey: string
  readonly privateKey: string
  readonly mandate: MandateParams

  private credentialManager: CredentialManager
  private credential: AuthorityCredential | null = null

  constructor(options: MockAgentOptions = {}) {
    const id = randomUUID().slice(0, 8)
    this.name = options.name ?? `test-agent-${id}`
    this.mandate = options.mandate ?? DEFAULT_MANDATE

    // Generate deterministic-looking keys from the name
    this.privateKey = createHash('sha256').update(`private:${this.name}:${id}`).digest('hex')
    this.publicKey = createHash('sha256').update(`public:${this.name}:${id}`).digest('hex')
    this.did = `did:ethr:0x${this.publicKey.slice(0, 40)}`

    this.credentialManager = new CredentialManager(new MemoryIPFSClient())
  }

  /**
   * Issue a credential for this agent and return it.
   */
  async issueCredential(mandate?: MandateParams): Promise<AuthorityCredential> {
    this.credential = await this.credentialManager.issue(
      this.did,
      mandate ?? this.mandate,
      { signingKey: this.privateKey },
    )
    return this.credential
  }

  /**
   * Get the agent's current credential, issuing one if needed.
   */
  async getCredential(): Promise<AuthorityCredential> {
    if (!this.credential) {
      return this.issueCredential()
    }
    return this.credential
  }

  /**
   * Verify a credential using this agent's credential manager.
   */
  async verifyCredential(credential: AuthorityCredential): Promise<{ valid: boolean; errors: string[] }> {
    return this.credentialManager.verify(credential)
  }

  /**
   * Hash a credential.
   */
  hashCredential(credential: AuthorityCredential): string {
    return this.credentialManager.hashCredential(credential)
  }
}
