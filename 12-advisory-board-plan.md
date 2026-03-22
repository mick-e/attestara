# AgentClear — Advisory Board and Technical Credibility Plan
## v0.1

---

## 1. Why Advisors Matter for AgentClear

AgentClear requires credibility across four distinct communities simultaneously:
- **ZK cryptography community** — to validate that the protocol is technically sound
- **Financial market infrastructure** — to validate that the clearing house analogy is architecturally correct and the solution fits regulated markets
- **EU AI Act / regulatory policy** — to validate that the governance architecture satisfies regulatory requirements
- **Enterprise procurement / Fortune 500** — to validate that this solves a real enterprise problem someone will pay to fix

Without credibility in each, the protocol faces a different objection at every conversation:
- Investors ask: "Has anyone serious in ZK looked at this?"
- Enterprise buyers ask: "Is this EU AI Act compliant?"
- Standards bodies ask: "Who from financial market infrastructure is behind this?"
- ZK researchers ask: "Has this been peer reviewed?"

The advisory board closes each of these gaps. Advisors are not for vanity — they are specific credibility assets deployed against specific objections.

---

## 2. Advisory Profiles Required

### 2.1 ZK Cryptography Advisor

**Role:** Validates the technical soundness of the ZK circuit design and proof system choices. Provides academic credibility. Can provide quotes and references for investor materials and standards submissions.

**What they bring:**
- Signal to the ZK community that the protocol is technically respectable
- Access to ZK academic networks (useful for recruiting engineers)
- Potential to co-author a paper on the protocol's novel contributions
- Ability to identify technical flaws before they become public

**Ideal profile:**
- Active researcher or practitioner in ZK proofs (Groth16/PLONK/STARKs)
- Academic affiliation with credible university (ideally European — ETH Zurich, TU Berlin, EPFL, UCL, or equivalent)
- Some applied ZK experience (DeFi, ZK identity, or ZK rollups)
- Willing to be named publicly

**Target names to research:**
- Researchers associated with Polygon zkEVM, Aztec Protocol, or StarkWare who are not conflicted
- Academic authors of papers in ZK identity (the arXiv DID/VC paper authors are a natural starting point — Rodriguez Garzon et al.)
- 0xPARC community members (open ZK research community)

**Compensation:** Typical advisor equity (0.1–0.25% with 2-year vest), plus nominal consulting rate for specific technical review work.

---

### 2.2 Financial Market Infrastructure Advisor

**Role:** Validates that AgentClear's architecture correctly addresses the settlement and commitment problem in financial markets. Provides institutional credibility with FSI buyers. Can open doors to potential pilot customers.

**What they bring:**
- Credibility with CISOs and CTOs in financial services
- Understanding of how existing clearing house infrastructure actually works (the London Clearing House / CCP model)
- Relationships with potential enterprise pilot customers
- Ability to articulate the regulatory alignment (DORA, SMCR) in terms financial services buyers understand

**Ideal profile:**
- 15+ years in financial market infrastructure, central banking, or financial technology
- Experience with clearing houses, CCPs, or post-trade infrastructure
- Ideally current or former senior role at: SWIFT, LCH, DTCC, a major investment bank's post-trade division, or a central bank's fintech/digital currency team
- European focus preferred (EU AI Act relevance; proximity to pilot market)
- Comfortable with the blockchain/ZK aspect — not a prerequisite to understand deeply, but must not be a dealbreaker

**Compensation:** 0.1–0.25% equity + advisory retainer (€1,000–€2,000/month for active engagement).

---

### 2.3 EU AI Act / Regulatory Policy Advisor

**Role:** Validates that AgentClear's architecture satisfies EU AI Act Article 9 requirements and advises on regulatory positioning. Provides credibility with compliance buyers and standards bodies.

**What they bring:**
- Direct knowledge of EU AI Act implementation requirements (ideally from working with Commission or Member State implementation groups)
- Credibility in the EU regulatory community
- Access to EU AI Act implementation working groups (useful for standards contribution strategy)
- Ability to articulate why AgentClear satisfies Article 9 in terms compliance teams understand
- Relationships with potential channel partners in the RegTech space

**Ideal profile:**
- Former or current Commission official, MEP advisor, or national AI authority staff member
- OR: RegTech lawyer/partner with deep EU AI Act specialisation and active practice
- OR: EU AI Act implementation consultant working with major enterprises
- Active participant in EU AI Office working groups

**Compensation:** 0.1–0.25% equity + advisory retainer (€1,500–€3,000/month given regulatory access value).

---

### 2.4 Enterprise Procurement / Fortune 500 Advisor

**Role:** Validates that AgentClear solves a real problem enterprises will pay to fix. Provides credibility with enterprise buyers. Can facilitate introduction to potential pilot customers.

**What they bring:**
- Firsthand understanding of the problem from the buyer's perspective
- Credibility when speaking to peers in similar organisations
- Ability to identify objections that won't surface in investor conversations
- Potential to be the first named enterprise reference customer

**Ideal profile:**
- Head of Procurement Technology, Chief Procurement Officer, or Head of AI Governance at a major European enterprise
- Currently deploying or evaluating agentic AI for procurement or contracting
- Subject to EU AI Act and DORA obligations
- Willing to participate in pilot and potentially be a named reference

**Compensation:** 0.1–0.15% equity + potential early-access pricing on enterprise licence.

---

## 3. Technical Advisory — ZK Circuit Audit Partner

This is distinct from the advisory board. Before mainnet deployment, AgentClear's ZK circuits must be audited by a specialised ZK security firm. This is not an equity relationship — it is a paid engagement.

**Target firms:**
1. **Trail of Bits** — Pre-eminent smart contract and ZK audit firm; has audited Tornado Cash, Aztec, ZKSync circuits. High cost (~$100K–$150K) but highest credibility signal.
2. **Zellic** — Specialises in ZK circuit and smart contract security; growing reputation; somewhat lower cost than Trail of Bits
3. **Veridise** — Formal verification and ZK circuit specialisation; academic heritage
4. **Least Authority** — ZK focus; audited Zcash; strong academic credibility

**Recommended approach:** Engage Trail of Bits or Zellic for the primary audit; consider a second audit by a different firm for the smart contracts specifically.

**Budget:** €60,000–€120,000 for comprehensive ZK + smart contract audit. This is a non-negotiable prerequisite for mainnet deployment and should be in the seed round budget.

---

## 4. Advisory Board Structure and Governance

**Board size:** 3–5 advisors (quality over quantity)

**Engagement model:**
- Quarterly advisory call (1 hour, all advisors)
- Monthly 1:1 with relevant advisor for specific work
- Advisors are named on website and in investor materials
- Advisors receive drafts for review before public disclosure in their domain

**Equity vesting:** Standard 2-year vest, monthly cliff after Month 1. No acceleration on advisor equity (keep it simple).

**Conflict policy:** Advisors should disclose and avoid conflicts with competing protocols. Working at Google/Salesforce/Visa would be disqualifying unless a very narrow, specific scope is agreed.

---

## 5. Credibility-Building Actions (Independent of Advisors)

The advisory board is one credibility signal. These are others that can be built in parallel:

| Action | Credibility Signal | Timeline |
|--------|------------------|----------|
| Publish ZK PoC results publicly | Technical soundness | Month 6 |
| Submit to W3C CCG | Standards community | Month 8 |
| Speak at Money20/20 Europe or equivalent | Financial services | Month 8 |
| Publish security threat model | Security rigour | Month 6 |
| ZK circuit audit (Trail of Bits) | Pre-mainnet credibility | Month 18 |
| Named pilot customer case study | Market validation | Month 14 |
| Academic paper on ZK authority credentials | Research community | Month 18 |

---

## 6. Advisor Recruitment Approach

**Step 1:** Map target advisors by name, not just profile. Identify 3 candidates per role.

**Step 2:** Warm introduction where possible (via ISACA network, ISCA community, LinkedIn connections). Cold outreach acceptable for ZK researchers if the protocol spec is strong enough to be interesting on its merits.

**Step 3:** Initial conversation framing — "We're building [description]. We'd value 30 minutes to get your perspective on whether we're thinking about this correctly." Do not lead with the advisor ask.

**Step 4:** If the conversation is productive, follow up with the protocol spec and competitive analysis. Let the quality of the work speak.

**Step 5:** If they engage positively, propose the advisory relationship. Be specific about what you'd ask of them (time commitment, specific contributions).

**Timeline:** Begin advisor outreach Month 2–3. Target first advisor confirmed by Month 4. Full board by Month 8.

---

*AgentClear Advisory Board and Credibility Plan v0.1*
