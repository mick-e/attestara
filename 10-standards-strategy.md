# Attestara — Standards Contribution Strategy
## v0.1

---

## 1. Why Standards Matter for Attestara

Protocol standards are winner-take-most markets. The protocol that becomes the W3C or IETF standard for AI agent trust credentials doesn't just win the compliance market — it *becomes* the compliance market. Every enterprise AI deployment will need to be compatible with it.

Google understood this with A2A: donate to Linux Foundation, become the reference implementation, and let the standard do the distribution work. Anthropic understood it with MCP: open-source and donate to the Linux Foundation AAIF. The result in both cases is that the originating organisation's implementation becomes the default even though technically anyone can implement the standard.

Attestara's standards strategy follows the same playbook, targeting bodies where the technical gap is real and no incumbent has staked a position.

---

## 2. Target Standards Bodies

### 2.1 W3C Credentials Community Group (CCG) — PRIMARY TARGET

**What it governs:** Verifiable Credentials, DIDs, and related identity standards  
**Relevance:** Attestara's Authority Credential is a Verifiable Credential extension; the Agent DID is a DID extension. Both are directly in-scope for W3C CCG.  
**Current state:** No AI agent-specific credential schemas exist in W3C standards. The DID/VC for AI Agents academic work (arXiv 2511.02841) has not yet been submitted to W3C CCG.

**What Attestara should contribute:**
1. **AgentAuthorityCredential schema** — A W3C VC schema specifically for AI agent mandate delegation. This is the most direct contribution: define the standard for how authority credentials are structured so any implementation can interoperate.
2. **ZK Proof binding in VCs** — A pattern for embedding ZK proof references in Verifiable Credentials. Currently W3C VCs don't have a standard way to bind ZK commitments to credential subjects; this is a genuine standards gap Attestara fills.
3. **Agent DID method proposal** — A `did:attestara` DID method specification registered with the W3C DID method registry.

**Engagement approach:**
- Join the W3C CCG mailing list and introduce the work
- Submit a draft to the CCG as a "Work Item" — formal consideration by the group
- Present at a W3C TPAC (Technical Plenary and Advisory Committee) meeting
- Timeline: Submit initial draft Month 6–8; aim for Work Item status by Month 12

---

### 2.2 Linux Foundation AAIF (AI Alliance Interoperability Foundation) — HIGH PRIORITY

**What it governs:** A2A protocol, MCP protocol, and (by adoption) the emerging AI agent interoperability standards  
**Relevance:** AAIF governs A2A and MCP — the protocols Attestara is designed to complement. Getting Attestara recognised as the trust layer standard within AAIF means A2A implementations will be expected to support Attestara credentials.  
**Members:** Google, Microsoft, AWS, Anthropic, OpenAI, Block, and 100+ others  
**Current state:** AAIF was founded December 2025 and is still establishing its governance and working group structure — the window to influence early direction is open.

**What Attestara should contribute:**
1. **Trust Layer Working Group proposal** — Propose a dedicated "Agentic Trust and Authority" working group within AAIF, positioning Attestara as the founding technical contribution
2. **A2A trust extension draft** — A formal extension proposal to the A2A specification defining how A2A Agent Cards should reference Attestara Authority Credentials for interoperability
3. **Reference implementation for trust-enabled A2A** — A code contribution demonstrating how Attestara works on top of A2A

**Engagement approach:**
- Apply for AAIF membership (as Attestara Foundation Ltd once incorporated)
- Engage the A2A technical steering committee directly
- Target a technical talk at a Linux Foundation AI event (LF AI & Data Summit)
- Timeline: Apply for membership Month 8; submit working group proposal Month 12

---

### 2.3 IETF — MEDIUM PRIORITY (Long-term)

**What it governs:** Internet protocols and standards  
**Relevance:** The proposed Agent Name Service (ANS, draft-narajala-ans) is at IETF and aligns with Attestara's identity registry concept. There is also potential for an IETF RFC covering the Attestara session protocol (the negotiation rail).  
**Current state:** ANS is a draft; no AI agent trust protocol has been submitted to IETF.

**What Attestara should contribute:**
1. **Co-author ANS extension** — Engage with the ANS draft authors to contribute the authority/mandate metadata components that are currently missing from ANS
2. **Attestara Session Protocol Internet Draft** — A longer-term RFC proposal for the negotiation rail layer

**Timeline:** IETF engagement is a Year 2+ activity; too early to prioritise before core protocol validation.

---

### 2.4 EU AI Act Implementation Working Groups — HIGH PRIORITY (Regulatory)

**What it governs:** Implementation guidance for EU AI Act Articles 9, 11, 12, and 14  
**Relevance:** The European Commission Expert Group on AI is developing guidance on what constitutes a compliant risk management system (Article 9) for agentic AI deployments. Attestara's architecture directly implements Article 9 requirements.  
**Current state:** Guidance on agentic AI is specifically flagged as a 2026 priority in the Commission's work programme.

**What Attestara should contribute:**
1. **Technical response to Commission consultation** — Submit Attestara as a technical reference implementation in response to the Commission's guidance consultations
2. **Case study contribution** — Once pilot customers are live, contribute anonymised case studies to Commission working group on agentic AI governance

**Engagement approach:**
- Monitor EU AI Act implementation consultations via EUR-Lex
- Submit formal responses identifying Attestara as relevant infrastructure
- Seek Advisory Board member with EU AI Act policy expertise (see Advisory Board Plan)
- Timeline: First submission Month 10–12 (coinciding with Commission guidance consultations)

---

### 2.5 ISO/IEC JTC 1/SC 42 (Artificial Intelligence) — MONITORING ONLY (Near-term)

**What it governs:** ISO/IEC 42001 (AI Management Systems) and related AI standards  
**Relevance:** ISO 42001 will increasingly be required as a baseline certification for enterprise AI deployments. Attestara's architecture should map to 42001 requirements.  
**Current state:** ISO 42001 was published December 2023; adoption is accelerating in enterprise procurement requirements.

**Action:** Map Attestara's architecture against ISO 42001 controls and publish the mapping. This is documentation work, not active standards participation. Formal ISO engagement is a Year 3 activity.

---

## 3. Standards Contribution Sequencing

| Priority | Body | Contribution | Target Month |
|----------|------|-------------|-------------|
| 1 | W3C CCG | AgentAuthorityCredential schema draft | Month 8 |
| 1 | AAIF | Membership application + trust layer proposal | Month 8 |
| 2 | W3C CCG | ZK proof binding in VCs pattern | Month 12 |
| 2 | EU AI Act working groups | First consultation response | Month 12 |
| 3 | AAIF | A2A trust extension draft | Month 14 |
| 3 | W3C CCG | did:attestara method spec | Month 16 |
| 4 | IETF | ANS extension co-authorship | Month 20 |
| 5 | ISO SC 42 | 42001 mapping document | Month 30 |

---

## 4. Standards Governance Principles

**Contribute early, lead the working group.** The most influential position in any standards body is the one who wrote the first draft. Attestara should aim to be the editor of any working group it initiates.

**Avoid premature standardisation.** Do not submit to formal standards processes before the protocol has been validated in at least one production deployment. Premature standardisation locks in mistakes. Target W3C CCG submission after the ZK PoC succeeds and the first pilot is underway.

**Keep the IP architecture clean.** Before any public submission, ensure the IP strategy document is finalised. Standards contributions under CC BY or open standards terms should not inadvertently encumber the commercial SDK.

**Engage individuals, not just organisations.** Standards communities run on individual relationships. Identify the 3–5 key people in each body who are working on adjacent problems and build direct relationships before making formal submissions.

---

*Attestara Standards Contribution Strategy v0.1*
