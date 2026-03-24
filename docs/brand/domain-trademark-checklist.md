# Attestara — Domain, Trademark & Brand Asset Checklist
## v0.1 — March 2026

---

## Domain Registration (Priority: IMMEDIATE)

Register all domains before any public disclosure of the protocol specification or investor materials. Domain squatting risk increases with every external conversation.

### Primary Domains

- [ ] **attestara.ai** — Primary website, protocol URLs, JSON-LD contexts, status endpoints. All canonical protocol URLs (contexts, schemas, verification keys, status lists) resolve here.
- [ ] **attestara.com** — Redirect to attestara.ai. Defensive registration to prevent squatting.
- [ ] **attestara.io** — Developer portal. Common TLD for protocol/developer tooling projects.
- [ ] **attestara.dev** — Documentation site. Google-managed TLD enforces HTTPS by default.
- [ ] **attestara.org** — Standards and community hub. Reinforces the open-protocol positioning.
- [ ] **attestara.network** — Protocol network branding. Useful for marketing the decentralised network layer.

### Defensive Registrations

- [ ] **attestara.net** — Prevent squatting (common fallback TLD).
- [ ] **attestara.co** — Prevent squatting (commonly confused with .com).

### Registrar Recommendations

| Registrar | Strengths | Notes |
|-----------|-----------|-------|
| Cloudflare Registrar | At-cost pricing, integrated DNS/CDN, no markup | Recommended for primary domains |
| Namecheap | Low cost, good bulk management | Good for defensive registrations |
| Google Domains (Squarespace) | Manages .dev TLD natively | Required for attestara.dev if Cloudflare unavailable |

### Estimated Costs (Annual)

| Domain | Est. Cost/Year |
|--------|---------------|
| attestara.ai | $50–$80 |
| attestara.com | $10–$15 |
| attestara.io | $30–$50 |
| attestara.dev | $12–$15 |
| attestara.org | $10–$15 |
| attestara.network | $15–$25 |
| attestara.net | $10–$15 |
| attestara.co | $25–$35 |
| **Total** | **~$160–$250/year** |

### DNS Setup Notes

- Use Cloudflare as DNS provider for all domains (even if registered elsewhere) for DDoS protection and edge caching.
- Configure DNSSEC on all domains.
- Set up CAA records to restrict certificate issuance to Let's Encrypt / Cloudflare only.
- Redirect all defensive domains (`.com`, `.net`, `.co`) to `attestara.ai` via 301 permanent redirects.
- Enable domain lock (transfer protection) on all registrations immediately after purchase.
- Set up WHOIS privacy on all domains.

**Responsible party:** CEO / CTO
**Deadline:** Before any external disclosure of protocol specification

---

## Trademark Registration

The "Attestara" name is currently unregistered (per IP Strategy v0.1, Section 4). Trademark protection is critical because even though the protocol is open, only Attestara Foundation can use the "Attestara" brand or offer "Attestara-certified" products.

### Filing Strategy

File in Gibraltar first (operational base, fastest), then EUIPO and UK IPO in parallel, then USPTO.

### Nice Classification Classes

| Class | Description | Relevance |
|-------|-------------|-----------|
| **Class 9** | Downloadable software, cryptographic protocols, SDK | Core protocol software, ZK circuits, SDK |
| **Class 42** | SaaS, software as a service, cloud computing | Managed Prover Service, Governance Dashboard |
| **Class 36** | Financial services, insurance, monetary affairs | Agent negotiation in financial services, commitment settlement |

### Filing Checklist

#### Gibraltar — Office of Fair Trading (Priority: FIRST)
- [ ] Conduct trademark search (Gibraltar IP database)
- [ ] Prepare application — Word mark "ATTESTARA"
- [ ] File for Classes 9, 42, 36
- [ ] **Est. cost:** GBP 100 filing fee + GBP 50 per additional class = ~GBP 200 total
- [ ] **Timeline:** 3–6 months to registration
- [ ] **Notes:** Smallest jurisdiction, fastest processing. Establishes priority date for Madrid Protocol.

#### EUIPO — EU-wide (Priority: HIGH)
- [ ] Conduct EUIPO TMview search for conflicts
- [ ] File EU Trade Mark (EUTM) application — Word mark "ATTESTARA"
- [ ] File for Classes 9, 42, 36
- [ ] **Est. cost:** EUR 850 (first class) + EUR 50 (second class) + EUR 150 (third class) = ~EUR 1,050 online filing
- [ ] **Timeline:** 5–8 months if no opposition; up to 18 months if opposed
- [ ] **Notes:** Covers all 27 EU member states in a single filing. Essential for EU AI Act compliance market positioning.

#### UK IPO — United Kingdom (Priority: HIGH)
- [ ] Conduct UK IPO trademark search
- [ ] File UK trade mark application — Word mark "ATTESTARA"
- [ ] File for Classes 9, 42, 36
- [ ] **Est. cost:** GBP 170 (first class) + GBP 50 per additional class = ~GBP 270
- [ ] **Timeline:** 4–6 months to registration
- [ ] **Notes:** Post-Brexit, UK is separate from EUIPO. Required for UK financial services market.

#### USPTO — United States (Priority: MEDIUM)
- [ ] Conduct TESS trademark search
- [ ] File US trademark application — Word mark "ATTESTARA"
- [ ] File for Classes 9, 42, 36 (separate application per class or combined)
- [ ] **Est. cost:** USD 250–$350 per class (TEAS Plus/Standard) = ~USD 750–$1,050
- [ ] **Timeline:** 8–12 months to registration; up to 18 months with Office Actions
- [ ] **Notes:** File under Section 1(b) (intent to use) if product is not yet in US commerce. Use basis can be amended later.

### Madrid Protocol Option

- [ ] **Consider Madrid Protocol filing** after Gibraltar registration establishes priority date
- [ ] Designate additional countries (Singapore, Australia, Japan, Switzerland) through a single WIPO application
- [ ] **Est. cost:** CHF 653 base fee + CHF 100 per class per designated country
- [ ] **Best for:** Expanding protection to 5+ countries efficiently
- [ ] **Notes:** Requires a "home" registration first (Gibraltar). More cost-effective than individual national filings when covering 3+ additional jurisdictions.

### Certification Mark (Future)

- [ ] Develop "Attestara Compatible" certification mark for third-party implementations
- [ ] Define conformance test suite requirements
- [ ] File certification mark applications in key jurisdictions
- [ ] **Timeline:** After protocol v1.0 and first third-party implementations exist

### Total Estimated Trademark Costs

| Jurisdiction | Est. Cost |
|-------------|-----------|
| Gibraltar | ~GBP 200 (~EUR 230) |
| EUIPO | ~EUR 1,050 |
| UK IPO | ~GBP 270 (~EUR 315) |
| USPTO | ~USD 750–1,050 (~EUR 700–980) |
| **Total (4 jurisdictions)** | **~EUR 2,300–2,575** |
| Madrid Protocol (optional, 3 additional countries) | ~EUR 1,500–2,500 additional |

**Responsible party:** CEO + IP attorney
**Deadline:** Within 30 days of seed funding close, or before first public protocol disclosure, whichever comes first

---

## Social Media & Developer Accounts (Priority: HIGH)

Reserve all accounts immediately. Username squatting is irreversible on most platforms.

### Developer Platforms

- [ ] **GitHub:** `github.com/attestara` — Create organisation. Transfer protocol repos here. Reserve immediately.
- [ ] **npm:** `@attestara` scope — Already reserved per submission-orgs.txt. Confirm ownership.
- [ ] **PyPI:** `attestara` package name — Reserve with placeholder package.
- [ ] **crates.io:** `attestara` — Reserve if Rust implementation is planned.
- [ ] **Docker Hub:** `attestara` organisation — Reserve for container images.

### Social Media

- [ ] **Twitter/X:** `@attestara` — Primary announcement channel. Reserve immediately.
- [ ] **LinkedIn:** Attestara company page — Professional/enterprise audience. Essential for B2B positioning.
- [ ] **Discord:** Attestara server — Developer community hub. Set up channels: #general, #protocol, #sdk, #governance, #announcements.
- [ ] **YouTube:** Attestara channel — Demo videos, conference talks, protocol explainers.
- [ ] **Bluesky:** `@attestara.bsky.social` (or `@attestara.ai` with domain verification) — Growing developer audience.

### Account Security

- [ ] Enable 2FA on all accounts (hardware key preferred, TOTP minimum).
- [ ] Use a shared password manager (1Password Business or similar) for team access.
- [ ] Document recovery codes in secure, offline storage.
- [ ] Set up a dedicated email `admin@attestara.ai` for account registrations (after domain is live).

**Responsible party:** CEO / DevRel
**Deadline:** Immediately (before any public protocol disclosure)

---

## Standards Body Registrations (Priority: HIGH)

Per the strategic recommendation in submission-orgs.txt: DIF first, W3C CCG second, JTC 21 for regulatory positioning only.

### Tier 1 — Join Immediately

- [ ] **DIF (Decentralized Identity Foundation)** — Trusted AI Agents Working Group
  - Membership: Free for companies under 1,000 employees
  - Action: Join DIF, engage working group chair, submit ZK authority enforcement approach as input to Agentic Authority Use Cases work item
  - Submit protocol spec as potential reference implementation once MVP is ready
  - **Deadline:** Immediate

### Tier 2 — Join at Month 8

- [ ] **W3C CCG (Credentials Community Group)** — CLA signed
  - Free to join (W3C Community Group, no W3C membership required)
  - Action: Submit AgentAuthorityCredential schema as Work Item proposal
  - Requires co-editor from a second organisation (cultivate this through DIF engagement)
  - Target: CCG Community Report by Month 16

- [ ] **AAIF (AI Agent Forum, Linux Foundation)** — Observer status
  - Action: Request observer status in Trust Layer Working Group
  - Submit A2A trust extension proposal

### Tier 3 — Regulatory Positioning (Ongoing)

- [ ] **CEN-CENELEC JTC 21** — Submit public consultation comments on prEN 18286 (Article 9 risk management standard)
- [ ] **ISO/IEC JTC 1/SC 42** — Monitor AI management systems standards for alignment claims

### Deferred (Phase 3+)

- [ ] IETF — Defer until independent implementations exist and enterprise customers request it
- [ ] GS1, FIX, SWIFT — Defer until live pilot deployments in supply chain or financial services
- [ ] IEEE SA, OASIS — Low priority; reference in whitepaper only

**Responsible party:** CEO / Protocol Architect
**Deadline:** DIF immediately; W3C CCG at Month 8

---

## Protocol URLs to Publish (Priority: BEFORE W3C CCG SUBMISSION)

These URLs must resolve before submitting the AgentAuthorityCredential schema to W3C CCG. All hosted on `attestara.ai`.

- [ ] `https://attestara.ai/contexts/v1` — JSON-LD context document
- [ ] `https://attestara.ai/vocab/v1` — Vocabulary document (human-readable term definitions)
- [ ] `https://attestara.ai/schemas/AgentAuthorityCredential/v1` — JSON Schema for credential validation
- [ ] `https://attestara.ai/circuits/MandateBound/v1/vkey.json` — ZK verification key (output of trusted setup)
- [ ] `https://status.attestara.ai/registry/1` — Bitstring Status List endpoint for credential revocation

### Hosting Requirements

- All URLs must return proper `Content-Type` headers (`application/ld+json`, `application/schema+json`, etc.).
- All URLs must be versioned (`/v1`) to allow future protocol evolution without breaking existing credentials.
- `status.attestara.ai` should be a separate subdomain for the status list service (can be a different backend).
- All endpoints must be publicly accessible without authentication.
- Set `Cache-Control` headers appropriately (contexts and schemas are immutable once published; status lists update frequently).

**Responsible party:** Protocol Architect / DevOps
**Deadline:** Before W3C CCG Work Item submission (target Month 8)

---

## Priority Summary

| Priority | Action | Est. Cost | Deadline |
|----------|--------|-----------|----------|
| **IMMEDIATE** | Register all domains | ~EUR 200/year | This week |
| **IMMEDIATE** | Reserve GitHub org, Twitter/X, LinkedIn, Discord, YouTube | Free | This week |
| **IMMEDIATE** | Join DIF, engage Trusted AI Agents WG | Free | This week |
| **HIGH** | File Gibraltar trademark | ~GBP 200 | Within 30 days |
| **HIGH** | File EUIPO + UK IPO trademarks | ~EUR 1,365 | Within 30 days |
| **HIGH** | Confirm npm @attestara scope, reserve PyPI | Free | Within 2 weeks |
| **MEDIUM** | File USPTO trademark | ~USD 750–1,050 | Within 60 days |
| **MEDIUM** | Set up protocol URLs on attestara.ai | Hosting costs only | By Month 8 |
| **MEDIUM** | Join W3C CCG, submit Work Item | Free | Month 8 |
| **LOW** | Madrid Protocol extensions | ~EUR 1,500–2,500 | After seed close |
| **LOW** | "Attestara Compatible" certification mark | TBD | After protocol v1.0 |

### Total Estimated Budget (Year 1)

| Category | Est. Cost |
|----------|-----------|
| Domain registrations | ~EUR 250 |
| Trademark filings (4 jurisdictions) | ~EUR 2,500 |
| IP attorney fees (trademark filings) | ~EUR 3,000–5,000 |
| Standards body memberships | Free (DIF, W3C CCG) |
| Social/developer accounts | Free |
| **Total** | **~EUR 5,750–7,750** |

This falls within the 16% legal allocation (~EUR 80,000) from the seed round budget, leaving ample budget for entity formation, patent filings, and legal counsel.

---

*Attestara Domain, Trademark & Brand Asset Checklist v0.1*
