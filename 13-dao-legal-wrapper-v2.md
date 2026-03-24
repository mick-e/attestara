# Attestara — DAO Legal Wrapper Structure
## v0.2 (Revised — Jurisdiction Neutral)

---

**DISCLAIMER:** This document is a structural analysis to inform legal advice. It does not constitute legal advice. Each jurisdiction option requires formal opinion from qualified legal counsel familiar with that jurisdiction's company law, DLT regulation, and crypto-asset rules.

---

## 1. Why a Legal Wrapper Is Required

A pure on-chain DAO with no legal entity creates:
- **Personal liability** for active protocol participants — in most jurisdictions, unincorporated associations expose members to joint and several liability
- **Inability to contract** — cannot enter commercial agreements, employment contracts, or IP licences
- **IP vulnerability** — no legal entity can hold trademarks, patents, or copyrights
- **Regulatory exposure** — operating DLT infrastructure from an unincorporated entity is legally ambiguous and increasingly problematic globally
- **Fundraising barrier** — investors cannot hold equity in a DAO; a legal entity is required for conventional investment structures

The legal wrapper does not undermine decentralisation — it provides the legal interface through which the decentralised governance structure operates in the real world.

---

## 2. Governance Architecture (Jurisdiction-Independent)

Regardless of which jurisdiction is chosen, the governance architecture is the same:

```
┌──────────────────────────────────────────────────────────────────┐
│          Attestara Foundation [Chosen Jurisdiction]              │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  BOARD OF DIRECTORS                                       │    │
│  │  (Legal accountability; minimum 2 directors)              │    │
│  │  • Appoints Technical Committee                           │    │
│  │  • Ratifies DAO governance votes above threshold          │    │
│  │  • Ultimate legal and regulatory accountability           │    │
│  └─────────────────────────┬─────────────────────────────── ┘    │
│                             │                                      │
│  ┌──────────────────────────▼──────────────────────────────┐     │
│  │  TECHNICAL COMMITTEE                                      │     │
│  │  (Protocol integrity; 3–5 members with ZK expertise)      │     │
│  │  • Veto on circuit/verification key changes               │     │
│  │  • Reviews all protocol upgrade proposals                 │     │
│  │  • Appointed by Board; serve 2-year terms                 │     │
│  └─────────────────────────┬─────────────────────────────── ┘     │
│                             │                                      │
│  ┌──────────────────────────▼──────────────────────────────┐     │
│  │  DAO GOVERNANCE (On-chain)                                │     │
│  │  • Protocol parameter changes (within bounds)             │     │
│  │  • Membership admission/revocation                        │     │
│  │  • Budget allocation within Foundation mandate            │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Jurisdiction Options — Comparative Analysis

### Option A: Gibraltar (Company Limited by Guarantee)

**Structure:** A Gibraltar CLG (Company Limited by Guarantee) has legal personality, no share capital, and is governed by its members. Widely used for non-profit foundations.

**Key advantages:**
- World's first purpose-built DLT regulation (Financial Services (Distributed Ledger Technology Providers) Regulations 2017) — regulators understand the technology
- GFSC (Gibraltar Financial Services Commission) has a track record of pragmatic, innovation-friendly DLT oversight
- Mike's existing presence in Gibraltar creates genuine operational substance — important for avoiding "brass plate" concerns and for EU regulatory credibility
- Gibraltar's EU-adjacent status (pre-Brexit relationship with Spain, EEA access considerations) gives some proximity to EU market
- Relatively low administrative overhead versus Swiss or Cayman options

**Key disadvantages / risks:**
- Smaller legal and banking ecosystem than Switzerland or UK; fewer specialist DLT lawyers
- GFSC oversight may require a DLT Provider licence for operating the Commitment Contract — analysis required
- Gibraltar's relationship with the EU post-Brexit adds complexity for EU-focused commercial and regulatory engagement
- Less recognised brand name in the global blockchain ecosystem than Cayman or Switzerland

**Best fit if:** Operational convenience is a priority; GFSC DLT framework provides useful regulatory clarity; team wants to maintain a single base of operations

**Legal questions requiring local counsel:**
- Does operating the Commitment Contract constitute a "DLT business" requiring GFSC licensing?
- Does the governance token require classification under Gibraltar's proceeds of crime or financial services legislation?
- Can a CLG structure accommodate the hybrid DAO/Foundation governance model proposed?

---

### Option B: Cayman Islands (Foundation Company)

**Structure:** A Cayman Foundation Company (introduced 2017) has legal personality but no shareholders — governed by a Founder, Supervisor, and Directors. Widely used for DeFi protocols (Uniswap Foundation, Compound, MakerDAO).

**Key advantages:**
- Purpose-designed for protocol foundations — the Foundation Company structure was explicitly created for blockchain governance entities
- Extensive precedent in the DeFi and Web3 ecosystem; legal practitioners are experienced with this structure
- No corporate income tax
- Cayman CIMA (Cayman Islands Monetary Authority) has developed pragmatic crypto-asset guidance
- Recognised globally as a credible foundation structure by institutional investors

**Key disadvantages / risks:**
- No specific DLT regulation — regulatory status of on-chain operations is less certain than Gibraltar
- Perceived negatively by some institutional investors and regulators as an "offshore" jurisdiction
- No operational connection to Gibraltar unless a subsidiary is established
- Cayman Foundation requires specific prescribed officers and supervisors — ongoing governance overhead
- EU AI Act regulatory engagement is more difficult from a Cayman entity than from a European or European-adjacent one

**Best fit if:** Institutional investor credibility and DeFi ecosystem recognition are priorities; enterprise-facing commercial operations run through a separate EU/UK subsidiary

**Hybrid structure consideration:** Cayman Foundation + Gibraltar (or UK/EU) operating subsidiary is a common pattern. Foundation holds IP and governance; operating company handles commercial contracts, employment, and EU regulatory engagement.

---

### Option C: Switzerland (Association / Verein)

**Structure:** A Swiss Verein (association) is a non-profit legal entity under Swiss Civil Code, Articles 60–79. Widely used by major blockchain foundations: Ethereum Foundation, Web3 Foundation, Cardano Foundation, Polkadot, Solana.

**Key advantages:**
- Most recognised and credible foundation structure in the global blockchain/Web3 ecosystem
- Strong precedent and a large ecosystem of experienced Swiss lawyers, auditors, and bankers in the Zug "Crypto Valley" cluster
- FINMA (Swiss Financial Market Supervisory Authority) has developed detailed guidance on DLT assets and governance tokens
- EU market access relatively straightforward for a Swiss entity (though Switzerland is not EU)
- High institutional credibility — major financial institutions, academic partners, and standards bodies take Swiss foundations seriously

**Key disadvantages / risks:**
- Swiss regulatory environment has become more complex — FINMA oversight is detailed and compliance-intensive
- Highest administrative overhead of the three options (annual reporting, mandatory audits, governance requirements)
- No personal connection to Switzerland; requires establishing genuine Swiss presence or engaging local directors/administrators
- Cost: ongoing Swiss administration (lawyers, auditors, local directors) runs €15,000–€30,000/year
- Zug-based lawyers and administrators are in high demand; lead times can be significant

**Best fit if:** Institutional credibility and ecosystem brand recognition are the top priorities; the team is willing to invest in Swiss administrative infrastructure; standards body engagement and academic partnerships are important in Year 1

---

## 4. Decision Framework

The optimal choice depends on weighing four factors:

| Factor | Gibraltar | Cayman | Switzerland |
|--------|-----------|--------|-------------|
| Operational convenience (Mike's base) | ★★★★★ | ★★ | ★★ |
| DLT regulatory clarity | ★★★★★ | ★★★ | ★★★★ |
| Institutional/investor credibility | ★★★ | ★★★★ | ★★★★★ |
| EU regulatory engagement | ★★★★ | ★★ | ★★★★ |
| Administrative cost/complexity | ★★★★ | ★★★ | ★★ |
| Web3/blockchain ecosystem recognition | ★★★ | ★★★★ | ★★★★★ |
| Enterprise buyer credibility | ★★★ | ★★★ | ★★★★★ |

**The core trade-off is operational convenience + EU positioning (Gibraltar) versus ecosystem credibility + institutional recognition (Switzerland), with Cayman as a middle ground that requires a subsidiary for operations.**

### Questions to answer before deciding:

1. Who are the primary institutional investors being targeted? If European VCs or corporate strategics (Deloitte, Accenture, major banks), Swiss or Gibraltar are preferred. If crypto-native funds (a16z crypto, Paradigm), Cayman is familiar.

2. Is the DAO Phase 2 a Year 2 priority or Year 3+? If Year 2, Cayman's established DAO precedent is valuable. If Year 3+, Gibraltar's operational convenience may be worth more in the near term.

3. Does the team want to maintain a single legal entity or is a Foundation + Operating Subsidiary structure acceptable? If single entity, Gibraltar is cleanest. If dual structure is acceptable, Cayman Foundation + Gibraltar/UK operating company is a strong option.

4. What is the legal counsel's recommendation after reviewing Gibraltar's DLT licence requirements? If the Commitment Contract requires a GFSC DLT Provider licence with significant compliance overhead, that changes the Gibraltar calculus.

---

## 5. Governance Token Design (Jurisdiction-Independent)

### Token Utility

The governance token serves one function: **voting rights in the DAO governance layer**. Explicitly a governance token, not a security or utility token in the financial sense.

Design principles:
- Non-transferable for the first 12 months post-issuance
- Cannot be staked for yield
- Governance rights only — no claim on Foundation assets or revenues
- Required stake for protocol participation

### Token Distribution

| Allocation | % | Vest | Description |
|-----------|---|------|-------------|
| Founding team | 20% | 4-year vest, 1-year cliff | Founders and early employees |
| Foundation reserve | 25% | Foundation-controlled | Protocol development, grants |
| Ecosystem/developers | 20% | Earned by contribution | Developer grants, ecosystem |
| Early participants | 15% | 2-year vest | Pilot customers, early DAO members |
| Investors | 15% | 2-year vest | Seed round (separate instrument) |
| Technical Committee | 5% | 3-year vest | Technical Committee members |

### Regulatory Caution

In all three jurisdictions, the governance token requires careful classification analysis:
- **Gibraltar:** Proceeds of Crime Act 2015 and Financial Services Act 2019 analysis required
- **Cayman:** Virtual Asset (Service Providers) Act 2020 analysis required
- **Switzerland:** FINMA guidance on governance tokens — Switzerland has the most developed guidance; FINMA has recognised governance-only tokens as typically not securities under Swiss law, subject to specific conditions

**This is one area where Switzerland's regulatory clarity is a genuine advantage.**

---

## 6. Seed Investment Structure (Jurisdiction-Independent)

Seed investors invest via **Convertible Notes or SAFE** — converting to ordinary shares (or equivalent) on a qualifying future round.

Governance tokens are NOT issued to investors as part of the investment. They are separate instruments.

**The specific investment instrument must be adapted to the chosen jurisdiction:**
- Gibraltar CLG: May require a parallel private company limited by shares (or dual-class structure within the CLG) — legal counsel required
- Cayman Foundation: SAFEs are well-established for Cayman entities; straightforward
- Swiss Verein: SAFEs are less standard; convertible loans (Wandeldarlehen) are more common in Swiss practice

---

## 7. Recommended Process

Rather than selecting a jurisdiction now, the recommended process is:

1. **Month 1–2:** Obtain one-page legal opinions from counsel in Gibraltar, Cayman, and Switzerland (approximately €1,500–€3,000 each). Focus questions on: DLT licence requirements, governance token classification, and investment structure compatibility.

2. **Month 2–3:** Share opinions with target seed investors for their view on preferred jurisdiction. Investor preference is a legitimate input — don't make this decision without checking.

3. **Month 3:** Select jurisdiction, incorporate, and begin operation.

**Estimated legal cost for jurisdiction selection process:** €8,000–€15,000 (opinions from three jurisdictions + incorporation in chosen jurisdiction).

---

## 8. Action Plan (Jurisdiction-Agnostic)

| Action | Owner | Timeline | Cost |
|--------|-------|----------|------|
| Obtain tri-jurisdiction legal opinions | Mike + legal counsel | Month 1–2 | €6,000–€9,000 |
| Investor jurisdiction preference check | Mike | Month 2 | — |
| Select jurisdiction | Mike + Board | Month 3 | — |
| Incorporate Foundation | Legal counsel | Month 3–4 | €2,000–€6,000 depending on jurisdiction |
| Governance token regulatory analysis | Legal counsel | Month 3–4 | €3,000–€5,000 |
| Open banking relationship | Mike | Month 4 | — |
| Draft Foundation Articles + governance docs | Legal counsel | Month 4–5 | €3,000–€5,000 |
| Technical Committee charter | Founders + advisors | Month 4–6 | Internal |

---

*Attestara DAO Legal Wrapper Structure v0.2 — Jurisdiction-neutral revision*  
*This document does not constitute legal advice.*
