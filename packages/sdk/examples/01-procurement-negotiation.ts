#!/usr/bin/env tsx
/**
 * Example 01 -- Procurement Negotiation
 *
 * Demonstrates an end-to-end negotiation between two AI agents:
 *   1. Both agents create DID identities
 *   2. Each agent is issued an Authority Credential with mandate bounds
 *   3. A negotiation session is opened
 *   4. The buyer proposes a price; the supplier counter-proposes
 *   5. The buyer accepts and the session is finalised
 *
 * Run:
 *   npx tsx packages/sdk/examples/01-procurement-negotiation.ts
 */

import {
  MockAgent,
  SessionManager,
  TestProver,
  CredentialManager,
  MemoryIPFSClient,
} from '@attestara/sdk'
import { CircuitId } from '@attestara/types'

async function main() {
  console.log('=== Procurement Negotiation Example ===\n')

  // ── Step 1: Create two agents ──────────────────────────────────────
  const buyer = new MockAgent({ name: 'buyer-agent' })
  const supplier = new MockAgent({ name: 'supplier-agent' })

  console.log(`Buyer   DID: ${buyer.did}`)
  console.log(`Supplier DID: ${supplier.did}\n`)

  // ── Step 2: Issue Authority Credentials ────────────────────────────
  const credManager = new CredentialManager(new MemoryIPFSClient())

  const buyerCred = await credManager.issue(buyer.did, {
    maxValue: BigInt(500_000),
    currency: 'EUR',
    domain: 'procurement.contracts',
  })
  console.log(`Buyer credential issued:   ${buyerCred.id}`)

  const supplierCred = await credManager.issue(supplier.did, {
    maxValue: BigInt(600_000),
    currency: 'EUR',
    domain: 'procurement.contracts',
  })
  console.log(`Supplier credential issued: ${supplierCred.id}\n`)

  // ── Step 3: Open a negotiation session ─────────────────────────────
  const sessionMgr = new SessionManager()
  const session = await sessionMgr.create({
    initiatorAgentId: buyer.did,
    counterpartyAgentId: supplier.did,
    sessionConfig: {
      maxTurns: 6,
      turnTimeoutSeconds: 300,
      sessionTimeoutSeconds: 3600,
      requiredProofs: [CircuitId.MANDATE_BOUND, CircuitId.PARAMETER_RANGE],
    },
  })
  console.log(`Session created: ${session.id}`)
  console.log(`Status: ${session.status}\n`)

  // ── Step 4: Negotiate ──────────────────────────────────────────────
  const prover = new TestProver()

  // Buyer proposes EUR 350,000
  const buyerProof = await prover.generateProof(CircuitId.MANDATE_BOUND, {
    value: BigInt(350_000),
    maxValue: BigInt(500_000),
  })

  const turn1 = session.proposeTurn({
    agentId: buyer.did,
    terms: { value: BigInt(350_000), currency: 'EUR', deliveryDays: 60 },
    proofType: CircuitId.MANDATE_BOUND,
    proof: buyerProof.proof,
    publicSignals: buyerProof.publicSignals,
  })
  console.log(`Turn ${turn1.sequenceNumber}: Buyer proposes EUR 350,000 / 60 days`)

  // Supplier counter-proposes EUR 420,000
  const supplierProof = await prover.generateProof(CircuitId.MANDATE_BOUND, {
    value: BigInt(420_000),
    maxValue: BigInt(600_000),
  })

  const turn2 = session.proposeTurn({
    agentId: supplier.did,
    terms: { value: BigInt(420_000), currency: 'EUR', deliveryDays: 45 },
    proofType: CircuitId.MANDATE_BOUND,
    proof: supplierProof.proof,
    publicSignals: supplierProof.publicSignals,
  })
  console.log(`Turn ${turn2.sequenceNumber}: Supplier counter-proposes EUR 420,000 / 45 days`)

  // Buyer proposes EUR 400,000 (compromise)
  const buyerProof2 = await prover.generateProof(CircuitId.MANDATE_BOUND, {
    value: BigInt(400_000),
    maxValue: BigInt(500_000),
  })

  const turn3 = session.proposeTurn({
    agentId: buyer.did,
    terms: { value: BigInt(400_000), currency: 'EUR', deliveryDays: 50 },
    proofType: CircuitId.MANDATE_BOUND,
    proof: buyerProof2.proof,
    publicSignals: buyerProof2.publicSignals,
  })
  console.log(`Turn ${turn3.sequenceNumber}: Buyer proposes EUR 400,000 / 50 days`)

  // ── Step 5: Supplier accepts ───────────────────────────────────────
  session.accept(supplier.did)

  console.log(`\nSession status: ${session.status}`)
  console.log(`Agreed terms: EUR 400,000 / 50 days delivery`)
  console.log(`Merkle root: ${session.merkleRoot}`)
  console.log(`Total turns: ${session.turnCount}`)
  console.log('\n=== Negotiation complete ===')
}

main().catch(console.error)
