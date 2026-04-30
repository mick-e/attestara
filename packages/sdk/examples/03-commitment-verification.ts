#!/usr/bin/env tsx
/**
 * Example 03 -- Commitment Verification
 *
 * Demonstrates on-chain commitment creation and verification:
 *   1. Two agents negotiate and agree on terms
 *   2. An off-chain commitment record is created
 *   3. The commitment is verified
 *   4. The commitment list is queried with filters
 *
 * Run:
 *   npx tsx packages/sdk/examples/03-commitment-verification.ts
 */

import {
  MockAgent,
  SessionManager,
  CommitmentManager,
  TestProver,
  CredentialManager,
  MemoryIPFSClient,
} from '@attestara/sdk'
import { CircuitId } from '@attestara/types'

async function main() {
  console.log('=== Commitment Verification Example ===\n')

  // ── Step 1: Setup agents and credentials ───────────────────────────
  const buyer = new MockAgent({ name: 'buyer-agent' })
  const supplier = new MockAgent({ name: 'supplier-agent' })
  const credManager = new CredentialManager(new MemoryIPFSClient())
  const prover = new TestProver()

  const buyerCred = await credManager.issue(buyer.did, {
    maxValue: BigInt(500_000),
    currency: 'EUR',
    domain: 'procurement.contracts',
  })

  const supplierCred = await credManager.issue(supplier.did, {
    maxValue: BigInt(600_000),
    currency: 'EUR',
    domain: 'procurement.contracts',
  })

  console.log('Agents and credentials created')
  console.log(`  Buyer:    ${buyer.did}`)
  console.log(`  Supplier: ${supplier.did}\n`)

  // ── Step 2: Run a quick negotiation ────────────────────────────────
  const sessionMgr = new SessionManager()
  const session = await sessionMgr.create({
    initiatorAgentId: buyer.did,
    counterpartyAgentId: supplier.did,
    sessionConfig: {
      maxTurns: 4,
      turnTimeoutSeconds: 300,
      sessionTimeoutSeconds: 3600,
      requiredProofs: [CircuitId.MANDATE_BOUND],
    },
  })

  // Single-round negotiation: buyer proposes, supplier accepts
  const proof = await prover.generateProof(CircuitId.MANDATE_BOUND, {
    value: BigInt(400_000),
    maxValue: BigInt(500_000),
  })

  session.proposeTurn({
    agentId: buyer.did,
    terms: { value: BigInt(400_000), currency: 'EUR', deliveryDays: 30 },
    proofType: CircuitId.MANDATE_BOUND,
    proof: proof.proof,
    publicSignals: proof.publicSignals,
  })

  session.accept(supplier.did)
  console.log(`Negotiation completed: ${session.status}`)
  console.log(`  Agreed: EUR 400,000 / 30 days\n`)

  // ── Step 3: Create a commitment ────────────────────────────────────
  const commitmentMgr = new CommitmentManager()

  console.log('Creating commitment record...')
  const buyerCredHash = credManager.hashCredential(buyerCred)
  const supplierCredHash = credManager.hashCredential(supplierCred)

  const commitment = await commitmentMgr.create({
    sessionId: session.id,
    agreementHash: session.merkleRoot!,
    parties: [buyer.did, supplier.did],
    credentialHashes: [buyerCredHash, supplierCredHash],
    proofs: [proof],
    circuitVersions: ['mandate-bound-v1'],
  })

  console.log(`  Commitment ID:    ${commitment.id}`)
  console.log(`  Session ID:       ${commitment.sessionId}`)
  console.log(`  Agreement Hash:   ${commitment.agreementHash.slice(0, 24)}...`)
  console.log(`  Parties:          ${commitment.parties.length}`)
  console.log(`  Credential hashes: ${commitment.credentialHashes.length}`)
  console.log(`  Verified:         ${commitment.verified}`)
  console.log(`  Tx Hash:          ${commitment.txHash ?? '(pending)'}`)
  console.log()

  // ── Step 4: Verify the commitment ──────────────────────────────────
  console.log('Verifying commitment...')
  const isVerified = await commitmentMgr.verify(commitment.id)
  console.log(`  Verification result: ${isVerified ? 'VALID' : 'INVALID'}\n`)

  // ── Step 5: Create a second commitment for listing demo ────────────
  const session2 = await sessionMgr.create({
    initiatorAgentId: supplier.did,
    counterpartyAgentId: buyer.did,
    sessionConfig: {
      maxTurns: 4,
      turnTimeoutSeconds: 300,
      sessionTimeoutSeconds: 3600,
      requiredProofs: [CircuitId.MANDATE_BOUND],
    },
  })

  const proof2 = await prover.generateProof(CircuitId.MANDATE_BOUND, {
    value: BigInt(250_000),
    maxValue: BigInt(600_000),
  })

  session2.proposeTurn({
    agentId: supplier.did,
    terms: { value: BigInt(250_000), currency: 'EUR', deliveryDays: 14 },
    proofType: CircuitId.MANDATE_BOUND,
    proof: proof2.proof,
    publicSignals: proof2.publicSignals,
  })

  session2.accept(buyer.did)

  await commitmentMgr.create({
    sessionId: session2.id,
    agreementHash: session2.merkleRoot!,
    parties: [supplier.did, buyer.did],
    credentialHashes: [supplierCredHash],
    proofs: [proof2],
    circuitVersions: ['mandate-bound-v1'],
  })

  // ── Step 6: List and filter commitments ────────────────────────────
  console.log('Listing all commitments...')
  const all = await commitmentMgr.list()
  console.log(`  Total commitments: ${all.length}`)

  for (const c of all) {
    console.log(`  - ${c.id.slice(0, 8)}... session=${c.sessionId.slice(0, 8)}... parties=${c.parties.length} verified=${c.verified}`)
  }

  // Filter by session
  console.log(`\nFiltering by session ${session.id.slice(0, 8)}...`)
  const filtered = await commitmentMgr.list({ sessionId: session.id })
  console.log(`  Matching commitments: ${filtered.length}`)

  console.log('\n=== Commitment verification complete ===')
}

main().catch(console.error)
