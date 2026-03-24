# Attestara — Go-to-Market Strategy
## v0.1

---

## 1. GTM Summary

**Primary motion:** Developer community / bottoms-up adoption seeded through standards bodies, with enterprise sales layer added at Phase 2.

**Beachhead vertical:** Financial services (regulatory urgency + highest value transactions + existing Wontok/Littledata relationships).

**Key insight from competitive analysis:** The fastest path to adoption is not selling Attestara as a product — it is making Attestara the *obvious layer* on top of Google A2A and Anthropic MCP. Developers building agentic systems will encounter the trust problem; Attestara should be the first thing they find when they search for solutions.

---

## 2. Phases

### Phase 0 — Seeding (Months 1–6)
*Goal: Establish thought leadership and developer awareness before the product exists.*

**Actions:**
- Publish protocol specification publicly (GitHub + Attestara website)
- Mike publishes the London Clearing House series on LinkedIn (already begun) — blog is done, now build the narrative arc over 4-6 posts building to the protocol announcement
- Submit the DID/VC/ZK credential architecture to W3C Credentials Community Group for feedback
- Engage Google A2A team directly: position Attestara as the trust layer for A2A, not a competitor
- Speak at one relevant conference: Money20/20 Europe (Amsterdam, June), EurAI (Belgium, July), or EU AI Act implementation events

**Metrics:** Protocol spec forks/stars on GitHub, LinkedIn engagement on the series, direct developer contacts.

### Phase 1 — Developer Adoption (Months 6–18)
*Goal: 50 developers building with Attestara SDK; 5 proof-of-concept enterprise pilots.*

**Developer motion:**
- Release open-source SDK (TypeScript + Python) with LangChain, AutoGen, and Agentforce adapters
- Developer documentation site with "hello world" negotiation in under 30 minutes
- Discord community for protocol discussion and support
- ZK circuit library published as standalone npm package (circomlib equivalent for Attestara circuits)

**Enterprise pilot motion:**
- Target: 5 enterprises across 2-3 verticals for paid pilots
- Ideal pilot profile: mid-to-large enterprise deploying agentic AI in procurement, financial services, or legal contracting; already EU AI Act aware
- Sales approach: direct outreach via Mike's existing Wontok/Littledata network + financial services contacts from ISACA and EC-Council community
- Pilot structure: 90-day paid engagement, €15,000–€25,000, deploying Attestara in a sandboxed procurement negotiation scenario
- Output: Published case study (with permission) that validates protocol in production context

**Metrics:** SDK downloads, GitHub stars, pilot customers signed, pilot completion rate.

### Phase 2 — Enterprise Scale (Months 18–36)
*Goal: 3-5 paying enterprise customers on annual contracts; standards body recognition.*

**Enterprise sales motion:**
- Dedicated enterprise sales: initial direct sales by Mike/founders, hire first dedicated sales person at ~Month 18
- Channel partnerships: Wontok (cybersecurity clients), Littledata (AI governance clients), target one system integrator partnership (Accenture, Deloitte, or KPMG — all have AI governance practices)
- Pricing: Enterprise SDK licence €6,000–€20,000/year + Prover Service €500–€5,000/month depending on volume

**Standards body motion:**
- Submit Attestara ZK credential schema to W3C Credentials Community Group
- Contribute to Linux Foundation AAIF (the A2A/MCP governance body)
- Engage EU AI Act implementation working groups (Commission Expert Group on AI)

---

## 3. Target Customer Profiles

### ICP 1: Enterprise Financial Services (Primary Beachhead)

**Profile:**
- Investment bank, insurance firm, or large asset manager
- Deploying agentic AI in procurement, counterparty contracting, or supply chain
- Subject to DORA and EU AI Act; active compliance programme
- 1,000–50,000 employees; European or global operations

**Buyer:** CISO, CTO, or Head of AI Governance  
**Champion:** AI/ML Engineering Lead or Emerging Technology team  
**Blocker:** Legal/Compliance (must be addressed early)

**Pain points addressed:**
- "How do we prove our AI agents had authority to commit to what they committed to?"
- "How do we audit an agent-mediated negotiation for DORA incident reporting?"
- "How do we comply with EU AI Act Article 9 for our agentic procurement systems?"

**Sales cycle estimate:** 6–12 months  
**Deal size estimate:** €30,000–€150,000/year

### ICP 2: Enterprise Procurement / Supply Chain

**Profile:**
- Manufacturing, retail, or logistics company deploying AI agents for supplier negotiation
- Annual procurement volume >€500M (making agent-negotiated commitment risk material)
- Using or evaluating Google A2A or Salesforce Agentforce

**Buyer:** CPO (Chief Procurement Officer) or Head of Digital Procurement  
**Champion:** Procurement Technology Lead  
**Pain points addressed:**
- "Our suppliers won't accept commitments from an AI agent without a trust framework"
- "We need audit trails for agent-negotiated contracts that our legal team accepts"

**Sales cycle estimate:** 4–9 months  
**Deal size estimate:** €20,000–€80,000/year

### ICP 3: Littledata Customers (Channel Play)

**Profile:**
- Mid-market organisation already using Littledata for EU AI Act compliance
- Deploying agentic AI and recognising the governance gap in agent-to-agent contexts
- Less technically sophisticated than ICP 1/2; needs more hand-holding

**Channel motion:** Littledata includes Attestara as an optional add-on in enterprise packages. The compliance narrative is already established; Attestara extends it to the agentic governance layer.

**Deal size estimate:** €8,000–€25,000/year (often bundled with Littledata)

---

## 4. Competitive Positioning Statement

**For enterprise organisations deploying agentic AI in B2B contexts,**  
**who need to prove their AI agents had authority to commit and that their commitments are binding,**  
**Attestara is the only open protocol that provides cryptographically-verified agent authority,**  
**privacy-preserving negotiation trust, and on-chain binding commitment.**

**Unlike** Google A2A (which solves interoperability but not authority enforcement),  
**or** Visa/Mastercard agentic payments (which solve consumer checkout but not B2B contracting),  
**Attestara gives organisations the governance infrastructure required by EU AI Act Article 9 for their agentic deployments, while enabling agents from competing organisations to negotiate and commit with mathematical certainty.**

---

## 5. Content and Thought Leadership

Mike's LinkedIn profile is the primary distribution channel in the early phase. The London Clearing House narrative arc should unfold over 6-8 posts:

| Post | Topic | Hook |
|------|-------|------|
| 1 (done) | Blog published | Drive to Littledata |
| 2 | The echoing behaviour problem | "We stress-tested AI agents negotiating with each other. The results were alarming." |
| 3 | Why existing solutions miss the point | "Visa, Mastercard, and Google are all solving the wrong problem." |
| 4 | The ZK proof layer | "How zero-knowledge cryptography solves what AI can't." |
| 5 | Protocol announcement | "We built the infrastructure. Here's Attestara." |
| 6 | Regulatory angle | "EU AI Act Article 9 and why every agentic deployment needs this now." |
| 7 | Developer launch | "The SDK is live. Here's how to build with it." |
| 8 | First pilot results | "What happened when a Fortune 500 used Attestara for the first time." |

---

## 6. Pricing Architecture

### Open Source (free)
- Protocol specification
- ZK circuit library
- Reference SDK (LGPL)

### Developer / Startup (€0–€500/month)
- Prover Service: up to 1,000 sessions/month
- Community support (Discord)
- No enterprise features

### Professional (€1,500–€5,000/month)
- Prover Service: up to 10,000 sessions/month
- Enterprise SDK features
- SLA (99.5% uptime)
- Email support

### Enterprise (€6,000–€20,000+/year SDK + €500–€5,000/month Prover)
- Unlimited sessions
- On-premises prover option
- HSM key management integration
- Compliance reporting module
- Littledata integration
- Dedicated support + SLA (99.9% uptime)
- Custom credential schemas
- Regulatory Interface Module

---

## 7. Partnership Priorities

| Partner Type | Target | Value Exchange |
|-------------|--------|---------------|
| Protocol layer | Google A2A / Linux Foundation AAIF | Attestara becomes A2A's trust layer; A2A ecosystem as distribution |
| Enterprise distribution | Wontok | Existing financial services/enterprise client base |
| Compliance channel | Littledata | Bundled product; compliance buyer is the governance buyer |
| System integrator | Deloitte AI practice or Accenture | Enterprise delivery capability; credibility with F500 |
| ZK infrastructure | Alchemy / Arbitrum | Preferred L2 partner; co-marketing |
| Academic validation | One university ZK research group | Technical credibility; circuit audit |

---

*Attestara Go-to-Market Strategy v0.1*
