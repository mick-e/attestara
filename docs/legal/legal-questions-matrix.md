# Attestara — Legal Questions Matrix
## All Open Legal Questions by Priority, Jurisdiction, and Source
### v1.0 — March 2026

---

**Purpose:** This document consolidates every open legal question identified across the Attestara document set, organized for efficient counsel engagement. Each question includes its source document, the specific section counsel should review, the jurisdiction(s) affected, and the priority tier.

**How to use this document:** Share the relevant section with counsel engaged for each workstream. The "Counsel should review" column identifies the exact whitepaper sections containing the technical context needed to answer each question.

---

## Summary

| Priority | Category | Question Count | Jurisdictions |
|----------|---------|---------------|---------------|
| P1 | Gibraltar Corporate & DLT | 7 | Gibraltar |
| P2 | Contract Formation & Enforceability | 8 | England & Wales, EU, Gibraltar |
| P2 | Agency Law & AI Authority | 6 | England & Wales, EU |
| P2 | Electronic Signatures & eIDAS | 4 | EU, UK |
| P2 | Liability & Protocol Failures | 5 | England & Wales, EU, Gibraltar |
| P3 | IP & Licensing | 10 | UK, EU, US, Gibraltar |
| P4 | DAO Governance & Legal Wrapper | 10 | Gibraltar, Cayman, Switzerland |
| P5 | Regulatory Compliance | 4 | EU, Gibraltar |
| **Total** | | **54** | |

---

## P1 — Gibraltar Corporate & DLT

These questions must be answered first, as the corporate structure decision affects all downstream workstreams.

| # | Question | Source | Counsel Should Review | Jurisdiction | Notes |
|---|---------|--------|----------------------|-------------|-------|
| G1 | Does operating the Attestara Commitment Contract (recording agreement hashes on-chain) constitute a "DLT business" under the Financial Services (Distributed Ledger Technology Providers) Regulations 2017, requiring a GFSC DLT Provider licence? | 05-legal-enforceability.md, Section 5; 13-dao-legal-wrapper-v2.md, Section 3 Option A | Protocol Specification (full doc), especially Commitment Contract architecture and on-chain settlement mechanism | Gibraltar | The Commitment Contract records hashes, not assets. Key distinction: "storing or transmitting value belonging to others" vs recording cryptographic proofs. |
| G2 | Can a Company Limited by Guarantee (CLG) accommodate the hybrid governance model (Board of Directors + Technical Committee + on-chain DAO token voting)? | 13-dao-legal-wrapper-v2.md, Section 3 Option A | 13-dao-legal-wrapper-v2.md, Section 2 (governance architecture diagram) | Gibraltar | CLG has no share capital; members are the governance participants. Question is whether Articles can encode the three-tier structure. |
| G3 | Can SAFE or convertible note instruments be used with a Gibraltar CLG, or does the absence of share capital require a parallel private company limited by shares? | 13-dao-legal-wrapper-v2.md, Section 6 | 09-investor-one-pager.md, Section "The Ask" (EUR 500K seed) | Gibraltar | Investors need equity-like instruments. If CLG cannot accommodate, a dual-entity structure may be required. |
| G4 | Does the governance token (non-transferable for 12 months, no yield, governance rights only) require classification under the Proceeds of Crime Act 2015 or Financial Services Act 2019? | 13-dao-legal-wrapper-v2.md, Section 5 | 13-dao-legal-wrapper-v2.md, Section 5 (token design and distribution table) | Gibraltar | Token properties: non-transferable initial period, no staking yield, governance-only, required stake for participation. |
| G5 | What are the tax implications (corporate tax, income tax, benefit-in-kind) of governance token allocations to founding team members (20%, 4-year vest, 1-year cliff)? | 13-dao-legal-wrapper-v2.md, Section 5 | 13-dao-legal-wrapper-v2.md, Section 5 (token distribution table) | Gibraltar | 20% founding team, 5% Technical Committee, 15% investors — all have different vesting schedules. |
| G6 | What banking relationships are available for a Gibraltar DLT-focused entity, and are there practical obstacles? | 13-dao-legal-wrapper-v2.md, Section 8 (action plan: "Open banking relationship") | 09-investor-one-pager.md (business model and revenue projections) | Gibraltar | Practical operational question; affects timeline for receiving seed investment. |
| G7 | Does Gibraltar's post-Brexit relationship with the EU affect Attestara's ability to serve EU enterprise customers or engage with EU regulatory frameworks (EU AI Act, DORA)? | 13-dao-legal-wrapper-v2.md, Section 3 Option A | 09-investor-one-pager.md (EU AI Act references, DORA reference) | Gibraltar, EU | Gibraltar is EU-adjacent but not EU. Impacts regulatory credibility with EU enterprise buyers. |

---

## P2 — Contract Formation & Enforceability

Core commercial viability questions. These determine whether Attestara's commitment records have legal force.

| # | Question | Source | Counsel Should Review | Jurisdiction | Notes |
|---|---------|--------|----------------------|-------------|-------|
| C1 | Does an Attestara Commitment Record (dual-signed, structured terms, on-chain anchored) constitute a legally binding contract between the principals? | 05-legal-enforceability.md, Section 2.1 | Protocol Specification: session lifecycle, Final Agreement structure, Commitment Contract | England & Wales | Must satisfy: offer, acceptance, consideration, intention to create legal relations, certainty of terms. The structured machine-readable format should help with certainty. |
| C2 | Is the on-chain Commitment Record the contract itself, or evidence of a contract formed off-chain during the negotiation session? | 05-legal-enforceability.md, Section 2.1 | Protocol Specification: distinction between negotiation session (off-chain) and commitment anchoring (on-chain) | England & Wales | This distinction matters for enforcement and for the applicable formalities. |
| C3 | Does the formal session structure (credential requirements, signed negotiation turns, on-chain anchoring) reinforce or undermine the presumption of intention to create legal relations in a B2B context? | 05-legal-enforceability.md, Section 2.1 | Protocol Specification: session initiation, credential verification, session anchoring | England & Wales | The formality of the process should reinforce commercial intent, but counsel must confirm. |
| C4 | Does the structured, machine-readable term encoding in the Final Agreement satisfy the certainty of terms requirement? What additional drafting is needed? | 05-legal-enforceability.md, Section 2.1 | Protocol Specification: Final Agreement data structure and term encoding | England & Wales | Courts have struck down agreements where material terms were insufficiently certain. |
| C5 | Same analysis as C1 under the law of a key EU member state (Germany or France recommended). | 05-legal-enforceability.md, Section 2 (general) | Protocol Specification (full doc) | EU (Germany or France) | EU contract formation requirements differ from English law. |
| C6 | Same analysis as C1 under Gibraltar law. | 05-legal-enforceability.md, Section 4 | Protocol Specification (full doc) | Gibraltar | Important for the Foundation's own contracting capacity. |
| C7 | Are on-chain records (Commitment Contract entries, session anchors) admissible as evidence in English courts? What evidential weight would they carry? | 05-legal-enforceability.md, Section 3.3 | Protocol Specification: Commitment Contract architecture, hash anchoring mechanism | England & Wales | Relevant for dispute resolution. |
| C8 | How would cross-border enforcement work for a commitment made via Attestara between a UK party and an EU party, anchored on-chain from a Gibraltar entity? | 05-legal-enforceability.md, Section 6 (Action Items, Priority 3) | 09-investor-one-pager.md (market context: cross-border enterprise use) | England & Wales, EU, Gibraltar | Post-Brexit enforcement of judgments between UK and EU is more complex. |

---

## P2 — Agency Law & AI Authority

The most legally novel questions in the Attestara architecture.

| # | Question | Source | Counsel Should Review | Jurisdiction | Notes |
|---|---------|--------|----------------------|-------------|-------|
| A1 | Does a digitally-signed Authority Credential constitute a valid instrument of actual authority under English agency law? Does it need to be structured as a power of attorney? Does it require a specific written form? | 05-legal-enforceability.md, Section 2.3 | Protocol Specification: Authority Credential structure, credential issuance flow, DID-based identity | England & Wales | The Authority Credential encodes mandate parameters (spend limits, allowed terms, escalation triggers). |
| A2 | Can an AI agent's digital signature constitute valid acceptance on behalf of its principal? Does the Electronic Communications Act 2000 extend to signatures applied by autonomous software? | 05-legal-enforceability.md, Section 2.1 | Protocol Specification: agent signature mechanism, Ed25519 key management, session signing | England & Wales | No direct precedent for autonomous AI agent signatures as contractual acceptance. |
| A3 | If a counterparty verifies an Agent's Authority Credential and ZK proofs, and the agent commits within its verified scope, can the principal disclaim the commitment on the grounds that the agent was "just an AI"? | 05-legal-enforceability.md, Section 2.3 | Protocol Specification: credential verification flow, ZK proof verification, counterparty reliance | England & Wales | This question will likely require judicial determination. Counsel should assess the probable direction. |
| A4 | What is the principal's liability for commitments made by their agent that exceed the agent's verified credential scope? Does the answer differ depending on whether the principal's credential issuance process was negligent? | 05-legal-enforceability.md, Section 2.3 | Protocol Specification: credential issuance, mandate encoding, ZK proof boundaries | England & Wales | Relates to apparent vs actual authority doctrine. |
| A5 | How does English contract law treat commitments made by an AI system that misapplied its own mandate constraints (i.e., the LLM made an error, not a cryptographic failure)? Is the principal bound? | 05-legal-enforceability.md, Section 3.2 (Scenario C) | Protocol Specification: agent decision-making within mandate, escalation triggers | England & Wales | Highest-probability failure mode. A principal may argue the agent's "mistake" should not bind them. |
| A6 | Does the answer to A5 differ depending on whether the counterparty knew it was dealing with an AI agent rather than a human? | 05-legal-enforceability.md, Section 3.2 (Scenario C) | Protocol Specification: session initiation (both parties know they are interacting with AI agents) | England & Wales | In Attestara, counterparties always know they are dealing with AI agents (identity is verified). |

---

## P2 — Electronic Signatures & eIDAS

| # | Question | Source | Counsel Should Review | Jurisdiction | Notes |
|---|---------|--------|----------------------|-------------|-------|
| E1 | Can an AI agent's Ed25519 signature qualify as an Advanced Electronic Signature (AdES) under eIDAS Regulation 910/2014? Specifically: is the signature "uniquely linked to the signatory" and "created by data under the signatory's sole control" when the signatory is an AI agent? | 05-legal-enforceability.md, Section 2.2 | Protocol Specification: Ed25519 key generation, DID registration, key management | EU, UK (retained eIDAS) | The three-tier eIDAS framework (SES, AdES, QES) determines evidential weight. |
| E2 | For eIDAS purposes, is the "signatory" the AI agent itself, or the principal organisation that deployed the agent? Can the principal be the signatory with the agent as an authorised representative? | 05-legal-enforceability.md, Section 2.2 | Protocol Specification: DID hierarchy (organisation DID vs agent DID), Authority Credential linking agent to organisation | EU | Affects which eIDAS tier applies and whether QES could ever be achieved. |
| E3 | Under what circumstances would a Qualified Electronic Signature (QES) be required for Attestara commitment records to be enforceable? | 05-legal-enforceability.md, Section 2.2 | Protocol Specification: commitment record structure, on-chain anchoring | EU | QES requires a qualified certificate from an accredited trust service provider. |
| E4 | How does eIDAS 2.0 (European Digital Identity Wallet framework, implementation 2024-2026) affect Attestara's architecture? Could Agent Authority Credentials be structured as EUDIW-compatible verifiable attestations? | 05-legal-enforceability.md, Section 2.2 | Protocol Specification: Verifiable Credential architecture, Authority Credential structure, DID method | EU | Forward-looking question; may create alignment opportunities or requirements. |

---

## P2 — Liability & Protocol Failures

| # | Question | Source | Counsel Should Review | Jurisdiction | Notes |
|---|---------|--------|----------------------|-------------|-------|
| L1 | If the ZK proof system produces a false positive verification (computationally infeasible but theoretically possible), who bears liability — the relying counterparty or the protocol operator (Attestara Foundation)? | 05-legal-enforceability.md, Section 3.2 (Scenario A) | Protocol Specification: ZK proof generation and verification, Commitment Contract verification logic; Threat Model (if available): T-series threats | England & Wales, Gibraltar | Relevant for Foundation's own liability exposure and Terms of Service drafting. |
| L2 | If a principal's credential issuance process was compromised (Scenario B: credential fraud), does the counterparty have any recourse against the credential verification infrastructure (Attestara), in addition to the principal? | 05-legal-enforceability.md, Section 3.2 (Scenario B) | Protocol Specification: credential issuance flow, Identity Registry, verification process | England & Wales | Important for understanding Attestara Foundation's potential liability. |
| L3 | Can the Attestara Foundation's Terms of Service effectively limit its liability for protocol failures to non-gross-negligence scenarios? What are the enforceability limits of such limitations under English law? | 05-legal-enforceability.md, Section 3.3 | (No specific whitepaper section — this is a ToS drafting question) | England & Wales | UCTA 1977 and CRA 2015 impose limits on liability exclusion clauses. |
| L4 | What governing law and dispute resolution mechanism should the Protocol Rules and Terms of Service specify? Is arbitration preferable to court litigation for a cross-border protocol? | 05-legal-enforceability.md, Section 3.3 | 09-investor-one-pager.md (market: cross-border B2B enterprise) | England & Wales, Gibraltar | London arbitration (LCIA) is a common choice for international commercial disputes. |
| L5 | What is the Commitment Record's legal status — is it evidence (supporting proof of a contract) or is it determinative (the contract itself)? Should the Terms of Service clarify this distinction? | 05-legal-enforceability.md, Section 3.3 | Protocol Specification: Commitment Contract, session lifecycle, Final Agreement | England & Wales | Related to C2 above. Important for managing user expectations and liability. |

---

## P3 — IP & Licensing

| # | Question | Source | Counsel Should Review | Jurisdiction | Notes |
|---|---------|--------|----------------------|-------------|-------|
| IP1 | Does LGPL v3 for the reference SDK create practical adoption barriers for enterprise customers whose legal teams have blanket policies against copyleft dependencies? Would Apache 2.0 better serve commercial adoption? | 06-ip-licensing.md, Section 3.3 | 06-ip-licensing.md, Section 7 (decision framework for open vs proprietary) | UK, EU, US | LGPL allows use as library in proprietary software, but "copyleft" label triggers enterprise legal reviews. |
| IP2 | Should the ZK circuit library use Apache 2.0 (explicit patent grant) instead of MIT? Given the defensive patent strategy, does Apache 2.0 provide better downstream protection? | 06-ip-licensing.md, Sections 3.2 and 5 | 06-ip-licensing.md, Section 5 (defensive patent strategy) | US (patent law), UK, EU | Apache 2.0 includes explicit patent licence grant that MIT lacks. |
| IP3 | Is CC BY 4.0 compatible with W3C Document License and DIF's Apache 2.0 licence for specification submissions? Are there any issues with submitting a CC BY 4.0 spec to standards bodies? | 06-ip-licensing.md, Section 3.1 | 06-ip-licensing.md, Section 6 (fork risk: "Donate the specification to a neutral standards body") | International | W3C and DIF have their own IP policies that may conflict with CC BY 4.0. |
| IP4 | Is the defensive patent strategy (file provisionals on novel cryptographic combinations, licence royalty-free to protocol implementers) the right approach for a EUR 500K seed-stage startup? Should Attestara instead commit to a patent non-assertion pledge? | 06-ip-licensing.md, Section 5 | 06-ip-licensing.md, Section 5 (full patent strategy) | US, International (PCT) | Cost: $15K-$30K provisionals, $100K-$200K full prosecution. Significant spend for a seed company. |
| IP5 | What is the filing deadline for provisional patent applications relative to first public disclosure of the protocol specification? Has the clock started? | 06-ip-licensing.md, Section 5 | Protocol Specification: publication status (currently unpublished draft per Section 2.1) | US | US provisional filing must occur within 12 months of first public disclosure. Spec is currently unpublished. |
| IP6 | Which jurisdictions beyond the US are worth pursuing for PCT patent applications at seed stage? | 06-ip-licensing.md, Section 5 | 09-investor-one-pager.md (market: EU and UK enterprise focus) | International | Budget constraints suggest prioritizing US + EP (European Patent) only. |
| IP7 | Should "Attestara" trademark registrations in Gibraltar, EU (EUIPO), UK (UKIPO), and US (USPTO) be filed simultaneously or phased? | 06-ip-licensing.md, Section 4 | 06-ip-licensing.md, Section 4 (trademark strategy) | Gibraltar, EU, UK, US | Simultaneous filing provides broader protection but higher upfront cost. |
| IP8 | What form of Contributor Licence Agreement (CLA) is appropriate for the open-source components? Apache-style individual CLA, or Developer Certificate of Origin (DCO)? | 06-ip-licensing.md (implied; not explicitly addressed) | 06-ip-licensing.md, Section 3 (all open-source components) | International | CLA is needed before accepting external contributions to the reference SDK. |
| IP9 | Should an "Attestara Compatible" certification mark be filed separately? What are the requirements for maintaining a certification mark? | 06-ip-licensing.md, Section 4 | 06-ip-licensing.md, Section 4 (certification mark concept) | EU, UK, US | Certification marks have specific governance and quality control requirements. |
| IP10 | What data ownership and usage rights should the Enterprise SDK commercial licence specify? The current plan states the buyer's data is their own — what specific clauses are needed? | 06-ip-licensing.md, Section 3.4 | 06-ip-licensing.md, Section 3.4 (Enterprise SDK licence terms) | UK, EU | GDPR implications if negotiation session metadata contains personal data identifiers. |

---

## P4 — DAO Governance & Legal Wrapper

| # | Question | Source | Counsel Should Review | Jurisdiction | Notes |
|---|---------|--------|----------------------|-------------|-------|
| D1 | Is a Gibraltar CLG, Cayman Foundation Company, or Swiss Verein the optimal jurisdiction for the Attestara Foundation, given the decision framework in 13-dao-legal-wrapper-v2.md Section 4? | 13-dao-legal-wrapper-v2.md, Section 4 | 13-dao-legal-wrapper-v2.md, Sections 3-4 (full comparative analysis and decision framework) | Gibraltar, Cayman, Switzerland | Decision depends on investor preferences, DLT licence outcome (G1), and operational priorities. |
| D2 | Can the three-tier governance model (Board > Technical Committee > DAO on-chain voting) be encoded in Foundation Articles of Association, and what are the enforceability mechanisms if on-chain votes conflict with Board decisions? | 13-dao-legal-wrapper-v2.md, Section 2 | 13-dao-legal-wrapper-v2.md, Section 2 (governance architecture diagram) | Chosen jurisdiction | Board ratification of DAO votes above threshold is proposed; legal mechanism for this needs definition. |
| D3 | What legal protections exist for Technical Committee members who exercise their veto on circuit/verification key changes? Can they be personally liable for veto decisions? | 13-dao-legal-wrapper-v2.md, Section 2 | 13-dao-legal-wrapper-v2.md, Section 2 (Technical Committee role: "Veto on circuit/verification key changes") | Chosen jurisdiction | Technical Committee members serve 2-year terms; veto power creates personal liability exposure. |
| D4 | For a Gibraltar CLG: does the governance token constitute a "membership interest" that gives token holders legal standing as CLG members? | 13-dao-legal-wrapper-v2.md, Sections 3 and 5 | 13-dao-legal-wrapper-v2.md, Section 5 (token design: governance rights only, non-transferable) | Gibraltar | CLG members have legal rights; aligning token holding with membership status requires care. |
| D5 | For a Cayman Foundation Company: is the additional complexity of a Foundation + Gibraltar operating subsidiary justified by the institutional credibility benefit? | 13-dao-legal-wrapper-v2.md, Section 3 Option B | 13-dao-legal-wrapper-v2.md, Section 3 Option B (hybrid structure consideration) | Cayman, Gibraltar | Common pattern in DeFi: Cayman Foundation holds IP/governance, operating company handles commercial. |
| D6 | Can a Swiss Association (Verein) be established later (Year 2-3) without restructuring the initial Gibraltar or Cayman entity? | 13-dao-legal-wrapper-v2.md, Section 3 Option C | 13-dao-legal-wrapper-v2.md, Section 4 (decision framework) | Switzerland, Gibraltar | Phased approach: start with Gibraltar, add Swiss entity for institutional credibility if needed. |
| D7 | For the governance token: in each candidate jurisdiction, does it constitute a security, financial instrument, or virtual asset? Specific analysis needed under: Gibraltar (POCA 2015, FSA 2019), Cayman (VASP Act 2020), Switzerland (FINMA token guidance). | 13-dao-legal-wrapper-v2.md, Section 5 | 13-dao-legal-wrapper-v2.md, Section 5 (token properties and regulatory caution section) | Gibraltar, Cayman, Switzerland | Switzerland has the most developed guidance; FINMA has recognised governance-only tokens as typically not securities. |
| D8 | What investment instrument is most appropriate for the seed round in each candidate jurisdiction? Gibraltar CLG (SAFE possible?), Cayman Foundation (SAFEs established), Swiss Verein (convertible loans/Wandeldarlehen more standard). | 13-dao-legal-wrapper-v2.md, Section 6 | 09-investor-one-pager.md, Section "The Ask" | Gibraltar, Cayman, Switzerland | Must be resolved before fundraising closes. |
| D9 | How should the relationship between on-chain DAO governance votes and off-chain Foundation Board ratification be legally documented? What happens if the Board declines to ratify? | 13-dao-legal-wrapper-v2.md, Section 2 | 13-dao-legal-wrapper-v2.md, Section 2 (governance architecture) | Chosen jurisdiction | The Articles must define: which DAO votes require Board ratification, the threshold, and the consequences of non-ratification. |
| D10 | Who are the primary institutional investors being targeted, and does their preference affect jurisdiction choice? (European VCs prefer Gibraltar/Switzerland; crypto-native funds prefer Cayman.) | 13-dao-legal-wrapper-v2.md, Section 4 (Questions to answer before deciding, #1) | 09-investor-one-pager.md (investor positioning) | All | This is a strategic question, not purely legal, but counsel's input on investor expectations is valuable. |

---

## P5 — Regulatory Compliance

| # | Question | Source | Counsel Should Review | Jurisdiction | Notes |
|---|---------|--------|----------------------|-------------|-------|
| R1 | How do Attestara's authority delegation, commitment recording, and audit trail features map to EU AI Act Article 9 risk management obligations for high-risk agentic AI systems? | 09-investor-one-pager.md (EU AI Act Article 9 reference) | Protocol Specification (full doc), especially: authority credentials, commitment records, session audit trail | EU | Article 9 enforcement begins August 2026. Compliance mapping supports the go-to-market narrative. |
| R2 | How does Attestara's protocol map to DORA requirements for ICT risk management and third-party oversight in financial services? | 09-investor-one-pager.md (DORA reference: "in force since January 2025") | Protocol Specification: commitment records as audit trail, identity verification | EU | Primary pilot customers are in financial services. DORA compliance mapping is a sales enabler. |
| R3 | Does the Managed Prover Service (SaaS) require a GDPR Data Processing Agreement? The Commitment Contract records agreement hashes (not personal data), but negotiation session metadata may contain personal data identifiers. | 06-ip-licensing.md, Section 3.5 | Protocol Specification: session metadata, prover service architecture | EU | DPA template needed for SaaS customers. Scope depends on whether metadata contains personal data. |
| R4 | If Attestara obtains a GFSC DLT Provider licence, what are the ongoing compliance requirements (reporting, audits, capital requirements)? | 05-legal-enforceability.md, Section 5 | (GFSC DLT framework regulations — external reference) | Gibraltar | Depends on outcome of G1. Only relevant if DLT licence is required. |

---

## Cross-Reference: Questions That Block Other Questions

Some questions have dependencies. Counsel should be aware of the following blocking relationships:

| Blocking Question | Blocked Questions | Rationale |
|-------------------|-------------------|-----------|
| G1 (DLT licence required?) | G2, D1, R4 | If DLT licence is required, it affects corporate structure choice, jurisdiction decision, and ongoing compliance. |
| G3 (SAFE with CLG?) | D8 | If CLG cannot accommodate SAFEs, investment structure must be redesigned. |
| D1 (Jurisdiction selection) | D2, D3, D4, D9 | Governance document specifics depend on which jurisdiction's company law applies. |
| C1 (Commitment Record binding?) | L1, L3, L5 | Liability and ToS questions depend on whether the commitment is legally binding in the first place. |
| A2 (AI agent signature valid?) | A3, A4, A5, A6 | If an AI agent cannot validly sign, the subsequent questions about scope and error are moot. |
| IP1 (LGPL vs Apache 2.0) | IP8 (CLA design) | CLA terms depend on the chosen licence. |

---

## Document Reference Guide for Counsel

When engaging counsel, provide the following documents for each workstream:

| Workstream | Essential Documents | Supporting Documents |
|-----------|-------------------|---------------------|
| P1: Gibraltar Corporate & DLT | 05-legal-enforceability.md (Sections 4-5), 13-dao-legal-wrapper-v2.md (Sections 3-4) | 09-investor-one-pager.md |
| P2: Contract Enforceability | 05-legal-enforceability.md (Sections 2-3), Protocol Specification | 09-investor-one-pager.md (market context) |
| P2: Agency & AI Authority | 05-legal-enforceability.md (Sections 2.3, 3.2), Protocol Specification | Threat Model (if available) |
| P2: eIDAS & Signatures | 05-legal-enforceability.md (Section 2.2), Protocol Specification | (eIDAS 2.0 implementation guidance — external) |
| P3: IP & Licensing | 06-ip-licensing.md (full document) | Protocol Specification (for patent claims) |
| P4: DAO Governance | 13-dao-legal-wrapper-v2.md (full document) | 05-legal-enforceability.md (Section 4), 09-investor-one-pager.md |
| P5: Regulatory | 09-investor-one-pager.md, Protocol Specification | 05-legal-enforceability.md (Section 5) |

---

*Attestara Legal Questions Matrix v1.0*
*54 open questions across 8 categories and 6 jurisdictions*
*Prepared March 2026*
