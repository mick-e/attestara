# AgentClear — IP and Licensing Strategy
## v0.1

---

## 1. The Core Tension

AgentClear faces a classic protocol business model tension: **the value of a protocol standard scales with adoption, but adoption is easiest when the protocol is free and open. Monetisation, however, requires proprietary value.**

The resolution is a layered IP strategy that keeps the protocol specification and core circuit library open (maximising adoption) while retaining proprietary value in the reference implementation, enterprise features, and managed infrastructure.

This is the same model that has worked for Linux (open kernel, commercial distributions), Ethereum (open protocol, commercial node operators), and HashiCorp (open source Terraform, commercial Terraform Cloud).

---

## 2. IP Asset Inventory

### 2.1 What Exists

| Asset | Description | Current Status |
|-------|-------------|---------------|
| Protocol Specification v0.1 | The AgentClear protocol design document | Unpublished draft |
| ZK Circuit designs | Mandate Bound, Parameter Range, etc. | Design document only |
| Competitive Analysis | Market research and positioning | Internal document |
| "AgentClear" name/brand | Protocol and product name | Unregistered |

### 2.2 What Will Be Created

| Asset | Description | IP Category |
|-------|-------------|-------------|
| Protocol Specification | Full technical standard | Open |
| ZK Circuits (Circom) | Core circuit library | Open |
| Circuit Verification Keys | Output of trusted setup | Open |
| Solidity Verifier Contracts | Auto-generated from circuits | Open |
| Reference SDK (TypeScript/Python) | Core implementation | Open Source (LGPL) |
| Enterprise SDK | Production-grade, supported implementation | Proprietary (commercial licence) |
| Prover Service | Managed proof generation infrastructure | Proprietary (SaaS) |
| Governance Dashboard | DAO management tooling | Proprietary (SaaS) |
| Littledata Integration Module | EU AI Act compliance integration | Proprietary (commercial licence) |

---

## 3. Licensing Strategy by Asset

### 3.1 Protocol Specification: Creative Commons Attribution 4.0

**Licence:** CC BY 4.0  
**Rationale:** Anyone can implement the protocol, build on it, or extend it, provided they credit AgentClear Foundation. This maximises protocol adoption — the goal at this stage — while ensuring the Foundation receives credit that supports ecosystem development and fundraising narrative.

**What this means in practice:** Any developer, company, or standards body can implement AgentClear-compatible software. Competing implementations are not just permitted — they are desirable, as they increase the protocol's network effects.

### 3.2 ZK Circuit Library: MIT Licence

**Licence:** MIT  
**Rationale:** ZK circuits are the technical foundation of the protocol. Making them MIT-licensed (more permissive than CC) removes any friction for integration into commercial products. The circuits are not the business — the business is the infrastructure that uses them.

**Key provision:** The verification keys output by the trusted setup ceremony should also be publicly released under MIT. Proprietary verification keys would fragment the ecosystem.

### 3.3 Reference SDK: GNU Lesser General Public Licence (LGPL v3)

**Licence:** LGPL v3  
**Rationale:** LGPL allows the SDK to be used as a library in proprietary software (unlike GPL, which would require the entire codebase to be open-sourced). This enables enterprise adoption while ensuring that improvements to the SDK itself remain open. The "Lesser" version is critical — GPL would be too restrictive for enterprise integration.

**What this means:** A company can build a proprietary procurement platform using the AgentClear SDK without open-sourcing their platform. But if they modify the SDK itself, those modifications must be released.

### 3.4 Enterprise SDK: Commercial Licence

**Licence:** Proprietary commercial licence  
**Rationale:** The Enterprise SDK adds features not in the open-source reference implementation: HSM key management integration, enterprise SSO, SLA-backed support, advanced monitoring and alerting, compliance reporting modules, and Littledata integration.

**Pricing model:** Annual subscription per organisation (see Financial Model document for pricing detail).

**Key clause:** The commercial licence must specify that the buyer's data (negotiation sessions, commitment records) is their own — AgentClear Foundation does not have rights to use or analyse buyer data.

### 3.5 SaaS Services: Terms of Service

Managed Prover Service and Governance Dashboard are operated as SaaS products under standard Terms of Service + Data Processing Agreement.

---

## 4. Trademark Strategy

**"AgentClear"** should be registered as a trademark in:
- Gibraltar (primary)
- European Union (EU Trademark via EUIPO)
- United Kingdom (UK Intellectual Property Office)
- United States (USPTO)

**Why trademarks matter for an open protocol:** Even if anyone can implement the protocol, only AgentClear Foundation can call its product "AgentClear" or claim to be "AgentClear-certified." This creates brand value and trust signals that competing open-source implementations cannot replicate.

**Certification mark:** Consider establishing an "AgentClear Compatible" certification mark for third-party implementations that pass the conformance test suite. This creates an ecosystem quality signal while extending the protocol's reach.

---

## 5. Defensive Patent Strategy

**Position:** AgentClear Foundation should file defensive patents on the novel cryptographic combinations in the protocol — not to enforce exclusivity, but to prevent others from patenting the same techniques and then asserting them against AgentClear or its users.

**Key patentable innovations (provisional assessment — requires patent attorney review):**
1. The combination of ZK Mandate Bound proofs with Verifiable Credential authority delegation for AI agent negotiation
2. The dual-signature session anchoring mechanism for tamper-proof negotiation audit trails
3. The escalation trigger mechanism tied to credential-encoded thresholds

**Filing strategy:**
- File provisional applications in the US (USPTO) within 12 months of first public disclosure
- Use the provisional period to assess commercial potential and refine claims
- File PCT applications to preserve international rights
- Licence patents royalty-free to any implementer complying with the open protocol specification (defensive use only)

**Cost estimate:** $15,000–$30,000 for provisional filings; $100,000–$200,000 for full prosecution across key jurisdictions.

---

## 6. Fork Risk and Governance

**The primary IP risk for an open protocol is a well-resourced fork:**
- Google, Salesforce, or a major bank forks the protocol
- Adds proprietary extensions that become de facto standards
- Fragments the ecosystem around their version

**Mitigations:**

**Technical:** Design the protocol to be difficult to fork incompatibly. The on-chain Commitment Contract, Identity Registry, and ZK verification keys create network effects that make forking costly — a fork would need to rebuild the registry ecosystem from scratch.

**Governance:** Donate the specification to a neutral standards body (W3C Credentials Community Group or Linux Foundation AAIF) under a governance model that requires supermajority consensus for protocol changes. This makes hostile forking a governance event rather than just a technical one.

**Trademark:** The "AgentClear" trademark cannot be used by a fork. Forks must use different names, reducing their ability to leverage AgentClear's brand equity.

**Community:** Build a strong developer community around the open-source reference implementation. Network effects in developer communities are harder to fork than code.

---

## 7. Open Source vs Proprietary Decision Framework

For each new feature or component, apply this framework:

```
Does the feature differentiate AgentClear from competitors?
    │
    ├── YES → Is it a protocol-level feature (affects interoperability)?
    │              │
    │              ├── YES → Open (required for ecosystem health)
    │              └── NO  → Proprietary Enterprise SDK
    │
    └── NO  → Open (maximise adoption, reduce maintenance burden)
```

**Examples:**
- MandateBound circuit: differentiating, protocol-level → **Open**
- Enterprise HSM key management: differentiating, not protocol-level → **Proprietary**
- Session anchor mechanism: differentiating, protocol-level → **Open**
- Compliance reporting dashboard: not protocol-level → **Proprietary SaaS**
- Littledata integration: differentiating, not protocol-level → **Proprietary**

---

## 8. Revenue Model Enabled by This Strategy

| Revenue Stream | IP Basis | Target Customer |
|---------------|---------|-----------------|
| Enterprise SDK licence | Proprietary commercial licence | Enterprise deployers |
| Managed Prover Service | SaaS ToS | Any AgentClear user |
| Governance Dashboard | SaaS ToS | DAO participants |
| Littledata Integration | Proprietary licence bundled with Littledata | Littledata enterprise customers |
| Conformance testing/certification | Trademark + service | Third-party implementers |
| Professional services / integration support | Service agreement | Enterprise buyers |

---

*AgentClear IP and Licensing Strategy v0.1*
