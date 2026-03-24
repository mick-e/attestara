import { describe, it, expect } from 'vitest'
import { CredentialManager, MemoryIPFSClient } from '../src/credentials/index.js'
import type { MandateParams } from '@attestara/types'

describe('CredentialManager', () => {
  const agentDid = 'did:ethr:0xabcdef1234567890abcdef1234567890abcdef12'
  const mandate: MandateParams = {
    maxValue: 10000n,
    currency: 'USDC',
    domain: 'procurement',
    parameterFloor: 100n,
    parameterCeiling: 5000n,
    allowedCounterparties: ['did:ethr:0x1111111111111111111111111111111111111111'],
  }

  function createManager() {
    const ipfs = new MemoryIPFSClient()
    return { manager: new CredentialManager(ipfs), ipfs }
  }

  describe('issue', () => {
    it('should issue a valid W3C VC with mandate params', async () => {
      const { manager } = createManager()
      const credential = await manager.issue(agentDid, mandate)

      expect(credential.id).toMatch(/^urn:uuid:/)
      expect(credential.type).toContain('VerifiableCredential')
      expect(credential.type).toContain('AgentAuthorityCredential')
      expect(credential.issuer).toBe(agentDid)
      expect(credential.issuanceDate).toBeDefined()
      expect(credential.expirationDate).toBeDefined()
      expect(credential.credentialSubject.id).toBe(agentDid)
      expect(credential.credentialSubject.mandateParams.maxValue).toBe(10000n)
      expect(credential.credentialSubject.mandateParams.currency).toBe('USDC')
      expect(credential.credentialSubject.mandateParams.domain).toBe('procurement')
    })

    it('should include a proof with JWS', async () => {
      const { manager } = createManager()
      const credential = await manager.issue(agentDid, mandate)

      expect(credential.proof.type).toBe('Ed25519Signature2020')
      expect(credential.proof.verificationMethod).toBe(`${agentDid}#keys-1`)
      expect(credential.proof.proofPurpose).toBe('assertionMethod')
      expect(credential.proof.jws).toBeDefined()
      expect(credential.proof.jws.length).toBeGreaterThan(0)
    })

    it('should respect custom expiration', async () => {
      const { manager } = createManager()
      const credential = await manager.issue(agentDid, mandate, {
        expiresInSeconds: 3600, // 1 hour
      })

      const issued = new Date(credential.issuanceDate).getTime()
      const expires = new Date(credential.expirationDate).getTime()
      const diff = (expires - issued) / 1000
      expect(diff).toBeCloseTo(3600, -1)
    })
  })

  describe('verify', () => {
    it('should verify a valid credential', async () => {
      const { manager } = createManager()
      const credential = await manager.issue(agentDid, mandate)
      const result = await manager.verify(credential)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject a revoked credential', async () => {
      const { manager } = createManager()
      const credential = await manager.issue(agentDid, mandate)
      const hash = manager.hashCredential(credential)
      await manager.revoke(hash)

      const result = await manager.verify(credential)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Credential has been revoked')
    })

    it('should reject an expired credential', async () => {
      const { manager } = createManager()
      const credential = await manager.issue(agentDid, mandate)
      // Manually set expiration to the past
      credential.expirationDate = new Date(Date.now() - 1000).toISOString()

      const result = await manager.verify(credential)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Credential has expired')
    })
  })

  describe('store and retrieve (IPFS round-trip)', () => {
    it('should store a credential and retrieve it by CID', async () => {
      const { manager } = createManager()
      const credential = await manager.issue(agentDid, mandate)

      const cid = await manager.store(credential)
      expect(cid).toMatch(/^Qm/)

      const retrieved = await manager.retrieve(cid)
      expect(retrieved.id).toBe(credential.id)
      expect(retrieved.issuer).toBe(credential.issuer)
      expect(retrieved.credentialSubject.mandateParams.maxValue).toBe(10000n)
      expect(retrieved.credentialSubject.mandateParams.currency).toBe('USDC')
    })

    it('should fail to retrieve a non-existent CID', async () => {
      const { manager } = createManager()
      await expect(manager.retrieve('QmNonExistent')).rejects.toThrow('CID not found')
    })

    it('should throw when no IPFS client is configured', async () => {
      const manager = new CredentialManager() // no IPFS
      const credential = await manager.issue(agentDid, mandate)
      await expect(manager.store(credential)).rejects.toThrow('No IPFS client configured')
    })
  })

  describe('revoke', () => {
    it('should revoke by credential hash', async () => {
      const { manager } = createManager()
      const credential = await manager.issue(agentDid, mandate)
      const hash = manager.hashCredential(credential)

      // Verify before revocation
      const beforeResult = await manager.verify(credential)
      expect(beforeResult.valid).toBe(true)

      // Revoke
      await manager.revoke(hash)

      // Verify after revocation
      const afterResult = await manager.verify(credential)
      expect(afterResult.valid).toBe(false)
    })
  })

  describe('MemoryIPFSClient', () => {
    it('should generate unique CIDs', async () => {
      const ipfs = new MemoryIPFSClient()
      const cid1 = await ipfs.store({ a: 1 })
      const cid2 = await ipfs.store({ b: 2 })
      expect(cid1).not.toBe(cid2)
    })

    it('should store and retrieve data independently (deep clone)', async () => {
      const ipfs = new MemoryIPFSClient()
      const original = { nested: { value: 42 } }
      const cid = await ipfs.store(original)

      // Mutate original
      original.nested.value = 999

      const retrieved = (await ipfs.retrieve(cid)) as typeof original
      expect(retrieved.nested.value).toBe(42)
    })
  })
})
