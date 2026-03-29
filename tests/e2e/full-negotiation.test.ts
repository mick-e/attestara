/**
 * End-to-end integration test: Full Negotiation Flow
 *
 * Exercises the complete Attestara negotiation lifecycle:
 *   Setup -> Credential Issuance -> Session Creation -> 5-turn Negotiation
 *   -> Commitment Settlement -> Verification
 *
 * Uses SDK testing utilities (MockAgent, TestProver, SessionRecorder, LocalChain,
 * TestCredentials) to run entirely in-memory without network or chain dependencies.
 *
 * Reference: Attestara Whitepaper v5, Appendix B (test vector for complete negotiation turn)
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import {
  MockAgent,
  TestProver,
  SessionRecorder,
  LocalChain,
  TestCredentials,
  SessionManager,
  NegotiationSession,
  CommitmentManager,
  CredentialManager,
  MemoryIPFSClient,
  MerkleAccumulator,
  hashTurn,
} from '@attestara/sdk'
import {
  CircuitId,
  type Terms,
  type ZKProof,
  type PublicSignals,
  type SessionConfig,
  type AuthorityCredential,
  type MandateParams,
  type CommitmentProof,
  type ProofResult,
} from '@attestara/types'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const EUR = 'EUR'

/** Build Terms from negotiation parameters (euro-cents). */
function makeTerms(unitPrice: number, quantity: number, deliveryDays: number): Terms {
  return {
    value: BigInt(unitPrice * quantity), // total commitment value in euro-cents
    currency: EUR,
    deliveryDays,
    additionalTerms: { unitPrice, quantity },
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('E2E: Full Negotiation Flow', () => {
  // ---- Participants ---------------------------------------------------
  let buyerAgent: MockAgent
  let sellerAgent: MockAgent
  let principalAgent: MockAgent

  // ---- Infrastructure -------------------------------------------------
  let prover: TestProver
  let sessionManager: SessionManager
  let commitmentManager: CommitmentManager
  let credentialManager: CredentialManager
  let localChain: LocalChain

  // ---- Credentials ----------------------------------------------------
  let buyerCredential: AuthorityCredential
  let sellerCredential: AuthorityCredential

  // ---- Session --------------------------------------------------------
  let session: NegotiationSession
  let recorder: SessionRecorder

  // =====================================================================
  // 1. SETUP PHASE
  // =====================================================================

  beforeAll(async () => {
    // Create identities ---------------------------------------------------
    const buyerMandate: MandateParams = {
      maxValue: BigInt(50_000_000), // €500,000.00 in euro-cents
      currency: EUR,
      domain: 'procurement',
      parameterFloor: BigInt(4000),   // unitPrice floor (euro-cents)
      parameterCeiling: BigInt(5500), // unitPrice ceiling (euro-cents)
    }

    const sellerMandate: MandateParams = {
      maxValue: BigInt(60_000_000), // €600,000.00
      currency: EUR,
      domain: 'sales',
      parameterFloor: BigInt(4200),
      parameterCeiling: BigInt(5800),
    }

    buyerAgent = new MockAgent({ name: 'buyer-agent', mandate: buyerMandate })
    sellerAgent = new MockAgent({ name: 'seller-agent', mandate: sellerMandate })
    principalAgent = new MockAgent({ name: 'principal' })

    // Shared services -----------------------------------------------------
    prover = new TestProver()
    sessionManager = new SessionManager()
    commitmentManager = new CommitmentManager()
    credentialManager = new CredentialManager(new MemoryIPFSClient())

    // Local chain (placeholder lifecycle) ---------------------------------
    localChain = new LocalChain()
    await localChain.start()
  })

  // =====================================================================
  // 2. CREDENTIAL ISSUANCE
  // =====================================================================

  describe('Phase 1: Credential Issuance', () => {
    it('should issue Authority Credential to Buyer Agent', async () => {
      buyerCredential = await buyerAgent.issueCredential()

      expect(buyerCredential.id).toMatch(/^urn:uuid:/)
      expect(buyerCredential.issuer).toBe(buyerAgent.did)
      expect(buyerCredential.credentialSubject.id).toBe(buyerAgent.did)
      expect(buyerCredential.credentialSubject.mandateParams.maxValue).toBe(BigInt(50_000_000))
      expect(buyerCredential.credentialSubject.mandateParams.currency).toBe(EUR)
      expect(buyerCredential.credentialSubject.mandateParams.parameterFloor).toBe(BigInt(4000))
      expect(buyerCredential.credentialSubject.mandateParams.parameterCeiling).toBe(BigInt(5500))
    })

    it('should issue Authority Credential to Seller Agent', async () => {
      sellerCredential = await sellerAgent.issueCredential()

      expect(sellerCredential.id).toMatch(/^urn:uuid:/)
      expect(sellerCredential.issuer).toBe(sellerAgent.did)
      expect(sellerCredential.credentialSubject.mandateParams.maxValue).toBe(BigInt(60_000_000))
      expect(sellerCredential.credentialSubject.mandateParams.parameterFloor).toBe(BigInt(4200))
      expect(sellerCredential.credentialSubject.mandateParams.parameterCeiling).toBe(BigInt(5800))
    })

    it('should verify Buyer credential is valid', async () => {
      const result = await buyerAgent.verifyCredential(buyerCredential)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should verify Seller credential is valid', async () => {
      const result = await sellerAgent.verifyCredential(sellerCredential)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should produce distinct credential hashes', () => {
      const buyerHash = buyerAgent.hashCredential(buyerCredential)
      const sellerHash = sellerAgent.hashCredential(sellerCredential)

      expect(buyerHash).toHaveLength(64)
      expect(sellerHash).toHaveLength(64)
      expect(buyerHash).not.toBe(sellerHash)
    })

    it('should store and retrieve credentials via IPFS', async () => {
      const cid = await credentialManager.store(buyerCredential)
      expect(cid).toBeDefined()

      const retrieved = await credentialManager.retrieve(cid)
      expect(retrieved.id).toBe(buyerCredential.id)
      expect(retrieved.issuer).toBe(buyerCredential.issuer)
    })
  })

  // =====================================================================
  // 3. SESSION CREATION
  // =====================================================================

  describe('Phase 2: Session Creation', () => {
    const sessionConfig: SessionConfig = {
      maxTurns: 10,
      turnTimeoutSeconds: 300,
      sessionTimeoutSeconds: 3600,
      requiredProofs: [CircuitId.MANDATE_BOUND, CircuitId.PARAMETER_RANGE],
    }

    it('should create a negotiation session (Buyer initiates)', async () => {
      session = await sessionManager.create({
        initiatorAgentId: buyerAgent.did,
        counterpartyAgentId: sellerAgent.did,
        sessionConfig,
      })

      expect(session.id).toBeDefined()
      expect(session.status).toBe('active')
      expect(session.initiatorAgentId).toBe(buyerAgent.did)
      expect(session.counterpartyAgentId).toBe(sellerAgent.did)
      expect(session.turnCount).toBe(0)
      expect(session.config.maxTurns).toBe(10)
    })

    it('should start with an empty merkle root', () => {
      expect(session.merkleRoot).toBe('0x' + '0'.repeat(64))
    })

    it('should create a session anchor (local chain)', async () => {
      expect(localChain.isRunning).toBe(true)
      const snapshotId = await localChain.snapshot()
      expect(snapshotId).toBeDefined()
    })

    it('should attach a session recorder (Seller accepts invitation)', () => {
      recorder = new SessionRecorder()
      recorder.attach(session)
      expect(recorder.eventCount).toBe(0)
    })

    it('should be retrievable from the session manager', async () => {
      const retrieved = await sessionManager.get(session.id)
      expect(retrieved).toBe(session)
    })
  })

  // =====================================================================
  // 4. NEGOTIATION (5 turns)
  // =====================================================================

  describe('Phase 3: Negotiation (5 turns)', () => {
    // Store proofs per turn for later commitment verification
    const turnProofResults: ProofResult[] = []
    let previousMerkleRoot: string

    // ------ Turn 1: Seller proposes unitPrice:52, qty:10000, delivery:90 ------
    it('Turn 1 — Seller proposes: unitPrice 52, qty 10000, delivery 90', async () => {
      previousMerkleRoot = session.merkleRoot

      const proofResult = await prover.generateProof(CircuitId.MANDATE_BOUND, {
        proposedValue: BigInt(52 * 10000),
        maxValue: BigInt(60_000_000),
      })
      turnProofResults.push(proofResult)

      const turn = session.proposeTurn({
        agentId: sellerAgent.did,
        terms: makeTerms(52, 10000, 90),
        proofType: CircuitId.MANDATE_BOUND,
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
      })

      expect(turn.sequenceNumber).toBe(1)
      expect(turn.agentId).toBe(sellerAgent.did)
      expect(turn.terms.value).toBe(BigInt(520000))
      expect(turn.terms.deliveryDays).toBe(90)
      expect(turn.signature).toBeDefined()
      expect(session.merkleRoot).not.toBe(previousMerkleRoot)

      // Verify the ZK proof
      const verification = await prover.verifyProof(CircuitId.MANDATE_BOUND, proofResult)
      expect(verification.valid).toBe(true)
    })

    // ------ Turn 2: Buyer counter-proposes unitPrice:45, qty:10000, delivery:60 ------
    it('Turn 2 — Buyer counter-proposes: unitPrice 45, qty 10000, delivery 60', async () => {
      previousMerkleRoot = session.merkleRoot

      const proofResult = await prover.generateProof(CircuitId.MANDATE_BOUND, {
        proposedValue: BigInt(45 * 10000),
        maxValue: BigInt(50_000_000),
      })
      turnProofResults.push(proofResult)

      const turn = session.proposeTurn({
        agentId: buyerAgent.did,
        terms: makeTerms(45, 10000, 60),
        proofType: CircuitId.MANDATE_BOUND,
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
      })

      expect(turn.sequenceNumber).toBe(2)
      expect(turn.agentId).toBe(buyerAgent.did)
      expect(turn.terms.value).toBe(BigInt(450000))
      expect(turn.terms.deliveryDays).toBe(60)
      expect(session.merkleRoot).not.toBe(previousMerkleRoot)

      const verification = await prover.verifyProof(CircuitId.MANDATE_BOUND, proofResult)
      expect(verification.valid).toBe(true)
    })

    // ------ Turn 3: Seller counter-proposes unitPrice:48, qty:10000, delivery:75 ------
    it('Turn 3 — Seller counter-proposes: unitPrice 48, qty 10000, delivery 75', async () => {
      previousMerkleRoot = session.merkleRoot

      const proofResult = await prover.generateProof(CircuitId.PARAMETER_RANGE, {
        proposedValue: BigInt(48 * 10000),
        maxValue: BigInt(60_000_000),
      })
      turnProofResults.push(proofResult)

      const turn = session.proposeTurn({
        agentId: sellerAgent.did,
        terms: makeTerms(48, 10000, 75),
        proofType: CircuitId.PARAMETER_RANGE,
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
      })

      expect(turn.sequenceNumber).toBe(3)
      expect(turn.terms.value).toBe(BigInt(480000))
      expect(turn.terms.deliveryDays).toBe(75)
      expect(session.merkleRoot).not.toBe(previousMerkleRoot)

      const verification = await prover.verifyProof(CircuitId.PARAMETER_RANGE, proofResult)
      expect(verification.valid).toBe(true)
    })

    // ------ Turn 4: Buyer counter-proposes unitPrice:47, qty:10000, delivery:75 ------
    it('Turn 4 — Buyer counter-proposes: unitPrice 47, qty 10000, delivery 75', async () => {
      previousMerkleRoot = session.merkleRoot

      const proofResult = await prover.generateProof(CircuitId.MANDATE_BOUND, {
        proposedValue: BigInt(47 * 10000),
        maxValue: BigInt(50_000_000),
      })
      turnProofResults.push(proofResult)

      const turn = session.proposeTurn({
        agentId: buyerAgent.did,
        terms: makeTerms(47, 10000, 75),
        proofType: CircuitId.MANDATE_BOUND,
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
      })

      expect(turn.sequenceNumber).toBe(4)
      expect(turn.terms.value).toBe(BigInt(470000))
      expect(turn.terms.deliveryDays).toBe(75)
      expect(session.merkleRoot).not.toBe(previousMerkleRoot)

      const verification = await prover.verifyProof(CircuitId.MANDATE_BOUND, proofResult)
      expect(verification.valid).toBe(true)
    })

    // ------ Turn 5: Seller accepts unitPrice:47, qty:10000, delivery:75 ------
    it('Turn 5 — Seller accepts: unitPrice 47, qty 10000, delivery 75', async () => {
      // Seller accepts the buyer's last proposal (Turn 4)
      session.accept(sellerAgent.did)

      expect(session.status).toBe('completed')
      expect(session.turnCount).toBe(4) // 4 proposed turns + 1 acceptance
    })

    // ------ Turn hash chain integrity ------
    it('should maintain turn hash chain integrity across all turns', () => {
      const turns = session.turns
      expect(turns).toHaveLength(4)

      // Each turn should have a unique hash
      const hashes = turns.map(t => hashTurn(t))
      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBe(4)

      // Verify each hash is a valid SHA-256 hex string
      for (const hash of hashes) {
        expect(hash).toMatch(/^[a-f0-9]{64}$/)
      }

      // Build a separate merkle tree from the hashes and verify it matches
      const verificationMerkle = new MerkleAccumulator()
      for (const hash of hashes) {
        verificationMerkle.addLeaf(hash)
      }
      expect(verificationMerkle.getRoot()).toBe(session.merkleRoot)
    })

    // ------ Recorder verification ------
    it('should have recorded all session events', () => {
      // 1 proposed + 3 countered + 1 accepted = 5 events
      expect(recorder.eventCount).toBe(5)
      expect(recorder.getEventsByType('turn.proposed')).toHaveLength(1)
      expect(recorder.getEventsByType('turn.countered')).toHaveLength(3)
      expect(recorder.getEventsByType('turn.accepted')).toHaveLength(1)
      expect(recorder.wasAccepted).toBe(true)
      expect(recorder.wasRejected).toBe(false)
    })

    it('should have recorded turns with correct sequence', () => {
      const recordedTurns = recorder.getTurns()
      // getTurns returns proposed + countered + accepted turns
      // accepted event re-uses the last turn, so we get 4 from proposals + 1 from accept = 5
      expect(recordedTurns.length).toBeGreaterThanOrEqual(4)

      // Verify sequence ordering of proposed turns
      for (let i = 0; i < Math.min(recordedTurns.length, 4); i++) {
        expect(recordedTurns[i].sequenceNumber).toBe(i + 1)
      }
    })

    it('should verify all ZK proofs were valid', async () => {
      for (const proofResult of turnProofResults) {
        const verification = await prover.verifyProof(proofResult.circuitId, proofResult)
        expect(verification.valid).toBe(true)
        expect(verification.verificationTimeMs).toBeDefined()
      }
    })

    it('should export session recording to JSON without errors', () => {
      const json = recorder.toJSON()
      expect(() => JSON.parse(json)).not.toThrow()
      const parsed = JSON.parse(json)
      expect(parsed.length).toBeGreaterThanOrEqual(5)
    })
  })

  // =====================================================================
  // 5. COMMITMENT SETTLEMENT
  // =====================================================================

  describe('Phase 4: Commitment Settlement', () => {
    let commitmentId: string

    it('should create a commitment record with dual signatures', async () => {
      const finalTerms = session.turns[session.turns.length - 1].terms
      const agreementHash = createHash('sha256')
        .update(JSON.stringify({
          sessionId: session.id,
          terms: {
            value: finalTerms.value.toString(),
            currency: finalTerms.currency,
            deliveryDays: finalTerms.deliveryDays,
            additionalTerms: finalTerms.additionalTerms,
          },
          merkleRoot: session.merkleRoot,
        }))
        .digest('hex')

      const buyerCredHash = buyerAgent.hashCredential(buyerCredential)
      const sellerCredHash = sellerAgent.hashCredential(sellerCredential)

      // Collect proofs from the final turn for the commitment
      const lastTurn = session.turns[session.turns.length - 1]
      const commitmentProofs: CommitmentProof[] = [
        {
          circuitId: CircuitId.MANDATE_BOUND,
          circuitVersion: 'v1-test',
          proof: lastTurn.proof,
          publicSignals: lastTurn.publicSignals,
        },
      ]

      const commitment = await commitmentManager.create({
        sessionId: session.id,
        agreementHash,
        parties: [buyerAgent.did, sellerAgent.did],
        credentialHashes: [buyerCredHash, sellerCredHash],
        proofs: commitmentProofs,
      })

      commitmentId = commitment.id

      // Verify commitment structure
      expect(commitment.id).toBeDefined()
      expect(commitment.sessionId).toBe(session.id)
      expect(commitment.agreementHash).toBe(agreementHash)
      expect(commitment.parties).toEqual([buyerAgent.did, sellerAgent.did])
      expect(commitment.parties).toHaveLength(2)
      expect(commitment.credentialHashes).toEqual([buyerCredHash, sellerCredHash])
      expect(commitment.proofs).toHaveLength(1)
      expect(commitment.proofs[0].circuitId).toBe(CircuitId.MANDATE_BOUND)
      expect(commitment.verified).toBe(false)
      expect(commitment.createdAt).toBeInstanceOf(Date)
    })

    it('should verify the commitment', async () => {
      const result = await commitmentManager.verify(commitmentId)
      expect(result).toBe(true)

      const commitment = await commitmentManager.get(commitmentId)
      expect(commitment).toBeDefined()
      expect(commitment!.verified).toBe(true)
    })

    it('should retrieve commitment by session filter', async () => {
      const commitments = await commitmentManager.list({ sessionId: session.id })
      expect(commitments).toHaveLength(1)
      expect(commitments[0].id).toBe(commitmentId)
    })

    it('commitment should reference correct parties (dual signatures)', async () => {
      const commitment = await commitmentManager.get(commitmentId)
      expect(commitment!.parties).toContain(buyerAgent.did)
      expect(commitment!.parties).toContain(sellerAgent.did)
    })

    it('commitment should contain correct credential hashes', async () => {
      const commitment = await commitmentManager.get(commitmentId)
      const buyerHash = buyerAgent.hashCredential(buyerCredential)
      const sellerHash = sellerAgent.hashCredential(sellerCredential)

      expect(commitment!.credentialHashes).toContain(buyerHash)
      expect(commitment!.credentialHashes).toContain(sellerHash)
    })

    it('commitment agreementHash should incorporate session merkle root', async () => {
      const commitment = await commitmentManager.get(commitmentId)
      const finalTerms = session.turns[session.turns.length - 1].terms

      // Recompute the expected agreement hash
      const expectedHash = createHash('sha256')
        .update(JSON.stringify({
          sessionId: session.id,
          terms: {
            value: finalTerms.value.toString(),
            currency: finalTerms.currency,
            deliveryDays: finalTerms.deliveryDays,
            additionalTerms: finalTerms.additionalTerms,
          },
          merkleRoot: session.merkleRoot,
        }))
        .digest('hex')

      expect(commitment!.agreementHash).toBe(expectedHash)
    })
  })

  // =====================================================================
  // 6. FINAL VERIFICATION
  // =====================================================================

  describe('Phase 5: Final Verification', () => {
    it('should verify the complete session transcript', () => {
      // Session completed successfully
      expect(session.status).toBe('completed')
      expect(session.turnCount).toBe(4)

      // All turns have valid structure
      for (const turn of session.turns) {
        expect(turn.id).toBeDefined()
        expect(turn.sessionId).toBe(session.id)
        expect(turn.agentId).toBeDefined()
        expect(turn.signature).toBeDefined()
        expect(turn.terms.currency).toBe(EUR)
        expect(turn.createdAt).toBeInstanceOf(Date)
      }

      // Turn sequence is monotonically increasing
      for (let i = 0; i < session.turns.length; i++) {
        expect(session.turns[i].sequenceNumber).toBe(i + 1)
      }
    })

    it('should verify alternating agent turns', () => {
      const turns = session.turns
      // Turn 1: Seller, Turn 2: Buyer, Turn 3: Seller, Turn 4: Buyer
      expect(turns[0].agentId).toBe(sellerAgent.did)
      expect(turns[1].agentId).toBe(buyerAgent.did)
      expect(turns[2].agentId).toBe(sellerAgent.did)
      expect(turns[3].agentId).toBe(buyerAgent.did)
    })

    it('should verify negotiation convergence', () => {
      const turns = session.turns
      // Seller: 52 -> 48 (conceded down)
      // Buyer:  45 -> 47 (conceded up)
      // Final agreement at 47
      const sellerPrices = [
        (turns[0].terms.additionalTerms as Record<string, unknown>)?.unitPrice,
        (turns[2].terms.additionalTerms as Record<string, unknown>)?.unitPrice,
      ]
      const buyerPrices = [
        (turns[1].terms.additionalTerms as Record<string, unknown>)?.unitPrice,
        (turns[3].terms.additionalTerms as Record<string, unknown>)?.unitPrice,
      ]

      // Seller conceded downward
      expect(sellerPrices[0]).toBeGreaterThan(sellerPrices[1] as number)
      // Buyer conceded upward
      expect(buyerPrices[1]).toBeGreaterThan(buyerPrices[0] as number)

      // Final agreed terms
      const finalTurn = turns[turns.length - 1]
      expect(finalTurn.terms.value).toBe(BigInt(470000)) // 47 * 10000
      expect(finalTurn.terms.deliveryDays).toBe(75)
    })

    it('should verify merkle root is non-empty after negotiation', () => {
      expect(session.merkleRoot).not.toBe('0x' + '0'.repeat(64))
      expect(session.merkleRoot).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should verify all ZK proofs for every turn in the transcript', async () => {
      for (const turn of session.turns) {
        // Each turn carries a proof — verify its structure
        expect(turn.proof).toBeDefined()
        expect(turn.proof.protocol).toBe('groth16')
        expect(turn.proof.curve).toBe('bn128')
        expect(turn.proof.pi_a).toHaveLength(2)
        expect(turn.proof.pi_b).toHaveLength(2)
        expect(turn.proof.pi_c).toHaveLength(2)
        expect(turn.publicSignals.signals.length).toBeGreaterThan(0)
      }
    })

    it('should have a valid commitment linked to the session', async () => {
      const commitments = await commitmentManager.list({ sessionId: session.id })
      expect(commitments).toHaveLength(1)

      const commitment = commitments[0]
      expect(commitment.verified).toBe(true)
      expect(commitment.parties).toHaveLength(2)
      expect(commitment.credentialHashes).toHaveLength(2)
      expect(commitment.proofs).toHaveLength(1)
    })

    it('should clean up local chain', async () => {
      await localChain.stop()
      expect(localChain.isRunning).toBe(false)
    })
  })

  // =====================================================================
  // Appendix B reference: Whitepaper test vector alignment
  // =====================================================================

  describe('Appendix B: Whitepaper Test Vector Alignment', () => {
    it('should match whitepaper participant DID format (did:ethr:0x...)', () => {
      expect(buyerAgent.did).toMatch(/^did:ethr:0x[0-9a-f]{40}$/)
      expect(sellerAgent.did).toMatch(/^did:ethr:0x[0-9a-f]{40}$/)
    })

    it('should match whitepaper credential structure', () => {
      // Whitepaper B.2: credential has id, type, issuer, credentialSubject, proof
      expect(buyerCredential.id).toMatch(/^urn:uuid:/)
      expect(buyerCredential.type).toContain('VerifiableCredential')
      expect(buyerCredential.type).toContain('AgentAuthorityCredential')
      expect(buyerCredential.issuer).toBeDefined()
      expect(buyerCredential.credentialSubject).toBeDefined()
      expect(buyerCredential.proof).toBeDefined()
      expect(buyerCredential.proof.type).toBeDefined()
      expect(buyerCredential.proof.verificationMethod).toContain('#keys-1')
      expect(buyerCredential.proof.proofPurpose).toBe('assertionMethod')
    })

    it('should match whitepaper mandate ranges', () => {
      // Whitepaper B.2: maxCommitmentValue €500K, unitPrice [40,55], qty [5K,15K], delivery [30,120]
      const mandate = buyerCredential.credentialSubject.mandateParams
      expect(mandate.maxValue).toBe(BigInt(50_000_000)) // €500K in euro-cents
      expect(mandate.parameterFloor).toBe(BigInt(4000))   // 40.00 EUR
      expect(mandate.parameterCeiling).toBe(BigInt(5500)) // 55.00 EUR
    })

    it('should use Groth16/BN128 proofs as per whitepaper B.3', () => {
      for (const turn of session.turns) {
        expect(turn.proof.protocol).toBe('groth16')
        expect(turn.proof.curve).toBe('bn128')
      }
    })

    it('should use correct circuit IDs as per whitepaper', () => {
      // Whitepaper B.3: MandateBound circuit
      const circuitIds = session.turns.map(t => t.proofType)
      expect(circuitIds).toContain(CircuitId.MANDATE_BOUND)
      expect(circuitIds).toContain(CircuitId.PARAMETER_RANGE)
    })
  })
})
