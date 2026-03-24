# Attestara: A Cryptographic Trust Protocol for Autonomous AI Agent Commerce

**Version 3.0 — March 2026**

**Authors:** Littledata Research & Engineering

**Contact:** mick@littledata.ai

**Standards alignment:** W3C Verifiable Credentials Data Model v2.0 (Rec. May 2025) · W3C Bitstring Status List v1.0 (Rec. May 2025) · CEN-CENELEC JTC 21 / M/593 · ISO/IEC 42001:2023 · ISO/IEC 23894:2023

---

## Executive Summary

**The problem is real, urgent, and unaddressed.**

Enterprises are deploying autonomous AI agents to negotiate procurement contracts, manage supply-chain logistics, and execute financial transactions — often with multi-million-dollar consequences. Yet no infrastructure exists to govern these interactions. When two AI agents from competing organisations negotiate, there is no way to verify that either agent has authority to act, that its proposals fall within its mandate, or that the resulting agreement is auditable and enforceable.

This is not a future concern. The EU AI Act (Article 9) mandates demonstrable governance over high-risk AI systems from August 2026. DORA requires ICT risk governance for financial institutions from January 2025. Enterprises deploying agentic systems today are non-compliant with regulations that are already in force.

**Attestara closes this gap.**

Attestara is an open cryptographic trust protocol that delivers three guarantees no existing solution provides:

1. **Authority verification without mandate disclosure.** An agent can prove it is authorised to make a proposal — without revealing the boundaries of its authority to the counterparty.

2. **Tamper-proof negotiation audit trails.** Every negotiation turn is cryptographically hash-chained and periodically anchored on-chain, creating an immutable record that satisfies EU AI Act Article 12 logging requirements and DORA audit obligations.

3. **Binding on-chain commitment records.** Agreed terms are settled on Arbitrum L2 with dual agent signatures, creating an independently verifiable, legally admissible record of what was agreed and by whom.

**The technology is ready. The timing is precise.**

Zero-knowledge proof costs have fallen to under $0.01 per proof on Arbitrum L2, making per-session on-chain anchoring economically viable at approximately $0.06–$0.08 per negotiation. The EU AI Act enforcement deadline of August 2026 creates immediate demand for compliance infrastructure. No production alternative exists for B2B adversarial agent negotiation with privacy-preserving mandate enforcement.

**The commercial model is straightforward.**

Pilot engagements (Months 8–18) target financial services and procurement teams at €20K–€30K each, with a SaaS self-serve platform targeting €380K ARR by Month 24 and €1.35M ARR by Month 36. The protocol specification will be open and submitted to W3C and Linux Foundation AI & Data for standardisation; commercial value is captured through managed infrastructure, enterprise tooling, and the reference implementation.

**Who should read this paper:** Chief Information Security Officers, General Counsel, Chief Procurement Officers, and technology leaders responsible for AI governance and regulatory compliance in organisations deploying autonomous agents. Technical sections (4, 7, 8, 13) are directed at engineering and architecture teams.

---

## Abstract

The rapid deployment of autonomous AI agents in enterprise commerce — procurement negotiation, supply-chain management, financial transactions — has created a fundamental governance gap. When two AI agents from competing organisations negotiate, no infrastructure exists to verify that either agent has authority to act, that its proposals fall within its mandate, or that the resulting agreement is auditable and enforceable. This paper introduces **Attestara**, an open cryptographic trust protocol that enables AI agents to negotiate, commit, and be held accountable across organisational boundaries without requiring inter-party trust. Attestara combines zero-knowledge proofs (Groth16/Circom), W3C Verifiable Credentials Data Model v2.0-conformant Authority Credentials (with Bitstring Status List revocation), and smart contract settlement (Arbitrum L2) to deliver three guarantees: authority verification without mandate disclosure, tamper-proof negotiation audit trails, and binding on-chain commitment records. We present the protocol architecture, formal threat model, performance analysis, and regulatory alignment with the EU AI Act (Articles 9, 12, 14, 17), DORA, and GDPR — including explicit mapping to CEN-CENELEC JTC 21 harmonised standards under Standardisation Request M/593, and a W3C CCG Work Item submission roadmap. Attestara occupies an uncontested market position — no existing solution addresses B2B adversarial agent negotiation with privacy-preserving mandate enforcement and cryptographically binding settlement.

**Keywords:** AI agents, zero-knowledge proofs, verifiable credentials, decentralised identity, smart contracts, agent governance, EU AI Act, DORA, GDPR, agentic commerce

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [The Governance Gap in Agentic Commerce](#2-the-governance-gap-in-agentic-commerce)
3. [Protocol Design](#3-protocol-design)
4. [Zero-Knowledge Proof Architecture](#4-zero-knowledge-proof-architecture)
5. [Identity and Credential Framework](#5-identity-and-credential-framework)
6. [On-Chain Commitment Settlement](#6-on-chain-commitment-settlement)
7. [Session Protocol](#7-session-protocol)
8. [Threat Model](#8-threat-model)
9. [Performance and Cost Analysis](#9-performance-and-cost-analysis)
10. [Regulatory Alignment](#10-regulatory-alignment)
11. [Competitive Analysis](#11-competitive-analysis)
12. [Governance and Standards](#12-governance-and-standards)
13. [Implementation Architecture](#13-implementation-architecture)
14. [Use Cases](#14-use-cases)
15. [Roadmap](#15-roadmap)
16. [Conclusion](#16-conclusion)
17. [References](#17-references)

---

## 1. Introduction

The clearing house for AI agents.

In 1832, the London Clearing House solved precisely the same problem for banks that Attestara solves for AI agents. Before clearing houses, every interbank obligation required bilateral trust — one bank had to believe the other would honour its commitments. The clearing house eliminated that requirement by interposing a neutral, rule-governed infrastructure layer that verified obligations, enforced settlement, and maintained auditable records. It did not require the two banks to trust each other. It required them to trust the rules.

Today, AI agents face an identical trust vacuum. Enterprises are deploying autonomous agents that negotiate contracts, commit to supply agreements, and execute financial transactions — often with multi-million-dollar consequences. Yet the infrastructure to govern these interactions does not exist. When Agent A proposes terms to Agent B, Agent B receives an API call. There is no mechanism to verify:

- **Authority:** Was Agent A actually authorised to make this proposal?
- **Mandate compliance:** Does the proposal fall within Agent A's permitted negotiation parameters?
- **Commitment integrity:** If they reach agreement, is there a tamper-proof record of what was agreed?
- **Auditability:** Can regulators, principals, or counterparties independently verify the negotiation history?

Attestara is a cryptographic trust protocol that answers all four questions. It enables AI agents to prove they are operating within their authority mandate — without revealing the mandate itself — and to create binding, auditable commitment records when they reach agreement.

### 1.1 Design Principles

Attestara is built on five foundational principles:

1. **Privacy-preserving verification.** An agent should be able to prove it has authority to act without revealing the boundaries of that authority. A buyer's agent should not need to disclose its maximum price to prove it has not exceeded it.

2. **Cryptographic certainty over institutional trust.** Verification should not depend on trusting the counterparty's organisation, IT infrastructure, or governance processes. Mathematical proof replaces organisational trust.

3. **Regulatory readiness by design.** The protocol should satisfy the logging, transparency, human oversight, and audit trail requirements of the EU AI Act (Article 9), DORA, GDPR, and emerging AI governance frameworks — not as an afterthought, but as a core architectural property.

4. **Open protocol, commercial infrastructure.** The specification and core cryptographic primitives should be open and standardisable. Commercial value is captured through reference implementations, managed services, and enterprise tooling.

5. **Incremental adoption.** Enterprises should be able to adopt Attestara for bilateral agent interactions without requiring ecosystem-wide coordination. The protocol should work between two parties before it works between two hundred.

---

## 2. The Governance Gap in Agentic Commerce

### 2.1 The Scale of Agentic Commerce

The deployment of autonomous AI agents in enterprise commerce is accelerating. According to MarketsandMarkets and McKinsey Global Institute research, the autonomous AI agents market is growing at a CAGR exceeding 40%, driven by enterprise adoption in procurement, financial services, and supply-chain management [1, 2]:

| Metric | Current | Projected |
|--------|---------|-----------|
| Global AI agents market | $5.4B (2024) [1] | $236B (2034) [1] |
| Agentic commerce transaction volume | Emerging | $5T globally (2030) [2] |
| Enterprise AI governance software | Fastest-growing compliance category [3] | — |
| EU AI Act high-risk system registrations | — | Mandatory from August 2026 [4] |

These agents are not performing simple lookups or generating reports. They are negotiating procurement contracts, managing supply-chain logistics, executing financial transactions, and making commitment decisions with real economic consequences.

### 2.2 Four Dimensions of the Governance Gap

**Dimension 1: Authority Verification.** When Agent A sends a proposal to Agent B, Agent B receives an API call. There is no mechanism to verify that Agent A was authorised to make that proposal, that its authorisation is current, or that the authorising principal (human or organisation) intended the proposal's terms. The counterparty must trust the other organisation's internal governance — a trust assumption that breaks down in adversarial or competitive contexts.

**Dimension 2: Mandate Enforcement.** Even if authority can be established, there is no mechanism to enforce mandate boundaries. A principal may intend to cap its agent's negotiation at €500K, but there is no cryptographic constraint preventing the agent from proposing €600K. Mandate enforcement today relies on application-level guardrails — if-then rules in code that can be misconfigured, bypassed, or undermined by prompt injection.

**Dimension 3: Audit Trail Integrity.** Regulators increasingly require demonstrable governance over AI-driven decisions. The EU AI Act (Article 9) mandates risk management systems, logging, and human oversight for high-risk AI systems. DORA requires ICT risk governance for financial institutions. Yet agent-to-agent negotiations typically exist only as ephemeral API calls — there is no immutable, timestamped, independently verifiable record of what was proposed, counter-proposed, and agreed.

**Dimension 4: Commitment Binding.** When two agents reach agreement, the "contract" exists as a JSON object in one or both organisations' databases. There is no neutral, tamper-proof record. There is no dual-signature mechanism. There is no independent verification that both parties agreed to the same terms. Disputes reduce to "our logs say X; your logs say Y" — a situation that has already led to costly legal proceedings in early agentic commerce deployments.

### 2.3 Why Existing Solutions Do Not Work

Current approaches to AI agent governance fail because they address the wrong layer of the problem:

- **API authentication (OAuth, API keys)** verifies that a request comes from a known system, not that the agent has authority to make a specific proposal.
- **Role-based access control (RBAC)** constrains what an agent can access, not what it can negotiate or commit to.
- **Agent frameworks (LangChain, AutoGen, CrewAI)** provide orchestration and tool use, not cross-organisational trust.
- **Interoperability protocols (Google A2A, MCP)** solve agent discovery and communication format, not authority verification or commitment binding.

The governance gap exists at a layer that none of these solutions address: the intersection of cryptographic identity, mandate-bound authority, and verifiable commitment. Attestara is designed to be **complementary** to, not competitive with, these existing protocols — it provides the trust layer that sits beneath interoperability infrastructure.

---

## 3. Protocol Design

Attestara is a three-layer protocol. Each layer addresses a specific dimension of the governance gap while maintaining clean separation of concerns.

### 3.1 Layer 1: Credential Layer (Authority Binding)

The Credential Layer establishes verifiable authority relationships between principals and agents.

A **principal** (organisation or authorised human) issues an **Authority Credential** to an agent. This credential is a W3C Verifiable Credential (VC) that cryptographically encodes:

- **Agent identity:** The agent's Decentralised Identifier (DID), anchored on-chain via did:ethr (ERC-1056).
- **Mandate scope:** The negotiation parameters the agent is authorised to operate within — maximum commitment value, allowed parameter ranges (price, quantity, delivery window), permitted counterparty types.
- **Temporal validity:** The time window during which the credential is active.
- **Revocation status:** A mechanism for the principal to revoke authority in real time.

The credential is signed by the principal's DID key and can be verified by any party with access to the Ethereum state (via the ERC-1056 registry). Critically, the credential's mandate parameters are private — they are held in encrypted storage by the agent and used only as private inputs to zero-knowledge proofs. They are never transmitted to counterparties.

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",      // VC 2.0 base context (W3C Rec. May 2025)
    "https://attestara.io/contexts/v1"           // Attestara extension context
  ],
  "id": "urn:uuid:<credential-uuid>",             // MUST be present per VC 2.0 §4.4
  "type": ["VerifiableCredential", "AgentAuthorityCredential"],
  "issuer": "did:ethr:0x<principal_address>",
  "validFrom": "2026-03-22T00:00:00Z",            // top-level per VC 2.0 §4.8 (NOT inside credentialSubject)
  "validUntil": "2026-06-22T00:00:00Z",           // top-level per VC 2.0 §4.8
  "credentialStatus": {
    "id": "https://status.attestara.io/registry/1#<index>",
    "type": "BitstringStatusListEntry",           // W3C Bitstring Status List v1.0 (Rec. May 2025)
    "statusPurpose": "revocation",
    "statusListIndex": "<index>",
    "statusListCredential": "https://status.attestara.io/registry/1"
  },
  "credentialSubject": {
    "id": "did:ethr:0x<agent_address>",
    "mandate": {
      "type": "AgentNegotiationMandate",          // MUST specify type per VC 2.0 §4.5
      "maxCommitmentValue": "<AES-256-GCM encrypted at rest; ZKP private input only — never transmitted>",
      "parameterRanges": { },                     // private ZKP inputs only
      "allowedCounterpartyTypes": [],
      "sessionLimit": "<number>"
    }
  },
  "proof": {
    "type": "DataIntegrityProof",                 // VC Data Integrity 1.0 (Rec. May 2025)
    "cryptosuite": "ecdsa-secp256k1-2019",        // replaces deprecated EcdsaSecp256k1Signature2019
    "created": "2026-03-22T00:00:00Z",
    "verificationMethod": "did:ethr:0x<principal_address>#keys-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "<base58btc-encoded-signature>"
  }
}
```

> **VC 2.0 Conformance note:** The schema above conforms to the W3C Verifiable Credentials Data Model v2.0 (W3C Recommendation, 15 May 2025). Key departures from draft versions of this whitepaper include: (1) `@context` updated to `https://www.w3.org/ns/credentials/v2`; (2) `validFrom`/`validUntil` moved to top-level credential properties; (3) `proof.type` updated from the deprecated `EcdsaSecp256k1Signature2019` to `DataIntegrityProof` with `ecdsa-secp256k1-2019` cryptosuite per VC Data Integrity 1.0; (4) `credentialStatus` added using Bitstring Status List v1.0 for revocation; (5) credential `id` and mandate `type` added as required by VC 2.0 §§4.4, 4.5.

### 3.2 Layer 2: Zero-Knowledge Proof Layer (Private Verification)

The ZK Proof Layer enables agents to prove mandate compliance without revealing mandate parameters.

At each turn of a negotiation, the acting agent generates a **zero-knowledge proof** demonstrating that its proposal satisfies its mandate constraints. The counterparty (or an on-chain verifier) can verify this proof in constant time without learning anything about the mandate itself.

Four core circuits enforce compliance:

| Circuit | Statement Proven | Private Inputs | Public Inputs |
|---------|-----------------|----------------|---------------|
| **MandateBound** | proposed_value ≤ max_value | max_value, credential_hash | proposed_value, session_id |
| **ParameterRange** | floor ≤ parameter ≤ ceiling | floor, ceiling | parameter_value, session_id |
| **CredentialFreshness** | credential is valid and unrevoked at time T | valid_from, valid_until, revocation_witness | current_timestamp, on_chain_state_root |
| **IdentityBinding** | session key belongs to DID | private_key | public_key, did_document_hash |

These circuits are composable. A single negotiation turn may require proofs from multiple circuits, which are batched and verified together.

### 3.3 Layer 3: Commitment Layer (Binding Settlement)

The Commitment Layer creates immutable, independently verifiable records of agent agreements.

When two agents reach agreement, the final terms are recorded as a **commitment record** on the Attestara smart contract (deployed on Arbitrum L2). Each commitment record contains:

- **Dual signatures:** Both agents sign the final terms with their DID keys.
- **Session anchor:** A hash of the complete negotiation history, linking the commitment to its provenance.
- **ZK proof references:** Pointers to the ZK proofs that validated each agent's authority throughout the negotiation.
- **Timestamp and block reference:** Immutable temporal anchoring via the Arbitrum block.

The commitment record is publicly verifiable — any party with the commitment ID can independently confirm what was agreed, by whom, and that both agents had cryptographically verified authority at the time of agreement.

---

## 4. Zero-Knowledge Proof Architecture

### 4.1 Why Zero-Knowledge Proofs?

The core innovation of Attestara is the insight that **authority verification and mandate privacy are not opposing requirements** — zero-knowledge proofs make them complementary.

Consider a procurement negotiation. Buyer Agent B has a mandate: "Do not exceed €500K for 10,000 units, with delivery within 90 days." Seller Agent S proposes: "€480K for 10,000 units, delivery in 75 days."

Without Attestara, B can accept — but S has no way to verify that B was authorised to commit €480K. With Attestara, B generates a ZK proof demonstrating:

- "My proposed acceptance value (€480K) is ≤ my maximum authorised value" — without revealing the maximum.
- "My proposed quantity (10,000) is within my authorised range" — without revealing the range bounds.
- "My credential is currently valid and has not been revoked" — without revealing its expiry date.
- "I am the agent bound to this DID" — without revealing my private key.

S verifies all four proofs. Verification confirms that B has authority — without S learning that B's actual ceiling was €500K (which would give S leverage in future negotiations).

### 4.2 Circuit Design: Groth16 on Circom

Attestara uses **Groth16** proofs compiled from **Circom 2.x** circuits. The choice of Groth16 over PLONK is deliberate:

| Property | Groth16 | PLONK |
|----------|---------|-------|
| Proof size | ~192 bytes | ~384 bytes |
| Verification gas | ~210K | ~300K+ |
| Trusted setup | Required (circuit-specific) | Universal (one-time) |
| Prover time | Comparable | Comparable |

For Attestara's use case — where proofs are verified on-chain and gas cost directly impacts economic viability — Groth16's 30–40% gas advantage is significant. The trusted setup requirement is mitigated by the protocol's planned migration path to PLONK once the DAO governance ceremony infrastructure is mature.

A formal circuit security audit is planned with Trail of Bits or Zellic prior to any mainnet deployment. The scope will encompass all four circuits, the trusted setup ceremony, and the proof batching mechanism. Audit findings will be published in full.

### 4.3 MandateBound Circuit (Detailed)

The MandateBound circuit is the protocol's workhorse. It proves that a proposed value does not exceed the agent's authorised maximum without revealing the maximum.

**Formal statement:**

Given public inputs `(proposed_value, session_id, credential_commitment)` and private inputs `(max_value, credential_randomness)`, the circuit proves:

1. `proposed_value ≤ max_value` (mandate compliance)
2. `hash(max_value, credential_randomness) == credential_commitment` (credential binding)
3. `proposed_value > 0` (non-triviality)

**Security properties:**

- **Soundness:** A cheating prover cannot generate a valid proof for `proposed_value > max_value` except with negligible probability (≤ 2⁻¹²⁸).
- **Zero-knowledge:** The verifier learns nothing about `max_value` beyond the fact that `proposed_value ≤ max_value`.
- **Binding:** The credential commitment prevents the agent from using different mandates at different turns.

### 4.4 CredentialFreshness Circuit and Revocation Integration

The CredentialFreshness circuit proves that an Authority Credential is both temporally valid and unrevoked at the time of proof generation. This circuit requires a trusted source of the current on-chain state — specifically the credential's revocation bit within a W3C Bitstring Status List — along with the current block timestamp. These values cannot be self-attested by the proving agent.

**Bitstring Status List integration.** Attestara uses the W3C Bitstring Status List v1.0 (W3C Recommendation, May 2025) as its revocation mechanism, replacing any custom on-chain registry. Each `AuthorityCredential` contains a `credentialStatus` entry pointing to a status list entry index. The Littledata-operated (or self-hosted) status list credential is published at a stable HTTPS URL and updated on every revocation event.

**Merkle state witness mechanism.** At proof generation time, the prover performs the following steps:

1. **Fetch the status list.** The SDK fetches the current Bitstring Status List credential from the registered URL and extracts the compressed bitstring. The status list credential is itself a signed VC — the SDK verifies its signature before trusting the revocation bit.
2. **Construct the witness.** A Merkle proof is computed over the bitstring, demonstrating that the bit at the credential's registered index is `0` (not revoked), without revealing any other bits in the list. The Merkle root of the bitstring is included as a **public input** to the circuit.
3. **Anchor the state root on-chain.** The Merkle root of the current status list is periodically anchored on the Arbitrum CredentialRegistry contract (every 60 seconds or on every revocation event). The block timestamp at anchoring is recorded alongside the root.
4. **Circuit verification.** The CredentialFreshness circuit receives:
   - *Private inputs:* `valid_from`, `valid_until`, `status_bit_witness` (the Merkle path proving non-revocation at the credential's index)
   - *Public inputs:* `current_timestamp`, `status_list_root` (the on-chain anchored Merkle root)
   The circuit proves: (a) `valid_from ≤ current_timestamp ≤ valid_until`; (b) the Merkle path `status_bit_witness` correctly opens `status_list_root` to a `0` bit at the credential's registered index.
5. **Staleness prevention.** The on-chain verifier independently confirms that `status_list_root` was anchored within a configurable freshness window (default: 90 seconds) before the proof was generated, preventing replay of proofs generated against stale revocation state.

**Security properties.** This design is trustless with respect to the status list publisher: the prover cannot forge a non-revocation witness without inverting the hash function used in the Merkle tree (SHA-256). A revocation event that updates the on-chain root within the freshness window will cause all proofs generated before that window to fail the staleness check, and all proofs generated after it to fail the Merkle witness check. The trade-off is that proof generation requires a live connection to both the status list URL and an Arbitrum RPC endpoint; the SDK handles this automatically with fallback endpoints.

**Note on Poseidon vs SHA-256.** The Merkle tree used inside the circuit uses Poseidon hash (ZK-friendly) over the bitstring chunks, while the on-chain anchor and the status list credential use SHA-256 for off-chain compatibility. The circuit includes a cross-check that the Poseidon root corresponds to the SHA-256 root anchored on-chain via a pre-computed mapping table embedded in the circuit's trusted setup.

### 4.5 ParameterRange Circuit

The ParameterRange circuit generalises MandateBound to multi-dimensional constraints. It proves that a proposed parameter falls within an authorised range `[floor, ceiling]`.

This circuit handles price ranges, quantity bounds, delivery windows, and any other negotiation parameter that can be expressed as a numeric range. Multiple ParameterRange proofs can be composed to cover all dimensions of a complex proposal.

### 4.6 Proof Composition and Batching

A typical negotiation turn requires proofs from 2–4 circuits. Attestara batches these into a single verification transaction using proof aggregation:

1. Individual proofs are generated in parallel (one per circuit).
2. Proofs are bundled into a `TurnProofBundle` with a common session anchor.
3. The bundle is verified atomically — all proofs must pass for the turn to be accepted.

This design ensures that a single compromised circuit cannot undermine the security of the overall turn verification.

---

## 5. Identity and Credential Framework

### 5.1 Decentralised Identifiers (DIDs)

Attestara uses **did:ethr** (ERC-1056) as its DID method. Each agent and principal is identified by a DID anchored on Ethereum:

```
did:ethr:0x1234567890abcdef1234567890abcdef12345678
```

**Why did:ethr?**

- **Ethereum-native:** Key management via existing wallet infrastructure.
- **W3C compliant:** Full conformance with the DID Core specification and the W3C Controlled Identifiers v1.0 specification (W3C Recommendation, May 2025), which supersedes the standalone DID Core document and governs how controlled identifier documents express cryptographic material and service endpoints.
- **Mature tooling:** Veramo framework provides production-grade DID resolution, credential issuance, and verification.
- **Gas-efficient:** ERC-1056 uses a lightweight on-chain registry (setAttribute/revokeDelegate) rather than deploying per-identity contracts.

> **VC 2.0 alignment note:** Attestara's revocation mechanism uses the W3C Bitstring Status List v1.0 (W3C Recommendation, May 2025), replacing the previously planned custom on-chain revocation registry. The `credentialStatus` field in each `AuthorityCredential` references an entry in a Bitstring Status List credential hosted at a stable URL. This provides a privacy-preserving, standards-compliant revocation mechanism that integrates with the `CredentialFreshness` ZK circuit (see Section 4.4).

### 5.2 Key Management for Enterprise Deployment

For high-value commitment operations, the DID private key is the root of trust for both agents and principals. Enterprise deployments should treat key management with the same rigour as CA private keys. Attestara supports and recommends:

- **Hardware Security Modules (HSMs):** The Enterprise SDK includes native HSM integration (PKCS#11) for both agent and principal key storage. Agent signing operations are delegated to the HSM; private keys never appear in memory.
- **Key rotation:** ERC-1056 supports delegate key rotation without changing the root DID. Organisations should rotate agent session keys after each negotiation and periodically rotate principal root keys. The SDK provides automated rotation tooling.
- **Key compromise response:** If a principal DID key is compromised, the organisation should immediately revoke all outstanding Authority Credentials via the CredentialRegistry. Historical commitment records signed under the compromised key remain valid unless challenged — the on-chain record provides a timestamped audit trail to support any dispute. A key compromise response runbook is included in the enterprise onboarding documentation.
- **Backup and recovery:** m-of-n Shamir secret sharing is supported for principal key recovery, allowing key reconstruction from a threshold of custodians without any single custodian holding the full key.

### 5.3 Authority Credential Lifecycle

```
┌──────────┐     issue()      ┌──────────┐    present()    ┌──────────┐
│          │ ───────────────► │          │ ──────────────► │          │
│ Principal│                  │  Agent   │                 │Counterpty│
│          │ ◄─────────────── │          │ ◄────────────── │          │
└──────────┘    revoke()      └──────────┘    verify()     └──────────┘
     │                             │                            │
     │         anchor()            │        checkStatus()       │
     └──────────────┐              │               ┌───────────┘
                    ▼              ▼               ▼
              ┌─────────────────────────────────────────┐
              │         CredentialRegistry              │
              │         (Arbitrum L2)                   │
              └─────────────────────────────────────────┘
```

1. **Issuance:** The principal creates an Authority Credential, signs it with their DID key, and delivers it to the agent via an encrypted channel (DIDComm v2).
2. **Anchoring:** The credential hash is recorded on the CredentialRegistry contract. This does not reveal the credential's contents — only its existence and issuer.
3. **Presentation:** The agent uses the credential's private fields as inputs to ZK proofs. The credential itself is never transmitted to counterparties.
4. **Verification:** Counterparties verify ZK proofs against the on-chain credential anchor, confirming the credential exists, is current, and was issued by a valid principal — without seeing the credential.
5. **Revocation:** The principal can revoke the credential at any time by updating the on-chain registry. All subsequent ZK proofs using the revoked credential will fail the CredentialFreshness circuit immediately.

### 5.4 Credential Security Model

Authority Credentials are sensitive — they encode the organisation's negotiation strategy. Attestara protects them through multiple mechanisms:

- **At rest:** Credentials are encrypted using the agent's DID key (AES-256-GCM). They are never stored in plaintext.
- **In transit:** Credential issuance uses end-to-end encrypted channels (DIDComm v2).
- **In use:** Credential parameters are used only as private inputs to ZK circuits. They are never included in public proof inputs or transmitted to counterparties.
- **Revocation propagation:** On-chain revocation is immediate and globally visible. The CredentialFreshness circuit checks the on-chain registry state at proof generation time via the Merkle witness mechanism (Section 4.4).

---

## 6. On-Chain Commitment Settlement

### 6.1 CommitmentContract Design

The CommitmentContract is the protocol's settlement layer. It records finalised agent agreements as immutable on-chain records.

```solidity
struct Commitment {
    bytes32 commitmentId;          // unique identifier
    bytes32 sessionAnchor;         // hash of complete negotiation history
    address agentA;                // DID-linked address of first agent
    address agentB;                // DID-linked address of second agent
    bytes32 termsHash;             // hash of agreed terms (off-chain storage)
    bytes signatureA;              // agent A's signature over terms
    bytes signatureB;              // agent B's signature over terms
    uint256[] proofReferences;     // on-chain ZK proof verification IDs
    uint256 timestamp;             // block timestamp
    CommitmentStatus status;       // active, disputed, settled
}
```

### 6.2 Dual-Signature Settlement

Both agents must sign the commitment terms for the record to be accepted. The CommitmentContract enforces:

1. **Signature validity:** Both signatures are verified against the agents' registered DID keys.
2. **Session binding:** The session anchor must match a previously anchored session hash.
3. **Proof coverage:** At least one valid ZK proof must be referenced for each agent.
4. **Temporal ordering:** The commitment timestamp must be after the last session turn timestamp.

This creates a settlement mechanism where neither agent can unilaterally create a commitment record, and both agents' authority is cryptographically verified.

### 6.3 Why Arbitrum L2?

Attestara deploys on **Arbitrum One** (Ethereum L2) for economic viability:

| Metric | Ethereum Mainnet | Arbitrum One | Savings |
|--------|-----------------|-------------|---------|
| Session anchoring (per tx) | ~$15.00 | ~$0.04 | 99.7% |
| Commitment settlement | ~$25.00 | ~$0.06 | 99.8% |
| ZK proof verification | ~$8.00 | ~$0.02 | 99.8% |
| **Total per session** | **~$48.00** | **~$0.12** | **99.8%** |

Arbitrum inherits Ethereum's security guarantees (fraud proofs settle to L1) while reducing costs by two orders of magnitude. This makes per-session on-chain anchoring economically viable even for moderate-value negotiations.

---

## 7. Session Protocol

### 7.1 Session Lifecycle

An Attestara negotiation session follows a defined lifecycle:

```
  INITIALISE ──► NEGOTIATE ──► COMMIT ──► SETTLE
       │              │            │          │
  create session   exchange     agree on    record on
  anchor on-chain  ZK-proven    final       chain with
  exchange DIDs    proposals    terms       dual sigs
```

**Phase 1 — Initialisation:**
- Agent A creates a session and anchors the session ID on-chain.
- Agent A sends a session invitation to Agent B (or Agent B discovers the session via the relay).
- Both agents verify each other's DID and credential status.
- A session key pair is established for the duration of the negotiation.

**Phase 2 — Negotiation:**
- Agents exchange proposals in alternating turns.
- Each proposal includes a `TurnProofBundle` — ZK proofs demonstrating mandate compliance.
- Each turn is hash-chained to the previous turn (session anchoring), creating a tamper-evident history.
- Turns are transmitted via the Session Relay (off-chain, encrypted, low-latency).

**Phase 3 — Commitment:**
- When agents agree on terms, both sign the final terms with their DID keys.
- The dual-signed terms are submitted to the CommitmentContract.
- The contract verifies signatures, session binding, and proof references.

**Phase 4 — Settlement:**
- The commitment record is immutably recorded on Arbitrum.
- Both principals can independently verify the commitment via the on-chain explorer.
- The session transcript is archived (IPFS or enterprise storage) for audit purposes.

### 7.2 Session Anchoring Mechanism

Session anchoring prevents turn manipulation — reordering, deletion, or injection of negotiation turns.

Each turn `t_n` includes:

```
turn_hash(n) = H(turn_hash(n-1) || agent_did || proposal || proof_bundle || timestamp)
```

Here, `H` denotes Poseidon (ZK-friendly) for in-circuit use and SHA-256 for off-chain verification. The hash chain creates a Merkle-like structure where any modification to a historical turn invalidates all subsequent hashes.

Session anchors are periodically committed on-chain (every N turns or at configurable intervals), creating checkpoints that make the full history independently verifiable.

### 7.3 Cross-Organisation Session Management

Attestara supports two session modes:

**Intra-organisation sessions:** Both agents belong to the same organisation. The session is established directly via the organisation's internal infrastructure. This mode is used for internal governance — ensuring that the organisation's own agents operate within their mandates.

**Cross-organisation sessions:** Agents belong to different organisations. The session is established via the Attestara Session Relay, which provides:

- **Encrypted transport:** End-to-end encrypted WebSocket channels between agents.
- **Authorisation handshake:** Mutual DID verification and credential status checks before the session begins.
- **Invite tokens:** Organisations can issue time-limited, single-use invite tokens to authorise cross-organisation sessions.
- **No content visibility:** The relay transports encrypted messages without access to plaintext proposals or mandate parameters.

### 7.4 Session Relay: Data Governance and Self-Hosting

The Session Relay routes encrypted messages between agents. While the relay cannot read message content, it observes session metadata: participant DID pairs, session timing, and turn counts. This metadata may be commercially sensitive.

Attestara addresses this concern through three mechanisms:

1. **Self-hosted relay:** The Session Relay is an open-source, containerised service that enterprises can deploy within their own infrastructure. Cross-organisation sessions can route through a mutually agreed third-party relay or directly between enterprise-hosted instances.
2. **Relay network:** Littledata operates multiple geographically distributed relay nodes. Enterprises may specify which relay regions their sessions use, and may nominate independent relay operators.
3. **Metadata minimisation:** The relay stores session metadata for a configurable retention period (default 30 days) and does not link session metadata to any personal identifiers beyond pseudonymous DID pairs.

For regulated enterprises (particularly those subject to DORA's third-party ICT risk provisions), self-hosted relay deployment is recommended and fully supported by the Enterprise SDK.

---

## 8. Threat Model

### 8.1 STRIDE Analysis

Attestara's threat model follows the STRIDE framework, identifying threats across all protocol layers:

| Threat | Category | Attack Vector | Mitigation |
|--------|----------|---------------|------------|
| Agent impersonation | Spoofing | Compromised DID key | Key rotation via ERC-1056; IdentityBinding ZK circuit; real-time DID resolution; HSM key storage |
| Turn injection | Tampering | Malicious relay operator | Hash-chain session anchoring; periodic on-chain checkpoints; client-side verification |
| Mandate parameter inference | Information Disclosure | Statistical analysis of accepted/rejected proposals | ZK proofs reveal only boolean (within/outside mandate); session limits prevent repeated probing; mandate randomisation recommendations |
| Commitment repudiation | Repudiation | Agent denies agreement post-settlement | Dual-signature on-chain commitment; immutable Arbitrum record; session transcript archival |
| Relay service outage | Denial of Service | DDoS against Session Relay | Bilateral P2P fallback; rate limiting; geographic distribution; self-hosted relay option |
| Credential forgery | Elevation of Privilege | Attacker creates fraudulent Authority Credential | On-chain credential anchoring; issuer DID verification; credential schema validation |
| LLM prompt injection | Tampering / Elevation of Privilege | Adversarial input manipulates the AI model driving the agent | See Section 8.4 |

### 8.2 Cryptographic Assumptions

Attestara's security relies on standard cryptographic assumptions:

- **Groth16 soundness:** The proof system is sound under the q-Strong Bilinear Diffie-Hellman (q-SBDH) assumption. A cheating prover cannot generate valid proofs for false statements except with negligible probability.
- **Trusted setup integrity:** At least one participant in the trusted setup ceremony must be honest for the setup to be secure. A compromised setup enables proof forgery. Mitigation: multi-party ceremony with 5+ independent participants; eventual PLONK migration removes this assumption entirely.
- **Hash collision resistance:** Session anchoring assumes SHA-256 and Poseidon are collision-resistant. A collision would allow turn manipulation.
- **DID key security:** Agent identity depends on the security of secp256k1 private keys. Key compromise enables impersonation. Mitigation: HSM support in Enterprise SDK; key rotation protocol (Section 5.2).

### 8.3 Economic Attack Resistance

Beyond cryptographic attacks, Attestara must resist economic manipulation:

- **Mandate probing:** A counterparty could submit a series of proposals to narrow down the other agent's mandate range through binary search. Mitigation: per-session turn limits; rate limiting; mandate randomisation recommendations (principals are advised to set mandate values at non-round numbers and to vary them between sessions).
- **Griefing (session spam):** An attacker could create many sessions to exhaust the counterparty's proof generation resources. Mitigation: session creation requires an on-chain stake deposit, refunded on session completion; rate limiting per DID.
- **Front-running:** On Arbitrum, sequencer front-running is theoretically possible. Mitigation: commitment records use content-addressed hashes (independent of transaction ordering); Arbitrum's fair ordering roadmap further mitigates this.

### 8.4 LLM Agent Layer: Prompt Injection and Model-Level Risks

Attestara's cryptographic layer enforces that an agent's proposals fall within its mandate bounds. It cannot guarantee that the AI model *driving* the agent reaches those proposals through honest reasoning.

A prompt injection attack could, for example, manipulate the LLM into proposing a value that is technically within mandate but strategically adverse to the principal's interests — such as proposing the maximum permitted price immediately rather than starting a negotiation lower.

This is an important limitation that users of Attestara should understand:

**What Attestara guarantees:** That the agent's proposals are within the cryptographically encoded mandate bounds, as defined by the principal at credential issuance time.

**What Attestara does not guarantee:** That the AI model's reasoning toward those proposals is sound, unmanipulated, or strategically optimal.

Mitigations at the application layer (outside Attestara's scope but recommended):

- Deploy AI agents from vendors with documented adversarial robustness testing.
- Define mandate bounds conservatively — treat them as hard limits rather than typical operating ranges.
- Monitor agent behaviour for anomalous patterns (e.g., consistently proposing maximum values) via the portal dashboard.
- Implement human review gates for commitments above defined thresholds.

Attestara's mandate enforcement provides a cryptographic floor on agent behaviour. Application-layer defences address what the agent does within that floor.

---

## 9. Performance and Cost Analysis

### 9.1 Proof Generation Benchmarks

Target performance for Attestara ZK circuits (browser and server environments):

| Circuit | Constraints | Proof Gen (Server) | Proof Gen (Browser) | Verification Gas |
|---------|-------------|-------------------|--------------------|------------------|
| MandateBound | ~5,000 | < 500ms | < 1.5s | ~210K |
| ParameterRange | ~8,000 | < 800ms | < 2.0s | ~215K |
| CredentialFreshness | ~3,000 | < 300ms | < 1.0s | ~200K |
| IdentityBinding | ~6,000 | < 600ms | < 1.8s | ~210K |
| **Bundled (4 circuits)** | **~22,000** | **< 1.5s** | **< 3.5s** | **~250K (batched)** |

Server benchmarks assume a 4-core machine with 8GB RAM. Browser benchmarks assume a modern desktop browser with WebAssembly support. The managed prover service targets server-class performance for all clients.

### 9.2 Per-Session Cost Model (Arbitrum)

A complete negotiation session (5 turns, commitment settlement):

| Operation | Quantity | Gas (L1-eq) | Cost (USD) |
|-----------|----------|-------------|------------|
| Session creation | 1 | ~80K | $0.015 |
| Turn anchoring | 5 | ~50K each | $0.045 |
| Proof verification (batched) | 2 | ~250K each | $0.010 |
| Commitment settlement | 1 | ~150K | $0.008 |
| **Total per session** | | | **~$0.06–$0.08** |

At $0.06–$0.08 per session, on-chain anchoring is economically viable even for moderate-value negotiations. For comparison, the same operations on Ethereum mainnet would cost $15–$48 per session.

### 9.3 Latency Budget

End-to-end latency for a single negotiation turn:

| Phase | Duration | Notes |
|-------|----------|-------|
| Proposal construction | < 50ms | Application-level |
| ZK proof generation (server) | < 1.5s | Managed prover service |
| Relay transmission | < 100ms | WebSocket, same-region |
| Proof verification (off-chain) | < 50ms | snarkjs verify |
| Session anchor update | < 200ms | Local hash computation |
| **Total per turn** | **< 2.0s** | Server-side proof generation |

For browser-based proof generation, add 1–2 seconds. The managed prover service is recommended for latency-sensitive applications.

---

## 10. Regulatory Alignment

### 10.1 EU AI Act (Regulation 2024/1689) and JTC 21 Harmonised Standards

The EU AI Act, effective August 2026, imposes obligations on high-risk AI systems including autonomous agents in financial services, procurement, and critical infrastructure [4]. Compliance with the Act's requirements is supported by harmonised standards being developed by CEN-CENELEC JTC 21 under Standardisation Request M/593. Attestara is designed to serve as a technical measure supporting compliance with these standards once they are published and referenced in the Official Journal of the EU (anticipated Q4 2026).

**Article 9 — Risk Management System** *(JTC 21 WG2 — AI Risk Management standard; ISO/IEC 23894:2023)*:

| Requirement | Attestara Feature | JTC 21 Standard |
|-------------|-------------------|-----------------|
| Identify and analyse known and foreseeable risks | Threat model (Section 8); STRIDE analysis; circuit-level security analysis | AI Risk Management (Article 9 standard) |
| Estimate and evaluate risks from intended use | Authority Credentials encode permitted use; ZK circuits enforce boundaries | ISO/IEC 23894:2023 risk assessment methodology |
| Adopt risk management measures | Mandate enforcement via ZK proofs; Bitstring Status List revocation | AI Risk Management (Article 9 standard) |
| Test risk management measures | ZK circuit test vectors; session simulation; commitment verification | AI Trustworthiness Framework (WG4) |

**Article 12 — Record-Keeping** *(JTC 21 WG4 — AI Logging and Transparency standard)*:

| Requirement | Attestara Feature |
|-------------|-------------------|
| Automatic recording of events (logging) | Session anchoring records every turn with cryptographic integrity |
| Traceability of AI system operation | On-chain commitment records; session transcript archival |
| Monitoring of AI system operation | Portal dashboard; real-time session monitoring |

**Article 14 — Human Oversight** *(JTC 21 WG4 — Foundational and Societal Aspects)*:

| Requirement | Attestara Feature |
|-------------|-------------------|
| Human oversight measures | Principals issue and revoke Authority Credentials; mandate boundaries are human-defined |
| Ability to intervene or interrupt | Real-time Bitstring Status List revocation; session termination; mandate modification |
| Understanding of AI system capacities | Dashboard provides mandate visibility, session monitoring, commitment explorer |

**Article 17 — Quality Management System** *(JTC 21 prEN 18286 — AI QMS; ISO/IEC 42001:2023)*:

Attestara's protocol design, test suites, and audit trail infrastructure are intended to support QMS implementation under prEN 18286. Specifically: the ZK circuit test suites provide the technical testing evidence required by Article 17(1)(f); the session anchoring and commitment records provide the record-keeping required by Article 17(1)(g); and the portal compliance reports provide the monitoring required by Article 17(1)(h).

**WG5 — Cybersecurity for AI Systems** *(DORA Article 6; ISO/IEC 15408 Common Criteria)*:

The threat model in Section 8 is structured to align with WG5's cybersecurity framework, which references ISO/IEC 15408 (Common Criteria) and the ISO/IEC 27006 series. The TEE-attested managed prover service and the STRIDE analysis are directly relevant to WG5's scope.

### 10.2 DORA (Digital Operational Resilience Act)

DORA, in force since January 2025, mandates ICT risk governance for financial institutions [5]. Attestara supports DORA compliance through:

- **ICT risk management:** ZK circuits provide verifiable risk boundaries for agent operations.
- **ICT-related incident reporting:** Commitment records and session logs provide audit-quality evidence.
- **Digital operational resilience testing:** ZK circuit test suites and session simulation tools support testing requirements.
- **Third-party ICT risk management:** Authority Credentials create verifiable governance over third-party agent integrations. For DORA-subject institutions, the self-hosted relay option (Section 7.4) removes the Session Relay from the third-party ICT risk scope.

### 10.3 GDPR (Regulation 2016/679)

Attestara's GDPR posture depends on what data is processed and by whom.

**Agent DID addresses and pseudonymity.** Agent DID addresses (Ethereum public keys) are pseudonymous identifiers. Under GDPR Recital 26 and Article 4(5), pseudonymous data is still personal data if re-identification is reasonably possible. Organisations should assess whether their agent DIDs can be linked to natural persons (e.g., if a DID is associated with a named employee's wallet). Where this risk exists, DIDs should be issued to organisational identities rather than individual employees.

**Mandate parameters and personal data.** The mandate parameters encoded in Authority Credentials (price ranges, commitment limits) are commercial data of the issuing organisation. They ordinarily do not constitute personal data under GDPR Article 4(1). However, if a mandate parameter relates to a named individual (e.g., a personal credit limit), it may fall within GDPR scope.

**On-chain immutability and the right to erasure.** GDPR Article 17 provides data subjects with a right to erasure. On-chain commitment records are immutable by design — they cannot be deleted. Attestara's design mitigates this tension through data minimisation: commitment records store only a `termsHash` (a hash of the agreed terms), not the terms themselves. The full terms are stored off-chain in enterprise-controlled storage and can be deleted. The on-chain hash alone is not personal data. Organisations should confirm this architecture with their DPOs.

**Data controller/processor relationships.** When Littledata operates the managed prover service or Session Relay on behalf of an enterprise, Littledata acts as a data processor under GDPR Article 28. A Data Processing Agreement (DPA) is provided as standard with all managed service arrangements. Enterprises operating self-hosted relay and prover instances are sole data controllers for those components.

**Cross-border data transfers.** Arbitrum L2 is a globally distributed network. On-chain data (commitment records, session anchors, credential hashes) is replicated across nodes in multiple jurisdictions. As these records contain only hashes (not personal data), Standard Contractual Clauses are not required for the on-chain components. For managed relay services, Littledata offers EU-hosted relay nodes to keep metadata processing within the EEA.

### 10.4 Legal Enforceability of Agent Commitments

A critical question for Attestara's adoption is whether agent-created commitment records are legally enforceable. The analysis below represents the current legal landscape; Littledata is engaged with external counsel in Gibraltar, England and Wales, and the EU to confirm and publish formal legal opinions prior to the Phase 2 pilot launch.

**eIDAS (EU Electronic Signatures Regulation):** An Ed25519 signature generated by an AI agent under a principal's Authority Credential may qualify as an "advanced electronic signature" under eIDAS Article 26, provided:
- The signature is uniquely linked to the signatory (the principal, via the DID chain of authority);
- The signature was created under the sole control of the signatory (via the Authority Credential, which only the authorised agent can use);
- The signature is linked to the data in a way that detects subsequent changes (via hash-chain anchoring).

**English law:** Under the Electronic Communications Act 2000, electronic signatures are admissible. Under Golden Ocean Group v Salgaocar [2012], electronic signatures need not be handwritten to bind a party contractually. The key legal question is whether the principal's issuance of an Authority Credential — which delegates negotiation and commitment authority to the agent — constitutes sufficient manifestation of intent to be bound by the agent's commitments. This is analogous to the established legal analysis of electronic agents in e-commerce, where the UNCITRAL Model Law on Electronic Commerce (Article 13) provides that acts of automated systems bind their operators.

**Smart contract records as evidence:** On-chain commitment records are admissible as evidence in most common-law and civil-law jurisdictions. Their probative value depends on demonstrating the integrity of the underlying cryptographic mechanisms, which the Attestara protocol is designed to provide. Cryptographic audit trails have been accepted as evidence in commercial arbitration proceedings, including in English courts.

**Recommended enterprise practice:** Enterprises deploying Attestara for high-value negotiations should supplement Attestara commitment records with a principal-level ratification step — a human-authorised confirmation that the agent's commitment is accepted — for any commitment above a defined materiality threshold. This provides a belt-and-braces legal backstop while the legal landscape around agent commitment enforceability matures.

---

## 11. Competitive Analysis

### 11.1 Competitive Landscape Mapping

Attestara exists at the intersection of three capability domains. No existing solution spans all three:

| Capability | Google A2A | Visa/MC Agent Pay | Salesforce Agentforce | Fetch.ai/SNET | Attestara |
|------------|-----------|-------------------|--------------------|---------------|------------|
| Agent interoperability | **Yes** | Partial | **Yes** | **Yes** | Yes |
| Authority verification | No | Consumer-grade | No | No | **Yes (ZK)** |
| Mandate privacy | No | No | No | No | **Yes (ZK)** |
| Adversarial negotiation | No | No | No | No | **Yes** |
| Binding commitments | No | Yes (payments) | No | Partial | **Yes (on-chain)** |
| Regulatory compliance (EU AI Act) | Partial | Yes (PCI) | Partial | No | **Yes** |
| GDPR-aligned design | Partial | Partial | Partial | No | **Yes** |
| Enterprise governance | No | Yes (payments) | Partial | No | **Yes** |

### 11.2 Uncontested Position

Attestara's competitive position is uncontested because it addresses a problem that adjacent players have neither the incentive nor the architecture to solve:

- **Google A2A** solves interoperability (how agents talk) but explicitly excludes authority enforcement. Attestara is complementary — it layers on top of A2A to provide the trust guarantees A2A does not. An enterprise can adopt both simultaneously.
- **Visa/Mastercard** solve consumer agent payments. B2B adversarial negotiation with mandate privacy is outside their product scope and outside their regulatory incentive to build.
- **Salesforce** solves agent routing within its ecosystem. Cross-organisational, cryptographically verifiable governance requires a neutral, ecosystem-independent protocol — which is architecturally incompatible with a proprietary platform model.
- **Existing IAM vendors** (Okta, Auth0, Microsoft Entra) manage user identity. Agent-to-agent authority delegation with ZK mandate proofs is a fundamentally different problem — the ZK layer is not a feature that can be added to an existing IAM product.

### 11.3 How Attestara Composes with Existing Infrastructure

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (LangChain / AutoGen / CrewAI agents)  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Interoperability Layer          │
│    (Google A2A / MCP — discovery,       │
│     routing, message format)            │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│           Trust Layer                   │
│  Attestara — authority verification,   │
│  mandate enforcement, commitment record │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Settlement Layer                │
│  Arbitrum L2 — on-chain commitment      │
│  records, ZK proof verification         │
└─────────────────────────────────────────┘
```

Attestara is not a replacement for A2A or MCP. It is the trust layer that makes those interoperability protocols safe to use for high-stakes commercial negotiations.

### 11.4 Timing Window

Three factors converge to create a narrow but clear timing window:

1. **Technology readiness:** ZK proof costs have dropped to under $0.01 per proof on L2. Arbitrum's gas economics make per-session anchoring viable. Five years ago, this was economically impossible. This window is open now and will attract competition within 18–24 months.
2. **Regulatory urgency:** EU AI Act Article 9 enforcement begins August 2026. Enterprises deploying agentic systems must demonstrate governance — creating immediate demand for compliance infrastructure that did not exist 12 months ago.
3. **Competitive vacuum:** No production system exists for B2B adversarial agent negotiation with privacy-preserving mandates. The first credible solution captures the standard-setting position — the protocol that pilots first is the protocol that becomes the default.

---

## 12. Governance and Standards

### 12.1 Protocol Governance Model

Attestara uses a dual governance model designed to serve both open-ecosystem and regulated-enterprise deployment contexts:

**Open DAO Governance:**
- On-chain voting on protocol parameters (session fees, circuit upgrades, registry policies).
- Token-weighted voting with quadratic weighting to prevent plutocratic capture.
- Technical Committee veto on security-critical changes (ZK circuits, cryptographic primitives).
- Specification changes require supermajority (67%) approval.
- *Governance token:* The Attestara governance token (ACL) will be issued as part of the Phase 2 launch. Token design, issuance schedule, and vesting parameters will be published in a separate token economics paper prior to launch. ACL token holders govern protocol parameters; they do not govern commercial implementations or managed services.

**Bilateral P2P Governance:**
- Designed for regulated enterprises that cannot participate in DAO governance (compliance constraints, fiduciary obligations, or legal restrictions on token participation).
- Two-party agreement on protocol parameters — the same cryptographic guarantees, on a private governance substrate.
- Enterprise SDK provides turnkey bilateral deployment with no DAO dependency.
- For DORA-subject and EU AI Act-regulated enterprises, P2P governance is the recommended deployment model.

### 12.2 Standards Strategy and Submission Roadmap

Attestara's long-term defensibility depends on becoming a recognised standard. The strategy is sequenced to align with the live work programmes of W3C CCG and CEN-CENELEC JTC 21.

---

#### W3C Credentials Community Group — Work Item Submission

**Target category:** Community Report (per the W3C CCG Work Item Process), with the goal of progressing to a final published CCG report and, subsequently, a formal Working Group Recommendation track submission.

**Conformance basis.** Attestara's credential layer is built on W3C Recommendations current as of May 2025:

| Specification | Version | Attestara Usage |
|---|---|---|
| Verifiable Credentials Data Model | v2.0 (Rec. May 2025) | `AuthorityCredential` schema (Section 3.1) |
| VC Data Integrity | v1.0 (Rec. May 2025) | `DataIntegrityProof` with `ecdsa-secp256k1-2019` |
| Bitstring Status List | v1.0 (Rec. May 2025) | `credentialStatus` revocation (Section 4.4) |
| Controlled Identifiers | v1.0 (Rec. May 2025) | DID document structure for did:ethr |
| DID Core | v1.0 (Rec.) | Agent and principal identity |
| VC Securing — JOSE/COSE | v1.0 (Rec. May 2025) | Alternative proof format (JWT path) |

> **Important distinction.** The `@context` URL in `AuthorityCredential` MUST be `https://www.w3.org/ns/credentials/v2` (VC 2.0), not the legacy v1 URL. The Attestara extension context (`https://attestara.io/contexts/v1`) defines `AgentAuthorityCredential`, `AgentNegotiationMandate`, and all custom vocabulary terms. This context document will be published at a stable URL as part of the Work Item submission and maintained as a W3C CCG registry entry.

**Submission requirements met:**
- Primary editor: Littledata Research & Engineering (mick@littledata.ai)
- Co-editor: Sought from a second organisation; expressions of interest invited from pilot customers and W3C CCG members
- W3C Community Contributor License Agreement: Required for all contributors; Littledata has accepted the CLA
- **The whitepaper does not claim to be a W3C standard**; it is positioned as the basis for a Work Item proposal that, if adopted, will be developed as a Community Report

**Submission timeline:**

| Month | Deliverable |
|-------|-------------|
| 8 | Submit `AgentAuthorityCredential` schema as W3C CCG Work Item proposal; publish extension context at stable URL |
| 10 | First published draft of `AgentAuthorityCredential` Community Report |
| 12 | Propose ZK proof binding pattern for Verifiable Credentials as a second Work Item (building on BBS+ selective disclosure work) |
| 16 | Submit `did:attestara` DID method specification for CCG registry listing |
| 20 | Submit supply-chain VC use case note (complementary to the W3C Supply Chain Verifiable Credentials CG launched February 2026) |

---

#### CEN-CENELEC JTC 21 — Standards Alignment

JTC 21 operates five working groups under Standardisation Request M/593 (amended M/613). Attestara's protocol components map directly to three of the five:

| JTC 21 Working Group | Scope | Attestara Alignment |
|---|---|---|
| **WG2 — Operational Aspects** | AI risk management (Article 9), QMS (Article 17), logging (Article 12) | ZK mandate enforcement → Article 9 risk measures; session anchoring → Article 12 record-keeping; credential revocation → Article 9 risk controls |
| **WG3 — Engineering Aspects** | Technical design, robustness, accuracy | ZK circuit design, formal soundness proofs, circuit test suites, trusted setup methodology |
| **WG4 — Foundational and Societal Aspects** | Transparency, human oversight (Article 14), explainability | Authority Credential lifecycle (human-defined mandates); portal dashboard (human oversight interface); audit trail exports |
| **WG5 — Cybersecurity for AI Systems** | AI-specific cybersecurity (DORA alignment, ICT risk) | STRIDE threat model; prompt injection analysis; DID key compromise response; relay security |

**Key standards being developed by JTC 21 and Attestara's alignment:**

| JTC 21 Standard | Status (March 2026) | Attestara mapping |
|---|---|---|
| prEN 18286 — AI Quality Management System | Public enquiry (Oct 2025); final adoption 2026 | Section 15 roadmap: ISO/IEC 42001 and prEN 18286 compliance mapping in Phase 3 |
| AI Risk Management standard (Article 9) | Internal ballot concluded; comment resolution | Section 10.1 Article 9 table maps directly; ZK circuits as technical risk measures |
| AI Trustworthiness Framework | Summer 2025 public consultation | ZK proofs → robustness; Bitstring Status List → transparency; session anchoring → traceability |
| AI Cybersecurity (WG5) | Comment resolution in progress | STRIDE model (Section 8.1); WG5 references ISO/IEC 15408 (Common Criteria) and ISO/IEC 27006 series; Attestara's TEE-attested prover is directly relevant |
| AI Logging and Transparency | Advancing toward 2026 publication | Session anchoring and commitment records map to AI Act Article 12 logging requirements |

**Additional normative references Attestara adopts for JTC 21 alignment:**

- **ISO/IEC 42001:2023** (AI Management System) — referenced in Phase 3 compliance mapping (Section 15)
- **ISO/IEC 23894:2023** (AI Risk Management guidance, aligned with ISO 31000) — informs Attestara's threat model structure and economic attack resistance analysis (Section 8)
- **ISO/IEC 27001:2022** (Information Security Management) — Enterprise SDK key management recommendations (Section 5.2) align with Annex A controls
- **ISO/IEC 15408** (Common Criteria) — Referenced by WG5; TEE attestation of the managed prover service is Common Criteria-adjacent

**Engagement pathway:**

| Month | Action |
|-------|--------|
| 10 | Submit public enquiry comments on prEN 18286 (QMS); demonstrate Attestara as a compliant technical measure |
| 12 | Submit response to European Commission consultation on agentic AI governance (Article 41 AI Act common specifications process) |
| 14 | Submit case studies from pilot engagements to JTC 21/WG2 as evidence base for operational aspects guidance |
| 18 | Seek liaison status between Attestara CCG Work Item and JTC 21/WG3 (engineering aspects) |

> **Note on harmonised standard status.** CEN-CENELEC harmonised standards, once referenced in the Official Journal of the EU, provide presumption of conformity with AI Act requirements. Attestara is designed to support compliance with standards that will carry this status — but cannot itself be a harmonised standard. The appropriate positioning is: *Attestara is a technical measure that supports compliance with harmonised standards developed by JTC 21 under Standardisation Request M/593.*

### 12.3 Fork Defence

Open protocols risk fragmentation. Attestara's fork defence operates at three levels:

1. **Specification donation:** The protocol specification will be donated to a standards body with supermajority governance for changes. This prevents unilateral specification forks by any single party, including Littledata.
2. **Trademark protection:** "Attestara" is registered in Gibraltar, EU, UK, and the US. Competing implementations cannot use the Attestara name or logo.
3. **Network effects:** The managed prover service, session relay, and enterprise tooling create infrastructure network effects that make forking the specification insufficient — a fork would also need to replicate the infrastructure network, the issuer DID registry, and the commitment contract deployment.

---

## 13. Implementation Architecture

### 13.1 Monorepo Structure

Attestara is implemented as a Turborepo + pnpm monorepo with seven packages:

```
attestara/
├── packages/
│   ├── types/          # @attestara/types — shared TypeScript interfaces
│   ├── contracts/      # @attestara/contracts — Solidity + Circom (Hardhat)
│   ├── sdk/            # @attestara/sdk — main developer SDK
│   ├── prover/         # @attestara/prover — ZK proof generation service
│   ├── relay/          # @attestara/relay — session relay + WebSocket
│   ├── cli/            # @attestara/cli — command-line tools
│   └── portal/         # @attestara/portal — Next.js dashboard
├── turbo.json          # Turborepo pipeline configuration
├── pnpm-workspace.yaml # pnpm workspace definition
└── tsconfig.base.json  # shared TypeScript configuration
```

### 13.2 SDK Architecture

The `@attestara/sdk` is the primary developer interface:

```typescript
import { AttestaraClient } from '@attestara/sdk';

const client = new AttestaraClient({
  provider: 'https://arb1.arbitrum.io/rpc',
  proverUrl: 'https://prover.attestara.io',  // managed or self-hosted
});

// 1. Create agent identity
const agent = await client.identity.create();

// 2. Issue authority credential (principal → agent)
const credential = await client.credentials.issue({
  subject: agent.did,
  mandate: {
    maxCommitmentValue: 500_000,
    parameterRanges: {
      unitPrice: { floor: 40, ceiling: 55 },
      quantity: { floor: 5_000, ceiling: 15_000 },
      deliveryDays: { floor: 30, ceiling: 120 },
    },
  },
  validFor: '90d',
});

// 3. Start negotiation session
const session = await client.negotiation.createSession({
  credential,
  mode: 'cross_org',
  counterpartyDid: 'did:ethr:0x...',
});

// 4. Submit proposal (ZK proof generated automatically)
await session.propose({
  unitPrice: 48,
  quantity: 10_000,
  deliveryDays: 75,
});

// 5. Settle commitment
const commitment = await session.commit();
console.log(`Commitment ID: ${commitment.id}`);
console.log(`Arbitrum TX: ${commitment.txHash}`);
```

### 13.3 Managed Prover Service: Trust Architecture

The `@attestara/prover` package provides a hosted ZK proof generation service. For enterprise deployments, the trust model of the prover is critically important.

**What the prover receives:** Encrypted proof request payloads containing the public inputs to each circuit (proposed values, session IDs). Private inputs (mandate parameters) are encrypted client-side using the agent's DID key before transmission. The prover service decrypts inputs within a Trusted Execution Environment (Intel TDX or AMD SEV-SNP) and generates proofs. Plaintext mandate parameters are never logged, stored, or made accessible outside the TEE.

**TEE attestation:** The managed prover service provides TEE remote attestation on demand, allowing enterprises to cryptographically verify that the prover binary has not been tampered with and that plaintext inputs are processed only within the attested TEE boundary.

**Self-hosted prover:** For enterprises that cannot accept any third-party dependency for mandate parameter processing, the prover service is available as a self-hosted Docker image deployable on enterprise infrastructure. Self-hosted deployment eliminates the Littledata trust dependency entirely. The Enterprise SDK includes deployment templates for AWS, Azure, and GCP.

- **Fastify HTTP API** for proof requests.
- **Worker thread pool** for parallel proof generation (4–16 workers per instance).
- **Circuit caching** — compiled circuits and proving keys are loaded once and reused.
- **SLA tiers** — latency and throughput guarantees for enterprise customers.

### 13.4 Portal Dashboard

The `@attestara/portal` provides organisational visibility:

- **Session Monitor:** Real-time view of active negotiations with turn-by-turn status.
- **Agent Manager:** Register, credential, and revoke agents. View agent activity history.
- **Commitment Explorer:** Browse, search, and verify on-chain commitment records.
- **Compliance Reports:** EU AI Act Article 12 logging reports. DORA audit trail exports. GDPR data inventory.
- **Interactive Demo:** End-to-end 5-turn negotiation walkthrough for onboarding and evaluation.
- **Anomaly Alerts:** Configurable alerts for agents proposing at mandate boundaries, high turn-count sessions, or sessions with unusual timing patterns.

---

## 14. Use Cases

### 14.1 Autonomous Procurement Negotiation

**Scenario:** A mid-sized manufacturing company deploys AI procurement agents to negotiate raw material contracts with multiple suppliers simultaneously.

**The current pain:** A typical B2B procurement dispute — where terms are contested post-agreement — costs between €80K and €200K in legal and operational resolution costs, and takes an average of 4–7 months to resolve [6]. The root cause is almost always the same: no authoritative, neutral record of what was agreed and by whom.

**Without Attestara:** The procurement agent sends API requests to supplier agents. Neither side can verify the other's authority. The Chief Procurement Officer cannot prove to the board that the agent stayed within its €2M mandate. The supplier cannot prove the agent had authority to commit. The "contract" is a JSON response in a database.

**With Attestara:**
1. The CPO issues an Authority Credential to the procurement agent: max €2M, Grade A/B materials only, delivery 60–90 days, no single-supplier concentration exceeding 40%.
2. At each negotiation turn, the agent generates ZK proofs demonstrating compliance with all four constraints — without revealing any specific limit to the supplier.
3. When terms are agreed, both agents sign and settle the commitment on-chain.
4. The board receives a compliance report showing every turn was mandate-compliant, with cryptographic proof that the agent operated within its authorisation.
5. If a dispute arises, the on-chain commitment record and session transcript provide an authoritative, tamper-proof account of what was agreed — eliminating the "our logs vs. your logs" failure mode.

**Measurable outcome:** Elimination of procurement dispute resolution costs; EU AI Act Article 9 compliance for deployed procurement agents; auditable mandate adherence for board reporting.

### 14.2 Financial Services — Algorithmic Trading Governance

**Scenario:** An asset management firm deploys AI agents for algorithmic trading across multiple exchanges and counterparties.

**The current pain:** DORA, in force since January 2025, requires demonstrable ICT risk governance over automated operations. Current audit trail infrastructure for algorithmic trading exists only in proprietary logs — not independently verifiable, not tamper-proof, and not intelligible to external regulators without significant forensic effort.

**With Attestara:**
1. The risk committee issues Authority Credentials encoding trading limits: maximum position size, sector exposure caps, VaR constraints, counterparty concentration limits.
2. Each trading decision generates ZK proofs of compliance, anchored on-chain.
3. Regulators can independently verify the complete audit trail without accessing proprietary trading strategies — the ZK proofs confirm compliance without revealing the specific limits.
4. Real-time credential revocation enables instant trading freeze if risk limits are approached or if a credential is suspected of being compromised.
5. DORA audit reports are generated automatically from the portal compliance module.

**Measurable outcome:** DORA-compliant ICT risk governance evidence without proprietary strategy disclosure; reduction in regulatory audit response time from weeks to hours.

### 14.3 Legal Services — AI Contract Negotiation

**Scenario:** Two law firms deploy AI agents to negotiate contract terms on behalf of their respective clients.

**The current pain:** AI-assisted contract negotiation is accelerating, but the governance question is unresolved: how does a client know their AI agent operated within instructions, and how can that be demonstrated to the counterparty or a court? Current practice relies on human review of AI suggestions — which defeats the efficiency case for AI negotiation.

**With Attestara:**
1. Each client's counsel issues Authority Credentials encoding acceptable terms: price ranges, liability caps, indemnity limits, jurisdiction preferences, and permitted deviation ranges.
2. AI agents negotiate within these mandates, generating ZK proofs at each turn.
3. The final agreed terms are settled on-chain with dual agent signatures.
4. Both clients receive a cryptographic audit trail demonstrating their agent operated within instructions — admissible as evidence in any subsequent dispute.
5. The eIDAS-compatible commitment record provides the foundation for enforceability analysis (Section 10.4).

**Measurable outcome:** Demonstrable mandate compliance for regulatory and client reporting; admissible negotiation record for dispute resolution; reduced human review burden while maintaining governance assurance.

### 14.4 Supply Chain — Multi-Party Agent Coordination

**Scenario:** A global retailer's procurement agent negotiates simultaneously with multiple supplier agents across different jurisdictions.

**The current pain:** Multi-party supply chain negotiations involve agents from organisations subject to different regulatory frameworks. A single negotiation may touch EU AI Act (European supplier), DORA (financial services logistics provider), and US AI governance frameworks simultaneously. No current solution provides unified governance across these jurisdictions.

**With Attestara:**
1. Each party's agents carry Authority Credentials with jurisdiction-specific constraints encoded.
2. Cross-border negotiations generate ZK proofs compliant with each jurisdiction's specific requirements.
3. Multi-party commitments are settled atomically — all parties sign or none do.
4. EU AI Act compliance is demonstrable for the European leg; the jurisdiction-neutral protocol works globally without re-engineering.

**Measurable outcome:** Single governance infrastructure across multi-jurisdictional supply chains; EU AI Act compliance evidence across the supply network; elimination of commitment ambiguity in multi-party negotiations.

---

## 15. Roadmap

### Phase 0: Foundation (Months 1–4)

| Deliverable | Status |
|-------------|--------|
| Protocol specification v0.1 | Specification complete |
| ZK circuit design (4 circuits with test vectors) | Specification complete |
| Smart contract architecture | Specification complete |
| Monorepo scaffolding (Turborepo + pnpm + 7 packages) | Implemented |
| MVP design specification v1.3 | Approved |
| Shared types package (@attestara/types) | In progress |

### Phase 1: MVP (Months 4–7)

- ZK circuits implemented in Circom with full test suites
- Smart contracts deployed to Arbitrum Sepolia testnet
- TypeScript SDK with identity, credentials, prover, negotiation, and commitment modules
- Managed prover service (local + remote) with TEE attestation
- Session relay with cross-organisation authorisation
- Next.js portal with session monitoring and interactive demo
- CLI tools for agent and session management
- Developer onboarding target: < 30 minutes to first negotiation
- Self-hosted relay and prover Docker images

### Phase 2: Pilot (Months 8–18)

- 5–7 paid pilot engagements with financial services and procurement teams (€20K–€30K each)
- Production deployment on Arbitrum One mainnet
- ZK circuit security audit — Trail of Bits or Zellic; findings published in full
- Full-scale trusted setup ceremony (5+ independent participants)
- External legal opinions (Gibraltar, England & Wales, EU) on commitment enforceability — published prior to pilot launch
- W3C CCG Work Item submission
- AAIF Trust Layer Working Group proposal
- Python adapters for LangChain and AutoGen
- DPA template published for GDPR-compliant managed service deployments
- Case study publication from pilot customers

### Phase 3: Scale (Months 19–36)

- SaaS self-serve platform; target €380K ARR by Month 24
- Systems integrator partnerships (Deloitte, Accenture, PwC)
- ISO/IEC 42001 AI management system compliance mapping
- Protocol specification donation to standards body
- Geographic expansion: UK, EU, Singapore, US
- PLONK migration (removes trusted setup requirement)
- ACL governance token launch
- Target: €1.35M ARR by Month 36

---

## 16. Conclusion

The clearing house for AI agents.

The AI agent economy is not arriving — it has arrived. Enterprises are deploying autonomous agents for high-value negotiations today, without the ability to verify authority, enforce mandates, or create binding records. The EU AI Act is in force. DORA is in force. The governance gap is not a future compliance risk; it is a present one.

Attestara closes this gap with a precise, minimal, and standards-aligned protocol. Zero-knowledge proofs resolve the previously intractable tension between authority verification and mandate privacy — proving that an agent has authority without revealing the boundaries of that authority. W3C Verifiable Credentials provide interoperable, enterprise-grade identity infrastructure. Smart contract settlement on Arbitrum L2 creates the immutable commitment records that enterprises, regulators, and courts require.

The timing window is narrow. Technology readiness, regulatory urgency, and competitive vacuum converge now. This is not a permanent window — it closes as awareness of the problem grows and alternatives emerge. The first credible, production-deployed trust protocol for agent commerce becomes the default standard. Standards are not won by the best technical design; they are won by the first credible implementation that pilots with enough enterprises to create adoption momentum.

Attestara is production-targeted infrastructure. It is designed to be deployed, adopted, and standardised — not published and studied.

Enterprises deploying autonomous agents for commercial negotiations should begin evaluation now. The August 2026 EU AI Act enforcement deadline does not allow for leisurely procurement cycles.

Contact mick@littledata.ai to arrange a pilot conversation.

---

## 17. References

1. MarketsandMarkets. (2024). *Autonomous AI Agents Market — Global Forecast to 2034.* Report Code: SE 9165.

2. McKinsey Global Institute. (2024). *The Next Frontier of AI: Agentic Systems and Commercial Applications.* McKinsey & Company.

3. Gartner. (2025). *Magic Quadrant for AI Governance Platforms.* Gartner Research.

4. European Parliament. (2024). *Regulation (EU) 2024/1689 — Artificial Intelligence Act.* Official Journal of the European Union.

5. European Parliament. (2022). *Regulation (EU) 2022/2554 — Digital Operational Resilience Act (DORA).* Official Journal of the European Union.

6. ICC International Court of Arbitration. (2024). *2024 Dispute Resolution Statistics: Commercial Disputes and AI-Assisted Transactions.* International Chamber of Commerce.

7. Groth, J. (2016). *On the Size of Pairing-Based Non-interactive Arguments.* EUROCRYPT 2016. Lecture Notes in Computer Science, vol 9666.

8. W3C. (2025). *Verifiable Credentials Data Model v2.0.* W3C Recommendation, 15 May 2025. https://www.w3.org/TR/vc-data-model-2.0/

9. W3C. (2025). *Verifiable Credential Data Integrity 1.0.* W3C Recommendation, 15 May 2025. https://www.w3.org/TR/vc-data-integrity/

10. W3C. (2025). *Bitstring Status List v1.0.* W3C Recommendation, 15 May 2025. https://www.w3.org/TR/vc-bitstring-status-list/

11. W3C. (2025). *Controlled Identifiers v1.0.* W3C Recommendation, 15 May 2025. https://www.w3.org/TR/cid-1.0/

12. W3C. (2022). *Decentralized Identifiers (DIDs) v1.0.* W3C Recommendation. https://www.w3.org/TR/did-core/

13. W3C. (2025). *Securing Verifiable Credentials using JOSE and COSE.* W3C Recommendation, 15 May 2025. https://www.w3.org/TR/vc-jose-cose/

14. uPort. (2019). *ERC-1056: Ethereum Lightweight Identity.* Ethereum Improvement Proposals.

15. iden3. (2022). *Circom 2.x: Circuit Compiler for Zero-Knowledge Proofs.* https://docs.circom.io/

16. Offchain Labs. (2024). *Arbitrum One Technical Documentation.* https://docs.arbitrum.io/

17. Gabizon, A., Williamson, Z., Ciobotaru, O. (2019). *PLONK: Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge.* IACR Cryptology ePrint Archive.

18. European Commission. (2014). *Regulation (EU) No 910/2014 — Electronic Identification and Trust Services (eIDAS).* Official Journal of the European Union.

19. UNCITRAL. (1996). *Model Law on Electronic Commerce.* United Nations Commission on International Trade Law.

20. Golden Ocean Group Ltd v Salgaocar Mining Industries PVT Ltd [2012] EWCA Civ 265.

21. European Parliament. (2016). *Regulation (EU) 2016/679 — General Data Protection Regulation (GDPR).* Official Journal of the European Union.

22. CEN-CENELEC JTC 21. (2025). *prEN 18286: Artificial Intelligence — Quality Management System for EU AI Act Regulatory Purposes.* Public Enquiry draft. CEN-CENELEC.

23. ISO/IEC. (2023). *ISO/IEC 42001:2023 — Information Technology: Artificial Intelligence: Management System.* International Organization for Standardization.

24. ISO/IEC. (2023). *ISO/IEC 23894:2023 — Information Technology: Artificial Intelligence: Guidance on Risk Management.* International Organization for Standardization.

25. CEN-CENELEC. (2025). *Update on CEN and CENELEC's Decision to Accelerate the Development of Standards for Artificial Intelligence.* October 2025. https://www.cencenelec.eu/news-events/news/2025/brief-news/2025-10-23-ai-standardization/

26. W3C CCG. (2024). *W3C CCG Work Item Process.* https://w3c-ccg.github.io/workitem-process/

27. Veramo. (2024). *Veramo Framework Documentation.* https://veramo.io/

---

*This white paper is published by Littledata. For pilot enquiries and technical discussions, contact mick@littledata.ai.*

*© 2026 Littledata. Protocol specification licensed under CC BY 4.0. All rights reserved for commercial implementations.*
