import { describe, it, expect } from 'vitest'
import { CredentialManager, MemoryIPFSClient, AGENT_AUTHORITY_CREDENTIAL_TYPE, CREDENTIAL_CONTEXT } from '../src/credentials/index.js'
import type { MandateParams } from '@attestara/types'

describe('CredentialManager (additional coverage)', () => {
  const ipfs = new MemoryIPFSClient()
  const manager = new CredentialManager(ipfs)
  const agentDid = 'did:ethr:0x' + '11'.repeat(20)

  const mandate: MandateParams = {
    maxValue: 500000n,
    currency: 'EUR',
    domain: 'procurement.contracts',
  }

  it('issues a credential with correct type', async () => {
    const cred = await manager.issue(agentDid, mandate)
    expect(cred.type).toContain('VerifiableCredential')
    expect(cred.type).toContain(AGENT_AUTHORITY_CREDENTIAL_TYPE)
  })

  it('issues a credential with correct subject', async () => {
    const cred = await manager.issue(agentDid, mandate)
    expect(cred.credentialSubject.id).toBe(agentDid)
    expect(cred.credentialSubject.mandateParams.maxValue).toBe(500000n)
    expect(cred.credentialSubject.mandateParams.currency).toBe('EUR')
    expect(cred.credentialSubject.mandateParams.domain).toBe('procurement.contracts')
  })

  it('sets correct expiration based on options', async () => {
    const cred = await manager.issue(agentDid, mandate, { expiresInSeconds: 3600 })
    const issued = new Date(cred.issuanceDate)
    const expiry = new Date(cred.expirationDate)
    const diff = (expiry.getTime() - issued.getTime()) / 1000
    expect(diff).toBeCloseTo(3600, -1)
  })

  it('hashes a credential deterministically', async () => {
    const cred = await manager.issue(agentDid, mandate)
    const hash1 = manager.hashCredential(cred)
    const hash2 = manager.hashCredential(cred)
    expect(hash1).toBe(hash2)
    expect(hash1).toBeTruthy()
  })

  it('verifies a valid credential', async () => {
    const cred = await manager.issue(agentDid, mandate)
    const result = await manager.verify(cred)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects expired credentials', async () => {
    const cred = await manager.issue(agentDid, mandate)
    // Hack expiration to past
    cred.expirationDate = new Date(Date.now() - 1000).toISOString()
    const result = await manager.verify(cred)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.toLowerCase().includes('expired'))).toBe(true)
  })

  it('detects revoked credentials', async () => {
    const cred = await manager.issue(agentDid, mandate)
    const hash = manager.hashCredential(cred)
    await manager.revoke(hash)
    const result = await manager.verify(cred)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.toLowerCase().includes('revoked'))).toBe(true)
  })

  it('works without IPFS client', async () => {
    const noIpfs = new CredentialManager()
    const cred = await noIpfs.issue(agentDid, mandate)
    expect(cred.id).toBeTruthy()
  })

  it('issues credentials with optional mandate params', async () => {
    const mandateWithBounds: MandateParams = {
      ...mandate,
      parameterFloor: 100000n,
      parameterCeiling: 600000n,
    }
    const cred = await manager.issue(agentDid, mandateWithBounds)
    expect(cred.credentialSubject.mandateParams.parameterFloor).toBe(100000n)
    expect(cred.credentialSubject.mandateParams.parameterCeiling).toBe(600000n)
  })
})
