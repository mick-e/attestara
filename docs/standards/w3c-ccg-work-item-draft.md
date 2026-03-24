# W3C Credentials Community Group -- Work Item Proposal

## AgentAuthorityCredential: A Verifiable Credential Schema for AI Agent Mandate Delegation

---

### Title

**AgentAuthorityCredential: A Verifiable Credential Schema for AI Agent Mandate Delegation**

---

### Abstract

This specification defines `AgentAuthorityCredential`, a Verifiable Credential type conforming to the W3C Verifiable Credentials Data Model v2.0, purpose-built for delegating and verifying authority in autonomous AI agent interactions. An `AgentAuthorityCredential` enables a Principal (organisation or authorised human) to issue a cryptographically signed credential to an AI Agent, encoding the scope within which the Agent is authorised to negotiate, commit, and transact on the Principal's behalf. The credential is designed for adversarial cross-organisational contexts where counterparties cannot and should not trust each other's infrastructure.

The specification also defines `AgentNegotiationMandate`, a structured mandate type within the credential subject that expresses negotiation parameters (value limits, parameter ranges, counterparty constraints, session limits). Mandate parameters are designed as private inputs to zero-knowledge proof circuits, enabling authority verification without mandate disclosure -- a counterparty can verify that an Agent is authorised to make a specific proposal without learning the boundaries of that authorisation.

A companion type, `AttestaraTurnProofBundle`, wraps zero-knowledge proof sets for individual negotiation turns as Verifiable Credentials, enabling composability with DIF Presentation Exchange v2 verification workflows.

---

### Motivation

The deployment of autonomous AI agents in enterprise commerce -- procurement negotiation, supply-chain management, financial transactions -- has created a governance gap that existing identity and credential standards do not address:

1. **No standard credential type for AI agent authority.** W3C Verifiable Credentials define schemas for human identity, educational credentials, and organisational attestations. No standard exists for expressing that an AI agent is authorised to act within specific parameters on behalf of an organisation. Every enterprise deploying agentic AI is building proprietary authority representations.

2. **No standard for privacy-preserving mandate verification.** In adversarial negotiations, revealing an agent's authority boundaries (maximum price, quantity limits) to a counterparty destroys negotiating leverage. Existing VC schemas assume the credential content is presentable; agent mandates require a schema designed for zero-knowledge proof consumption where private fields are never transmitted.

3. **Regulatory urgency.** The EU AI Act (Article 9) mandates demonstrable governance over high-risk AI systems from August 2026. DORA requires ICT risk governance for financial institutions. A standardised, interoperable credential for AI agent authority is a prerequisite for compliant multi-party agentic deployments.

4. **Interoperability gap.** Without a common credential schema, AI agents from different organisations, platforms, and vendors cannot verify each other's authority in a standard way. This blocks the emergence of multi-party agentic commerce.

The DIF Trusted AI Agents Working Group has identified these gaps in its Agentic Authority Use Cases work item. This Work Item proposal brings a concrete credential schema, informed by DIF WG engagement and production implementation experience, to the W3C CCG for standardisation.

---

### Specification Scope

This specification defines the following:

#### In Scope

1. **`AgentAuthorityCredential` type definition** -- A VC type with type array `["VerifiableCredential", "AgentAuthorityCredential"]`, defining the required and optional properties for AI agent authority delegation.

2. **`AgentNegotiationMandate` type definition** -- A structured credential subject type expressing mandate parameters: maximum commitment value, parameter ranges (price, quantity, delivery), allowed counterparty types, and session limits.

3. **`AttestaraTurnProofBundle` type definition** -- A VC type wrapping zero-knowledge proof sets for negotiation turns, enabling verification via DIF Presentation Exchange v2.

4. **JSON-LD context** -- Extension context at `https://attestara.ai/contexts/v1` defining all custom vocabulary terms.

5. **JSON Schema** -- Structural validation schema at `https://attestara.ai/schemas/AgentAuthorityCredential/v1`.

6. **Credential lifecycle** -- Issuance, presentation, verification, and revocation patterns specific to agent authority credentials.

7. **ZK proof binding pattern** -- How zero-knowledge proof commitments reference credential subjects without requiring credential disclosure.

8. **Privacy considerations** -- Which credential fields are designed for public verification vs. private ZK circuit inputs.

#### Out of Scope

1. Specific ZK circuit implementations (these are implementation details, not credential schema concerns).
2. Transport protocol bindings (DIDComm v2 bindings are contributed to DIF separately).
3. Smart contract settlement mechanisms.
4. Specific DID method requirements (the schema is DID-method-agnostic).
5. Enterprise key management and HSM integration details.

---

### Conformance with VC Data Model v2.0

This specification is designed as a conformant extension of the following W3C Recommendations (all published May 2025):

| Specification | Version | Usage in AgentAuthorityCredential |
|---|---|---|
| Verifiable Credentials Data Model | v2.0 (W3C Rec.) | Base credential structure; `@context`, `type`, `issuer`, `validFrom`, `validUntil`, `credentialSubject`, `proof` |
| VC Data Integrity | v1.0 (W3C Rec.) | `DataIntegrityProof` proof type |
| Data Integrity EdDSA Cryptosuites | v1.0 (W3C Rec.) | `eddsa-jcs-2022` cryptosuite (Ed25519) |
| Bitstring Status List | v1.0 (W3C Rec.) | `BitstringStatusListEntry` for real-time credential revocation |
| Controlled Identifiers | v1.0 (W3C Rec.) | DID document structure for Agent and Principal identifiers |
| VC Securing -- JOSE/COSE | v1.0 (W3C Rec.) | Alternative JWT proof path for environments preferring JOSE |

**Conformance claims:**
- An `AgentAuthorityCredential` is a valid VC 2.0 credential. Any VC 2.0 conformant verifier can process the base credential structure.
- The Attestara extension context adds domain-specific vocabulary; it does not override or conflict with the VC 2.0 base context.
- Revocation uses the standard Bitstring Status List mechanism with no extensions.
- The proof uses standard `DataIntegrityProof` with a W3C Recommendation cryptosuite.

---

### Editors

- **Primary Editor:** Mick Brolin, Littledata Research & Engineering (mick@littledata.ai)
- **Co-Editor (required):** To be confirmed from a DIF Trusted AI Agents Working Group participant or pilot customer organisation. The co-editor commitment will be secured through DIF WG engagement prior to this submission.

**Editor responsibilities:**
- Maintain the specification document in the W3C CCG GitHub repository
- Respond to community feedback and issue reports
- Publish updated drafts on a regular cadence (target: quarterly)
- Coordinate with DIF Trusted AI Agents WG to ensure alignment

---

### Community Contributor License Agreement

Littledata Ltd has accepted the W3C Community Contributor License Agreement (CLA). All contributions to this Work Item are made under the W3C Community Final Specification Agreement.

---

### Timeline

| Month | Milestone |
|-------|-----------|
| 0 (submission) | Work Item proposal submitted to W3C CCG mailing list (public-credentials@w3.org) |
| 1 | Work Item accepted; repository created in w3c-ccg GitHub org |
| 2 | First Editor's Draft published with type definitions, JSON-LD context, and JSON Schema |
| 4 | Extension context published at stable URL (`https://attestara.ai/contexts/v1`) |
| 4 | Community review period opens; feedback solicited from CCG mailing list |
| 6 | Second Editor's Draft incorporating community feedback |
| 8 | Reference implementation demonstrating credential issuance, verification, and revocation |
| 10 | First published draft of Community Report |
| 12 | Propose ZK proof binding pattern for VCs as companion Work Item |
| 14 | Community Report Final Draft; call for implementations |
| 16 | Community Report published; at least two independent implementations demonstrated |
| 18 | Seek W3C CCG / JTC 21 WG3 liaison status for regulatory alignment |

**Long-term path (beyond this Work Item):**
- If the Community Report demonstrates sufficient adoption and implementation, the editors may propose advancing to a W3C Working Group Recommendation track. This is a multi-year process requiring W3C Member support and is not a near-term target.

---

### Prior Art and Related Work

1. **DIF Trusted AI Agents Working Group -- Agentic Authority Use Cases** (2024--2026). The working group's focus on delegation chains, authorisation boundaries, and human oversight directly informs this specification. Attestara's protocol bindings have been submitted to the WG as use case input.

2. **Rodriguez Garzon et al., "Decentralised Identity and Verifiable Credentials for AI Agents"** (arXiv 2511.02841, 2025). Academic treatment of DID/VC application to AI agents. This Work Item provides the concrete credential schema that the academic work identifies as needed.

3. **W3C VC 2.0 family of Recommendations** (May 2025). The stable standards foundation on which this specification builds.

4. **RFC 9396 -- OAuth 2.0 Rich Authorization Requests.** The `AgentNegotiationMandate` structure is conceptually aligned with RAR's `authorization_details` object. The key difference: RAR requires a shared authorisation server, which is untenable in adversarial cross-organisational contexts.

5. **IETF Agent Name Service (draft-narajala-ans).** Agent discovery and identity registration. Complementary to, not competing with, this credential schema.

6. **DIF Presentation Exchange v2.** This specification defines a presentation definition (`attestara-turn-verification`) that enables verification using PE v2 infrastructure.

7. **DIF Credential Manifest.** This specification defines a credential manifest for `AgentAuthorityCredential` issuance.

---

### References

- [VC-DATA-MODEL] W3C. "Verifiable Credentials Data Model v2.0." W3C Recommendation, May 2025. https://www.w3.org/TR/vc-data-model-2.0/
- [VC-DATA-INTEGRITY] W3C. "Verifiable Credential Data Integrity 1.0." W3C Recommendation, May 2025. https://www.w3.org/TR/vc-data-integrity/
- [VC-DI-EDDSA] W3C. "Data Integrity EdDSA Cryptosuites v1.0." W3C Recommendation, May 2025. https://www.w3.org/TR/vc-di-eddsa/
- [BITSTRING-STATUS-LIST] W3C. "Bitstring Status List v1.0." W3C Recommendation, May 2025. https://www.w3.org/TR/vc-bitstring-status-list/
- [CONTROLLED-IDENTIFIERS] W3C. "Controlled Identifiers v1.0." W3C Recommendation, May 2025. https://www.w3.org/TR/controller-document/
- [DIDCOMM-V2] DIF. "DIDComm Messaging v2." https://identity.foundation/didcomm-messaging/spec/
- [PE-V2] DIF. "Presentation Exchange v2.0.0." https://identity.foundation/presentation-exchange/spec/v2.0.0/
- [CREDENTIAL-MANIFEST] DIF. "Credential Manifest." https://identity.foundation/credential-manifest/
- [RFC9396] Lodderstedt, T., Richer, J., and B. Campbell. "OAuth 2.0 Rich Authorization Requests." RFC 9396, May 2023.
- [ATTESTARA-WP] Littledata Research & Engineering. "Attestara: A Cryptographic Trust Protocol for Autonomous AI Agent Commerce." Version 5.0, March 2026.

---

### Submission Instructions

This proposal is submitted to the W3C Credentials Community Group via the public-credentials@w3.org mailing list, following the CCG Work Item process documented at https://w3c-ccg.github.io/. The proposal requests creation of a new Work Item repository in the w3c-ccg GitHub organisation.

---

*AgentAuthorityCredential W3C CCG Work Item Proposal -- Draft v1.0*
