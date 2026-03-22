# AgentClear — DAO Legal Wrapper Structure
## v0.1

---

**DISCLAIMER:** This document is a structural analysis to inform legal advice. It does not constitute legal advice. Gibraltar company and DLT framework analysis requires qualified legal counsel familiar with Gibraltar law and the Financial Services (Distributed Ledger Technology Providers) Regulations 2017.

---

## 1. Why a Legal Wrapper Is Required

A pure on-chain DAO with no legal entity creates:
- **Personal liability** for active protocol participants — in most jurisdictions, unincorporated associations expose members to joint and several liability
- **Inability to contract** — the DAO cannot enter commercial agreements, employment contracts, or IP licences
- **IP vulnerability** — no legal entity can hold trademarks, patents, or copyrights
- **Regulatory exposure** — operating DLT infrastructure from an unincorporated entity is legally ambiguous in most jurisdictions and increasingly problematic
- **Fundraising barrier** — investors cannot hold equity in a DAO; a legal entity is required for any conventional investment structure

The legal wrapper does not undermine decentralisation — it provides the legal interface through which the decentralised governance structure operates in the real world.

---

## 2. Recommended Structure: Gibraltar Company Limited by Guarantee

### 2.1 Rationale for Gibraltar

Gibraltar is the recommended jurisdiction for three reasons:

**DLT Regulatory Framework:** Gibraltar enacted the world's first purpose-built DLT regulation in 2018 (Financial Services (Distributed Ledger Technology Providers) Regulations 2017). The Gibraltar Financial Services Commission (GFSC) has established expertise in DLT businesses and a track record of pragmatic, innovation-friendly regulation.

**Operational Presence:** Mike is based in Gibraltar. Incorporating there creates genuine operational substance — an important consideration for EU regulatory credibility and avoiding "brass plate" concerns.

**EU Relationship:** Gibraltar's unique constitutional status (British Overseas Territory with historic EU relationship) and proximity to Spain make it well-positioned for EU market access conversations, particularly relevant for EU AI Act engagement.

### 2.2 Company Limited by Guarantee Structure

A Gibraltar company limited by guarantee (CLG) is appropriate for protocol foundations:
- No share capital — governance is by membership, not equity
- Members provide a nominal guarantee (typically £1) rather than purchasing shares
- Can be structured as non-profit (important for DAO governance neutrality narrative)
- Full legal personality — can hold IP, enter contracts, employ staff, open bank accounts

**Articles of Association** must be drafted to reflect the hybrid DAO/traditional governance model — this requires specialised legal drafting.

### 2.3 Governance Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│         AgentClear Foundation Limited (Gibraltar CLG)            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  BOARD OF DIRECTORS                                      │    │
│  │  (Legal accountability; minimum 2 directors)             │    │
│  │  • Appoints Technical Committee                          │    │
│  │  • Ratifies DAO governance votes above threshold         │    │
│  │  • Ultimate legal and regulatory accountability          │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                            │                                      │
│  ┌─────────────────────────▼──────────────────────────────┐     │
│  │  TECHNICAL COMMITTEE                                     │     │
│  │  (Protocol integrity; 3–5 members with ZK expertise)     │     │
│  │  • Veto on circuit/verification key changes              │     │
│  │  • Reviews all protocol upgrade proposals                │     │
│  │  • Appointed by Board; serve 2-year terms                │     │
│  └────────────────────────┬───────────────────────────────┘     │
│                            │                                      │
│  ┌─────────────────────────▼──────────────────────────────┐     │
│  │  DAO GOVERNANCE (On-chain)                               │     │
│  │  (Token-weighted voting for general protocol decisions)  │     │
│  │  • Protocol parameter changes (within bounds)            │     │
│  │  • Membership admission/revocation                       │     │
│  │  • Budget allocation within Foundation mandate           │     │
│  │  • Fee structure changes                                  │     │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  EXECUTION LAYER                                                  │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │  IP Registry  │  │  Commercial      │  │  Employment      │   │
│  │  (Foundation  │  │  Contracts       │  │  Contracts       │   │
│  │  holds IP)    │  │  (Foundation     │  │  (Foundation     │   │
│  │               │  │  signs)          │  │  employs)        │   │
│  └───────────────┘  └─────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Decision Rights Matrix

| Decision Type | Required Approval | Veto Right |
|--------------|------------------|------------|
| Daily operations | Management | — |
| Commercial contracts <€50K | CEO/Management | — |
| Commercial contracts >€50K | Board | — |
| Protocol parameter changes (non-security) | DAO supermajority (60%) | — |
| New member admission | DAO simple majority (51%) | Board |
| Circuit/verification key changes | DAO supermajority (75%) | Technical Committee |
| Protocol security parameters | DAO supermajority (75%) + Technical Committee | Board |
| IP assignment | Board | — |
| Director appointment/removal | Members (CLG members) | — |
| Company dissolution | Members supermajority + Board | — |

---

## 3. Governance Token Design

### 3.1 Token Utility

The governance token ($ACL — subject to naming) serves one function: **voting rights in the DAO governance layer**. It is explicitly a governance token, not a security token or utility token in the financial sense.

Design principles:
- Non-transferable for the first 12 months post-issuance (reduces speculation)
- Cannot be staked for yield (reduces financialisation)
- Governance rights only — no claim on Foundation assets or revenues
- Required stake for protocol participation (skin in the game)

### 3.2 Token Distribution

| Allocation | % | Vest | Description |
|-----------|---|------|-------------|
| Founding team | 20% | 4-year vest, 1-year cliff | Founders and early employees |
| Foundation reserve | 25% | Foundation-controlled, no vest | Protocol development, grants |
| Ecosystem/developers | 20% | Earned by contribution | Developer grants, ecosystem incentives |
| Early participants | 15% | 2-year vest | Pilot customers, early DAO members |
| Investors | 15% | 2-year vest | Seed investors (non-voting ordinary shares in CLG; governance tokens separate) |
| Technical Committee | 5% | 3-year vest | Allocated to Technical Committee members |

**Total: 100%**

### 3.3 Regulatory Caution on Token Issuance

Gibraltar's DLT framework requires careful analysis of whether the governance token constitutes a "token" subject to regulation under Gibraltar's Proceeds of Crime Act 2015 or EU MiCA (Markets in Crypto Assets Regulation, in force 2024).

*Question for legal counsel:* Does a governance-only token issued by a Gibraltar CLG constitute a crypto-asset requiring MiCA classification? If so, which category? MiCA's "utility token" exemption may apply, but this requires specific legal analysis.

---

## 4. Seed Investment Structure

Seed investors invest in the Foundation via **Convertible Notes or SAFE (Simple Agreement for Future Equity)** — standard startup instruments — converting to ordinary shares in the Foundation company on a future qualifying round.

Governance tokens are NOT issued to investors as part of the investment. They are separate, earned over time through participation or purchased separately (if regulations permit). This separation is important for regulatory reasons and for maintaining the integrity of the governance model.

**Structure:**
```
Investor → Convertible Note → AgentClear Foundation Ltd (Gibraltar CLG)
                                         ↓
                         Ordinary shares (non-voting in DAO, 
                          but with financial rights to revenue)
                         
DAO Governance → Separate governance token (not a security)
```

*Question for legal counsel:* Is this structure compatible with Gibraltar company law? Does a CLG permit ordinary shares with financial rights? (May need a different company type — Gibraltar private company limited by shares, with Foundation operating as a subsidiary.)

---

## 5. Banking and Treasury

**Banking:** Gibraltar's banking sector is smaller than the UK/EU. Primary options:
- Barclays Gibraltar (major UK bank, DLT-friendly)
- Jyske Bank Gibraltar
- Digital/fintech bank (Wise Business, Mercury) for operational accounts

**Crypto treasury:** Foundation may hold a portion of reserves in stablecoins (USDC) for operational efficiency in paying contributors and gas costs. This requires GFSC guidance on whether this constitutes DLT activity.

**Multi-sig:** All treasury assets above €50K should be held in a multi-signature wallet (e.g. Gnosis Safe) requiring minimum 2-of-3 Foundation director signatures. This is both a security requirement and a governance best practice.

---

## 6. Action Plan

| Action | Owner | Timeline | Cost Estimate |
|--------|-------|----------|---------------|
| Engage Gibraltar corporate solicitor | Mike | Month 1 | €3,000–€5,000 |
| GFSC DLT licence assessment | Legal counsel | Month 1–2 | Included in legal budget |
| Incorporate Foundation CLG | Legal counsel | Month 2–3 | €2,000–€4,000 |
| Draft Foundation Articles | Legal counsel | Month 2–3 | Included |
| MiCA/token regulatory analysis | Legal counsel | Month 3–4 | €3,000–€5,000 |
| Open banking relationship | Mike | Month 3 | — |
| Technical Committee charter | Founder + advisors | Month 4–6 | Internal |
| DAO governance smart contracts | Engineering | Month 18+ | Included in build budget |

---

*AgentClear DAO Legal Wrapper Structure v0.1 — For legal counsel review*  
*This document does not constitute legal advice.*
