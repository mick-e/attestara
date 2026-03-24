# Attestara — Legal Counsel Engagement Plan
## Comprehensive Roadmap for Legal Workstreams
### v1.0 — March 2026

---

**Purpose:** This document provides a structured plan for engaging legal counsel across all Attestara workstreams, organized by priority and timeline. It is designed to be shared directly with prospective law firms as a scope-of-work brief.

**Budget context:** The seed round targets EUR 500,000 with 16% (EUR 80,000) allocated to legal. The plan below totals EUR 68,000-107,000, with priority ordering to allow phased spending within budget.

---

## Priority 1: Gibraltar Corporate & DLT (Month 1-2)

### Scope

Company formation, DLT Provider licence assessment, and operational setup for the Attestara Foundation entity. The founding team is based in Gibraltar, and the investor one-pager (doc 09) identifies Gibraltar as the operational base.

### Key Questions to Answer

1. **Does Attestara require a GFSC DLT Provider licence?** The Commitment Contract records agreement hashes on-chain but does not custody assets. Does recording agreement hashes constitute "storing or transmitting value belonging to others" under the Financial Services (Distributed Ledger Technology Providers) Regulations 2017? (Ref: 05-legal-enforceability.md, Section 5)
2. **Optimal corporate structure: CLG vs Ltd?** A Company Limited by Guarantee (non-profit, no share capital) is proposed for the Foundation. However, seed investors require equity-like instruments (SAFEs or convertible notes). Can a CLG accommodate this, or is a parallel private company limited by shares required? (Ref: 13-dao-legal-wrapper-v2.md, Section 6)
3. **Governance token classification.** Does the proposed governance token (non-transferable for 12 months, no yield, governance rights only) require classification under Gibraltar's Proceeds of Crime Act 2015 or Financial Services Act 2019? (Ref: 13-dao-legal-wrapper-v2.md, Section 5)
4. **Tax implications of token-weighted governance.** Are there corporate tax, income tax, or benefit-in-kind implications for team members receiving governance token allocations under Gibraltar tax law?
5. **Employment and contractor arrangements.** What are the requirements for employing staff or engaging contractors from a Gibraltar entity, particularly for remote team members in other jurisdictions?
6. **Banking.** Practical guidance on establishing banking relationships for a DLT-focused entity in Gibraltar.

### Recommended Firms (Gibraltar DLT Specialists)

- **ISOLAS LLP** — Gibraltar's largest law firm; extensive DLT and fintech practice; advised on multiple GFSC DLT licence applications
- **Hassans International Law Firm** — Long-established Gibraltar firm; corporate and financial services practice with DLT experience
- **Triay & Triay** — Corporate and commercial practice; experience with Gibraltar company formations and regulatory matters
- **Attias & Levy** — Boutique firm with financial services and DLT focus
- **TSN (Turner Sills Nicolas)** — Specialist fintech and DLT regulatory practice

### Estimated Budget

EUR 15,000-25,000

| Item | Estimate |
|------|----------|
| DLT licence opinion (written) | EUR 5,000-8,000 |
| Corporate structure recommendation (written) | EUR 3,000-5,000 |
| Company incorporation (CLG or Ltd) | EUR 2,000-4,000 |
| Governance token classification opinion | EUR 3,000-5,000 |
| Banking and operational setup advice | EUR 2,000-3,000 |

### Deliverables

- [ ] Written opinion: DLT Provider licence requirement assessment
- [ ] Written recommendation: Optimal corporate structure (CLG, Ltd, or hybrid)
- [ ] Governance token classification opinion under Gibraltar law
- [ ] Company formation documents (Memorandum and Articles of Association)
- [ ] Tax and employment summary memo

### Selection Criteria (Priority 1 Counsel)

- Direct experience with GFSC DLT licence applications
- Familiarity with Gibraltar company law (CLG and Ltd structures)
- Existing relationships with GFSC
- Ability to provide written opinions suitable for investor due diligence

---

## Priority 2: Smart Contract Enforceability (Month 2-3)

### Scope

Formal legal opinions on whether Attestara's on-chain commitment records constitute binding agreements, and whether AI agents can legally bind their principals through the protocol's authority delegation mechanism.

This is the most commercially important legal workstream. Pilot customers will need assurance that commitments made through Attestara are enforceable. The legal analysis in 05-legal-enforceability.md identifies the key questions; counsel must provide formal answers.

### Key Questions (from 05-legal-enforceability.md)

**Contract Formation:**

1. Do dual-signed on-chain Commitment Records constitute valid contracts under English law? Specifically, does the combination of cryptographic signatures, structured terms, and on-chain anchoring satisfy the requirements of offer, acceptance, consideration, intention to create legal relations, and certainty of terms? (Ref: Section 2.1)
2. Does the on-chain Commitment Record function as evidence of the contract, or is it the contract itself? What is the distinction and does it matter for enforcement?

**Agency Law:**

3. Does a Principal's issuance of an Authority Credential (a digitally-signed delegation of authority with encoded mandate parameters) create a valid agency relationship under English law? Does the Authority Credential need to be structured as a formal power of attorney? (Ref: Section 2.3)
4. Can an AI agent's digital signature constitute valid acceptance on behalf of its principal? The Electronic Communications Act 2000 and Electronic Signatures Regulations 2002 recognise electronic signatures, but do they extend to signatures applied by autonomous software? (Ref: Section 2.1)
5. If an agent commits within its verified credential scope, can the principal disclaim the commitment on the grounds that the agent was "just an AI"? (Ref: Section 2.3)
6. What is the principal's liability for commitments made by their agent that exceed the agent's verified credential scope? Does the answer differ depending on whether the principal's credential issuance process was negligent? (Ref: Section 2.3)

**eIDAS and Electronic Signatures:**

7. Can an AI agent's Ed25519 signature qualify as an Advanced Electronic Signature (AdES) under eIDAS? Does the agent need to be the "signatory" or can the principal organisation be the signatory with the agent as an authorised representative? (Ref: Section 2.2)
8. Under what circumstances would a Qualified Electronic Signature (QES) be required for Attestara commitment records?
9. How does eIDAS 2.0 (European Digital Identity Wallet framework) affect the architecture? Could Agent Authority Credentials be structured as EUDIW-compatible verifiable attestations? (Ref: Section 2.2)

**Evidence and Enforcement:**

10. Are on-chain records admissible as evidence in English courts? What weight would they carry?
11. How would cross-border enforcement work for commitments made via Attestara between parties in different jurisdictions (Gibraltar/UK/EU)?

**Liability for Protocol Failures:**

12. If the ZK proof system produces a false verification (computationally infeasible but relevant as a risk scenario), who bears liability — the relying counterparty or the protocol operator? (Ref: Section 3.2, Scenario A)
13. If the underlying LLM makes an error in applying mandate constraints (the highest-probability failure mode), is the principal bound by the resulting commitment? Does it matter whether the counterparty knew it was dealing with an AI? (Ref: Section 3.2, Scenario C)

### Jurisdictions

- **England & Wales** — Primary jurisdiction for analysis; most Attestara pilot customers expected to be UK-based; richest body of contract and agency law
- **EU (recommend Germany or France)** — Key EU member state for eIDAS analysis and cross-border enforcement; pick based on counsel availability
- **Gibraltar** — Operational base; important for Foundation's own contracting capacity

### Recommended Approach

Engage separate counsel per jurisdiction. The English law opinion is the highest priority and should be commissioned first. EU and Gibraltar opinions can run in parallel during Month 3.

**For English law:**
- **Bird & Bird LLP** — Strong tech/IP practice; experience with smart contract and digital signature enforceability
- **Mishcon de Reya** — Active in digital assets and Web3; MDR Lab accelerator demonstrates tech engagement
- **Shoosmiths LLP** — Technology contracts practice; pragmatic approach suited to startup budgets
- **Lewis Silkin LLP** — Technology and digital media practice; experience with novel tech legal questions
- **Fieldfisher LLP** — Strong in fintech and digital assets; Brussels office for EU coordination

**For EU law (Germany):**
- **Hogan Lovells (Frankfurt)** — DLT and fintech regulatory practice
- **CMS (Berlin)** — Strong digital economy and AI practice

### Estimated Budget

EUR 20,000-35,000

| Item | Estimate |
|------|----------|
| English law opinion (contract formation + agency) | EUR 10,000-15,000 |
| EU/eIDAS opinion (selected member state) | EUR 5,000-10,000 |
| Gibraltar enforceability opinion | EUR 3,000-5,000 |
| Cross-border enforcement memo | EUR 2,000-5,000 |

### Deliverables

- [ ] Formal legal opinion: Enforceability of Attestara Commitment Records under English law
- [ ] Formal legal opinion: AI agent authority and principal liability under English agency law
- [ ] Formal legal opinion: eIDAS classification of Agent signatures and AdES qualification
- [ ] Formal legal opinion: Enforceability under selected EU member state law
- [ ] Cross-border enforcement analysis memo
- [ ] Publishable summary of opinions (redacted for pilot customer due diligence)

---

## Priority 3: IP & Licensing (Month 2-4)

### Scope

Review and finalize the IP and licensing model described in 06-ip-licensing.md. The strategy uses a layered approach: open protocol specification (CC BY 4.0), open ZK circuits (MIT), open-source reference SDK (LGPL v3), proprietary enterprise SDK and SaaS services.

### Key Questions

**Licence Selection:**

1. **LGPL v3 for the reference SDK — implications for enterprise customers?** LGPL allows use as a library in proprietary software, but some enterprise legal teams have blanket policies against LGPL dependencies. Would Apache 2.0 be more commercially practical? What are the trade-offs for protecting SDK improvements? (Ref: 06-ip-licensing.md, Section 3.3)
2. **MIT for ZK circuits — is this the right choice?** MIT is maximally permissive. Is there any reason to prefer Apache 2.0 (which includes explicit patent grant) for the circuit library? (Ref: Section 3.2)
3. **CC BY 4.0 for protocol specification — compatibility with standards bodies?** If the specification is submitted to W3C (Credentials Community Group) or DIF (Decentralized Identity Foundation), are there any licence compatibility issues with CC BY 4.0? W3C uses its own Document License; DIF uses Apache 2.0. (Ref: Section 3.1)
4. **Apache 2.0 vs MIT for ZK circuits specifically.** Apache 2.0 includes an explicit patent licence grant that MIT does not. Given the defensive patent strategy (Section 5), would Apache 2.0 provide better protection for downstream users?

**Patent Strategy:**

5. **Defensive vs offensive vs none.** The current plan (06-ip-licensing.md, Section 5) recommends defensive patents on novel cryptographic combinations. Is this the right approach? What is the cost-benefit for a pre-revenue startup? Should Attestara instead commit to a patent non-assertion pledge (e.g., the Open Patent Pledge)?
6. **Provisional patent timing.** First public disclosure (protocol specification) has not yet occurred. What is the timeline for filing provisional applications relative to planned publication? (Ref: Section 5)
7. **PCT strategy.** Which jurisdictions are worth pursuing beyond US provisional filings for a EUR 500K seed-funded startup? (Ref: Section 5)

**Trademark:**

8. **"Attestara" trademark registration.** Priority jurisdictions identified as Gibraltar, EU (EUIPO), UK (UKIPO), US (USPTO). Should all four be filed simultaneously, or phased? (Ref: Section 4)
9. **"Attestara Compatible" certification mark.** Is a separate certification mark application needed, and what are the requirements? (Ref: Section 4)

**Contributor Licence Agreement:**

10. **CLA design.** What form of Contributor Licence Agreement is appropriate for the open-source components? Apache-style individual CLA, or Developer Certificate of Origin (DCO)?

### Recommended Approach

A single firm with IP, open-source licensing, and patent expertise can handle this entire workstream.

**Recommended firms:**
- **Moorcrofts LLP** — UK firm specialising in open-source licensing and tech IP; experienced with open-core models
- **Bird & Bird LLP** — If already engaged for Priority 2, can bundle IP work
- **Bristows LLP** — Strong IP and patent practice; tech sector focus
- **Kilburn & Strode** — Patent attorneys with software/crypto patent experience

### Estimated Budget

EUR 8,000-12,000

| Item | Estimate |
|------|----------|
| Licence review and recommendation memo | EUR 2,000-3,000 |
| Patent strategy opinion | EUR 2,000-4,000 |
| Trademark filings (4 jurisdictions) | EUR 2,000-3,000 |
| CLA and SDK licence header drafting | EUR 1,000-2,000 |
| Certification mark assessment | EUR 1,000 |

### Deliverables

- [ ] Written recommendation: Final licence selection for each asset class (with reasoning)
- [ ] Patent strategy opinion (defensive vs pledge vs none)
- [ ] Trademark applications filed in priority jurisdictions
- [ ] Contributor Licence Agreement (final, ready to deploy)
- [ ] SDK licence header templates (for all open-source repositories)
- [ ] Standards body licence compatibility memo (W3C, DIF)

---

## Priority 4: DAO Governance Legal Wrapper (Month 4-6)

### Scope

Formal legal structure for the dual governance model: DAO governance layer for multi-party ecosystems, plus bilateral P2P deployment for regulated enterprises. The analysis in 13-dao-legal-wrapper-v2.md identifies three jurisdiction options (Gibraltar, Cayman, Switzerland) and recommends a structured decision process.

### Key Questions (from 13-dao-legal-wrapper-v2.md)

**Jurisdiction Selection:**

1. Can the Gibraltar CLG structure accommodate the hybrid DAO/Foundation governance model (Board of Directors + Technical Committee + on-chain DAO token voting)? (Ref: Section 3, Option A)
2. Is a Cayman Foundation Company + Gibraltar operating subsidiary structure worth the additional complexity and cost? Under what conditions would this be preferred? (Ref: Section 3, Option B)
3. If institutional credibility requires Swiss recognition, can a Swiss Association (Verein) be established later (Phase 2) without restructuring the Gibraltar entity? (Ref: Section 3, Option C)

**Governance Token:**

4. Does the governance token (non-transferable for 12 months, no yield, governance rights only, required stake for protocol participation) constitute a security, financial instrument, or virtual asset under the chosen jurisdiction's law? (Ref: Section 5)
5. What are the regulatory requirements for token issuance in each candidate jurisdiction? (Ref: Section 5)

**Investment Structure:**

6. Can SAFE instruments be used with a Gibraltar CLG, or is a parallel structure required? (Ref: Section 6)
7. What is the most investor-friendly seed investment instrument compatible with the chosen corporate structure?

**Dual Governance Model:**

8. How should the relationship between on-chain DAO votes and Foundation Board ratification be legally documented? What happens if the Board declines to ratify a DAO vote?
9. What legal protections exist for Technical Committee members who exercise their veto on circuit/verification key changes?
10. How does the dual governance model (DAO for open ecosystems, P2P bilateral for regulated enterprises) affect the Foundation's legal structure?

### Recommended Approach

Follow the phased process recommended in 13-dao-legal-wrapper-v2.md:

- **Month 4:** Commission one-page legal opinions from counsel in Gibraltar, Cayman, and Switzerland (EUR 1,500-3,000 each) focused on DLT licence requirements, governance token classification, and investment structure compatibility
- **Month 5:** Share opinions with target seed investors for jurisdiction preference input
- **Month 5-6:** Select jurisdiction, incorporate, and draft governance documents

### Recommended Firms

- **Gibraltar:** Same firm as Priority 1 (continuity)
- **Cayman:** Walkers, Appleby, or Ogier (all have established Foundation Company practices)
- **Switzerland:** Lenz & Staehelin, Walder Wyss, or MME (Zug-based, extensive blockchain foundation experience)

### Estimated Budget

EUR 15,000-20,000

| Item | Estimate |
|------|----------|
| Tri-jurisdiction opinions (3 x EUR 2,000-3,000) | EUR 6,000-9,000 |
| Governance token regulatory analysis | EUR 3,000-5,000 |
| Foundation Articles and governance documents | EUR 3,000-5,000 |
| Technical Committee charter (legal review) | EUR 1,000-2,000 |
| Investment instrument structuring advice | EUR 2,000-3,000 |

### Deliverables

- [ ] Written opinions: Jurisdiction comparison (Gibraltar vs Cayman vs Switzerland)
- [ ] Governance token regulatory classification (chosen jurisdiction)
- [ ] Foundation Articles of Association (or equivalent)
- [ ] Technical Committee charter (legally reviewed)
- [ ] DAO governance framework document (legal relationship between on-chain and off-chain governance)
- [ ] Template SAFE or convertible note adapted to chosen jurisdiction

---

## Priority 5: Regulatory Compliance (Month 6+)

### Scope

Regulatory compliance assessments for Attestara deployments in key regulatory frameworks. These are driven by customer requirements — pilot customers in financial services and regulated industries will require compliance documentation.

### Key Assessments

1. **EU AI Act Article 9 compliance.** Attestara's pilot customers deploying high-risk AI systems must comply with Article 9 (risk management). Assessment of how Attestara's authority delegation, commitment recording, and audit trail features map to Article 9 obligations. This directly supports the go-to-market narrative.
2. **DORA (Digital Operational Resilience Act) compliance mapping.** For financial services pilots, map Attestara's protocol features to DORA requirements for ICT risk management and third-party oversight. DORA has been in force since January 2025.
3. **GDPR Data Processing Agreement.** For the Managed Prover Service (SaaS), a DPA template is required. The Commitment Contract records agreement hashes, not personal data, but the negotiation session metadata may contain personal data identifiers.
4. **Gibraltar-specific regulatory compliance.** Ongoing compliance requirements under the chosen regulatory framework (DLT Provider licence conditions, if applicable).

### Estimated Budget

EUR 10,000-15,000 per assessment (EU AI Act and DORA are the immediate priorities)

| Item | Estimate |
|------|----------|
| EU AI Act Article 9 mapping | EUR 5,000-8,000 |
| DORA compliance mapping | EUR 5,000-8,000 |
| GDPR DPA template | EUR 2,000-3,000 |
| Gibraltar ongoing compliance advice | EUR 3,000-5,000 (annual) |

### Deliverables

- [ ] EU AI Act Article 9 compliance assessment (publishable for customer due diligence)
- [ ] DORA compliance mapping document
- [ ] GDPR DPA template for Managed Prover Service
- [ ] Customer-facing compliance summary sheet

---

## Budget Summary

| Priority | Workstream | Timeline | Budget Range |
|----------|-----------|----------|-------------|
| 1 | Gibraltar Corporate & DLT | Month 1-2 | EUR 15,000-25,000 |
| 2 | Smart Contract Enforceability | Month 2-3 | EUR 20,000-35,000 |
| 3 | IP & Licensing | Month 2-4 | EUR 8,000-12,000 |
| 4 | DAO Governance Legal Wrapper | Month 4-6 | EUR 15,000-20,000 |
| 5 | Regulatory Compliance | Month 6+ | EUR 10,000-15,000 |
| **Total** | | **Month 1-6+** | **EUR 68,000-107,000** |

This aligns with the EUR 80,000 legal budget from the seed round (16% of EUR 500,000). Priorities 1-3 (EUR 43,000-72,000) are essential before or during fundraising. Priorities 4-5 can be partially deferred if budget is tight.

### Phased Spending Profile

| Month | Cumulative Spend (Low) | Cumulative Spend (High) |
|-------|----------------------|------------------------|
| Month 1-2 | EUR 15,000 | EUR 25,000 |
| Month 3 | EUR 35,000 | EUR 60,000 |
| Month 4 | EUR 43,000 | EUR 72,000 |
| Month 5-6 | EUR 58,000 | EUR 92,000 |
| Month 6+ | EUR 68,000 | EUR 107,000 |

---

## Selection Criteria for All Counsel

When evaluating law firms across all workstreams, apply the following criteria:

1. **DLT/blockchain experience** — Demonstrated track record advising blockchain protocols, DLT businesses, or crypto-asset issuers. Not merely "interested in blockchain" but having completed relevant engagements.
2. **Financial services regulatory knowledge** — Attestara's primary market is enterprise financial services. Counsel must understand the regulatory environment (GFSC, FCA, ESMA, DORA) that Attestara's customers operate in.
3. **Cross-border capability** — The protocol operates across Gibraltar, UK, and EU jurisdictions. Firms with offices or established referral networks in multiple jurisdictions are preferred.
4. **AI governance familiarity** — This is an emerging area. Firms that have engaged with the EU AI Act, AI agent liability questions, or autonomous system governance have an advantage. Do not disqualify otherwise strong firms on this criterion alone.
5. **Willingness to provide publishable opinion summaries** — Attestara needs customer-facing legal opinion summaries (redacted from full opinions) to support enterprise sales and investor due diligence. Counsel must be willing to produce these.
6. **Startup-appropriate billing** — Fixed-fee or capped-fee arrangements are strongly preferred. Hourly billing without caps is a last resort. Some firms offer startup/emerging company programmes with discounted rates.
7. **Responsiveness** — Attestara is operating on a 6-month timeline with regulatory deadlines (EU AI Act Article 9 enforcement in August 2026). Counsel that cannot commit to defined response times should not be engaged.

---

## Engagement Process

### Step 1: Initial Outreach (Week 1)

Send this document (or a tailored excerpt) to 2-3 firms per workstream. Request:
- Confirmation of relevant experience
- Proposed fee structure (fixed fee preferred)
- Estimated timeline
- Named partner and associate who would handle the work
- Conflicts check

### Step 2: Selection (Week 2-3)

Evaluate responses against selection criteria. Prefer firms that can handle multiple workstreams (reduces coordination overhead). A single firm covering Priorities 1 and 4 (both Gibraltar-focused) is ideal.

### Step 3: Engagement Letters (Week 3-4)

Execute engagement letters with clear scope, fixed or capped fees, defined deliverables, and timeline commitments.

### Step 4: Kick-off (Week 4)

Provide counsel with the full Attestara document set:
- Protocol Specification (01-protocol-spec.md)
- Legal Enforceability Framework (05-legal-enforceability.md)
- IP and Licensing Strategy (06-ip-licensing.md)
- Investor One-Pager (09-investor-one-pager.md)
- DAO Legal Wrapper Structure (13-dao-legal-wrapper-v2.md)
- Threat Model (if available)

---

*Attestara Counsel Engagement Plan v1.0*
*Prepared March 2026*
