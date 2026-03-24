/**
 * End-to-end integration test: Credential Lifecycle
 *
 * Exercises the full credential lifecycle:
 *   Issue -> Verify (valid) -> Revoke -> Verify (revoked) -> Attempt use (fail)
 *
 * Uses SDK testing utilities (MockAgent, TestCredentials, CredentialManager).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import {
  MockAgent,
  TestCredentials,
  CredentialManager,
  MemoryIPFSClient,
  SessionManager,
  TestProver,
} from '@attestara/sdk'
import {
  CircuitId,
  type AuthorityCredential,
  type MandateParams,
  type SessionConfig,
} from '@attestara/types'

describe('E2E: Credential Lifecycle', () => {
  let agent: MockAgent
  let credentialManager: CredentialManager
  let credential: AuthorityCredential
  let credentialHash: string

  beforeAll(() => {
    agent = new MockAgent({
      name: 'lifecycle-agent',
      mandate: {
        maxValue: BigInt(100_000),
        currency: 'USDC',
        domain: 'testing',
        parameterFloor: BigInt(10),
        parameterCeiling: BigInt(500),
      },
    })
    credentialManager = new CredentialManager(new MemoryIPFSClient())
  })

  // =====================================================================
  // 1. ISSUE CREDENTIAL
  // =====================================================================

  describe('Phase 1: Issue Credential', () => {
    it('should issue a valid credential', async () => {
      credential = await agent.issueCredential()

      expect(credential.id).toMatch(/^urn:uuid:/)
      expect(credential.type).toContain('VerifiableCredential')
      expect(credential.type).toContain('AgentAuthorityCredential')
      expect(credential.issuer).toBe(agent.did)
      expect(credential.issuanceDate).toBeDefined()
      expect(credential.expirationDate).toBeDefined()
      expect(credential.credentialSubject.id).toBe(agent.did)
      expect(credential.credentialSubject.mandateParams.maxValue).toBe(BigInt(100_000))
      expect(credential.credentialSubject.mandateParams.currency).toBe('USDC')
    })

    it('should have a proof with required fields', () => {
      expect(credential.proof).toBeDefined()
      expect(credential.proof.type).toBe('Ed25519Signature2020')
      expect(credential.proof.created).toBeDefined()
      expect(credential.proof.verificationMethod).toContain(agent.did)
      expect(credential.proof.verificationMethod).toContain('#keys-1')
      expect(credential.proof.proofPurpose).toBe('assertionMethod')
      expect(credential.proof.jws).toBeDefined()
      expect(credential.proof.jws.length).toBeGreaterThan(0)
    })

    it('should produce a deterministic hash', () => {
      credentialHash = agent.hashCredential(credential)
      expect(credentialHash).toHaveLength(64)
      expect(credentialHash).toMatch(/^[a-f0-9]{64}$/)

      // Hashing again should produce the same result
      const secondHash = agent.hashCredential(credential)
      expect(secondHash).toBe(credentialHash)
    })

    it('should have a future expiration date', () => {
      const expiry = new Date(credential.expirationDate)
      expect(expiry.getTime()).toBeGreaterThan(Date.now())
    })
  })

  // =====================================================================
  // 2. VERIFY CREDENTIAL (VALID)
  // =====================================================================

  describe('Phase 2: Verify Credential (valid)', () => {
    it('should verify the credential is valid', async () => {
      const result = await agent.verifyCredential(credential)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should verify via TestCredentials utility', async () => {
      const result = await TestCredentials.verify(credential)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should verify via standalone CredentialManager', async () => {
      const result = await credentialManager.verify(credential)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should store and retrieve credential from IPFS', async () => {
      const cid = await credentialManager.store(credential)
      expect(cid).toBeDefined()
      expect(cid).toMatch(/^Qm/)

      const retrieved = await credentialManager.retrieve(cid)
      expect(retrieved.id).toBe(credential.id)
      expect(retrieved.issuer).toBe(credential.issuer)
      expect(retrieved.credentialSubject.id).toBe(credential.credentialSubject.id)
    })
  })

  // =====================================================================
  // 3. REVOKE CREDENTIAL
  // =====================================================================

  describe('Phase 3: Revoke Credential', () => {
    it('should revoke the credential by hash', async () => {
      // Revoke using the credential manager (off-chain for MVP)
      await credentialManager.revoke(credentialHash)
    })

    it('should report credential as revoked on verification', async () => {
      const result = await credentialManager.verify(credential)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Credential has been revoked')
    })

    it('should still have valid structure despite revocation', async () => {
      // The credential itself still has all required fields — it is the
      // revocation status check that causes verification failure.
      expect(credential.id).toBeDefined()
      expect(credential.issuer).toBeDefined()
      expect(credential.proof).toBeDefined()
      expect(credential.credentialSubject).toBeDefined()
    })
  })

  // =====================================================================
  // 4. ATTEMPT TO USE REVOKED CREDENTIAL (fail)
  // =====================================================================

  describe('Phase 4: Attempt Use of Revoked Credential', () => {
    it('should fail verification when used in a negotiation context', async () => {
      // Simulate a pre-negotiation credential check
      const result = await credentialManager.verify(credential)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('credential hash should still be computable', () => {
      // Hashing works regardless of revocation status
      const hash = credentialManager.hashCredential(credential)
      expect(hash).toBe(credentialHash)
    })

    it('credential should still be retrievable from IPFS', async () => {
      // Store first (in case not already stored in this manager instance)
      const cid = await credentialManager.store(credential)
      const retrieved = await credentialManager.retrieve(cid)
      expect(retrieved.id).toBe(credential.id)
    })
  })

  // =====================================================================
  // 5. EXPIRED CREDENTIAL
  // =====================================================================

  describe('Phase 5: Expired Credential', () => {
    let expiredCredential: AuthorityCredential

    it('should create an expired credential', async () => {
      expiredCredential = await TestCredentials.createExpired(agent.did)
      expect(expiredCredential).toBeDefined()
    })

    it('should fail verification due to expiration', async () => {
      const result = await TestCredentials.verify(expiredCredential)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Credential has expired')
    })

    it('expired credential should have past expiration date', () => {
      const expiry = new Date(expiredCredential.expirationDate)
      expect(expiry.getTime()).toBeLessThan(Date.now())
    })
  })

  // =====================================================================
  // 6. CREDENTIAL WITH BOUNDS
  // =====================================================================

  describe('Phase 6: Credential with Parameter Bounds', () => {
    let boundedCredential: AuthorityCredential

    it('should create a credential with floor and ceiling', async () => {
      boundedCredential = await TestCredentials.createWithBounds(agent.did, 100n, 5000n)

      expect(boundedCredential.credentialSubject.mandateParams.parameterFloor).toBe(100n)
      expect(boundedCredential.credentialSubject.mandateParams.parameterCeiling).toBe(5000n)
      expect(boundedCredential.credentialSubject.mandateParams.maxValue).toBe(5000n)
    })

    it('should verify as valid', async () => {
      const result = await TestCredentials.verify(boundedCredential)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should have distinct hash from unbounded credential', () => {
      const boundedHash = TestCredentials.hash(boundedCredential)
      expect(boundedHash).not.toBe(credentialHash)
    })
  })

  // =====================================================================
  // 7. RESTRICTED CREDENTIAL (counterparty whitelist)
  // =====================================================================

  describe('Phase 7: Restricted Credential', () => {
    let restrictedCredential: AuthorityCredential
    const allowedCounterparty = 'did:ethr:0x1111111111111111111111111111111111111111'

    it('should create a credential restricted to specific counterparties', async () => {
      restrictedCredential = await TestCredentials.createRestricted(agent.did, [allowedCounterparty])

      expect(restrictedCredential.credentialSubject.mandateParams.allowedCounterparties)
        .toEqual([allowedCounterparty])
    })

    it('should verify as valid', async () => {
      const result = await TestCredentials.verify(restrictedCredential)
      expect(result.valid).toBe(true)
    })
  })

  // =====================================================================
  // 8. MULTIPLE CREDENTIALS — ISOLATION
  // =====================================================================

  describe('Phase 8: Multiple Credentials Isolation', () => {
    it('revoking one credential should not affect others', async () => {
      const manager = new CredentialManager(new MemoryIPFSClient())

      const cred1 = await manager.issue(agent.did, {
        maxValue: 10000n,
        currency: 'USDC',
        domain: 'test-1',
      })
      const cred2 = await manager.issue(agent.did, {
        maxValue: 20000n,
        currency: 'USDC',
        domain: 'test-2',
      })

      const hash1 = manager.hashCredential(cred1)

      // Revoke only cred1
      await manager.revoke(hash1)

      const result1 = await manager.verify(cred1)
      expect(result1.valid).toBe(false)
      expect(result1.errors).toContain('Credential has been revoked')

      const result2 = await manager.verify(cred2)
      expect(result2.valid).toBe(true)
      expect(result2.errors).toHaveLength(0)
    })

    it('different agents should have different credential hashes', async () => {
      const agent1 = new MockAgent({ name: 'agent-alpha' })
      const agent2 = new MockAgent({ name: 'agent-beta' })

      const cred1 = await agent1.issueCredential()
      const cred2 = await agent2.issueCredential()

      const hash1 = agent1.hashCredential(cred1)
      const hash2 = agent2.hashCredential(cred2)

      expect(hash1).not.toBe(hash2)
    })
  })
})
