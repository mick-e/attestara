# DIF Trusted AI Agents Working Group -- Presentation Outline

**Title:** Attestara: ZK-Based Authority Enforcement for Agentic Commerce
**Presenter:** Mick Brolin, Littledata Research & Engineering
**Target audience:** DIF Trusted AI Agents Working Group
**Duration:** 15 minutes presentation + 10 minutes Q&A
**Format:** Slide deck (PDF/Google Slides), shared with WG mailing list 3 days in advance

---

## Slide 1: Title Slide (30 seconds)

- **Attestara: A Cryptographic Trust Protocol for Autonomous AI Agent Commerce**
- Presenter name, organisation (Littledata), contact (mick@littledata.ai)
- "Submitted as use case input to the Agentic Authority Use Cases work item"

---

## Slide 2: Problem Statement -- The Governance Gap (2 minutes)

**Key message:** When two AI agents from competing organisations negotiate, no infrastructure exists to verify authority, enforce mandates, or create auditable records.

Content:
- Enterprises deploying autonomous agents for procurement, supply chain, financial transactions
- No mechanism to verify: Was the agent authorised? Does the proposal fall within its mandate? Is there a tamper-proof record?
- The clearing house analogy: Before 1832, interbank obligations required bilateral trust. Clearing houses eliminated that requirement. AI agents face the identical trust vacuum today.
- EU AI Act Article 9 mandates demonstrable governance from August 2026 -- enterprises deploying agentic systems today are non-compliant
- DORA requires ICT risk governance for financial institutions from January 2025

---

## Slide 3: How Attestara Maps to the WG's Agentic Authority Use Cases (3 minutes)

**Key message:** Attestara is a production-targeted implementation of what this working group is specifying.

Content:
- The WG's Agentic Authority Use Cases work item focuses on:
  - Delegation chains
  - Authorisation boundaries
  - Trust registries
  - Agent discovery
  - Human oversight mechanisms
- Attestara directly addresses each:
  - **Delegation chains:** Principal issues AgentAuthorityCredential (W3C VC 2.0) to Agent via WACI-DIDComm Issue Credential v3
  - **Authorisation boundaries:** Mandate parameters encoded in credential; enforced via Groth16 ZK proofs at every negotiation turn
  - **Trust registries:** On-chain CredentialRegistry (Arbitrum L2) for credential anchoring and Bitstring Status List revocation
  - **Agent discovery:** did:ethr (ERC-1056) identifiers with DIDComm v2 service endpoints
  - **Human oversight:** Principal-defined mandate boundaries; real-time revocation; audit trail exports

---

## Slide 4: DIDComm v2 Protocol Bindings (3 minutes)

**Key message:** Attestara defines three concrete DIDComm v2 message types that compose with existing DIF infrastructure.

Content:
- **Credential Issuance:** WACI-DIDComm Issue Credential v3 over DIDComm v2
  - `issue-credential/3.0/offer-credential` -> `request-credential` -> `issue-credential` -> `ack`
  - Credential body encrypted with Agent's DID key (ECDH-1PU + XC20P)
- **Session Invitation:** Custom DIDComm v2 type `attestara.ai/protocols/session/1.0/invite`
  - Includes sessionId, on-chain anchor tx hash, single-use invite token
  - Required `expires_time` to bound validity
- **Negotiation Turn:** Custom DIDComm v2 type `attestara.ai/protocols/negotiation/1.0/turn`
  - Carries proposal + ZK proof bundle (MandateBound, ParameterRange, CredentialFreshness, IdentityBinding)
  - Hash-chained turns create tamper-proof audit trail
- **DIF Presentation Exchange v2:** `attestara-turn-verification` presentation definition for counterparty verification
- **DIF Credential Manifest:** Defines issuance requirements for AgentAuthorityCredential

---

## Slide 5: ZK Proof Integration with Verifiable Credentials (3 minutes)

**Key message:** ZK proofs solve the fundamental tension -- verify authority without revealing the authority boundaries.

Content:
- The problem: If Agent A reveals its maximum price to Agent B, Agent B exploits it. But Agent B needs assurance that Agent A is authorised.
- Attestara's solution: Four Groth16 ZK circuits:
  1. **MandateBound** -- proves proposed value is within mandate limits without revealing limits
  2. **ParameterRange** -- proves each parameter (price, quantity, delivery) is within allowed range
  3. **CredentialFreshness** -- proves credential has not been revoked (checks Bitstring Status List Merkle root)
  4. **IdentityBinding** -- proves the prover controls the Agent DID
- Credential mandate parameters are ZK circuit private inputs only -- never transmitted
- On-chain verification via Groth16 verifier contract (Arbitrum L2)
- Cost: ~$0.06--$0.08 per negotiation session (ZK proof costs under $0.01 each on L2)

---

## Slide 6: Demo Plan (2 minutes)

**Key message:** We can demonstrate the protocol end-to-end.

Content:
- **Live demo scope** (when SDK MVP is ready):
  1. Principal issues AgentAuthorityCredential via DIDComm v2
  2. Agent A invites Agent B to negotiation session (DIDComm session invite)
  3. Agents exchange proposals with ZK proof bundles (DIDComm turn messages)
  4. Counterparty verifies proofs -- confirms authority without seeing mandate
  5. Agreement settled on-chain with dual signatures
- **What the WG sees:**
  - DIDComm v2 messages flowing through the protocol
  - ZK proofs generated and verified in real time
  - On-chain settlement record
- **Timeline:** Demo available after Phase 1 MVP (target Month 6)
- **Offer:** WG members invited to test against a staging environment

---

## Slide 7: Call to Action (2 minutes)

**Key message:** We are here to contribute, not just present. We need the WG's input and collaboration.

Specific asks:
1. **Feedback on protocol bindings:** Are the DIDComm v2 message types structured correctly? Do they compose with other WG outputs?
2. **Co-editors:** We need a co-editor from a second organisation for the W3C CCG Work Item submission (Month 8). We are looking for someone who is working on adjacent agent authority problems.
3. **Reference implementation feedback:** When the SDK is public, we welcome WG members to test, report issues, and validate interoperability.
4. **Use case contributions:** If WG members have additional use cases (beyond procurement/financial services) that the protocol should address, we want to hear them.
5. **DIF Labs sponsorship:** We plan to apply for DIF Labs at Month 4 and welcome WG support.

---

## Appendix Slides (for Q&A, not presented)

### A1: Credential Structure

- Full `AgentAuthorityCredential` VC structure (Whitepaper Section 3.1)
- JSON-LD context: `https://attestara.ai/contexts/v1`
- VC 2.0 conformance table (VC Data Model, Data Integrity, EdDSA Cryptosuites, Bitstring Status List, Controlled Identifiers)

### A2: Architecture Diagram

- Four-layer architecture: Identity (DID/VC), ZK Proof, Session Protocol, On-Chain Settlement
- Component diagram showing SDK, relay, prover service, smart contracts

### A3: Threat Model Summary

- STRIDE analysis of the protocol
- Key threats: credential forgery, proof replay, relay compromise, DID key compromise
- Mitigations for each

### A4: Regulatory Alignment

- EU AI Act Article 9, 12, 14 mapping
- DORA alignment
- GDPR considerations (ZK proofs as privacy-preserving measure)

### A5: Standards Engagement Timeline

- Full timeline from Whitepaper Section 12.5
- DIF (now) -> W3C CCG (Month 8) -> JTC 21 (Month 10) -> IETF (Month 24+)

---

## Preparation Checklist

- [ ] Finalise slide deck
- [ ] Share deck with WG mailing list 3 business days before call
- [ ] Prepare 2-minute demo video (backup if live demo is not ready)
- [ ] Prepare one-page protocol summary handout (PDF)
- [ ] Identify 3--5 specific WG members to follow up with individually
- [ ] Have Whitepaper v5 available for reference during Q&A

---

*Attestara DIF Presentation Outline v1.0*
