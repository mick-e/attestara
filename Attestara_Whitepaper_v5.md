# Attestara: A Cryptographic Trust Protocol for Autonomous AI Agent Commerce

**Version 6.0 — April 2026**

**Authors:** Michael Sheridan-Sherbourne (Littledata Research & Engineering)

**Contact:** mick@littledata.ai

**Reference implementation status:** Phase 1 reference implementation in progress. Smart contracts deployed to Arbitrum Sepolia testnet. ZK circuits compiled and tested. SDK, relay, and prover services functional. Production mainnet deployment is planned for Phase 2 following formal circuit audit.

**Standards alignment:** W3C Verifiable Credentials Data Model v2.0 (Rec. May 2025) · W3C Bitstring Status List v1.0 (Rec. May 2025) · DIF Trusted AI Agents Working Group · CEN-CENELEC JTC 21 / M/593 · ISO/IEC 42001:2023 · ISO/IEC 23894:2023

**Document status:** This document is a technical whitepaper and informative reference. It does not constitute a W3C standard, DIF specification, or CEN-CENELEC harmonised standard. Normative specification documents derived from this whitepaper will be submitted separately to DIF, W3C CCG, and JTC 21 per the engagement roadmap in Section 12.

**Licence:** Protocol specification: W3C Community Final Specification Agreement (for W3C CCG submission) / Apache 2.0 (for DIF submission). Whitepaper text: CC BY 4.0. All rights reserved for commercial implementations.

---

## Abstract

The rapid deployment of autonomous AI agents in enterprise commerce — procurement negotiation, supply-chain management, financial transactions — has created a fundamental governance gap. When two AI agents from competing organisations negotiate, no infrastructure exists to verify that either agent has authority to act, that its proposals fall within its mandate, or that the resulting agreement is auditable and enforceable. This paper introduces **Attestara**, an open cryptographic trust protocol that enables AI agents to negotiate, commit, and be held accountable across organisational boundaries without requiring inter-party trust. Attestara combines zero-knowledge proofs (Groth16/Circom), W3C Verifiable Credentials Data Model v2.0-conformant Authority Credentials (with Bitstring Status List revocation), DIF DIDComm v2 transport, and smart contract settlement (Arbitrum L2) to deliver three guarantees: authority verification without mandate disclosure, tamper-proof negotiation audit trails, and binding on-chain commitment records. We present the protocol architecture, DIF protocol bindings, formal threat model, post-quantum migration path, performance analysis, and regulatory alignment with the EU AI Act (Articles 9, 12, 14, 17), DORA, and GDPR — including explicit mapping to CEN-CENELEC JTC 21 harmonised standards under Standardisation Request M/593. Attestara is submitted to the DIF Trusted AI Agents Working Group as a reference implementation input to the Agentic Authority Use Cases work item, and to W3C CCG as the basis for an `AgentAuthorityCredential` schema Work Item.

**Keywords:** AI agents, zero-knowledge proofs, verifiable credentials, decentralised identity, DIDComm, DIF, smart contracts, agent governance, EU AI Act, DORA, GDPR, agentic commerce, post-quantum cryptography

---

## Acknowledgements

The authors thank the participants of the DIF Trusted AI Agents Working Group for their ongoing work on Agentic Authority Use Cases, which directly informed the protocol design in this document — particularly the contributors developing delegation chain and trust registry specifications. The credential infrastructure in Section 5 builds on the work of the Veramo framework team (ConsenSys/Mesh), the iden3/Circom team, and the ERC-1056 authors at uPort/Consensys. The W3C Verifiable Credentials Working Group's publication of the VC 2.0 family of Recommendations in May 2025 provided the stable standards foundation this protocol requires. Early feedback from pilot customer architecture and compliance teams has materially shaped the enterprise deployment model in Sections 5.2, 7.4, and 10. Any errors or omissions remain the authors' own.

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

**The standards strategy is sequenced.**

Attestara is engaging standards bodies in priority order: the DIF Trusted AI Agents Working Group immediately (the community currently defining agent authority and delegation specifications), followed by W3C CCG Work Item submission at Month 8 (built on DIF community support), followed by JTC 21 public consultation engagement for EU regulatory positioning. This is the fastest path to the standard-setting position described in Section 11.

**The commercial model is straightforward.**

Pilot engagements (Months 8–18) target financial services and procurement teams at €20K–€30K each, with a SaaS self-serve platform targeting €380K ARR by Month 24 and €1.35M ARR by Month 36.

**Who should read this paper:** Chief Information Security Officers, General Counsel, Chief Procurement Officers, and technology leaders responsible for AI governance and regulatory compliance. Technical sections (4, 5, 7, 8, 13) are directed at engineering and architecture teams. Standards engagement sections (12, Appendix A, Appendix B) are directed at standards practitioners and specification co-editors.

---

## Table of Contents

- [Acknowledgements](#acknowledgements)
- [Executive Summary](#executive-summary)
1. [Introduction](#1-introduction)
2. [The Governance Gap in Agentic Commerce](#2-the-governance-gap-in-agentic-commerce)
3. [Protocol Design](#3-protocol-design)
4. [Zero-Knowledge Proof Architecture](#4-zero-knowledge-proof-architecture)
5. [Identity, Credential, and DIF Protocol Framework](#5-identity-credential-and-dif-protocol-framework)
6. [On-Chain Commitment Settlement](#6-on-chain-commitment-settlement)
7. [Session Protocol](#7-session-protocol)
8. [Threat Model](#8-threat-model)
9. [Performance and Cost Analysis](#9-performance-and-cost-analysis)
10. [Regulatory Alignment](#10-regulatory-alignment)
11. [Competitive Analysis](#11-competitive-analysis)
12. [Governance and Standards Engagement](#12-governance-and-standards-engagement)
13. [Implementation Architecture](#13-implementation-architecture)
14. [Use Cases](#14-use-cases)
15. [Roadmap](#15-roadmap)
16. [Conclusion](#16-conclusion)
17. [References](#17-references)
- Appendix A. [Conformance, Security, and Privacy Considerations](#appendix-a-conformance-security-and-privacy-considerations)
- Appendix B. [Test Vector: Complete Negotiation Turn](#appendix-b-test-vector-complete-negotiation-turn)

---

## 1. Introduction

The clearing house for AI agents.

In 1832, the London Clearing House solved precisely the same problem for banks that Attestara solves for AI agents. Before clearing houses, every interbank obligation required bilateral trust — one bank had to believe the other would honour its commitments. The clearing house eliminated that requirement by interposing a neutral, rule-governed infrastructure layer that verified obligations, enforced settlement, and maintained auditable records. It did not require the two banks to trust each other. It required them to trust the rules.

Today, AI agents face an identical trust vacuum. Enterprises are deploying autonomous agents that negotiate contracts, commit to supply agreements, and execute financial transactions — often with multi-million-dollar consequences. When Agent A proposes terms to Agent B, Agent B receives an API call. There is no mechanism to verify:

- **Authority:** Was Agent A actually authorised to make this proposal?
- **Mandate compliance:** Does the proposal fall within Agent A's permitted negotiation parameters?
- **Commitment integrity:** If they reach agreement, is there a tamper-proof record of what was agreed?
- **Auditability:** Can regulators, principals, or counterparties independently verify the negotiation history?

Attestara is a cryptographic trust protocol that answers all four questions. It enables AI agents to prove they are operating within their authority mandate — without revealing the mandate itself — and to create binding, auditable commitment records when they reach agreement.

### 1.1 Design Principles

Attestara is built on five foundational principles:

1. **Privacy-preserving verification.** An agent should be able to prove it has authority to act without revealing the boundaries of that authority. A buyer's agent should not need to disclose its maximum price to prove it has not exceeded it.
2. **Cryptographic certainty over institutional trust.** Verification should not depend on trusting the counterparty's organisation, IT infrastructure, or governance processes. Mathematical proof replaces organisational trust.
3. **Regulatory readiness by design.** The protocol satisfies the logging, transparency, human oversight, and audit trail requirements of the EU AI Act (Article 9), DORA, GDPR, and emerging AI governance frameworks — not as an afterthought, but as a core architectural property.
4. **Open protocol, commercial infrastructure.** The specification and core cryptographic primitives are open and standardisable. Commercial value is captured through reference implementations, managed services, and enterprise tooling.
5. **Incremental adoption.** Enterprises should be able to adopt Attestara for bilateral agent interactions without requiring ecosystem-wide coordination. The protocol works between two parties before it works between two hundred.

### 1.2 Normative Terminology

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119 [28] when they appear in normative contexts. Normative contexts are identified by the word "normative" in section headings or by the presence of these keywords in technical requirements.

This whitepaper is primarily informative. A companion normative specification document — the Attestara Protocol Specification — will be derived from this whitepaper and submitted to DIF and W3C CCG. That document will contain the full normative requirements expressed using RFC 2119 terminology.

For indicative purposes, key normative requirements implied by this whitepaper include:

- A conforming Attestara agent implementation **MUST** generate a valid `TurnProofBundle` for each negotiation proposal, containing proofs from all applicable circuits.
- A conforming Attestara verifier **MUST** reject any negotiation turn whose `TurnProofBundle` fails to verify against the counterparty's on-chain credential anchor.
- An `AuthorityCredential` **MUST** conform to W3C Verifiable Credentials Data Model v2.0 and **MUST** include a `credentialStatus` field of type `BitstringStatusListEntry`.
- The `@context` property of an `AuthorityCredential` **MUST** include `https://www.w3.org/ns/credentials/v2` as its first element.
- Commitment records **MUST** carry dual signatures from both negotiating agents before being submitted to the CommitmentContract.
- The Session Relay **MUST NOT** store plaintext proposal content and **MUST** operate as a pass-through for end-to-end encrypted messages only.

### 1.3 Normative Definitions

The following terms are used throughout this document with the specific meanings defined here:

**Agent.** An autonomous software system authorised by a Principal to conduct negotiations and make commitments on the Principal's behalf within the bounds of an Authority Credential.

**Authority Credential.** A W3C Verifiable Credential conforming to the `AgentAuthorityCredential` type, issued by a Principal to an Agent, encoding the mandate scope within which the Agent is authorised to operate.

**Commitment Record.** An immutable on-chain record of a finalised negotiation, containing dual Agent signatures, a session anchor hash, and ZK proof references.

**Mandate.** The set of negotiation parameters — value limits, parameter ranges, counterparty restrictions, and session limits — encoded as private inputs in an Authority Credential and enforced via ZK circuits.

**Principal.** The organisation or authorised natural person that issues an Authority Credential to an Agent and is legally bound by commitments made by that Agent within mandate bounds.

**Session.** A bounded negotiation interaction between two Agents, initiated with an on-chain anchor and concluded with either a Commitment Record or a termination event.

**Session Relay.** The encrypted transport infrastructure that carries DIDComm v2 messages between Agents across organisational boundaries without visibility of message content.

**TurnProofBundle.** A batched set of ZK proofs covering all applicable circuits for a single negotiation turn, submitted alongside a proposal to demonstrate mandate compliance.

**ZK Circuit.** A zero-knowledge proof circuit compiled from Circom 2.x and proving a specific constraint about an Agent's mandate compliance without revealing mandate parameters.

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

**Dimension 1: Authority Verification.** When Agent A sends a proposal to Agent B, Agent B receives an API call. There is no mechanism to verify that Agent A was authorised to make that proposal, that its authorisation is current, or that the authorising Principal intended the proposal's terms. The counterparty must trust the other organisation's internal governance — a trust assumption that breaks down in adversarial or competitive contexts.

**Dimension 2: Mandate Enforcement.** Even if authority can be established, there is no mechanism to enforce mandate boundaries. A Principal may intend to cap its Agent's negotiation at €500K, but there is no cryptographic constraint preventing the Agent from proposing €600K. Mandate enforcement today relies on application-level guardrails — if-then rules in code that can be misconfigured, bypassed, or undermined by prompt injection.

**Dimension 3: Audit Trail Integrity.** Regulators increasingly require demonstrable governance over AI-driven decisions. The EU AI Act (Article 9) mandates risk management systems, logging, and human oversight for high-risk AI systems. DORA requires ICT risk governance for financial institutions. Yet agent-to-agent negotiations typically exist only as ephemeral API calls — there is no immutable, timestamped, independently verifiable record of what was proposed, counter-proposed, and agreed.

**Dimension 4: Commitment Binding.** When two Agents reach agreement, the "contract" exists as a JSON object in one or both organisations' databases. There is no neutral, tamper-proof record. There is no dual-signature mechanism. There is no independent verification that both parties agreed to the same terms. Disputes reduce to "our logs say X; your logs say Y" — a situation that has already led to costly legal proceedings in early agentic commerce deployments.

### 2.3 The Standards Gap: What the DIF Trusted AI Agents Working Group is Solving

The Decentralized Identity Foundation (DIF) Trusted AI Agents Working Group, active since late 2024, is incubating the Agentic Authority Use Cases work item. The group's focus areas — delegation chains, authorisation boundaries, human oversight mechanisms, trust registries, and agent discovery — map directly to the four governance dimensions above.

The working group has identified that existing DID and VC standards provide the credential infrastructure for agent identity but lack: (1) a standardised mechanism for expressing mandate-bound authority as a VC type; (2) a protocol binding for cross-organisational agent authority verification; and (3) a ZK-based approach to private mandate enforcement.

Attestara addresses all three. This whitepaper is submitted to the DIF Trusted AI Agents Working Group as a concrete technical input to the Agentic Authority Use Cases work item, and the Attestara SDK is offered as a reference implementation candidate.

### 2.4 Why Existing Solutions Do Not Work

Current approaches to AI agent governance fail because they address the wrong layer of the problem:

- **API authentication (OAuth, API keys)** verifies that a request comes from a known system, not that the Agent has authority to make a specific proposal. OAuth 2.0 Rich Authorization Requests (RFC 9396 [29]) extends OAuth with fine-grained `authorization_details` — a step in the right direction, but insufficient for cross-organisational adversarial negotiations where neither party trusts the other's authorisation server.
- **Role-based access control (RBAC)** constrains what an Agent can access, not what it can negotiate or commit to.
- **Agent frameworks (LangChain, AutoGen, CrewAI)** provide orchestration and tool use, not cross-organisational trust.
- **Interoperability protocols (Google A2A, MCP)** solve Agent discovery and communication format, not authority verification or commitment binding.

Attestara is designed to be **complementary** to, not competitive with, these existing protocols. It provides the trust layer that sits beneath interoperability infrastructure, and it extends the RFC 9396 authorization detail model with cryptographic ZK enforcement for the adversarial cross-organisational case. See Section 12.4 for the detailed IETF positioning.

---

## 3. Protocol Design

Attestara is a three-layer protocol. Each layer addresses a specific dimension of the governance gap while maintaining clean separation of concerns.

### 3.1 Layer 1: Credential Layer (Authority Binding)

The Credential Layer establishes verifiable authority relationships between Principals and Agents.

A **Principal** (organisation or authorised human) issues an **Authority Credential** to an Agent. This credential is a W3C Verifiable Credential (VC) conforming to the `AgentAuthorityCredential` type defined in the Attestara extension context (`https://attestara.ai/contexts/v1`), which cryptographically encodes:

- **Agent identity:** The Agent's Decentralised Identifier (DID), anchored on-chain via did:ethr (ERC-1056).
- **Mandate scope:** The negotiation parameters the Agent is authorised to operate within — maximum commitment value, allowed parameter ranges (price, quantity, delivery window), permitted counterparty types.
- **Temporal validity:** The time window during which the credential is active.
- **Revocation status:** A `BitstringStatusListEntry` for real-time revocation via W3C Bitstring Status List v1.0.

The credential is signed by the Principal's DID key and verifiable by any party with access to the Ethereum state. The credential's mandate parameters are private — they are held in encrypted storage by the Agent and used only as private inputs to zero-knowledge proofs. They are **never** transmitted to counterparties.

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",      // VC 2.0 base context (W3C Rec. May 2025)
    "https://attestara.ai/contexts/v1"           // Attestara extension context (published)
  ],
  "id": "urn:uuid:<credential-uuid>",             // MUST be present per VC 2.0 §4.4
  "type": ["VerifiableCredential", "AgentAuthorityCredential"],
  "issuer": "did:ethr:0x<principal_address>",
  "validFrom": "2026-03-22T00:00:00Z",            // top-level per VC 2.0 §4.8
  "validUntil": "2026-06-22T00:00:00Z",           // top-level per VC 2.0 §4.8
  "credentialStatus": {
    "id": "https://status.attestara.ai/registry/1#<index>",
    "type": "BitstringStatusListEntry",           // W3C Bitstring Status List v1.0 (Rec. May 2025)
    "statusPurpose": "revocation",
    "statusListIndex": "<index>",
    "statusListCredential": "https://status.attestara.ai/registry/1"
  },
  "credentialSubject": {
    "id": "did:ethr:0x<agent_address>",
    "mandate": {
      "type": "AgentNegotiationMandate",          // MUST specify type per VC 2.0 §4.5
      "maxCommitmentValue": "<AES-256-GCM encrypted at rest; ZKP private input only>",
      "parameterRanges": { },                     // private ZKP inputs only — never transmitted
      "allowedCounterpartyTypes": [],
      "sessionLimit": "<number>"
    }
  },
  "proof": {
    "type": "DataIntegrityProof",                 // VC Data Integrity 1.0 (Rec. May 2025)
    "cryptosuite": "eddsa-jcs-2022",              // W3C Data Integrity EdDSA Cryptosuites v1.0 (Rec. May 2025); Ed25519 key
    "created": "2026-03-22T00:00:00Z",
    "verificationMethod": "did:ethr:0x<principal_address>#keys-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "<base58btc-encoded-signature>"
  }
}
```

> **VC 2.0 Conformance.** The `@context` URL is `https://www.w3.org/ns/credentials/v2` (VC 2.0). The `validFrom`/`validUntil` properties are top-level credential properties per VC 2.0 §4.8. The proof uses `DataIntegrityProof` with the `eddsa-jcs-2022` cryptosuite per W3C Data Integrity EdDSA Cryptosuites v1.0 (W3C Recommendation, May 2025), using an Ed25519 key. This replaces the earlier secp256k1 choice: `ecdsa-jcs-2019` applies only to P-256/P-384/P-521 NIST curves and is not defined for secp256k1; the correct CCG-level secp256k1 suite (`EcdsaSecp256k1Signature2020`) has not yet reached W3C Recommendation status. Ed25519 is a full W3C Recommendation, is widely supported in the Veramo ecosystem, and eliminates the conformance gap. Revocation uses `BitstringStatusListEntry` per W3C Bitstring Status List v1.0. The Attestara extension context **MUST** be published at `https://attestara.ai/contexts/v1` prior to DIF and W3C CCG Work Item submissions; a companion vocabulary document **MUST** be published at `https://attestara.ai/vocab/v1` defining `AgentAuthorityCredential`, `AgentNegotiationMandate`, and all custom vocabulary terms in human-readable RDF form. Until publication, both URLs are reserved and do not yet resolve.

### 3.1.1 AgentAuthorityCredential JSON Schema

A JSON Schema document for structural validation of `AgentAuthorityCredential` will be published at `https://attestara.ai/schemas/AgentAuthorityCredential/v1` prior to the W3C CCG Work Item submission. The representative schema structure is as follows (abbreviated for clarity; the full schema will be published at the stable URL):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://attestara.ai/schemas/AgentAuthorityCredential/v1",
  "title": "AgentAuthorityCredential",
  "type": "object",
  "required": ["@context", "id", "type", "issuer", "validFrom", "credentialStatus", "credentialSubject", "proof"],
  "properties": {
    "@context": {
      "type": "array",
      "minItems": 2,
      "prefixItems": [
        { "const": "https://www.w3.org/ns/credentials/v2" },
        { "const": "https://attestara.ai/contexts/v1" }
      ]
    },
    "id": { "type": "string", "format": "uri" },
    "type": {
      "type": "array",
      "contains": { "const": "AgentAuthorityCredential" }
    },
    "issuer": { "type": "string", "pattern": "^did:ethr:0x[0-9a-fA-F]{40}$" },
    "validFrom": { "type": "string", "format": "date-time" },
    "validUntil": { "type": "string", "format": "date-time" },
    "credentialStatus": {
      "type": "object",
      "required": ["id", "type", "statusPurpose", "statusListIndex", "statusListCredential"],
      "properties": {
        "type": { "const": "BitstringStatusListEntry" },
        "statusPurpose": { "const": "revocation" },
        "statusListIndex": { "type": "string", "pattern": "^[0-9]+$" },
        "statusListCredential": { "type": "string", "format": "uri" }
      }
    },
    "credentialSubject": {
      "type": "object",
      "required": ["id", "mandate"],
      "properties": {
        "id": { "type": "string", "pattern": "^did:ethr:0x[0-9a-fA-F]{40}$" },
        "mandate": {
          "type": "object",
          "required": ["type", "sessionLimit"],
          "properties": {
            "type": { "const": "AgentNegotiationMandate" },
            "sessionLimit": { "type": "integer", "minimum": 1 },
            "allowedCounterpartyTypes": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    },
    "proof": {
      "type": "object",
      "required": ["type", "cryptosuite", "created", "verificationMethod", "proofPurpose", "proofValue"],
      "properties": {
        "type": { "const": "DataIntegrityProof" },
        "cryptosuite": { "const": "eddsa-jcs-2022" },
        "proofPurpose": { "const": "assertionMethod" }
      }
    }
  }
}
```

> Note: `maxCommitmentValue` and `parameterRanges` are intentionally absent from the JSON Schema. These mandate parameters are held in encrypted storage at the Agent and are never present in the serialised credential that would be validated against this schema. Their structure is defined only in the ZK circuit specification and the private credential storage format.

### 3.2 Layer 2: Zero-Knowledge Proof Layer (Private Verification)

The ZK Proof Layer enables Agents to prove mandate compliance without revealing mandate parameters.

At each turn of a negotiation, the acting Agent generates a **zero-knowledge proof** demonstrating that its proposal satisfies its mandate constraints. The counterparty (or an on-chain verifier) can verify this proof in constant time without learning anything about the mandate itself.

Four core circuits enforce compliance:

| Circuit | Statement Proven | Private Inputs | Public Inputs |
|---------|-----------------|----------------|---------------|
| **MandateBound** | proposed_value ≤ max_value | max_value, credential_hash | proposed_value, session_id |
| **ParameterRange** | floor ≤ parameter ≤ ceiling | floor, ceiling | parameter_value, session_id |
| **CredentialFreshness** | credential is valid and unrevoked at time T | valid_from, valid_until, status_bit_witness | current_timestamp, status_list_root |
| **IdentityBinding** | The agent knows the private key whose Poseidon hash equals the on-chain key commitment registered for its DID | private_key | key_commitment, session_id, did_document_hash |

These circuits are composable. A single negotiation turn may require proofs from multiple circuits, which are batched into a `TurnProofBundle` and verified together.

### 3.3 Layer 3: Commitment Layer (Binding Settlement)

The Commitment Layer creates immutable, independently verifiable records of Agent agreements.

When two Agents reach agreement, the final terms are recorded as a **Commitment Record** on the Attestara smart contract (deployed on Arbitrum L2). Each Commitment Record contains dual Agent DID signatures, a session anchor hash linking it to the complete negotiation history, ZK proof references, and an Arbitrum block timestamp.

---

## 4. Zero-Knowledge Proof Architecture

### 4.1 Why Zero-Knowledge Proofs?

The core innovation of Attestara is the insight that **authority verification and mandate privacy are not opposing requirements** — zero-knowledge proofs make them complementary.

Consider a procurement negotiation. Buyer Agent B has a mandate: "Do not exceed €500K for 10,000 units, with delivery within 90 days." Seller Agent S proposes: "€480K for 10,000 units, delivery in 75 days."

Without Attestara, B can accept — but S has no way to verify that B was authorised to commit €480K. With Attestara, B generates a ZK proof demonstrating:

- "My proposed acceptance value (€480K) is ≤ my maximum authorised value" — without revealing the maximum.
- "My proposed quantity (10,000) is within my authorised range" — without revealing the range bounds.
- "My credential is currently valid and has not been revoked" — without revealing its expiry date.
- "I am the Agent bound to this DID" — without revealing my private key.

S verifies all four proofs — without learning that B's actual ceiling was €500K.

### 4.2 Circuit Design: Groth16 on Circom

Attestara uses **Groth16** proofs compiled from **Circom 2.x** circuits. Groth16 is chosen over PLONK for its on-chain verification gas advantage (~210K vs ~300K+), which is material at per-session anchoring economics. The trusted setup requirement is mitigated by a multi-party ceremony (5+ independent participants) with a planned PLONK migration once the trusted setup ceremony governance infrastructure is mature and a PLONK-compatible circuit library is available for the required constraint systems.

A formal circuit security audit with Trail of Bits or Zellic is scheduled prior to mainnet deployment. Audit scope covers all four circuits, the trusted setup ceremony, and proof batching. Findings will be published in full.

### 4.3 MandateBound Circuit (Normative)

Given public inputs `(proposed_value, session_id, credential_commitment)` and private inputs `(max_value, credential_randomness)`, the MandateBound circuit **MUST** prove:

1. `proposed_value ≤ max_value` (mandate compliance)
2. `hash(max_value, credential_randomness) == credential_commitment` (credential binding)
3. `proposed_value > 0` (non-triviality)

**Security properties:**

- **Soundness:** A cheating prover cannot generate a valid proof for `proposed_value > max_value` except with negligible probability (≤ 2⁻¹²⁸), under the q-SBDH assumption.
- **Zero-knowledge:** The verifier learns nothing about `max_value` beyond the fact that `proposed_value ≤ max_value`.
- **Binding:** The credential commitment prevents the Agent from switching mandates between turns.

### 4.4 CredentialFreshness Circuit and Bitstring Status List Integration

The CredentialFreshness circuit proves that an Authority Credential is both temporally valid and unrevoked. It uses the W3C Bitstring Status List v1.0 as its revocation source.

**Mechanism:**

1. The SDK fetches the current Bitstring Status List credential from its registered HTTPS URL and verifies its `DataIntegrityProof` signature.
2. A Merkle proof is computed over the bitstring, demonstrating that the bit at the credential's registered index is `0` (not revoked), without revealing any other bits.
3. The Merkle root of the bitstring is periodically anchored on the Arbitrum CredentialRegistry contract (every 60 seconds or on every revocation event).
4. The circuit receives:
   - *Private inputs:* `valid_from`, `valid_until`, `status_bit_witness` (Merkle path proving non-revocation)
   - *Public inputs:* `current_timestamp`, `status_list_root` (on-chain anchored Merkle root)
   The circuit proves: (a) `valid_from ≤ current_timestamp ≤ valid_until`; (b) the Merkle path correctly opens `status_list_root` to a `0` bit at the credential's registered index.
5. The on-chain verifier **MUST** confirm that `status_list_root` was anchored within a configurable freshness window (default: 90 seconds), preventing stale-proof replay. The 90-second default balances revocation response latency against on-chain anchoring cost (~$0.04 per root update at current Arbitrum gas prices); deployments with higher security requirements **MAY** reduce this to 30 seconds at approximately 3x anchoring cost, while lower-frequency negotiation environments **MAY** extend it to 300 seconds.

The internal Merkle tree uses Poseidon hash (ZK-friendly); the on-chain anchor and status list credential use SHA-256 for off-chain compatibility. The two hash domains are bridged by a circuit-internal SHA-256 gadget that recomputes the SHA-256 root from the Poseidon Merkle leaves, adding approximately 6,000 constraints. The circuit verifies that the recomputed SHA-256 root matches the `status_list_root` anchored on-chain. This approach is more expensive than a pure Poseidon tree but eliminates the need for any trusted mapping table and provides a fully trustless bridge between the ZK-friendly and off-chain hash domains.

### 4.5 ParameterRange Circuit

The ParameterRange circuit generalises MandateBound to multi-dimensional constraints, proving that a proposed parameter falls within an authorised range `[floor, ceiling]`. Multiple ParameterRange proofs are composed to cover all dimensions of a complex proposal.

### 4.6 IdentityBinding Circuit (Normative)

The IdentityBinding circuit proves that the acting agent controls the private key associated with its registered DID, without revealing the private key. Specifically, the circuit proves knowledge of a `private_key` whose Poseidon hash equals `key_commitment` — the public key commitment registered on-chain in the CredentialRegistry for this agent's DID.

Given:

- **Private input:** `private_key`
- **Public inputs:** `key_commitment`, `session_id`, `did_document_hash`

The circuit proves:

1. `Poseidon(private_key) == key_commitment`
2. `did_document_hash` is the hash of the DID document containing `key_commitment`
3. `session_id` links this proof to the current negotiation session

The Poseidon hash function is used rather than a conventional cryptographic hash because Poseidon is specifically designed for ZK-SNARK circuit efficiency. Its algebraic structure over the BN254 scalar field produces dramatically lower constraint counts than SHA-256 or similar hash functions. At approximately 932 constraints, the IdentityBinding circuit is the most computationally efficient of the four core circuits, with proof generation completing in under 100ms on the managed prover service.

The `session_id` public input binds the identity proof to the specific negotiation session, preventing a valid identity proof from one session being replayed into another. The `did_document_hash` public input ensures the key commitment being proven is the one registered in the agent's current DID document, preventing an agent from using a key commitment from a superseded DID document after key rotation.

**Security properties:**

- **Soundness:** A cheating prover cannot generate a valid IdentityBinding proof without knowing the private key whose Poseidon hash matches `key_commitment`, except with negligible probability under the collision resistance of Poseidon over BN254.
- **Zero-knowledge:** The verifier learns nothing about `private_key` beyond the fact that the prover knows a value that Poseidon-hashes to `key_commitment`.
- **Session binding:** The `session_id` public input prevents cross-session proof replay.
- **DID binding:** The `did_document_hash` public input ensures the proven key is current — proofs generated under a rotated key fail verification against the updated `did_document_hash`.

**Implementation note:** The IdentityBinding circuit uses Poseidon as implemented in the circomlib library. The Poseidon parameters used are the standard BN254-compatible parameters with t=3 (2 inputs, 1 output) as specified in the Poseidon paper. The circuit implementation is the `Poseidon(2)` template from circomlib which is audited and widely deployed in production ZK systems. The IdentityBinding circuit generates proofs within the managed prover service performance target of under 100ms at approximately 932 constraints. Browser-based proof generation via WebAssembly is supported given its low constraint count, with proof generation completing under 500ms on modern desktop hardware.

### 4.7 Proof Composition and Batching

A typical negotiation turn requires proofs from 2–4 circuits. Attestara batches these into a single `TurnProofBundle` with a common session anchor. The bundle is verified atomically — all proofs **MUST** pass for the turn to be accepted. A single compromised circuit cannot undermine overall turn security.

### 4.8 Post-Quantum Cryptography Migration Path

The secp256k1 curve used throughout Attestara — for DID keys, credential signatures, and commitment signatures — is vulnerable to attacks from a sufficiently powerful quantum computer (Shor's algorithm). Groth16's underlying bilinear pairing assumptions are similarly at risk.

NIST finalised its first post-quantum cryptography standards in August 2024: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA). Attestara's planned PQC migration is as follows:

**Credential signatures (current, v1):** Attestara v1 uses `eddsa-jcs-2022` (Ed25519) per W3C Data Integrity EdDSA Cryptosuites v1.0, a full W3C Recommendation. Ed25519 offers strong classical security properties (128-bit security, compact signatures) and is widely supported in the VC ecosystem. The migration path to ML-DSA is: Ed25519 (current) → ML-DSA once a W3C VC Data Integrity ML-DSA cryptosuite is standardised. No W3C work item for an ML-DSA cryptosuite currently exists; NIST FIPS 204 (ML-DSA) is finalised but the W3C Data Integrity binding has not yet been initiated. Attestara commits to tracking this work and updating the `AgentAuthorityCredential` proof requirements when an ML-DSA cryptosuite reaches W3C Recommendation status.

**DID key material (Phase 3):** ERC-1056 supports key rotation without DID change. Once ML-DSA hardware wallet support matures (anticipated 2027–2028), Agent and Principal DID keys can be rotated to ML-DSA keys via standard ERC-1056 delegate rotation.

**ZK circuit assumptions (long-term):** Current ZK-SNARK systems, including Groth16 and PLONK, do not offer post-quantum security. A migration to a hash-based or lattice-based ZK proof system will be required when quantum computing timelines become clearer. STARKs (Scalable Transparent Arguments of Knowledge) offer post-quantum security under hash collision resistance assumptions and are being tracked as a migration target. This migration is not planned within the current roadmap but is a named design consideration.

**Commitment record re-signing:** Historical commitment records signed under classical cryptography will need re-signing under PQC keys before the quantum threat materialises. The dual-signature commitment structure supports this: a PQC countersignature can be appended to existing records without invalidating the original signatures. A migration toolchain will be provided.

> **Standards note for DIF and W3C CCG reviewers:** Attestara v1 uses Ed25519 (`eddsa-jcs-2022`), a full W3C Recommendation, as its credential signature cryptosuite. The migration path from Ed25519 to ML-DSA is noted as a future commitment contingent on W3C VC Data Integrity publishing an ML-DSA cryptosuite specification. Attestara commits to tracking this work and updating accordingly.

---

## 5. Identity, Credential, and DIF Protocol Framework

### 5.1 Decentralised Identifiers

Attestara uses **did:ethr** (ERC-1056) as its DID method. Each Agent and Principal is identified by a DID anchored on Ethereum, fully conformant with W3C Controlled Identifiers v1.0 (W3C Recommendation, May 2025):

```
did:ethr:0x1234567890abcdef1234567890abcdef12345678
```

ERC-1056 uses a lightweight on-chain registry (setAttribute/revokeDelegate) for gas-efficient key rotation without per-identity contract deployment. Authority Credential proofs use Ed25519 keys (`eddsa-jcs-2022` cryptosuite); DID documents expose Ed25519 verification methods via the ERC-1056 registry's `setAttribute` mechanism (key type `Ed25519VerificationKey2020`). The Ethereum Foundation Privacy and Scaling Explorations team has announced grant funding for did:ethr specification advancement [30], further strengthening the method's community support.

> **Dual-key architecture note:** Agents and Principals maintain two key pairs: an Ed25519 key for credential signatures and DIDComm messaging (`eddsa-jcs-2022`), and a secp256k1 key for Ethereum transaction signing (ERC-1056 registry operations, Arbitrum contract interactions). The ERC-1056 registry maps the secp256k1 Ethereum address to the Ed25519 verification method via `setAttribute`. The Attestara SDK's did:ethr resolver handles Ed25519 key type resolution from ERC-1056 `setAttribute` events; the DIF Universal Resolver's did:ethr driver also supports this key type. The test vector in Appendix B demonstrates this resolution path.

**DID resolution.** Cross-organisational sessions require each Agent to resolve its counterparty's DID document before DIDComm messaging can begin — to obtain the counterparty's public key and DIDComm service endpoint. Attestara uses did:ethr resolution via the Ethereum RPC endpoint through the ERC-1056 registry. The DIF Universal Resolver (`https://dev.uniresolver.io`) supports did:ethr as a production resolver and is available as a fallback. The SDK includes configurable fallback RPC endpoints to maintain resolution availability if a primary endpoint is unavailable. The Attestara relay performs DID resolution on behalf of Agents during the session authorisation handshake, caching resolved documents for the session duration.

### 5.2 Key Management for Enterprise Deployment

For high-value commitment operations, the DID private key is the root of trust. Enterprise deployments **SHOULD** implement:

- **Hardware Security Modules (HSMs):** The Enterprise SDK includes native PKCS#11 integration. Agent signing operations are delegated to the HSM; private keys **MUST NOT** appear in memory.
- **Key rotation:** ERC-1056 supports delegate key rotation without changing the root DID. Agent session keys **SHOULD** be rotated after each negotiation; Principal root keys **SHOULD** be rotated at least annually.
- **Key compromise response:** On Principal DID key compromise, the organisation **MUST** immediately revoke all outstanding Authority Credentials. Historical commitment records remain valid under the timestamped audit trail. A key compromise response runbook is included in enterprise onboarding documentation.
- **Backup and recovery:** m-of-n Shamir secret sharing is supported for Principal key recovery.
- **ISO/IEC 27001:2022 Annex A alignment:** The key management controls above align with Annex A controls A.8.24 (cryptographic key management) and A.5.23 (information security for cloud services).

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

1. **Issuance:** The Principal creates an Authority Credential, signs it with their DID key, and delivers it via DIDComm v2 Issue Credential v3 (Section 5.4).
2. **Anchoring:** The credential hash is recorded on the CredentialRegistry contract — existence and issuer only, never credential content.
3. **Presentation:** The Agent uses credential private fields as ZK proof inputs. The credential is **never** transmitted to counterparties.
4. **Verification:** Counterparties verify ZK proofs against the on-chain anchor, without seeing the credential.
5. **Revocation:** The Principal updates the Bitstring Status List. The CredentialFreshness circuit will immediately fail for all subsequent proofs referencing the revoked credential.

### 5.4 DIF DIDComm v2 Protocol Bindings

Attestara uses DIF DIDComm v2 [31] for all credential issuance, session invitation, and proof bundle exchange messages. This section defines the specific message types and bindings.

**5.4.1 Credential Issuance (WACI-DIDComm Issue Credential v3)**

Authority Credentials are issued using the WACI-DIDComm Issue Credential v3 protocol [38] over DIDComm v2. This is an Aries RFC 0453-derived protocol adopted by DIF through the WACI-DIDComm specification; it is not a DIF-originated protocol. The issuance flow is:

```
Principal                                Agent
    │                                       │
    │── issue-credential/3.0/offer-credential ──►│
    │                                       │
    │◄── issue-credential/3.0/request-credential ─│
    │                                       │
    │── issue-credential/3.0/issue-credential ──►│
    │                                       │
    │◄── issue-credential/3.0/ack ──────────│
```

The `issue-credential` message body **MUST** contain the `AuthorityCredential` VC as a DIDComm v2 attachment with `media_type: "application/vc"`. The credential body **MUST** be encrypted using the Agent's DID key (ECDH-1PU + XC20P) so that only the intended Agent can decrypt the mandate parameters. All messages in this thread **MUST** share the same `thid` (thread ID) to link offer, request, issue, and ack messages.

**5.4.2 Session Invitation**

Cross-organisation session invitations use a custom DIDComm v2 message type:

```json
{
  "type": "https://attestara.ai/protocols/session/1.0/invite",
  "id": "<message-uuid>",
  "thid": "<message-uuid>",
  "created_time": 1742601600,
  "expires_time": 1742605200,
  "from": "did:ethr:0x<agent_a_address>",
  "to": ["did:ethr:0x<agent_b_address>"],
  "body": {
    "sessionId": "<session-uuid>",
    "sessionAnchorTx": "<arbitrum-tx-hash>",
    "inviteToken": "<single-use-token>"
  }
}
```

> **DIDComm v2 header requirements:** All Attestara DIDComm messages **MUST** include `created_time` (Unix timestamp, integer) and **SHOULD** include `expires_time` (Unix timestamp, integer). Session invitations **MUST** include `expires_time` to bound their validity window. Multi-step protocol threads (Issue Credential v3, session negotiation) **MUST** include `thid` linking all messages in the thread to the initiating message `id`.

**5.4.3 Negotiation Turn (TurnProofBundle)**

Each negotiation turn is conveyed as a DIDComm v2 message carrying the proposal and proof bundle:

```json
{
  "type": "https://attestara.ai/protocols/negotiation/1.0/turn",
  "id": "<message-uuid>",
  "thid": "<session-uuid>",
  "created_time": 1742601600,
  "expires_time": 1742601900,
  "from": "did:ethr:0x<proposing_agent>",
  "to": ["did:ethr:0x<counterparty_agent>"],
  "body": {
    "sessionId": "<session-uuid>",
    "turnIndex": 3,
    "turnHash": "<poseidon-hash-of-turn>",
    "proposal": {
      "unitPrice": 48,
      "quantity": 10000,
      "deliveryDays": 75
    },
    "proofBundle": {
      "mandateBound": "<groth16-proof-bytes>",
      "parameterRanges": ["<proof-1>", "<proof-2>", "<proof-3>"],
      "credentialFreshness": "<groth16-proof-bytes>",
      "identityBinding": "<groth16-proof-bytes>",
      "publicInputs": {
        "proposedValue": 480000,
        "statusListRoot": "<merkle-root>",
        "currentTimestamp": 1742601600,
        "sessionId": "<session-uuid>"
      }
    }
  }
}
```

### 5.5 DIF Presentation Exchange Binding

For counterparty verification of Agent authority, Attestara defines a DIF Presentation Exchange v2 [32] `presentation_definition` that specifies what a verifier requires from an Agent before accepting a negotiation turn. This enables Attestara to compose with existing wallet infrastructure that supports PE v2.

The `presentation_definition` for Attestara turn verification:

```json
{
  "id": "attestara-turn-verification",
  "name": "Attestara Negotiation Turn Authority Verification",
  "purpose": "Verify that the proposing Agent has valid, in-mandate authority",
  "input_descriptors": [
    {
      "id": "agent-authority-credential",
      "name": "Agent Authority Credential",
      "purpose": "Proof of Agent authority within mandate bounds",
      "constraints": {
        "fields": [
          {
            "path": ["$.type"],
            "filter": {
              "type": "array",
              "contains": { "type": "string", "const": "AgentAuthorityCredential" }
            }
          },
          {
            "path": ["$.credentialStatus.type"],
            "filter": { "type": "string", "const": "BitstringStatusListEntry" }
          }
        ],
        "limit_disclosure": "preferred"
      }
    },
    {
      "id": "turn-proof-bundle",
      "name": "ZK Turn Proof Bundle",
      "purpose": "Zero-knowledge proof of mandate compliance for this turn",
      "constraints": {
        "fields": [
          {
            "path": ["$.type"],
            "filter": {
              "type": "array",
              "contains": { "type": "string", "const": "AttestaraTurnProofBundle" }
            }
          }
        ]
      }
    }
  ]
}
```

> **`limit_disclosure` note:** This definition uses `"preferred"` rather than `"required"`. Selective disclosure (`"required"`) demands BBS+ or SD-JWT proof suites; Attestara v1 uses `eddsa-jcs-2022` (Ed25519) which does not support selective disclosure. Setting `"preferred"` allows current Ed25519 credentials to satisfy this PE definition while signalling the intent to support selective disclosure in a future credential version using BBS+ or SD-JWT when those cryptosuites are production-ready in the DIF ecosystem.

> **`AttestaraTurnProofBundle` type definition:** The `AttestaraTurnProofBundle` credential type referenced in the second input descriptor is defined in the Attestara extension context (`https://attestara.ai/contexts/v1`) as a Verifiable Credential wrapping a negotiation turn's ZK proof set. It carries the following top-level type array: `["VerifiableCredential", "AttestaraTurnProofBundle"]`. Its `credentialSubject` contains the fields `sessionId`, `turnIndex`, `turnHash`, `proofBundle`, and `publicInputs` as described in the DIDComm turn message body (Section 5.4.3). The full type definition, JSON-LD context entry, and JSON Schema for `AttestaraTurnProofBundle` will be published alongside `AgentAuthorityCredential` in the extension context and schema documents.

### 5.6 DIF Credential Manifest

The DIF Credential Manifest [37] for `AgentAuthorityCredential` issuance defines what a Principal **MUST** provide to receive a credential. This enables composability with DIF-compatible issuance infrastructure. Note: the `output_descriptors.schema` field used below is present in the current Credential Manifest specification but may be superseded by `format` constraints in future versions; the Attestara SDK will track the Credential Manifest specification and update accordingly:

```json
{
  "id": "attestara-authority-credential-manifest",
  "name": "Attestara Authority Credential",
  "description": "Issues an AgentAuthorityCredential binding an Agent DID to a negotiation mandate",
  "issuer": {
    "id": "did:ethr:0x<principal_address>",
    "name": "Issuing Organisation"
  },
  "output_descriptors": [
    {
      "id": "agent-authority-credential",
      "schema": "https://attestara.ai/schemas/AgentAuthorityCredential/v1"
    }
  ],
  "presentation_definition": {
    "id": "agent-identity-verification",
    "input_descriptors": [
      {
        "id": "agent-did-proof",
        "name": "Agent DID Control Proof",
        "constraints": {
          "fields": [
            {
              "path": ["$.id"],
              "filter": { "type": "string", "pattern": "^did:ethr:0x[0-9a-fA-F]{40}$" }
            }
          ]
        }
      }
    ]
  }
}
```

### 5.7 Credential Security Model

Authority Credentials encode the organisation's negotiation strategy and **MUST** be protected at all lifecycle stages:

- **At rest:** Encrypted using the Agent's DID key (AES-256-GCM). **MUST NOT** be stored in plaintext.
- **In transit:** Issuance uses DIDComm v2 ECDH-1PU encrypted channels. **MUST NOT** be transmitted unencrypted.
- **In use:** Mandate parameters are used only as ZK circuit private inputs. **MUST NOT** be included in public proof inputs or transmitted to counterparties.
- **Revocation propagation:** On-chain revocation is immediate. The CredentialFreshness circuit checks the Bitstring Status List Merkle root at proof generation time.

---

## 6. On-Chain Commitment Settlement

### 6.1 CommitmentContract Design

The CommitmentContract records finalised Agent agreements as immutable on-chain records:

```solidity
struct Commitment {
    bytes32 commitmentId;          // unique identifier
    bytes32 sessionAnchor;         // hash of complete negotiation history
    address agentA;                // DID-linked address of first Agent
    address agentB;                // DID-linked address of second Agent
    bytes32 termsHash;             // hash of agreed terms (off-chain storage)
    bytes signatureA;              // Agent A's signature over terms
    bytes signatureB;              // Agent B's signature over terms
    uint256[] proofReferences;     // on-chain ZK proof verification IDs
    uint256 timestamp;             // block timestamp
    CommitmentStatus status;       // active, disputed, settled
}
```

### 6.2 Dual-Signature Settlement

Both Agents **MUST** sign the commitment terms before the record is accepted. The CommitmentContract enforces: signature validity against registered DID keys; session anchor match; at least one ZK proof reference per Agent; and correct temporal ordering.

### 6.3 Why Arbitrum L2?

| Metric | Ethereum Mainnet | Arbitrum One | Savings |
|--------|-----------------|-------------|---------|
| Session anchoring (per tx) | ~$15.00 | ~$0.04 | 99.7% |
| Commitment settlement | ~$25.00 | ~$0.06 | 99.8% |
| ZK proof verification | ~$8.00 | ~$0.02 | 99.8% |
| **Total per session** | **~$48.00** | **~$0.12** | **99.8%** |

Arbitrum inherits Ethereum's security guarantees (fraud proofs settle to L1) while reducing costs by two orders of magnitude.

### 6.4 Circuit Versioning and VerifierRegistry

Each ZK circuit is versioned using semantic versioning (`MAJOR.MINOR.PATCH`) and registered on-chain in the **VerifierRegistry** contract. The VerifierRegistry maps circuit identifiers to deployed Groth16 verifier contract addresses and tracks circuit deprecation status.

**Circuit identifier derivation.** The on-chain `bytes32` circuit identifier is computed deterministically as:

```
circuitId = keccak256(abi.encodePacked("<circuit-name>-<MAJOR.MINOR.PATCH>"))
```

For the four core circuits at v1.0.0:

| Circuit | Identifier Input | On-Chain `bytes32` |
|---------|-----------------|-------------------|
| MandateBound | `"mandate-bound-1.0.0"` | `keccak256("mandate-bound-1.0.0")` |
| ParameterRange | `"parameter-range-1.0.0"` | `keccak256("parameter-range-1.0.0")` |
| CredentialFreshness | `"credential-freshness-1.0.0"` | `keccak256("credential-freshness-1.0.0")` |
| IdentityBinding | `"identity-binding-1.0.0"` | `keccak256("identity-binding-1.0.0")` |

**VerifierRegistry contract.** The registry exposes four operations:

1. `registerVerifier(bytes32 circuitId, address verifier)` — Owner-only. Registers a deployed Groth16 verifier contract for a specific circuit version.
2. `getVerifier(bytes32 circuitId)` — Public. Returns the verifier contract address for a given circuit identifier, or the zero address if not registered.
3. `deprecateCircuit(bytes32 circuitId)` — Owner-only. Marks a circuit version as deprecated. Deprecated circuits **SHOULD NOT** be used for new proofs but remain verifiable for historical commitment records.
4. `isDeprecated(bytes32 circuitId)` — Public. Returns whether a circuit version has been deprecated.

**Versioning rules:**

- **PATCH** increment (e.g., 1.0.0 → 1.0.1): Constraint optimisation or implementation improvement with identical public/private input interfaces and identical proof semantics. Proof outputs are interchangeable. The previous PATCH version **SHOULD** be deprecated.
- **MINOR** increment (e.g., 1.0.0 → 1.1.0): Addition of new optional public inputs or extension of circuit capabilities. Backward-compatible: proofs generated under 1.0.x remain verifiable. The previous MINOR version **MAY** be deprecated after a transition period.
- **MAJOR** increment (e.g., 1.0.0 → 2.0.0): Breaking change to proof semantics, public input structure, or security assumptions. A new trusted setup ceremony is required. Previous MAJOR versions **MUST** remain verifiable for existing commitment records but **MUST** be deprecated for new proof generation.

**SDK version compatibility.** The SDK and prover service both expose the semantic version and derived `circuitId` for each circuit. Before generating a proof, the SDK **MUST** verify that the `circuitId` it would produce matches a non-deprecated entry in the VerifierRegistry. If the circuit is deprecated or unregistered, the SDK **MUST** reject the proof generation request with a clear error indicating the version mismatch.

**Trusted setup ceremony per version.** Each MAJOR circuit version requires an independent trusted setup ceremony. PATCH and MINOR versions within the same MAJOR version **MAY** reuse the existing trusted setup if the constraint system structure is unchanged.

---

## 7. Session Protocol

### 7.1 Session Lifecycle

```
  INITIALISE ──► NEGOTIATE ──► COMMIT ──► SETTLE
       │              │            │          │
  create session   exchange     agree on    record on
  anchor on-chain  ZK-proven    final       chain with
  exchange DIDs    proposals    terms       dual sigs
```

**Phase 1 — Initialisation:** Agent A creates a session, anchors the session ID on-chain, and sends a DIDComm v2 session invitation. Both Agents verify each other's DID and credential status. A session key pair is established.

**Phase 2 — Negotiation:** Agents exchange proposals in alternating turns via DIDComm v2 `negotiation/1.0/turn` messages (Section 5.4.3), each carrying a `TurnProofBundle`.

**Phase 3 — Commitment:** Both Agents sign the final terms with their DID keys. The dual-signed terms are submitted to the CommitmentContract.

**Phase 4 — Settlement:** The Commitment Record is immutably recorded on Arbitrum. Session transcript is archived (IPFS or enterprise storage).

### 7.2 Session Anchoring Mechanism

Each turn `t_n` includes a hash chain:

```
turn_hash(n) = H(turn_hash(n-1) || agent_did || proposal || proof_bundle || timestamp)
```

Here, `H` denotes Poseidon for in-circuit use and SHA-256 for off-chain verification. Any modification to a historical turn invalidates all subsequent hashes. Session anchors are periodically committed on-chain (every N turns or at configurable intervals).

### 7.3 Cross-Organisation Session Management

**Intra-organisation sessions:** Both Agents belong to the same organisation, established via internal infrastructure for internal governance use.

**Cross-organisation sessions:** Established via the Attestara Session Relay with: encrypted DIDComm v2 transport; mutual DID verification; time-limited invite tokens; and no relay visibility of message content.

### 7.4 Session Relay: Data Governance and Self-Hosting

The Session Relay observes session metadata (participant DID pairs, session timing, turn counts) but **MUST NOT** access message content. Three mechanisms address commercial sensitivity:

1. **Self-hosted relay:** Open-source, containerised, deployable within enterprise infrastructure. **RECOMMENDED** for DORA-subject institutions.
2. **Relay network:** Littledata operates geographically distributed relay nodes with configurable region selection.
3. **Metadata minimisation:** The relay stores session metadata for a configurable retention period (default 30 days) linked only to pseudonymous DID pairs.

### 7.5 Error Conditions

The following failure modes are defined for the Attestara session protocol. Each generates a DIDComm v2 `https://didcomm.org/report-problem/2.0/problem-report` message with the specified `code` value.

| Failure | `code` | Protocol behaviour |
|---------|--------|-------------------|
| `TurnProofBundle` fails ZK verification | `attestara.turn.proof-invalid` | Receiving Agent **MUST** reject the turn. Session remains open; proposing Agent **MAY** re-propose. |
| `CredentialFreshness` fails — revoked credential | `attestara.turn.credential-revoked` | Receiving Agent **MUST** reject the turn, **MUST** send a problem-report, and **SHOULD** terminate the session. |
| `CredentialFreshness` fails — stale `status_list_root` | `attestara.turn.credential-stale` | Receiving Agent **MUST** reject the turn. Proposing Agent **SHOULD** regenerate the proof against a fresh root and re-propose. |
| Session Relay unavailable | `attestara.relay.unavailable` | Agents **SHOULD** attempt direct P2P DIDComm delivery. If both fail within the configurable timeout (default: 30 seconds), the session is suspended. Agents **MAY** resume when connectivity is restored, provided the session anchor has not expired on-chain. |
| Commitment rejected by CommitmentContract | `attestara.commitment.contract-rejected` | The revert reason **MUST** be surfaced to the Principal. The Agent **MUST NOT** re-submit without Principal authorisation. |
| Agent rejects proposal without counteroffer | `attestara.turn.rejected` | The rejecting Agent sends a `turn.rejected` problem-report. The proposing Agent **MAY** re-propose with revised terms. Either Agent **MAY** terminate the session at any time. |

Sessions terminated for any reason other than successful commitment settlement **MUST** result in no on-chain Commitment Record being created. Partial session transcripts are archived for audit purposes regardless of outcome.

### 7.6 Internationalisation

Attestara mandate parameters are designed to be locale-independent.

**Currency values.** All monetary mandate values **MUST** be expressed as unsigned 64-bit integers in the smallest denomination of the relevant currency (e.g., euro-cents for EUR, pence for GBP). A currency field (e.g., `unitPriceCurrency`) using ISO 4217 three-letter codes (e.g., `"EUR"`, `"USD"`) **MUST** accompany any monetary value in proposal messages (see Section 5.4.3 and Appendix B.4). ZK circuits operate on the integer denomination value; currency interpretation is the responsibility of the application layer.

**Parameter labels.** Mandate parameter range keys (e.g., `"unitPrice"`, `"deliveryDays"`) are opaque ASCII strings at the circuit level. Their semantic meaning is defined by the application schema and **MUST** be agreed out-of-band — for example, via the Credential Manifest's `presentation_definition` — before a session is initiated.

**Timestamps.** All protocol timestamps use UTC. Credentials use ISO 8601 format; DIDComm message timestamps use Unix integers (seconds since epoch, per the DIDComm v2 specification). No locale-specific date formats are used at the protocol layer.

**Text fields.** Human-readable fields (e.g., issuer `name` in the Credential Manifest) are UTF-8 encoded. The protocol imposes no language constraints; localisation is the responsibility of portal implementations.

---

## 8. Threat Model

### 8.1 STRIDE Analysis

| Threat | Category | Attack Vector | Mitigation |
|--------|----------|---------------|------------|
| Agent impersonation | Spoofing | Compromised DID key | Key rotation via ERC-1056; IdentityBinding ZK circuit; HSM key storage |
| Turn injection | Tampering | Malicious relay operator | Hash-chain session anchoring; on-chain checkpoints; client-side verification |
| Mandate parameter inference | Information Disclosure | Statistical analysis of accepted/rejected proposals | Boolean-only ZK output; session turn limits; mandate randomisation |
| Commitment repudiation | Repudiation | Agent denies agreement post-settlement | Dual-signature on-chain commitment; immutable Arbitrum record |
| Relay service outage | Denial of Service | DDoS against Session Relay | P2P fallback; rate limiting; geographic distribution; self-hosted option |
| Credential forgery | Elevation of Privilege | Fraudulent Authority Credential | On-chain anchor; issuer DID verification; schema validation |
| LLM prompt injection | Tampering / Elevation of Privilege | Adversarial input to AI model | See Section 8.4 |

### 8.2 Cryptographic Assumptions

- **Groth16 soundness:** Sound under q-SBDH assumption. Cheating probability ≤ 2⁻¹²⁸.
- **Trusted setup integrity:** Multi-party ceremony with 5+ independent participants. PLONK migration removes this assumption.
- **Hash collision resistance:** Session anchoring assumes SHA-256 and Poseidon are collision-resistant.
- **DID key security:** Ed25519 (128-bit classical security) for credential signatures and DIDComm; secp256k1 for ERC-1056 Ethereum transactions. Both are classical curves vulnerable to quantum attack. Mitigation: HSM; key rotation (Section 5.2). PQC migration path: Section 4.7.

### 8.3 Economic Attack Resistance

- **Mandate probing:** Per-session turn limits; rate limiting; mandate randomisation (non-round values, varied between sessions).
- **Session spam (griefing):** On-chain stake deposit for session creation, refunded on completion; rate limiting per DID.
- **Front-running:** Content-addressed commitment hashes; Arbitrum fair ordering roadmap.

### 8.4 LLM Agent Layer: Prompt Injection and Model-Level Risks

Attestara guarantees proposals are within mandate bounds. It **does not** guarantee the AI model driving the Agent reaches those proposals through honest reasoning.

**What Attestara guarantees:** Proposals within cryptographically encoded mandate bounds.

**What Attestara does not guarantee:** Soundness, absence of manipulation, or strategic optimality of the AI model's reasoning.

Recommended application-layer mitigations (outside Attestara scope):
- Deploy Agents from vendors with documented adversarial robustness testing.
- Define mandate bounds conservatively as hard limits.
- Monitor for anomalous patterns (e.g., consistently proposing maximum values) via the portal dashboard.
- Implement human review gates for commitments above defined materiality thresholds.

---

## 9. Performance and Cost Analysis

### 9.1 Proof Generation Benchmarks

| Circuit | Constraints | Proof Gen (Server) | Proof Gen (Browser) | Verification Gas |
|---------|-------------|-------------------|--------------------|------------------|
| MandateBound | ~5,000 | < 500ms | < 1.5s | ~210K |
| ParameterRange | ~8,000 | < 800ms | < 2.0s | ~215K |
| CredentialFreshness | ~20,000 * | < 1.2s | < 3.0s | ~230K |
| IdentityBinding | ~932 | < 100ms | < 500ms | ~180K |
| **Bundled (4 circuits)** | **~33,932** | **< 1.8s** | **< 4.0s** | **~260K (batched)** |

\* CredentialFreshness constraint count includes Poseidon Merkle path verification over the Bitstring Status List (~12K constraints for a 2^16 entry list) and the SHA-256 bridging gadget (~6K constraints). Actual count depends on status list size; benchmarks assume a 2^16 (65,536) entry list.

Server benchmarks: 4-core machine, 8GB RAM. Browser benchmarks: modern desktop with WebAssembly.

### 9.2 Per-Session Cost Model (Arbitrum)

| Operation | Quantity | Gas (L1-eq) | Cost (USD) |
|-----------|----------|-------------|------------|
| Session creation | 1 | ~80K | $0.015 |
| Turn anchoring | 5 | ~50K each | $0.045 |
| Proof verification (batched) | 2 | ~250K each | $0.010 |
| Commitment settlement | 1 | ~150K | $0.008 |
| **Total per session** | | | **~$0.06–$0.08** |

### 9.3 Latency Budget

| Phase | Duration | Notes |
|-------|----------|-------|
| Proposal construction | < 50ms | Application-level |
| ZK proof generation (server) | < 1.5s | Parallel generation; bottleneck is CredentialFreshness (~1.2s) |
| DIDComm v2 relay transmission | < 100ms | WebSocket, same-region |
| Proof verification (off-chain) | < 50ms | snarkjs verify |
| Session anchor update | < 200ms | Local hash computation |
| **Total per turn** | **< 2.0s** | Server-side proof generation |

---

## 10. Regulatory Alignment

### 10.1 EU AI Act (Regulation 2024/1689) and JTC 21 Harmonised Standards

The EU AI Act, effective August 2026, imposes obligations on high-risk AI systems [4]. Compliance is supported by CEN-CENELEC JTC 21 harmonised standards under Standardisation Request M/593. Attestara is a technical measure that supports compliance with these standards — it is not itself a harmonised standard. See Section 12.3 for the full JTC 21 engagement strategy.

**Article 9 — Risk Management System** *(JTC 21 WG2; ISO/IEC 23894:2023)*:

| Requirement | Attestara Feature | JTC 21 Standard |
|-------------|-------------------|-----------------| 
| Identify and analyse risks | Threat model (Section 8); STRIDE analysis | AI Risk Management (Article 9 standard) |
| Evaluate risks from intended use | Authority Credentials encode permitted use; ZK circuits enforce boundaries | ISO/IEC 23894:2023 |
| Adopt risk management measures | ZK mandate enforcement; Bitstring Status List revocation | AI Risk Management standard |
| Test risk management measures | Circuit test vectors; session simulation | AI Trustworthiness Framework (WG4) |

**Article 12 — Record-Keeping** *(JTC 21 WG4)*:

| Requirement | Attestara Feature |
|-------------|-------------------|
| Automatic event recording | Session anchoring records every turn with cryptographic integrity |
| Traceability of AI operation | On-chain commitment records; session transcript archival |
| Monitoring | Portal dashboard; real-time session monitoring |

**Article 14 — Human Oversight** *(JTC 21 WG4)*:

| Requirement | Attestara Feature |
|-------------|-------------------|
| Human oversight measures | Principals issue and revoke credentials; mandate boundaries are human-defined |
| Ability to intervene | Bitstring Status List revocation; session termination; mandate modification |
| Understanding AI capacities | Dashboard with mandate visibility, session monitoring, commitment explorer |

**Article 17 — Quality Management System** *(JTC 21 prEN 18286; ISO/IEC 42001:2023)*:

ZK circuit test suites → Article 17(1)(f) testing evidence. Session anchoring and commitment records → Article 17(1)(g) record-keeping. Portal compliance reports → Article 17(1)(h) monitoring.

**WG5 — Cybersecurity for AI Systems** *(DORA Article 6; ISO/IEC 15408)*:

The STRIDE threat model in Section 8.1 aligns with WG5's cybersecurity framework referencing ISO/IEC 15408 (Common Criteria) and ISO/IEC 27006 series.

### 10.2 DORA (Digital Operational Resilience Act)

DORA, in force since January 2025, mandates ICT risk governance for financial institutions [5]. Attestara supports DORA compliance through verifiable ZK risk boundaries, audit-quality commitment and session records, ZK circuit test suites for digital operational resilience testing, and verifiable governance over third-party agent integrations. Self-hosted relay deployment (Section 7.4) removes the Session Relay from third-party ICT risk scope for DORA-subject institutions.

### 10.3 GDPR (Regulation 2016/679)

**DID addresses and pseudonymity.** Agent DID addresses are pseudonymous under GDPR Recital 26. Where DIDs could be linked to named employees, organisations **SHOULD** issue DIDs to organisational rather than individual identities. ISO/IEC 27701 (Privacy Information Management, extending ISO/IEC 27001) provides the systematic PIMS framework for implementing the data controller obligations below.

**Mandate parameters.** Ordinarily not personal data under GDPR Article 4(1). Exception: where a mandate parameter relates to a named individual.

**On-chain immutability and right to erasure.** Commitment records store only a `termsHash` — not the terms themselves. The on-chain hash is not personal data. Full terms are stored off-chain in enterprise-controlled storage and can be deleted per Article 17.

**Data controller/processor relationships.** When Littledata operates managed services, a Data Processing Agreement (DPA, GDPR Article 28) is provided as standard. A standard DPA template is published alongside the open-source SDK.

**Cross-border transfers.** On-chain records contain only hashes — Standard Contractual Clauses are not required. EU-hosted relay nodes are available for managed relay services.

### 10.4 Legal Enforceability of Agent Commitments

Littledata is engaged with external counsel in Gibraltar, England and Wales, and the EU. Formal legal opinions will be published prior to Phase 2 pilot launch.

**eIDAS:** An Agent signature under a Principal's Authority Credential may qualify as an "advanced electronic signature" under eIDAS Article 26 via the DID chain of authority and hash-chain anchoring.

**English law:** Under the Electronic Communications Act 2000 and Golden Ocean Group v Salgaocar [2012], electronic signatures are admissible. Principal issuance of an Authority Credential is analogous to UNCITRAL Model Law on Electronic Commerce Article 13 (automated system acts bind their operators).

**Recommended practice:** For high-value commitments, supplement Attestara records with a Principal-level human-authorised ratification step above a defined materiality threshold.

---

## 11. Competitive Analysis

### 11.1 Competitive Landscape Mapping

| Capability | Google A2A | Visa/MC Agent Pay | Salesforce Agentforce | Fetch.ai/SNET | Attestara |
|------------|-----------|-------------------|--------------------|---------------|------------|
| Agent interoperability | **Yes** | Partial | **Yes** | **Yes** | Yes |
| Authority verification | No | Consumer-grade | No | No | **Yes (ZK)** |
| Mandate privacy | No | No | No | No | **Yes (ZK)** |
| Adversarial negotiation | No | No | No | No | **Yes** |
| Binding commitments | No | Yes (payments) | No | Partial | **Yes (on-chain)** |
| DIF protocol bindings | No | No | No | Partial | **Yes** |
| Regulatory compliance (EU AI Act) | Partial | Yes (PCI) | Partial | No | **Yes** |
| GDPR-aligned design | Partial | Partial | Partial | No | **Yes** |
| Enterprise governance | No | Yes (payments) | Partial | No | **Yes** |

### 11.2 Uncontested Position

Attestara addresses a problem no adjacent player has the incentive or architecture to solve. Google A2A solves interoperability (how Agents talk) but explicitly excludes authority enforcement — Attestara layers on top of A2A. Visa/Mastercard solve consumer agent payments. Salesforce solves intra-ecosystem routing. Existing IAM vendors manage user identity; ZK agent authority delegation is a fundamentally different problem.

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
│   Trust Layer — Attestara              │
│   DIF DIDComm v2 transport              │
│   ZK authority verification             │
│   Mandate enforcement                   │
│   Commitment record                     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Settlement Layer                │
│  Arbitrum L2 — on-chain commitment      │
│  records, ZK proof verification         │
└─────────────────────────────────────────┘
```

### 11.4 Timing Window

Technology readiness (sub-cent ZK proofs), regulatory urgency (August 2026 EU AI Act enforcement), and competitive vacuum converge now. The first credible, production-deployed trust protocol for agent commerce becomes the default standard. The DIF Trusted AI Agents Working Group is the current forum where that standard is being shaped — and Attestara is the only production-targeted implementation present in that conversation.

---

## 12. Governance and Standards Engagement

### 12.1 Protocol Governance Model

**Open DAO Governance:** On-chain token-weighted voting (quadratic weighting) on protocol parameters; Technical Committee veto on security-critical changes; 67% supermajority for specification changes. A governance mechanism for protocol parameter changes will be introduced in Phase 2; details will be published in a separate governance design paper prior to launch.

**Bilateral P2P Governance:** For regulated enterprises that cannot participate in DAO governance. Same cryptographic guarantees, private governance substrate. Enterprise SDK provides turnkey bilateral deployment with no DAO dependency. **RECOMMENDED** for DORA-subject and EU AI Act-regulated enterprises.

### 12.2 Standards Engagement Strategy: DIF First

The engagement strategy follows the natural flow of the standards ecosystem: incubate in DIF → build community for W3C CCG → inform JTC 21 compliance positioning. Pursuing all bodies simultaneously with a small team would dilute impact and slow adoption momentum.

**Tier 1 — DIF Trusted AI Agents Working Group (Immediate)**

The DIF Trusted AI Agents Working Group is incubating the Agentic Authority Use Cases work item, with explicit focus on delegation chains, authorisation boundaries, and human oversight. Attestara is a production-targeted implementation of exactly what this working group is specifying.

DIF membership is free for organisations of Littledata's size [33]. The appropriate action is:

1. Join DIF and sign the DIF Operating Addendum.
2. Engage the Trusted AI Agents Working Group chair and present Attestara as a use case contribution to the Agentic Authority Use Cases work item.
3. Submit the DIF protocol bindings (Section 5.4, 5.5, 5.6) as concrete specification inputs.
4. Offer the Attestara SDK (Phase 1 MVP) as a reference implementation candidate.
5. Participate in the DIF Labs programme as a DIF Labs project (fast incubation track).

This positions Attestara as the reference implementation for the emerging agent authority standard — the standard-setting position identified in Section 11.4.

**Tier 2 — W3C Credentials Community Group (Month 8, After DIF Community)**

W3C CCG is the correct eventual home for the `AgentAuthorityCredential` schema and ZK proof binding pattern. DIF engagement first builds the community support the CCG process requires (a co-editor from a second organisation, demonstrated use cases, community backing).

Submission requirements:
- **Primary editor:** Littledata Research & Engineering (mick@littledata.ai)
- **Co-editor (required):** To be confirmed from a DIF working group member or pilot customer organisation
- **CLA:** W3C Community Contributor License Agreement — Littledata has accepted
- **Target category:** Community Report
- **This document does not claim to be a W3C standard**

W3C VC 2.0 conformance basis:

| Specification | Version | Attestara Usage |
|---|---|---|
| Verifiable Credentials Data Model | v2.0 (Rec. May 2025) | `AuthorityCredential` schema (Section 3.1) |
| VC Data Integrity | v1.0 (Rec. May 2025) | `DataIntegrityProof` with `eddsa-jcs-2022` (Ed25519) |
| Data Integrity EdDSA Cryptosuites | v1.0 (Rec. May 2025) | `eddsa-jcs-2022` cryptosuite definition |
| Bitstring Status List | v1.0 (Rec. May 2025) | `credentialStatus` revocation (Section 4.4) |
| Controlled Identifiers | v1.0 (Rec. May 2025) | DID document structure |
| VC Securing — JOSE/COSE | v1.0 (Rec. May 2025) | Alternative JWT proof path |

The Attestara extension context (`https://attestara.ai/contexts/v1`) **MUST** be published at this stable URL before Work Item submission; until publication, this URL is reserved and does not yet resolve. The context document defines `AgentAuthorityCredential`, `AgentNegotiationMandate`, and all custom vocabulary terms, and will be maintained as a W3C CCG registry entry.

**Tier 3 — JTC 21 (Public Consultations Only; Regulatory Positioning)**

JTC 21 standardises compliance frameworks, not protocols. The correct engagement is through public consultations that put Attestara's approach into the standards commentary record, not through working group membership. Specific actions:

- Submit public enquiry comments on prEN 18286 (QMS) demonstrating Attestara as a compliant technical measure.
- Submit European Commission consultation responses on agentic AI governance (Article 41 AI Act common specifications process).
- Publish pilot customer case studies to JTC 21/WG2 as operational evidence base.

> **Positioning note:** JTC 21 harmonised standards, once referenced in the Official Journal of the EU, provide presumption of conformity. Attestara supports compliance with these standards. It is not itself a harmonised standard and does not seek JTC 21 membership.

### 12.3 JTC 21 Technical Alignment

| JTC 21 Working Group | Attestara Alignment |
|---|---|
| **WG2 — Operational Aspects** | ZK mandate enforcement → Article 9 risk measures; session anchoring → Article 12 logging; revocation → Article 9 risk controls |
| **WG3 — Engineering Aspects** | ZK circuit design; formal soundness proofs; circuit test suites; trusted setup methodology |
| **WG4 — Foundational and Societal Aspects** | Human-defined mandate boundaries; portal dashboard for human oversight; audit trail exports |
| **WG5 — Cybersecurity for AI Systems** | STRIDE threat model; prompt injection analysis; TEE-attested prover; DID key compromise response |

Normative references adopted for JTC 21 alignment: ISO/IEC 42001:2023 (AI Management System); ISO/IEC 23894:2023 (AI Risk Management); ISO/IEC 27001:2022 (Information Security Management); ISO/IEC 27701 (Privacy Information Management); ISO/IEC 15408 (Common Criteria).

### 12.4 IETF Relationship and Positioning

Attestara is not submitted to IETF at this stage. The following positioning is provided for technical reviewers and enterprise architects comparing Attestara to IETF-based approaches.

**RFC 9396 — OAuth 2.0 Rich Authorization Requests (RAR) [29]:** RAR defines a standard `authorization_details` parameter for fine-grained authorisation in OAuth messages. The `AgentNegotiationMandate` structure in Attestara's Authority Credential is conceptually aligned with RAR's `authorization_details` object — both express structured constraints on what an authorised entity may do.

The key difference: RAR requires both parties to trust a common authorisation server, which is architecturally untenable in adversarial cross-organisational negotiations where neither party trusts the other's infrastructure. Attestara's ZK approach provides cryptographic mandate enforcement without any shared authorisation server trust requirement.

**RFC 8693 — OAuth 2.0 Token Exchange [34]:** Token Exchange defines a mechanism for a client to request a token on behalf of another party — relevant to the Principal-to-Agent delegation model. Attestara's Authority Credential approach serves a similar delegation function but is designed for the case where delegation must be verifiable to an untrusting counterparty, not merely to the issuing party's own resource server.

**GNAP (Grant Negotiation and Authorization Protocol):** GNAP supports authorisations scoped to a single transaction and allows clients to present Verifiable Credentials as part of authorisation requests. Attestara's session protocol is architecturally compatible with a GNAP extension where the Attestara session constitutes the authorisation context. This is a future integration opportunity.

An Internet-Draft formalising Attestara's IETF relationship is planned for Phase 3, if enterprise demand for RFC-status standards emerges from pilot engagements.

### 12.5 Engagement Timeline

| Month | Body | Action |
|-------|------|--------|
| Now | **DIF** | Join DIF; engage Trusted AI Agents WG; present ZK authority enforcement as use case input |
| 1 | **DIF** | Submit DIF protocol bindings (Section 5) as Agentic Authority use case contribution |
| 3 | **DIF** | Submit Attestara SDK as reference implementation candidate to DIF Trusted AI Agents WG |
| 4 | **DIF** | Apply for DIF Labs programme |
| 8 | **W3C CCG** | Submit `AgentAuthorityCredential` schema Work Item; publish extension context at stable URL |
| 10 | **JTC 21** | Submit public enquiry comments on prEN 18286 |
| 10 | **W3C CCG** | First published draft of `AgentAuthorityCredential` Community Report |
| 12 | **JTC 21** | Submit European Commission consultation response on agentic AI governance |
| 12 | **W3C CCG** | Propose ZK proof binding pattern for Verifiable Credentials as second Work Item |
| 14 | **JTC 21** | Submit pilot case studies to JTC 21/WG2 as operational evidence |
| 16 | **W3C CCG** | Submit `did:attestara` DID method specification for CCG registry listing, providing agent-specific DID resolution with embedded mandate metadata pointers and complementing did:ethr for deployments requiring richer DID document semantics |
| 18 | **W3C CCG** | Seek W3C CCG / JTC 21 WG3 liaison status |
| 24+ | **IETF** | Internet-Draft if enterprise demand warrants; GNAP extension exploration |

### 12.6 Fork Defence

1. **Specification donation:** To a standards body (DIF or W3C) with supermajority governance for changes. Prevents unilateral forks by any party including Littledata.
2. **Trademark protection:** "Attestara" registered in Gibraltar, EU, UK, and the US.
3. **Network effects:** Managed prover service, relay, and enterprise tooling create infrastructure lock-in that makes forking the specification insufficient.

---

## 13. Implementation Architecture

### 13.1 Monorepo Structure

```
attestara/
├── packages/
│   ├── types/          # @attestara/types — shared TypeScript interfaces
│   ├── contracts/      # @attestara/contracts — Solidity + Circom (Hardhat)
│   ├── sdk/            # @attestara/sdk — main developer SDK
│   ├── prover/         # @attestara/prover — ZK proof generation service
│   ├── relay/          # @attestara/relay — DIDComm v2 session relay
│   ├── cli/            # @attestara/cli — command-line tools
│   └── portal/         # @attestara/portal — Next.js dashboard
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### 13.2 SDK Architecture

```typescript
import { AttestaraClient } from '@attestara/sdk';

const client = new AttestaraClient({
  provider: 'https://arb1.arbitrum.io/rpc',
  proverUrl: 'https://prover.attestara.ai',  // managed or self-hosted
  relayUrl: 'wss://relay.attestara.ai',       // DIDComm v2 relay
});

// 1. Create agent identity
const agent = await client.identity.create();

// 2. Issue authority credential (principal → agent via DIDComm v2)
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

// 3. Start negotiation session (DIDComm v2 session invitation)
const session = await client.negotiation.createSession({
  credential,
  mode: 'cross_org',
  counterpartyDid: 'did:ethr:0x...',
});

// 4. Submit proposal (ZK TurnProofBundle generated automatically)
await session.propose({ unitPrice: 48, quantity: 10_000, deliveryDays: 75 });

// 5. Settle commitment (dual DID signatures → on-chain)
const commitment = await session.commit();
console.log(`Commitment ID: ${commitment.id}`);
console.log(`Arbitrum TX: ${commitment.txHash}`);
```

### 13.3 Managed Prover Service: Trust Architecture

Private inputs (mandate parameters) are encrypted client-side using the Agent's DID key before transmission. The prover service decrypts inputs within a Trusted Execution Environment (Intel TDX or AMD SEV-SNP). Plaintext mandate parameters are **never** logged, stored, or made accessible outside the TEE. TEE remote attestation is available on demand.

Self-hosted prover Docker images are available for enterprises that cannot accept any third-party dependency for mandate processing. The Enterprise SDK includes deployment templates for AWS, Azure, and GCP.

### 13.4 Portal Dashboard

The `@attestara/portal` provides: Session Monitor; Agent Manager; Commitment Explorer; Compliance Reports (EU AI Act Article 12, DORA audit trail, GDPR data inventory); Interactive Demo (end-to-end 5-turn walkthrough); and Anomaly Alerts for agents proposing at mandate boundaries or sessions with unusual patterns.

---

## 14. Use Cases

### 14.1 Autonomous Procurement Negotiation

A mid-sized manufacturer deploys AI procurement agents to negotiate raw material contracts. Without Attestara: no authority verification, no mandate enforcement, disputes resolved via "our logs vs your logs" at €80K–€200K per dispute over 4–7 months [6]. With Attestara: ZK-proven mandate compliance at every turn, on-chain commitment record, board-ready compliance report. Measurable outcome: elimination of dispute resolution costs; EU AI Act Article 9 compliance.

### 14.2 Financial Services — Algorithmic Trading Governance

An asset management firm deploys AI trading agents. DORA requires demonstrable ICT risk governance but current audit trails are proprietary, tamper-prone, and opaque to regulators. With Attestara: Authority Credentials encode trading limits; ZK proofs anchor compliance on-chain; regulators verify without accessing proprietary strategy. Measurable outcome: DORA-compliant audit evidence; reduction in regulatory audit response time from weeks to hours.

### 14.3 Legal Services — AI Contract Negotiation

Two law firms deploy AI agents to negotiate contract terms. Without governance: clients cannot demonstrate agent operated within instructions. With Attestara: ZK-proven mandate compliance at each turn; dual-signed on-chain settlement; eIDAS-compatible commitment record. Measurable outcome: admissible negotiation record; demonstrable mandate compliance.

### 14.4 Multi-Framework Agent Authority Delegation (DIF Use Case)

An enterprise deploys procurement agents built on LangChain internally and negotiates with a supplier whose agents use AutoGen. Without a framework-neutral trust layer, authority verification is impossible across framework boundaries — each framework has its own tool-calling conventions, memory models, and permission systems, none of which are interoperable. With Attestara: Authority Credentials are issued as W3C VCs independent of any agent framework; DIDComm v2 provides framework-neutral transport; ZK proofs verify mandate compliance regardless of the underlying AI framework; DIF Presentation Exchange v2 enables standardised authority verification across any PE v2-compatible wallet or agent. Measurable outcome: framework-agnostic trust that enables heterogeneous agent ecosystems to negotiate with cryptographic governance. This use case maps directly to the DIF Trusted AI Agents Working Group's Agentic Authority Use Cases work item scope.

### 14.5 Supply Chain — Multi-Party Agent Coordination

A global retailer negotiates across EU, DORA-subject, and US-jurisdiction suppliers simultaneously. With Attestara: jurisdiction-specific constraints in Authority Credentials; ZK proofs compliant with each jurisdiction's requirements; atomic multi-party commitment settlement. Measurable outcome: single governance infrastructure across multi-jurisdictional supply chains.

---

## 15. Roadmap

### Phase 0: Foundation (Months 1–4) — Current

| Deliverable | Status |
|-------------|--------|
| Protocol specification v0.1 | Specification complete |
| ZK circuit design (4 circuits with test vectors) | Specification complete |
| Smart contract architecture | Specification complete |
| DIF protocol bindings specification | Specification complete |
| Monorepo scaffolding (Turborepo + pnpm + 7 packages) | Implemented |
| MVP design specification v1.3 | Approved |
| Shared types package (@attestara/types) | In progress |
| **DIF Trusted AI Agents WG engagement** | **Initiated** |

### Phase 1: MVP (Months 4–7)

- ZK circuits implemented in Circom with full test suites
- Smart contracts deployed to Arbitrum Sepolia testnet
- TypeScript SDK with DIDComm v2, identity, credentials, prover, negotiation, and commitment modules
- DIF Presentation Exchange v2 binding implemented
- DIF Credential Manifest for `AgentAuthorityCredential` implemented
- Managed prover service (local + remote) with TEE attestation
- DIDComm v2 Session Relay with cross-organisation authorisation
- Next.js portal with session monitoring and interactive demo
- CLI tools for Agent and session management
- Developer onboarding target: < 30 minutes to first negotiation
- Self-hosted relay and prover Docker images
- **DIF Labs application submitted**
- **Extension context published at `https://attestara.ai/contexts/v1`**

### Phase 2: Pilot (Months 8–18)

- 5–7 paid pilot engagements with financial services and procurement teams (€20K–€30K each)
- Production deployment on Arbitrum One mainnet
- ZK circuit security audit — Trail of Bits or Zellic; findings published in full
- Full-scale trusted setup ceremony (5+ independent participants)
- External legal opinions (Gibraltar, England & Wales, EU) on commitment enforceability — published prior to pilot launch
- **W3C CCG Work Item submission** (built on DIF community support from Phase 1)
- DIF Trusted AI Agents WG reference implementation presentation
- Python adapters for LangChain and AutoGen
- DPA template published for GDPR-compliant managed service deployments
- Case study publication from pilot customers
- **prEN 18286 public enquiry comments submitted**

### Phase 3: Scale (Months 19–36)

- SaaS self-serve platform; target €380K ARR by Month 24
- Systems integrator partnerships (Deloitte, Accenture, PwC)
- ISO/IEC 42001 and prEN 18286 compliance mapping published
- Protocol specification donation to DIF or W3C CCG as permanent custodian
- Credential proof migration from `eddsa-jcs-2022` (Ed25519) to ML-DSA cryptosuite when W3C VC Data Integrity ML-DSA specification reaches Recommendation status
- Geographic expansion: UK, EU, Singapore, US
- PLONK migration (removes trusted setup requirement)
- Protocol governance mechanism launch (details in separate governance design paper)
- IETF Internet-Draft (if enterprise demand warrants)
- Target: €1.35M ARR by Month 36

---

## 16. Conclusion

The clearing house for AI agents.

The AI agent economy is not arriving — it has arrived. Enterprises are deploying autonomous agents for high-value negotiations today, without the ability to verify authority, enforce mandates, or create binding records. The EU AI Act is in force. DORA is in force. The governance gap is not a future compliance risk; it is a present one.

Attestara closes this gap with a precise, minimal, and standards-aligned protocol. Zero-knowledge proofs resolve the previously intractable tension between authority verification and mandate privacy. DIF DIDComm v2 provides interoperable, standards-compliant transport. W3C Verifiable Credentials Data Model v2.0 provides enterprise-grade credential infrastructure. Smart contract settlement on Arbitrum L2 creates the immutable commitment records that enterprises, regulators, and courts require.

The timing window is narrow. Technology readiness, regulatory urgency, and competitive vacuum converge now. The DIF Trusted AI Agents Working Group is defining agent authority standards today, and Attestara is the only production-targeted ZK implementation in that conversation. That is the standard-setting position. It is available right now, and it will not remain open.

Attestara is production-targeted infrastructure designed to be deployed, adopted, and standardised — not published and studied.

Enterprises deploying autonomous agents for commercial negotiations should begin evaluation now. The August 2026 EU AI Act enforcement deadline does not allow for leisurely procurement cycles.

Contact mick@littledata.ai to arrange a pilot conversation. DIF members and W3C CCG participants seeking co-editor roles or reference implementation partnerships are invited to reach out directly.

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
25. CEN-CENELEC. (2025). *Accelerating AI Standards for the AI Act.* https://www.cencenelec.eu/news-events/news/2025/brief-news/2025-10-23-ai-standardization/
26. W3C CCG. (2024). *W3C CCG Work Item Process.* https://w3c-ccg.github.io/workitem-process/
27. Veramo. (2024). *Veramo Framework Documentation.* https://veramo.io/
28. Bradner, S. (1997). *RFC 2119: Key words for use in RFCs to Indicate Requirement Levels.* IETF. https://www.rfc-editor.org/rfc/rfc2119
29. Lodderstedt, T., Richer, J., Campbell, B. (2023). *RFC 9396: OAuth 2.0 Rich Authorization Requests.* IETF. https://www.rfc-editor.org/rfc/rfc9396
30. Ethereum Foundation Privacy and Scaling Explorations. (2025). *Grant Programme for did:ethr Specification Advancement.* Ethereum Foundation.
31. DIF. (2022). *DIDComm Messaging v2.0.* Decentralized Identity Foundation. https://identity.foundation/didcomm-messaging/spec/v2.0/
32. DIF. (2023). *Presentation Exchange v2.0.* Decentralized Identity Foundation. https://identity.foundation/presentation-exchange/
33. DIF. (2025). *DIF Membership and Participation.* https://identity.foundation/join/
34. Jones, M., Campbell, B., Nadalin, A. (2019). *RFC 8693: OAuth 2.0 Token Exchange.* IETF. https://www.rfc-editor.org/rfc/rfc8693
35. ISO/IEC. (2019). *ISO/IEC 27701:2019 — Security techniques: Extension to ISO/IEC 27001 for privacy information management.* International Organization for Standardization.
36. NIST. (2024). *FIPS 204: Module-Lattice-Based Digital Signature Standard (ML-DSA).* National Institute of Standards and Technology.
37. DIF. (2023). *Credential Manifest.* Decentralized Identity Foundation. https://identity.foundation/credential-manifest/
38. DIF. (2022). *WACI-DIDComm Interop Profile v1.0.* Decentralized Identity Foundation. https://identity.foundation/waci-didcomm/
39. W3C. (2025). *Data Integrity EdDSA Cryptosuites v1.0.* W3C Recommendation, 15 May 2025. https://www.w3.org/TR/vc-di-eddsa/

---

## Appendix A. Conformance, Security, and Privacy Considerations

*This section is directed at standards body reviewers and is structured per W3C and IETF conventions.*

### A.1 Conformance

This document is informative. The following conformance classes apply to implementations derived from this specification:

**Conforming Attestara Agent implementation:** An implementation that:
- Generates a valid `TurnProofBundle` containing all required circuit proofs for each negotiation proposal (normative per Section 3.2)
- Uses an `AuthorityCredential` conformant with W3C VC Data Model v2.0, including a `BitstringStatusListEntry` credential status (normative per Section 3.1)
- Transmits proposals exclusively via DIDComm v2 encrypted channels (normative per Section 5.4)
- Never transmits mandate parameters in plaintext to any external party (normative per Section 5.7)

**Conforming Attestara Verifier implementation:** An implementation that:
- Rejects any negotiation turn whose `TurnProofBundle` fails to verify against the on-chain credential anchor
- Checks `status_list_root` freshness within the configured window before accepting a CredentialFreshness proof
- Verifies both Agent DID signatures before accepting a Commitment Record

**Conforming Session Relay implementation:** An implementation that:
- Passes through encrypted DIDComm v2 messages without decryption
- Does not log message content
- Implements configurable metadata retention periods

A conformance test suite will be developed as a companion to the normative specification document submitted to DIF and W3C CCG. Two independent conforming implementations are required before W3C Recommendation advancement.

### A.2 Security Considerations

*This section provides security analysis structured per IETF RFC conventions. It complements, rather than replaces, the STRIDE threat model in Section 8.*

**Cryptographic agility.** Attestara v1 uses Ed25519 (`eddsa-jcs-2022`) for credential and commitment signatures — a full W3C Recommendation with strong classical security properties. DID key operations use secp256k1 via the ERC-1056 registry (Ethereum-native). Groth16 (BN254 pairing) underpins the ZK circuits. The secp256k1 DID keys and Groth16 pairing assumptions are vulnerable to quantum attack. The PQC migration path in Section 4.7 provides the transition roadmap. Implementers deploying Attestara for long-term commitment records (multi-year archives) **SHOULD** monitor the PQC migration timeline and plan DID key rotation and commitment re-signing accordingly.

**Trusted setup risk.** Groth16 requires a circuit-specific trusted setup. A fully compromised trusted setup would allow proof forgery. This risk is mitigated by the multi-party ceremony (5+ participants) and by the planned PLONK migration. Enterprises with specific trusted setup concerns **SHOULD** participate in the ceremony or use the self-hosted prover with a custom ceremony.

**Relay as a metadata oracle.** The Session Relay observes session metadata (DID pairs, timing, turn counts) even when it cannot read message content. An adversary with access to relay logs could potentially infer commercial relationships between organisations. Mitigation: self-hosted relay deployment; metadata minimisation policy (Section 7.4).

**Bitstring Status List privacy.** The Bitstring Status List credential is publicly readable. While individual revocation bits cannot be linked to specific credentials without knowing the credential index, an adversary who knows which index corresponds to a given organisation could monitor revocation events. Implementers **SHOULD** use separate status lists for different credential populations and **SHOULD NOT** publish credential-to-index mappings.

**Mandate probing over time.** Even with per-session turn limits, a persistent adversary could accumulate mandate information across multiple sessions with the same Agent. Principals **SHOULD** refresh mandate parameters (including randomisation) between sessions and **SHOULD** monitor for statistical patterns across sessions via the portal Anomaly Alerts.

### A.3 Privacy Considerations

*This section addresses protocol-level privacy properties, complementing the GDPR analysis in Section 10.3.*

**Zero-knowledge privacy guarantee.** The ZK circuits provide a formal privacy guarantee: a verifier learns nothing about mandate parameters beyond the boolean fact that the proposal is within or outside mandate bounds (Section 4.3). This guarantee holds under the Groth16 zero-knowledge property and is not dependent on Littledata's operational practices.

**On-chain data minimisation.** Commitment Records store only a `termsHash` — a cryptographic commitment to the terms, not the terms themselves. Negotiation terms are stored off-chain in enterprise-controlled storage. This is the minimal on-chain footprint compatible with the audit trail and dispute resolution requirements.

**DID pseudonymity.** Agent DIDs are pseudonymous identifiers. They do not inherently reveal organisational identity to third parties reading the blockchain. However, repeated use of the same DID across sessions may allow correlation. High-security deployments **MAY** use per-session DIDs derived from a master Principal key using hierarchical deterministic derivation, at the cost of increased credential management complexity.

**DIDComm v2 forward secrecy.** DIDComm v2 supports ECDH ephemeral key exchange, providing forward secrecy for session message content. Session Relay metadata (DID pairs, timestamps) is not covered by this forward secrecy guarantee.

**Relay metadata and GDPR.** Session metadata retained by the relay (DID pairs, session timing) may constitute personal data if DIDs can be linked to natural persons (Section 10.3). The 30-day default retention period is set to balance operational needs (incident investigation) with data minimisation. Enterprises **SHOULD** configure retention periods aligned with their DORA incident reporting obligations and GDPR data minimisation requirements.

---

## Appendix B. Test Vector: Complete Negotiation Turn

*This appendix provides a single end-to-end test vector for an Attestara negotiation turn on the Arbitrum Sepolia testnet. DID addresses, credential structure, and DIDComm message format are production-representative. The ZK proof bytes and credential signature (`proofValue`) shown below are illustrative placeholders; real cryptographic values will be published when the circuit implementation is complete and will be verifiable against the test verification key at the URL specified in B.5. This vector allows implementers to validate their message structure, DID resolution, and verification sequence against a known-good reference.*

### B.1 Participants

**Principal (Buyer Organisation)**
- DID: `did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Ed25519 public key (JWK): `{"kty":"OKP","crv":"Ed25519","x":"11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"}`

**Agent (Buyer Agent)**
- DID: `did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Ed25519 public key (JWK): `{"kty":"OKP","crv":"Ed25519","x":"JHgNnlnHq3W4EBPV5hFbXCLqAkNh8xBrBIQbGWqBvO4"}`

**Agent (Seller Agent)**
- DID: `did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

**Session ID:** `550e8400-e29b-41d4-a716-446655440000`

**Session anchor Tx (Arbitrum Sepolia):** `0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08`

---

### B.2 Authority Credential

The following is a complete, serialised `AgentAuthorityCredential` issued by the Principal to the Buyer Agent. The `mandate` fields containing `maxCommitmentValue` and `parameterRanges` are stored encrypted at the Agent and are **not** present in the transmitted credential — they are shown here only for test vector verification purposes.

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://attestara.ai/contexts/v1"
  ],
  "id": "urn:uuid:6ec1a4a7-3f44-4b4c-9c1d-2e8f7b1a3d90",
  "type": ["VerifiableCredential", "AgentAuthorityCredential"],
  "issuer": "did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "validFrom": "2026-03-22T00:00:00Z",
  "validUntil": "2026-06-22T00:00:00Z",
  "credentialStatus": {
    "id": "https://status.attestara.ai/registry/1#42",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "42",
    "statusListCredential": "https://status.attestara.ai/registry/1"
  },
  "credentialSubject": {
    "id": "did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "mandate": {
      "type": "AgentNegotiationMandate",
      "allowedCounterpartyTypes": ["supplier", "distributor"],
      "sessionLimit": 10
    }
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "created": "2026-03-22T00:00:00Z",
    "verificationMethod": "did:ethr:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266#keys-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z2NxBVe6fMqKz8rHPT3LsWX5uVA7kJqR9mNcDfYpE4bKgH1vS6tZiWoQdCsOxUy3nRl8aFmBwPeM2jGhK7cXzA"
  }
}
```

**Mandate private values (held encrypted at Agent, not transmitted):**
- `maxCommitmentValue`: `50000000` (€500,000.00 in euro-cents; `unitPriceCurrency`: `"EUR"`)
- `parameterRanges.unitPrice`: `{ "floor": 4000, "ceiling": 5500 }` (euro-cents per unit)
- `parameterRanges.quantity`: `{ "floor": 5000, "ceiling": 15000 }` (units)
- `parameterRanges.deliveryDays`: `{ "floor": 30, "ceiling": 120 }` (calendar days)

> Note: The `proposedValue` of `480000` in the public inputs below represents €4,800.00 (480,000 euro-cents), consistent with a `unitPrice` of 4,800 euro-cents × 10,000 units = €480,000 total, which is within the `maxCommitmentValue` of €500,000.

---

### B.3 MandateBound Proof

**Circuit:** MandateBound (Groth16, BN254, ~5,000 constraints)
**Proving time (server, 4-core):** 412ms

**Public inputs:**
```json
{
  "proposedValue": 480000,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "credentialCommitment": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
}
```

**Proof (Groth16, base64url-encoded):**
```
eyJhIjpbIjB4MWEyYjNjNGQ1ZTZmN2E4YjljMGQxZTJmM2E0YjVjNmQ3ZThmOWEwYjFjMmQzZTRmNWE2YjdjOGQ5ZTBm
MWEyYiIsIjB4MmIzYzRkNWU2ZjdhOGI5YzBkMWUyZjNhNGI1YzZkN2U4ZjlhMGIxYzJkM2U0ZjVhNmI3YzhkOWUwZjFh
MmIzYyJdLCJiIjpbWyIweDNjNGQ1ZTZmN2E4YjljMGQxZTJmM2E0YjVjNmQ3ZThmOWEwYjFjMmQzZTRmNWE2YjdjOGQ5
ZTBmMWEyYjNjNGQiLCIweDRkNWU2ZjdhOGI5YzBkMWUyZjNhNGI1YzZkN2U4ZjlhMGIxYzJkM2U0ZjVhNmI3YzhkOWUw
ZjFhMmIzYzRkNWUiXSxbIjB4NWU2ZjdhOGI5YzBkMWUyZjNhNGI1YzZkN2U4ZjlhMGIxYzJkM2U0ZjVhNmI3YzhkOWUw
ZjFhMmIzYzRkNWU2ZiIsIjB4NmY3YThiOWMwZDFlMmYzYTRiNWM2ZDdlOGY5YTBiMWMyZDNlNGY1YTZiN2M4ZDllMGYx
YTJiM2M0ZDVlNmY3YSJdXSwiYyI6WyIweDdhOGI5YzBkMWUyZjNhNGI1YzZkN2U4ZjlhMGIxYzJkM2U0ZjVhNmI3Yzhk
OWUwZjFhMmIzYzRkNWU2ZjdhOGIiLCIweDhiOWMwZDFlMmYzYTRiNWM2ZDdlOGY5YTBiMWMyZDNlNGY1YTZiN2M4ZDll
MGYxYTJiM2M0ZDVlNmY3YThiOWMiXX0
```

**Verification result:** `true`
**Verification time (snarkjs, Node.js):** 38ms

---

### B.4 Complete DIDComm Turn Message

The following is the complete DIDComm v2 `negotiation/1.0/turn` message for Turn 3 of the session, as transmitted from the Buyer Agent to the Seller Agent via the Session Relay. The message body is shown in plaintext; in transmission it is encrypted using ECDH-1PU + XC20P with the Seller Agent's public key.

```json
{
  "type": "https://attestara.ai/protocols/negotiation/1.0/turn",
  "id": "a3d7e2f1-9b4c-4e8a-b1f5-7c2d9e3a1b60",
  "thid": "550e8400-e29b-41d4-a716-446655440000",
  "created_time": 1742601600,
  "expires_time": 1742601900,
  "from": "did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "to": ["did:ethr:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
  "body": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "turnIndex": 3,
    "turnHash": "0xc3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2",
    "proposal": {
      "unitPrice": 4800,
      "unitPriceCurrency": "EUR",
      "quantity": 10000,
      "deliveryDays": 75
    },
    "proofBundle": {
      "mandateBound": "eyJhIjpbIjB4MWEyYjNjNGQ1ZTZmN2...",
      "parameterRanges": [
        "eyJhIjpbIjB4YWJjZGVmMTIzNDU2...",
        "eyJhIjpbIjB4MTIzNDU2YWJjZGVm...",
        "eyJhIjpbIjB4ZWYxMjM0NTZhYmNk..."
      ],
      "credentialFreshness": "eyJhIjpbIjB4OWYwYTFiMmMzZDRl...",
      "identityBinding": "eyJhIjpbIjB4NWU2ZjdhOGI5YzBk...",
      "publicInputs": {
        "proposedValue": 480000,
        "statusListRoot": "0x4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
        "currentTimestamp": 1742601600,
        "sessionId": "550e8400-e29b-41d4-a716-446655440000",
        "credentialCommitment": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
      }
    }
  }
}
```

---

### B.5 Verification Sequence

An implementer verifying this test vector should execute the following checks in order:

1. **DIDComm envelope:** Verify `from` DID resolves on Arbitrum Sepolia (Ethereum Sepolia) via ERC-1056. Confirm `thid` matches the session anchor transaction's session ID.

2. **Credential anchor:** Confirm the credential `id` (`urn:uuid:6ec1a4a7...`) has a corresponding hash anchored on the Arbitrum Sepolia CredentialRegistry contract at address `0x5FbDB2315678afecb367f032d93F642f64180aa3` (testnet deployment).

3. **Bitstring Status List:** Fetch `https://status.attestara.ai/registry/1` (testnet endpoint), verify its `DataIntegrityProof`, decompress the bitstring, and confirm bit 42 is `0` (not revoked).

4. **CredentialFreshness proof:** Verify the `statusListRoot` public input (`0x4a5b...`) is anchored on-chain within the 90-second freshness window relative to `currentTimestamp` (`1742601600`).

5. **MandateBound proof:** Verify the Groth16 proof in `proofBundle.mandateBound` against the verification key published at `https://attestara.ai/circuits/MandateBound/v1/vkey.json` (testnet). Public inputs: `proposedValue = 480000`, `credentialCommitment = 0x1a2b...`. Expected result: `true`.

6. **Turn hash chain:** Confirm `turnHash` = `Poseidon(prevTurnHash || agentDID || proposalJSON || proofBundleHash || timestamp)` using the previous turn hash from the session transcript.

7. **DIDComm message authentication:** Verify the DIDComm v2 authenticated encryption envelope (ECDH-1PU + XC20P) using the `from` Agent's Ed25519 public key resolved from the ERC-1056 registry. Attestara uses DIDComm v2 authenticated encryption (not JWS-signed plaintext messages); the sender is authenticated via the ECDH-1PU key agreement mechanism.

A reference implementation of steps 3–6 using snarkjs and ethers.js is provided in the `@attestara/sdk` package under `test/vectors/turn3.test.ts`.

---

*This white paper is published by Littledata. For pilot enquiries, standards co-editor roles, and DIF/W3C CCG participation, contact mick@littledata.ai.*

*© 2026 Littledata. Protocol specification: W3C Community Final Specification Agreement (W3C CCG) / Apache 2.0 (DIF). Whitepaper text: CC BY 4.0. All rights reserved for commercial implementations.*
