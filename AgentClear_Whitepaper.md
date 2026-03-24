# Attestara: A Cryptographic Trust Protocol for Autonomous AI Agent Commerce

**Version 1.0 — March 2026**

**Authors:** littledata Research & Engineering

**Contact:** mick@littledata.ai

---

## Abstract

The rapid deployment of autonomous AI agents in enterprise commerce — procurement negotiation, supply-chain management, financial transactions — has created a fundamental governance gap. When two AI agents from competing organisations negotiate, no infrastructure exists to verify that either agent has authority to act, that its proposals fall within its mandate, or that the resulting agreement is auditable and enforceable. This paper introduces **Attestara**, an open cryptographic trust protocol that enables AI agents to negotiate, commit, and be held accountable across organisational boundaries without requiring inter-party trust. Attestara combines zero-knowledge proofs (Groth16/Circom), W3C Verifiable Credentials, and smart contract settlement (Arbitrum L2) to deliver three guarantees: authority verification without mandate disclosure, tamper-proof negotiation audit trails, and binding on-chain commitment records. We present the protocol architecture, formal threat model, performance analysis, and regulatory alignment with the EU AI Act and DORA. Attestara occupies an uncontested market position — no existing solution addresses B2B adversarial agent negotiation with privacy-preserving mandate enforcement and cryptographically binding settlement.

**Keywords:** AI agents, zero-knowledge proofs, verifiable credentials, decentralised identity, smart contracts, agent governance, EU AI Act, DORA, agentic commerce

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

The analogy is precise: in 1832, the London Clearing House solved the same problem for banks that Attestara solves for AI agents. Before clearing houses, every interbank obligation required bilateral trust — one bank had to believe the other would honour its commitments. The clearing house eliminated that requirement by interposing a neutral, rule-governed infrastructure layer that verified obligations, enforced settlement, and maintained auditable records.

Today, AI agents face an identical trust vacuum. Enterprises are deploying autonomous agents that negotiate contracts, commit to supply agreements, and execute financial transactions — often with multi-million-dollar consequences. Yet the infrastructure to govern these interactions does not exist. When Agent A proposes terms to Agent B, Agent B has no way to verify:

- **Authority:** Was Agent A actually authorised to make this proposal?
- **Mandate compliance:** Does the proposal fall within Agent A's permitted negotiation parameters?
- **Commitment integrity:** If they reach agreement, is there a tamper-proof record of what was agreed?
- **Auditability:** Can regulators, principals, or counterparties independently verify the negotiation history?

Attestara is a cryptographic trust protocol that answers all four questions. It enables AI agents to prove they are operating within their authority mandate — without revealing the mandate itself — and to create binding, auditable commitment records when they reach agreement.

The protocol is designed for a world where AI agents are not just tools but economic actors — entities that negotiate, commit, and must be held accountable.

### 1.1 Design Principles

Attestara is built on five foundational principles:

1. **Privacy-preserving verification.** An agent should be able to prove it has authority to act without revealing the boundaries of that authority. A buyer's agent should not need to disclose its maximum price to prove it hasn't exceeded it.

2. **Cryptographic certainty over institutional trust.** Verification should not depend on trusting the counterparty's organisation, IT infrastructure, or governance processes. Mathematical proof replaces organisational trust.

3. **Regulatory readiness by design.** The protocol should satisfy the logging, transparency, human oversight, and audit trail requirements of the EU AI Act (Article 9), DORA, and emerging AI governance frameworks — not as an afterthought, but as a core architectural property.

4. **Open protocol, commercial infrastructure.** The specification and core cryptographic primitives should be open and standardisable. Commercial value is captured through reference implementations, managed services, and enterprise tooling.

5. **Incremental adoption.** Enterprises should be able to adopt Attestara for bilateral agent interactions without requiring ecosystem-wide coordination. The protocol should work between two parties before it works between two hundred.

---

## 2. The Governance Gap in Agentic Commerce

### 2.1 The Scale of Agentic Commerce

The deployment of autonomous AI agents in enterprise commerce is accelerating:

| Metric | Current | Projected |
|--------|---------|-----------|
| Global AI agents market | $5.4B (2024) | $236B (2034) |
| Agentic commerce volume | Emerging | $5T globally (2030) |
| Enterprise AI governance software | Fastest-growing compliance category | — |
| EU AI Act high-risk system registrations | — | Mandatory from August 2026 |

These agents are not performing simple lookups or generating reports. They are negotiating procurement contracts, managing supply-chain logistics, executing financial transactions, and making commitment decisions with real economic consequences.

### 2.2 Four Dimensions of the Governance Gap

**Dimension 1: Authority Verification.** When Agent A sends a proposal to Agent B, Agent B receives an API call. There is no mechanism to verify that Agent A was authorised to make that proposal, that its authorisation is current, or that the authorising principal (human or organisation) intended the proposal's terms. The counterparty must trust the other organisation's internal governance — a trust assumption that breaks down in adversarial or competitive contexts.

**Dimension 2: Mandate Enforcement.** Even if authority can be established, there is no mechanism to enforce mandate boundaries. A principal may intend to cap its agent's negotiation at €500K, but there is no cryptographic constraint preventing the agent from proposing €600K. Mandate enforcement today relies on application-level guardrails — if-then rules in code that can be misconfigured, bypassed, or undermined by prompt injection.

**Dimension 3: Audit Trail Integrity.** Regulators increasingly require demonstrable governance over AI-driven decisions. The EU AI Act (Article 9) mandates risk management systems, logging, and human oversight for high-risk AI systems. DORA requires ICT risk governance for financial services. Yet agent-to-agent negotiations typically exist only as ephemeral API calls — there is no immutable, timestamped, independently verifiable record of what was proposed, counter-proposed, and agreed.

**Dimension 4: Commitment Binding.** When two agents reach agreement, the "contract" exists as a JSON object in one or both organisations' databases. There is no neutral, tamper-proof record. There is no dual-signature mechanism. There is no independent verification that both parties agreed to the same terms. Disputes reduce to "our logs say X; your logs say Y."

### 2.3 Why Existing Solutions Don't Work

Current approaches to AI agent governance fail because they address the wrong layer of the problem:

- **API authentication (OAuth, API keys)** verifies that a request comes from a known system, not that the agent has authority to make a specific proposal.
- **Role-based access control (RBAC)** constrains what an agent can access, not what it can negotiate or commit to.
- **Agent frameworks (LangChain, AutoGen, CrewAI)** provide orchestration and tool use, not cross-organisational trust.
- **Interoperability protocols (Google A2A, MCP)** solve agent discovery and communication format, not authority verification or commitment binding.

The governance gap exists at a layer that none of these solutions address: the intersection of cryptographic identity, mandate-bound authority, and verifiable commitment.

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

The credential is signed by the principal's DID key and can be verified by any party with access to the Ethereum state (via the ERC-1056 registry). Critically, the credential's mandate parameters are private — they are never disclosed to counterparties. They are used only as private inputs to zero-knowledge proofs.

```
AuthorityCredential {
  @context: ["https://www.w3.org/2018/credentials/v1", "https://attestara.io/v1"]
  type: ["VerifiableCredential", "AgentAuthorityCredential"]
  issuer: did:ethr:0x<principal_address>
  credentialSubject: {
    id: did:ethr:0x<agent_address>
    mandate: {
      maxCommitmentValue: <encrypted>     // private input to ZKP
      parameterRanges: { ... }            // private input to ZKP
      allowedCounterpartyTypes: [...]
      sessionLimit: <number>
    }
    validFrom: "2026-03-22T00:00:00Z"
    validUntil: "2026-06-22T00:00:00Z"
  }
  proof: { type: "EcdsaSecp256k1Signature2019", ... }
}
```

### 3.2 Layer 2: Zero-Knowledge Proof Layer (Private Verification)

The ZK Proof Layer enables agents to prove mandate compliance without revealing mandate parameters.

At each turn of a negotiation, the acting agent generates a **zero-knowledge proof** demonstrating that its proposal satisfies its mandate constraints. The counterparty (or an on-chain verifier) can verify this proof in constant time without learning anything about the mandate itself.

Four core circuits enforce compliance:

| Circuit | Statement Proven | Private Inputs | Public Inputs |
|---------|-----------------|----------------|---------------|
| **MandateBound** | proposed_value ≤ max_value | max_value, credential_hash | proposed_value, session_id |
| **ParameterRange** | floor ≤ parameter ≤ ceiling | floor, ceiling | parameter_value, session_id |
| **CredentialFreshness** | credential is valid at time T | valid_from, valid_until | current_timestamp |
| **IdentityBinding** | session key belongs to DID | private_key | public_key, did_document_hash |

These circuits are composable. A single negotiation turn may require proofs from multiple circuits (e.g., MandateBound + ParameterRange + CredentialFreshness), which are batched and verified together.

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
- "My credential is currently valid" — without revealing its expiry date.
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

### 4.3 MandateBound Circuit (Detailed)

The MandateBound circuit is the protocol's workhorse. It proves that a proposed value does not exceed the agent's authorised maximum, without revealing the maximum.

**Formal statement:**

Given public inputs `(proposed_value, session_id, credential_commitment)` and private inputs `(max_value, credential_randomness)`, the circuit proves:

1. `proposed_value ≤ max_value` (mandate compliance)
2. `hash(max_value, credential_randomness) == credential_commitment` (credential binding)
3. `proposed_value > 0` (non-triviality)

**Security properties:**

- **Soundness:** A cheating prover cannot generate a valid proof for `proposed_value > max_value` except with negligible probability (≤ 2⁻¹²⁸).
- **Zero-knowledge:** The verifier learns nothing about `max_value` beyond the fact that `proposed_value ≤ max_value`.
- **Binding:** The credential commitment prevents the agent from using different mandates at different turns.

### 4.4 ParameterRange Circuit

The ParameterRange circuit generalises MandateBound to multi-dimensional constraints. It proves that a proposed parameter falls within an authorised range `[floor, ceiling]`.

This circuit handles price ranges, quantity bounds, delivery windows, and any other negotiation parameter that can be expressed as a numeric range. Multiple ParameterRange proofs can be composed to cover all dimensions of a complex proposal.

### 4.5 Proof Composition and Batching

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
- **W3C compliant:** Full conformance with the DID Core specification.
- **Mature tooling:** Veramo framework provides production-grade DID resolution, credential issuance, and verification.
- **Gas-efficient:** ERC-1056 uses a lightweight on-chain registry (setAttribute/revokeDelegate) rather than deploying per-identity contracts.

### 5.2 Authority Credential Lifecycle

```
┌──────────┐     issue()      ┌──────────┐    present()    ┌──────────┐
│          │ ───────────────►  │          │ ──────────────► │          │
│ Principal│                   │  Agent   │                 │Counterpty│
│          │ ◄───────────────  │          │ ◄────────────── │          │
└──────────┘    revoke()       └──────────┘    verify()     └──────────┘
     │                              │                            │
     │         anchor()             │        checkStatus()       │
     └──────────────┐               │               ┌───────────┘
                    ▼               ▼               ▼
              ┌─────────────────────────────────────────┐
              │         CredentialRegistry              │
              │         (Arbitrum L2)                    │
              └─────────────────────────────────────────┘
```

1. **Issuance:** The principal creates an Authority Credential, signs it with their DID key, and delivers it to the agent via an encrypted channel.
2. **Anchoring:** The credential hash is recorded on the CredentialRegistry contract. This does not reveal the credential's contents — only its existence and issuer.
3. **Presentation:** The agent uses the credential's private fields as inputs to ZK proofs. The credential itself is never transmitted to counterparties.
4. **Verification:** Counterparties verify ZK proofs against the on-chain credential anchor. They confirm the credential exists, is current, and was issued by a valid principal — without seeing the credential.
5. **Revocation:** The principal can revoke the credential at any time by updating the on-chain registry. All subsequent ZK proofs using the revoked credential will fail the CredentialFreshness circuit.

### 5.3 Credential Security Model

Authority Credentials are sensitive — they encode the organisation's negotiation strategy. Attestara protects them through multiple mechanisms:

- **At rest:** Credentials are encrypted using the agent's DID key (AES-256-GCM). They are never stored in plaintext.
- **In transit:** Credential issuance uses end-to-end encrypted channels (DIDComm v2).
- **In use:** Credential parameters are used only as private inputs to ZK circuits. They are never included in public proof inputs or transmitted to counterparties.
- **Revocation propagation:** On-chain revocation is immediate and globally visible. The CredentialFreshness circuit checks the on-chain registry at proof generation time.

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

Where `H` is Poseidon (ZK-friendly) for in-circuit use and SHA-256 for off-chain verification. The hash chain creates a Merkle-like structure where any modification to a historical turn invalidates all subsequent hashes.

Session anchors are periodically committed on-chain (every N turns or at configurable intervals), creating checkpoints that make the full history independently verifiable.

### 7.3 Cross-Organisation Session Management

Attestara supports two session modes:

**Intra-organisation sessions:** Both agents belong to the same organisation. The session is established directly via the organisation's internal infrastructure. This mode is used for internal governance — ensuring that the organisation's own agents operate within their mandates.

**Cross-organisation sessions:** Agents belong to different organisations. The session is established via the Attestara Session Relay, which provides:

- **Encrypted transport:** End-to-end encrypted WebSocket channels between agents.
- **Authorisation handshake:** Mutual DID verification and credential status checks before the session begins.
- **Invite tokens:** Organisations can issue time-limited, single-use invite tokens to authorise cross-org sessions.
- **No content visibility:** The relay transports encrypted messages without access to plaintext proposals or mandate parameters.

---

## 8. Threat Model

### 8.1 STRIDE Analysis

Attestara's threat model follows the STRIDE framework, identifying threats across all protocol layers:

| Threat | Category | Attack Vector | Mitigation |
|--------|----------|---------------|------------|
| Agent impersonation | Spoofing | Compromised DID key | Key rotation via ERC-1056; IdentityBinding ZK circuit; real-time DID resolution |
| Turn injection | Tampering | Malicious relay operator | Hash-chain session anchoring; periodic on-chain checkpoints; client-side verification |
| Mandate parameter inference | Information Disclosure | Statistical analysis of accepted/rejected proposals | ZK proofs reveal only boolean (within/outside mandate); session limits prevent repeated probing |
| Commitment repudiation | Repudiation | Agent denies agreement post-settlement | Dual-signature on-chain commitment; immutable Arbitrum record; session transcript archival |
| Relay service outage | Denial of Service | DDoS against Session Relay | Bilateral P2P fallback; rate limiting; geographic distribution; multiple relay operators |
| Credential forgery | Elevation of Privilege | Attacker creates fraudulent Authority Credential | On-chain credential anchoring; issuer DID verification; credential schema validation |

### 8.2 Cryptographic Assumptions

Attestara's security relies on standard cryptographic assumptions:

- **Groth16 soundness:** The proof system is sound under the q-Strong Bilinear Diffie-Hellman (q-SBDH) assumption. A cheating prover cannot generate valid proofs for false statements except with negligible probability.
- **Trusted setup integrity:** At least one participant in the trusted setup ceremony must be honest for the setup to be secure. A compromised setup enables proof forgery. Mitigation: multi-party ceremony with 5+ independent participants; eventual PLONK migration removes this assumption.
- **Hash collision resistance:** Session anchoring assumes SHA-256 and Poseidon are collision-resistant. A collision would allow turn manipulation.
- **DID key security:** Agent identity depends on the security of secp256k1 private keys. Key compromise enables impersonation. Mitigation: HSM support in Enterprise SDK; key rotation protocol.

### 8.3 Economic Attack Resistance

Beyond cryptographic attacks, Attestara must resist economic manipulation:

- **Mandate probing:** A counterparty could submit a series of proposals to narrow down the other agent's mandate range through binary search. Mitigation: per-session turn limits; rate limiting; mandate randomisation recommendations.
- **Griefing (session spam):** An attacker could create many sessions to exhaust the counterparty's proof generation resources. Mitigation: session creation requires on-chain stake; rate limiting per DID.
- **Front-running:** On Arbitrum, sequencer front-running is theoretically possible. Mitigation: commitment records use content-addressed hashes (independent of transaction ordering); Arbitrum's fair ordering roadmap further mitigates this.

---

## 9. Performance and Cost Analysis

### 9.1 Proof Generation Benchmarks

Target performance for Attestara ZK circuits (browser and server environments):

| Circuit | Constraints | Proof Gen (Server) | Proof Gen (Browser) | Verification Gas |
|---------|-------------|-------------------|--------------------|--------------------|
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

### 10.1 EU AI Act (Regulation 2024/1689)

The EU AI Act, effective August 2026, imposes obligations on high-risk AI systems including autonomous agents in financial services, procurement, and critical infrastructure.

**Article 9 — Risk Management System:**

| Requirement | Attestara Feature |
|-------------|-------------------|
| Identify and analyse known and foreseeable risks | Threat model (Section 8); circuit-level security analysis |
| Estimate and evaluate risks from intended use | Authority Credentials encode permitted use; ZK circuits enforce boundaries |
| Adopt risk management measures | Mandate enforcement via ZK proofs; real-time credential revocation |
| Test risk management measures | ZK circuit test vectors; session simulation; commitment verification |

**Article 12 — Record-Keeping:**

| Requirement | Attestara Feature |
|-------------|-------------------|
| Automatic recording of events (logging) | Session anchoring records every turn with cryptographic integrity |
| Traceability of AI system operation | On-chain commitment records; session transcript archival |
| Monitoring of AI system operation | Portal dashboard; real-time session monitoring |

**Article 14 — Human Oversight:**

| Requirement | Attestara Feature |
|-------------|-------------------|
| Human oversight measures | Principals issue and revoke Authority Credentials; mandate boundaries are human-defined |
| Ability to intervene or interrupt | Real-time credential revocation; session termination; mandate modification |
| Understanding of AI system capacities | Dashboard provides mandate visibility, session monitoring, commitment explorer |

### 10.2 DORA (Digital Operational Resilience Act)

DORA, in force since January 2025, mandates ICT risk governance for financial institutions. Attestara supports DORA compliance through:

- **ICT risk management:** ZK circuits provide verifiable risk boundaries for agent operations.
- **ICT-related incident reporting:** Commitment records and session logs provide audit-quality evidence.
- **Digital operational resilience testing:** ZK circuit test suites and session simulation tools support testing requirements.
- **Third-party ICT risk management:** Authority Credentials create verifiable governance over third-party agent integrations.

### 10.3 Legal Enforceability

A critical question for Attestara's adoption is whether agent-created commitment records are legally enforceable. The analysis (requiring external counsel confirmation) suggests:

- **eIDAS (EU Electronic Signatures):** An Ed25519 signature generated by an AI agent may qualify as an "advanced electronic signature" under eIDAS Article 26, provided the signature is uniquely linked to the signatory (the principal, via the DID chain), under the signatory's sole control (via the Authority Credential), and linked to the data in a way that detects subsequent changes (via hash-chain anchoring).

- **English law:** Under the Electronic Communications Act 2000 and case law (Golden Ocean Group v Salgaocar), electronic signatures are admissible. The key question is whether the principal's issuance of an Authority Credential constitutes sufficient intent to be bound by the agent's commitments.

- **Smart contract as evidence:** On-chain commitment records are admissible as evidence in most common-law and civil-law jurisdictions. Their probative value depends on demonstrating the integrity of the underlying cryptographic mechanisms.

These questions are flagged for external counsel engagement during the pilot phase.

---

## 11. Competitive Analysis

### 11.1 Competitive Landscape Mapping

Attestara exists at the intersection of three capability domains. No existing solution spans all three:

| Capability | Google A2A | Visa/MC Agent Pay | Salesforce Agentforce | Fetch.ai/SNET | Attestara |
|------------|-----------|-------------------|----------------------|---------------|------------|
| Agent interoperability | **Yes** | Partial | **Yes** | **Yes** | Yes |
| Authority verification | No | Consumer-grade | No | No | **Yes (ZK)** |
| Mandate privacy | No | No | No | No | **Yes (ZK)** |
| Adversarial negotiation | No | No | No | No | **Yes** |
| Binding commitments | No | Yes (payments) | No | Partial | **Yes (on-chain)** |
| Regulatory compliance | Partial | Yes (PCI) | Partial | No | **Yes (EU AI Act)** |
| Enterprise governance | No | Yes (payments) | Partial | No | **Yes** |

### 11.2 Uncontested Position

Attestara's competitive position is uncontested because it addresses a problem that adjacent players have neither the incentive nor the architecture to solve:

- **Google A2A** solves interoperability (how agents talk) but explicitly excludes authority enforcement. Attestara is complementary — it can layer on top of A2A.
- **Visa/Mastercard** solve consumer agent payments. B2B adversarial negotiation with mandate privacy is outside their product scope.
- **Salesforce** solves agent routing within its ecosystem. Cross-organisational, cryptographically verifiable governance is architecturally beyond its platform model.
- **Existing IAM vendors** (Okta, Auth0, Entra) manage user identity. Agent-to-agent authority delegation with ZK mandate proofs is a fundamentally different problem.

### 11.3 Timing Window

Three factors converge to create a unique timing window:

1. **Technology readiness:** ZK proof costs have dropped to < $0.01 per proof on L2. Arbitrum's gas economics make per-session anchoring viable. Five years ago, this was economically impossible.
2. **Regulatory urgency:** EU AI Act Article 9 enforcement begins August 2026. Enterprises deploying agentic systems must demonstrate governance — creating urgent demand for compliance infrastructure.
3. **Competitive vacuum:** No production system exists for B2B adversarial agent negotiation with privacy-preserving mandates. The first credible solution captures the standard-setting position.

---

## 12. Governance and Standards

### 12.1 Protocol Governance Model

Attestara uses a dual governance model designed to serve both open-ecosystem and regulated-enterprise deployment contexts:

**Open DAO Governance:**
- On-chain voting on protocol parameters (session fees, circuit upgrades, registry policies).
- Token-weighted voting with quadratic weighting to prevent plutocratic capture.
- Technical Committee veto on security-critical changes (ZK circuits, cryptographic primitives).
- Specification changes require supermajority (67%) approval.

**Bilateral P2P Governance:**
- For regulated enterprises that cannot participate in DAO governance (compliance constraints).
- Two-party agreement on protocol parameters.
- Same cryptographic guarantees; different governance substrate.
- Enterprise SDK provides turnkey bilateral deployment.

### 12.2 Standards Strategy

Attestara's long-term defensibility depends on becoming a recognised standard. The strategy follows the Linux Foundation / W3C playbook:

**W3C Credentials Community Group (Primary):**
- Month 8: Submit AgentAuthorityCredential schema draft.
- Month 12: Propose ZK proof binding pattern for VCs.
- Month 16: Submit did:attestara DID method specification.

**Linux Foundation AI & Data — AAIF (High Priority):**
- Month 8: Propose Trust Layer Working Group.
- Month 12: Submit A2A trust extension draft.
- Month 18: Reference implementation as AAIF project.

**EU AI Act Implementation Working Groups (Regulatory):**
- Month 12: Submit Commission consultation response on agentic AI governance.
- Month 14+: Case studies from pilot customers demonstrating compliance.

### 12.3 Fork Defence

Open protocols risk fragmentation. Attestara's fork defence operates at three levels:

1. **Specification donation:** The protocol specification will be donated to a standards body with supermajority governance for changes. This prevents unilateral specification forks.
2. **Trademark protection:** "Attestara" is registered in Gibraltar, EU, UK, and US. Competing implementations cannot use the Attestara name.
3. **Network effects:** The managed prover service, session relay, and enterprise tooling create infrastructure lock-in that makes forking the specification insufficient — you would also need to replicate the infrastructure network.

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

### 13.3 Managed Prover Service

The `@attestara/prover` package provides a hosted ZK proof generation service for clients that cannot or prefer not to generate proofs locally:

- **Fastify HTTP API** for proof requests.
- **Worker thread pool** for parallel proof generation (4–16 workers per instance).
- **Circuit caching** — compiled circuits and proving keys are loaded once and reused.
- **SLA tiers** — latency and throughput guarantees for enterprise customers.
- **No mandate visibility** — the prover service generates proofs from encrypted inputs. It never sees plaintext mandate parameters (proofs are generated in a TEE or with client-side input encryption).

### 13.4 Portal Dashboard

The `@attestara/portal` provides organisational visibility:

- **Session Monitor:** Real-time view of active negotiations with turn-by-turn status.
- **Agent Manager:** Register, credential, and revoke agents. View agent activity history.
- **Commitment Explorer:** Browse, search, and verify on-chain commitment records.
- **Compliance Reports:** EU AI Act Article 12 logging reports. DORA audit trail exports.
- **Interactive Demo:** End-to-end 5-turn negotiation walkthrough for onboarding and evaluation.

---

## 14. Use Cases

### 14.1 Autonomous Procurement Negotiation

**Scenario:** A manufacturing company deploys AI procurement agents to negotiate raw material contracts with multiple suppliers simultaneously.

**Without Attestara:** The procurement agent sends API requests to supplier agents. Neither side can verify the other's authority. The manufacturer cannot prove to its board that the agent stayed within its $2M mandate. The supplier cannot prove the agent had authority to commit. The "contract" is a JSON response in a database.

**With Attestara:**
1. The CPO issues an Authority Credential to the procurement agent: max $2M, steel grade A/B only, delivery 60–90 days, no single-supplier concentration > 40%.
2. At each negotiation turn, the agent generates ZK proofs demonstrating compliance with all four constraints — without revealing any specific limit to the supplier.
3. When terms are agreed, both agents sign and settle the commitment on-chain.
4. The board receives a compliance report showing every turn was mandate-compliant, with cryptographic proof.

### 14.2 Financial Services — Algorithmic Trading Governance

**Scenario:** An asset management firm deploys AI agents for algorithmic trading across multiple exchanges and counterparties.

**DORA requirement:** Demonstrable ICT risk governance over automated trading operations.

**With Attestara:**
1. The risk committee issues Authority Credentials encoding trading limits: max position size, sector exposure caps, VaR constraints, counterparty limits.
2. Each trading decision generates ZK proofs of compliance, anchored on-chain.
3. Regulators can independently verify the complete audit trail without accessing proprietary trading strategies.
4. Real-time credential revocation enables instant position freeze if risk limits are breached.

### 14.3 Legal Services — AI Contract Negotiation

**Scenario:** Two law firms deploy AI agents to negotiate contract terms on behalf of their respective clients.

**With Attestara:**
1. Each client's counsel issues Authority Credentials encoding acceptable terms: price ranges, liability caps, indemnity limits, jurisdiction preferences.
2. AI agents negotiate within these mandates, generating ZK proofs at each turn.
3. The final agreed terms are settled on-chain with dual signatures.
4. Both clients receive a cryptographic audit trail showing their agent operated within instructions.
5. The settlement record is admissible as evidence of the negotiation process and final agreement.

### 14.4 Supply Chain — Multi-Party Agent Coordination

**Scenario:** A retailer's procurement agent negotiates simultaneously with multiple supplier agents across different jurisdictions.

**With Attestara:**
1. Each party's agents carry Authority Credentials with jurisdiction-specific constraints.
2. Cross-border negotiations generate ZK proofs compliant with each jurisdiction's requirements.
3. Multi-party commitments are settled atomically — all parties sign or none do.
4. EU AI Act compliance is demonstrable for the European leg; jurisdiction-neutral protocol works globally.

---

## 15. Roadmap

### Phase 0: Foundation (Months 1–4)

| Deliverable | Status |
|-------------|--------|
| Protocol specification v0.1 | Complete |
| ZK circuit design (4 circuits with test vectors) | Complete |
| Smart contract architecture | Complete |
| Monorepo scaffolding (Turborepo + pnpm + 7 packages) | Complete |
| MVP design specification v1.3 | Approved |
| Shared types package (@attestara/types) | In progress |

### Phase 1: MVP (Months 4–7)

- ZK circuits implemented in Circom with full test suites
- Smart contracts deployed to Arbitrum testnet
- TypeScript SDK with identity, credentials, prover, negotiation, and commitment modules
- Managed prover service (local + remote)
- Session relay with cross-org authorisation
- Next.js portal with session monitoring and interactive demo
- CLI tools for agent and session management
- Developer onboarding target: < 30 minutes to first negotiation

### Phase 2: Pilot (Months 8–18)

- 5–7 paid pilot engagements with financial services firms (€20K–€30K each)
- Production deployment on Arbitrum mainnet
- ZK circuit security audit (Trail of Bits or Zellic)
- Full-scale trusted setup ceremony
- W3C CCG Work Item submission
- AAIF Trust Layer Working Group proposal
- Python adapters for LangChain and AutoGen
- Case study publication

### Phase 3: Scale (Months 19–36)

- SaaS self-serve platform; target €380K ARR by Month 24
- Systems integrator partnerships (Deloitte, Accenture, PwC)
- ISO/IEC 42001 compliance mapping
- Protocol specification donation to standards body
- Geographic expansion: UK, EU, Singapore, US
- PLONK migration (removes trusted setup requirement)
- Target: €1.35M ARR by Month 36

---

## 16. Conclusion

The AI agent economy is arriving faster than the governance infrastructure needed to support it. Enterprises are deploying autonomous agents for high-value negotiations without the ability to verify authority, enforce mandates, or create binding records. Regulators are imposing requirements (EU AI Act, DORA) that cannot be met with existing tooling.

Attestara addresses this gap with a precise, minimal, and standards-aligned protocol. Zero-knowledge proofs solve the previously intractable tension between authority verification and mandate privacy. W3C Verifiable Credentials provide interoperable identity infrastructure. Smart contract settlement creates the immutable commitment records that enterprises and regulators require.

The timing window is narrow but clear. Technology readiness (sub-cent ZK proof costs), regulatory urgency (August 2026 enforcement), and competitive vacuum (no production alternative) converge to create a category-defining opportunity.

Attestara is not a research project. It is production-targeted infrastructure for the agent economy — designed to be deployed, adopted, and standardised.

The clearing house for AI agents.

---

## 17. References

1. European Parliament. (2024). *Regulation (EU) 2024/1689 — Artificial Intelligence Act.* Official Journal of the European Union.

2. European Parliament. (2022). *Regulation (EU) 2022/2554 — Digital Operational Resilience Act (DORA).* Official Journal of the European Union.

3. Groth, J. (2016). *On the Size of Pairing-Based Non-interactive Arguments.* EUROCRYPT 2016. Lecture Notes in Computer Science, vol 9666.

4. W3C. (2022). *Verifiable Credentials Data Model v2.0.* W3C Recommendation. https://www.w3.org/TR/vc-data-model-2.0/

5. W3C. (2022). *Decentralized Identifiers (DIDs) v1.0.* W3C Recommendation. https://www.w3.org/TR/did-core/

6. uPort. (2019). *ERC-1056: Ethereum Lightweight Identity.* Ethereum Improvement Proposals.

7. iden3. (2022). *Circom 2.x: Circuit Compiler for Zero-Knowledge Proofs.* https://docs.circom.io/

8. Offchain Labs. (2024). *Arbitrum One Technical Documentation.* https://docs.arbitrum.io/

9. Gabizon, A., Williamson, Z., Ciobotaru, O. (2019). *PLONK: Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge.* IACR Cryptology ePrint Archive.

10. European Commission. (2014). *Regulation (EU) No 910/2014 — Electronic Identification and Trust Services (eIDAS).* Official Journal of the European Union.

11. UK Treasury Select Committee. (2026). *AI in Financial Services: Governance and Oversight.* House of Commons Report.

12. Veramo. (2024). *Veramo Framework Documentation.* https://veramo.io/

---

*This white paper is published by littledata. For inquiries, contact mick@littledata.ai.*

*© 2026 littledata. Protocol specification licensed under CC BY 4.0. All rights reserved for commercial implementations.*
