# AgentClear — Go-to-Market Strategy
## v0.2 (Revised — SaaS + Professional Services)

---

**Revision note:** This version reflects the confirmed revenue model of Enterprise SaaS and Professional Services. Channel bundling via third-party products has been removed from the revenue architecture. The core sales motion is direct enterprise engagement, with developer community adoption as the awareness and inbound driver.

---

## 1. GTM Summary

**Primary motion:** Professional services as the initial land, converting to recurring SaaS. Developer community adoption drives organic inbound and reduces CAC over time.

**Beachhead vertical:** Financial services (regulatory urgency + highest value transactions + DORA/EU AI Act compliance driver creating genuine purchase urgency).

**Key structural insight:** In Year 1, AgentClear sells *engagements* (pilots and integration support), not subscriptions. This is deliberate — pilots fund case studies, case studies close SaaS contracts, SaaS contracts compound. The professional services motion is the fastest path to the first ten enterprise customers.

---

## 2. Revenue Motion Architecture

```
AWARENESS          LAND              EXPAND             RETAIN
    │                │                  │                  │
Developer       Pilot / PS         SaaS Contract      Expansion
Community    (€20-30K, 90 days)   (€28K ARR avg)    (+15%/year)
    │                │                  │                  │
Blog/GitHub   Direct outreach     Prover Service     Custom schemas
LinkedIn      ISACA/EC-Council    Enterprise SDK     Advisory retainer
Conferences   network             Compliance module  Integration support
```

---

## 3. Phases

### Phase 0 — Seeding (Months 1–6)
*Goal: Establish thought leadership and developer awareness before the product exists. Generate 3+ letters of intent for pilots.*

**Actions:**
- Publish protocol specification on GitHub
- Publish the London Clearing House blog series on LinkedIn (5-6 posts over the period, building to the protocol announcement)
- Submit protocol spec to W3C Credentials Community Group for early feedback
- Engage Google A2A team directly — position AgentClear as the trust layer complement to A2A
- Attend and speak at one relevant event: Money20/20 Europe (Amsterdam, June 2026), EU AI Act implementation conference, or ISACA EUROCACS
- Generate minimum 3 qualified pilot conversations from Mike's existing Wontok/ISACA network before Month 6

**Metrics:** Protocol spec GitHub stars, LinkedIn post engagement, pilot conversations opened.

### Phase 1 — Professional Services Land (Months 6–18)
*Goal: 5–7 paid pilot engagements; 3–4 conversions to SaaS.*

**Pilot sales motion:**
- Target profile: enterprise with active agentic AI deployment in procurement, financial services, or legal contracting; EU AI Act Article 9 obligation confirmed; in-house legal or compliance team engaged on AI governance
- Outreach channels: Mike's ISACA network, EC-Council connections, Wontok client relationships, direct LinkedIn outreach to Head of AI Governance / CISO roles in target sectors
- Pilot structure: 90-day fixed-fee engagement (€20,000–€30,000) deploying AgentClear in a sandboxed procurement or contracting negotiation scenario
- Output: Working integration, validated compliance documentation, written case study (with permission)

**Integration support motion:**
- Target: Enterprises that have completed pilots and need help integrating AgentClear into production procurement systems or agent frameworks
- Service: Fixed-day-rate engagements (€1,500/day), typically 10–25 days
- This is the bridge from "pilot worked" to "subscription signed"

**Developer community (parallel track):**
- Open-source SDK release (TypeScript + Python) with LangChain, AutoGen, and Agentforce adapters
- Developer documentation site
- Discord community
- ZK circuit library published as standalone npm package
- GitHub-first presence — all protocol development public

**Metrics:** Pilots signed, pilot completion rate, pilot-to-SaaS conversion rate, SDK downloads, GitHub stars.

### Phase 2 — SaaS Scale (Months 18–36)
*Goal: €380K ARR by Month 24; hire first sales person; activate SI partnership.*

**Enterprise SaaS motion:**
- By Month 18, have 10–12 case studies or reference customers
- Structured sales process: inbound from developer community + outbound from direct enterprise sales
- Mike + one dedicated sales hire (Month 20) as sales team
- Target one system integrator partnership (Deloitte AI practice, Accenture, or KPMG) — SIs bring existing enterprise relationships and multiply reach without proportional headcount
- Pricing: Enterprise SDK (€6K–€22K/year) + Managed Prover Service (€5.4K–€97.2K/year)

**Standards body momentum (reinforces enterprise sales):**
- W3C CCG Work Item submission (Month 12) — signals protocol legitimacy to enterprise buyers
- AAIF engagement (Month 14) — positions AgentClear as the A2A trust layer standard
- EU AI Act working group participation (Month 12) — signals regulatory alignment to compliance buyers

**Metrics:** SaaS ARR, net revenue retention, customer count, SI deal pipeline.

---

## 4. Target Customer Profiles

### ICP 1: Enterprise Financial Services (Primary Beachhead)

**Profile:** Investment bank, insurance firm, large asset manager, or fintech deploying agentic AI in procurement, counterparty contracting, or supply chain. Subject to DORA and EU AI Act high-risk obligations. 1,000–50,000 employees, European or global operations.

**Buyer persona:** CISO, CTO, or Head of AI Governance  
**Champion:** AI/ML Engineering Lead or Emerging Technology team  
**Entry point:** Pilot engagement framed as "EU AI Act Article 9 readiness assessment for agentic deployments"

**Pain points addressed:**
- "How do we prove our AI agents had authority to commit to what they committed to?" (accountability gap)
- "How do we produce the audit trail required for DORA incident reporting on agent-mediated transactions?" (compliance gap)
- "Our legal team won't sign off on agentic procurement without a governance framework" (internal blocker)

**Typical buying journey:** Mike/founder outreach → CISO/Head of AI Governance intro meeting → Legal/Compliance stakeholder engagement → Pilot proposal → 90-day pilot → Integration → SaaS contract

**Sales cycle:** 5–8 months  
**Y1 total value (pilot + integration + Y1 SaaS):** €70,000–€100,000

---

### ICP 2: Enterprise Procurement / Supply Chain

**Profile:** Manufacturing, retail, or logistics enterprise with annual procurement volume >€200M, deploying or evaluating AI agents for supplier negotiation. Using Google A2A or Salesforce Agentforce.

**Buyer persona:** CPO (Chief Procurement Officer) or Head of Digital Procurement  
**Champion:** Procurement Technology Lead or Head of Digital Transformation  
**Entry point:** "We saw [A2A / Agentforce deployment] doesn't solve the authority and commitment problem"

**Pain points addressed:**
- "Our suppliers won't accept commitments from an AI agent without a legal trust framework"
- "We need audit trails for agent-negotiated contracts that hold up in court"
- "We're deploying A2A but there's no governance layer for the cross-org negotiations"

**Sales cycle:** 4–7 months  
**Y1 total value:** €55,000–€85,000

---

### ICP 3: Legal and Professional Services

**Profile:** Law firm, M&A advisory, or contract management platform adding AI-assisted negotiation capabilities. Regulatory sensitivity is very high; accountability and audit trail requirements are existential.

**Buyer persona:** CTO or Chief Innovation Officer at law firm; Product Lead at contract management platform  
**Entry point:** Conference presentation or developer community adoption

**Pain points addressed:**
- "We cannot let AI agents commit to terms on behalf of our clients without a verification and accountability framework"
- "Our professional indemnity insurance requires us to demonstrate governance over AI-assisted negotiations"

**Sales cycle:** 6–10 months (legal sector moves slowly)  
**Y1 total value:** €60,000–€90,000

---

## 5. Competitive Positioning

**For enterprise organisations deploying agentic AI in B2B contexts,**  
**who need to prove their AI agents had authority to commit and that their commitments are binding,**  
**AgentClear is the only open protocol that provides cryptographically-verified agent authority,**  
**privacy-preserving negotiation trust, and on-chain binding commitment.**

**Unlike** Google A2A (which solves interoperability but not authority enforcement),  
**or** Visa/Mastercard agentic payments (which solve consumer checkout but not B2B contracting),  
**AgentClear gives organisations the governance infrastructure required by EU AI Act Article 9 for agentic deployments, while enabling agents from competing organisations to negotiate and commit with mathematical certainty.**

---

## 6. Pricing Architecture

### Open Source (Free)
- Protocol specification, ZK circuits, reference SDK (LGPL)
- No prover service, no support, no SLA

### Managed Prover Service

| Tier | Sessions/Month | Price |
|------|---------------|-------|
| Developer | 500 | Free |
| Startup | 2,000 | €500/month |
| Professional | 10,000 | €1,800/month |
| Enterprise | 50,000 | €4,500/month |
| Enterprise+ | Unlimited | €9,000/month |

### Enterprise SDK Licence (Annual)

| Tier | Price | Key Features |
|------|-------|-------------|
| SME (≤10 agents) | €6,000 | Standard features, email support |
| Professional (≤50 agents) | €12,000 | HSM integration, compliance reports, SLA 99.5% |
| Enterprise (unlimited) | €22,000 | Custom schemas, on-prem prover, SLA 99.9%, dedicated support |

### Professional Services

| Service | Price |
|---------|-------|
| Pilot engagement (90 days) | €20,000–€30,000 fixed |
| Integration support | €1,500/day |
| Custom credential schema design | €8,000–€15,000 fixed |
| Advisory retainer | €5,000/quarter |

---

## 7. LinkedIn Content Arc (Mike's Profile)

The protocol launch narrative across 8 posts:

| # | Topic | Core Message |
|---|-------|-------------|
| 1 | London Clearing House blog (done) | The governance problem AI hasn't solved |
| 2 | Echoing behaviour problem | "We stress-tested AI agents negotiating each other. The results were alarming." |
| 3 | Why existing solutions miss | "Visa, Mastercard, Google are all solving the wrong layer" |
| 4 | ZK proofs as the answer | "How cryptography solves what AI training cannot" |
| 5 | Protocol announcement | "We built the trust infrastructure. Here's AgentClear." |
| 6 | EU AI Act Article 9 angle | "Why every agentic deployment needs this before August 2026" |
| 7 | Developer SDK launch | "The SDK is live. Here's a working negotiation in 30 lines." |
| 8 | First pilot results | "What happened when [enterprise] used AgentClear for the first time." |

**Target cadence:** One post per week from Month 4 onward. Each post includes a link to the protocol spec or documentation.

---

## 8. Partnership Priorities

| Partner Type | Target | Value Exchange | Priority |
|-------------|--------|---------------|----------|
| Protocol layer | Google A2A / AAIF | AgentClear becomes A2A's trust layer | Highest |
| Enterprise delivery | Deloitte / Accenture AI practice | SI brings enterprise pipeline at scale | High |
| ZK infrastructure | Arbitrum / Alchemy | Co-marketing; preferred deployment chain | Medium |
| Enterprise distribution | Wontok existing network | Warm enterprise introductions | High |
| Academic validation | ZK research group | Technical credibility; circuit audit | Medium |
| Legal/compliance | RegTech law firms (Osborne Clarke, Bird & Bird) | Regulatory co-selling to financial services | Medium |

**Note:** The Littledata integration is removed as a primary distribution channel in this revision. It remains a potential future integration for compliance reporting, but is not a confirmed go-to-market motion.

---

*AgentClear Go-to-Market Strategy v0.2 — SaaS + Professional Services revenue model*
