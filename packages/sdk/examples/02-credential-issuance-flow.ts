#!/usr/bin/env tsx
/**
 * Example 02 -- Credential Issuance Flow
 *
 * Demonstrates issuing, verifying, and revoking W3C Verifiable Credentials:
 *   1. Create a DID for the agent
 *   2. Issue an Authority Credential with specific mandate bounds
 *   3. Pin the credential to IPFS (in-memory mock)
 *   4. Hash and verify the credential
 *   5. Revoke the credential
 *
 * Run:
 *   npx tsx packages/sdk/examples/02-credential-issuance-flow.ts
 */

import {
  MockAgent,
  CredentialManager,
  MemoryIPFSClient,
} from '@attestara/sdk'

async function main() {
  console.log('=== Credential Issuance Flow Example ===\n')

  // ── Step 1: Create an agent ────────────────────────────────────────
  const agent = new MockAgent({ name: 'procurement-agent' })
  console.log(`Agent DID:    ${agent.did}`)
  console.log(`Public Key:   ${agent.publicKey.slice(0, 24)}...\n`)

  // ── Step 2: Create credential manager with IPFS ────────────────────
  const ipfs = new MemoryIPFSClient()
  const credManager = new CredentialManager(ipfs)

  // ── Step 3: Issue Authority Credential ─────────────────────────────
  console.log('Issuing Authority Credential...')
  const credential = await credManager.issue(agent.did, {
    maxValue: BigInt(500_000),
    currency: 'EUR',
    domain: 'procurement.contracts',
    parameterFloor: BigInt(10_000),
    parameterCeiling: BigInt(500_000),
  }, {
    expiresInSeconds: 30 * 24 * 3600, // 30 days
  })

  console.log(`  Credential ID: ${credential.id}`)
  console.log(`  Type:          ${credential.type.join(', ')}`)
  console.log(`  Issuer:        ${credential.issuer}`)
  console.log(`  Subject:       ${credential.credentialSubject.id}`)
  console.log(`  Domain:        ${credential.credentialSubject.mandateParams.domain}`)
  console.log(`  Max Value:     EUR ${credential.credentialSubject.mandateParams.maxValue.toLocaleString()}`)
  console.log(`  Floor:         EUR ${credential.credentialSubject.mandateParams.parameterFloor?.toLocaleString()}`)
  console.log(`  Ceiling:       EUR ${credential.credentialSubject.mandateParams.parameterCeiling?.toLocaleString()}`)
  console.log(`  Issued:        ${credential.issuanceDate}`)
  console.log(`  Expires:       ${credential.expirationDate}`)
  console.log(`  Proof Type:    ${credential.proof.type}`)
  console.log()

  // ── Step 4: Pin to IPFS ────────────────────────────────────────────
  console.log('Pinning credential to IPFS...')
  const cid = await ipfs.pin(JSON.stringify(credential))
  console.log(`  IPFS CID: ${cid}`)

  // Retrieve and verify
  const retrieved = await ipfs.get(cid)
  const parsed = JSON.parse(retrieved!)
  console.log(`  Retrieved: ${parsed.id === credential.id ? 'OK' : 'MISMATCH'}\n`)

  // ── Step 5: Hash the credential ────────────────────────────────────
  console.log('Hashing credential...')
  const hash = credManager.hashCredential(credential)
  console.log(`  Credential hash: ${hash.slice(0, 32)}...`)
  console.log(`  Hash length:     ${hash.length} chars\n`)

  // ── Step 6: Issue a second credential (different domain) ───────────
  console.log('Issuing second credential (logistics domain)...')
  const logisticsCred = await credManager.issue(agent.did, {
    maxValue: BigInt(100_000),
    currency: 'USD',
    domain: 'logistics.shipping',
  }, {
    expiresInSeconds: 7 * 24 * 3600, // 7 days
  })

  console.log(`  Credential ID: ${logisticsCred.id}`)
  console.log(`  Domain:        ${logisticsCred.credentialSubject.mandateParams.domain}`)
  console.log(`  Max Value:     USD ${logisticsCred.credentialSubject.mandateParams.maxValue.toLocaleString()}\n`)

  // ── Step 7: Revoke the first credential ────────────────────────────
  console.log('Revoking first credential...')
  await credManager.revoke(hash)
  console.log(`  Credential ${credential.id} revoked`)

  // Check revocation status
  const isRevoked = credManager.isRevoked(hash)
  console.log(`  Is revoked: ${isRevoked}`)

  const logisticsHash = credManager.hashCredential(logisticsCred)
  const isLogisticsRevoked = credManager.isRevoked(logisticsHash)
  console.log(`  Logistics credential revoked: ${isLogisticsRevoked}`)

  console.log('\n=== Credential issuance flow complete ===')
}

main().catch(console.error)
