# Attestara — Brand Guidelines
## v0.1 — March 2026

---

## 1. Name

**Attestara** — always written with a capital "A" and no spaces, hyphens, or camelCase.

| Usage | Correct | Incorrect |
|-------|---------|-----------|
| In text | Attestara | attestara, ATTESTARA, Attest-Ara, AttestAra |
| Possessive | Attestara's | Attestaras' |
| As adjective | Attestara protocol | Attestara Protocol (do not capitalise "protocol" unless starting a sentence) |

### Name Origin

"Attestara" combines "attest" (to certify, to bear witness) with a suffix evoking "clearing" — reflecting the protocol's role as a clearing house for AI agent trust. The name is deliberately institutional in tone: it should feel like infrastructure, not a consumer app.

### Legal Name

The legal entity is **Attestara Foundation** (Gibraltar). When referring to the organisation (not the protocol), use "Attestara Foundation" on first reference and "Attestara" thereafter.

---

## 2. Tagline

**Primary:** "The clearing house for AI agents"

**Extended variants (for context-specific use):**
- "Trust infrastructure for the AI agent economy" — investor/enterprise contexts
- "Cryptographic trust for autonomous AI negotiation" — technical/developer contexts
- "Verifiable authority. Binding commitment. Enforceable accountability." — standards body/regulatory contexts

The primary tagline references the 1832 London Bankers' Clearing House analogy from the investor one-pager. Use it consistently across the website, pitch decks, and social profiles.

---

## 3. Colour Palette

### Primary Colours

| Colour | Hex | RGB | Usage |
|--------|-----|-----|-------|
| **Navy** | `#1a1a2e` | 26, 26, 46 | Primary background, headers, body text on light backgrounds |
| **Deep Blue** | `#0f3460` | 15, 52, 96 | Secondary backgrounds, cards, code blocks |
| **Signal Red** | `#e94560` | 233, 69, 96 | Accent, CTAs, highlights, links, alerts |

### Supporting Colours

| Colour | Hex | RGB | Usage |
|--------|-----|-----|-------|
| **White** | `#ffffff` | 255, 255, 255 | Primary text on dark backgrounds, page backgrounds |
| **Light Grey** | `#f0f0f5` | 240, 240, 245 | Secondary backgrounds, cards on white |
| **Medium Grey** | `#6c6c80` | 108, 108, 128 | Secondary text, captions, metadata |
| **Success Green** | `#10b981` | 16, 185, 129 | Verification success, valid status |
| **Warning Amber** | `#f59e0b` | 245, 158, 11 | Warnings, pending states |

### Colour Rationale

The palette is deliberately dark and institutional. Navy and deep blue convey trust, security, and financial-grade seriousness. Signal red provides energy and urgency without undermining the institutional tone. This palette positions Attestara alongside financial infrastructure (SWIFT, Bloomberg) rather than consumer tech (Stripe, Linear).

### Accessibility

- All text must meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
- Signal red `#e94560` on Navy `#1a1a2e` passes AA for large text only. For body text on dark backgrounds, use white `#ffffff`.
- Signal red `#e94560` on white `#ffffff` passes AA for all text sizes.

---

## 4. Typography

### Recommended Typefaces

| Usage | Typeface | Fallback | Weight |
|-------|----------|----------|--------|
| **Headings** | Inter | system-ui, -apple-system, sans-serif | 600 (SemiBold), 700 (Bold) |
| **Body text** | Inter | system-ui, -apple-system, sans-serif | 400 (Regular), 500 (Medium) |
| **Code / technical** | JetBrains Mono | Fira Code, Consolas, monospace | 400 (Regular) |

### Why Inter

Inter is open-source (SIL Open Font License), optimised for screen readability at small sizes, and has excellent support for tabular numbers (important for displaying hashes, addresses, and financial figures). It is the standard for developer-facing infrastructure products.

### Type Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 2.25rem (36px) | 700 | 1.2 |
| H2 | 1.75rem (28px) | 600 | 1.3 |
| H3 | 1.375rem (22px) | 600 | 1.4 |
| Body | 1rem (16px) | 400 | 1.6 |
| Small / caption | 0.875rem (14px) | 400 | 1.5 |
| Code inline | 0.875rem (14px) | 400 (mono) | 1.5 |

---

## 5. Logo

### Current Status

No logo has been designed yet. Until a logo is finalised, use the wordmark "Attestara" set in Inter Bold (700 weight) with the following specifications:

- Colour on dark backgrounds: White `#ffffff`
- Colour on light backgrounds: Navy `#1a1a2e`
- Minimum size: 16px height for digital, 8mm for print

### Logo Design Brief (for future designer)

The logo should:
- Work as a standalone mark (icon) and as a wordmark (text)
- Reference concepts of attestation, verification, clearing, or trust infrastructure
- Avoid cliches: no shields, padlocks, chains, or blockchain cubes
- Work at small sizes (favicons, npm badges, GitHub org avatar)
- Be legible in monochrome (black on white, white on black)

### Relationship to Littledata

Attestara and Littledata (littledata.ai) are related but distinct products under the same leadership. Attestara handles B2B agent trust infrastructure; Littledata handles EU AI Act compliance and risk assessment.

When co-branding:
- Use "Attestara, from the makers of Littledata" or "An Attestara Foundation project, in partnership with Littledata"
- Never merge the two brand identities into a single logo or combined mark
- The Littledata integration module is a proprietary product that bridges both platforms; marketing materials for it should show both brands clearly separated

---

## 6. Tone of Voice

### Core Principles

**Authoritative, not academic.** Write like an experienced engineer explaining to a peer, not like a professor lecturing to students. Assume the reader is intelligent and technically capable.

**Precise, not verbose.** Every sentence should carry information. Eliminate filler words, hedging language ("might potentially"), and unnecessary qualifiers. If a claim is uncertain, state the uncertainty directly rather than softening the language.

**Institutional, not startup-y.** Attestara is infrastructure. The tone should feel closer to a central bank white paper than a Y Combinator demo day pitch. Avoid: "revolutionary," "game-changing," "disruptive," "10x," "moonshot." Use: "enables," "enforces," "verifies," "settles."

**Concrete, not abstract.** Favour specific examples over general claims. Instead of "Attestara provides trust," write "Attestara enables Agent A to verify that Agent B has authority to commit to a price below $50,000 without Agent B revealing its actual price limit."

### Writing Examples

| Context | Avoid | Use |
|---------|-------|-----|
| Feature description | "Our cutting-edge ZK technology revolutionises agent trust" | "Zero-knowledge proofs allow agents to prove mandate compliance without revealing mandate parameters" |
| Error message | "Oops! Something went wrong" | "Credential verification failed: issuer DID not found in registry" |
| Marketing | "The future of AI agent commerce" | "Verifiable authority for AI agent negotiation, today" |
| Documentation | "Simply call the function" | "Call `verifyMandate()` with the credential and proof as arguments" |

### Terminology

Use these terms consistently:

| Term | Definition | Do Not Use |
|------|-----------|------------|
| Authority Credential | A Verifiable Credential encoding an agent's negotiating mandate | Permission, authorisation token, access grant |
| Commitment Record | An on-chain record of a finalised agreement | Transaction, deal, contract (unless legal context) |
| Mandate | The scope of authority delegated to an agent | Permission set, role, access level |
| Prover Service | The managed infrastructure for ZK proof generation | Proof engine, ZK server |
| Session anchor | The dual-signed hash anchoring a negotiation session | Session ID, session token |
| Deploying organisation | The entity that deploys and is accountable for an agent | Owner, operator (unless regulatory context requires "operator") |

---

## 7. Visual Elements

### Code Examples

All code examples should use syntax highlighting with the Attestara colour palette:
- Keywords: Signal Red `#e94560`
- Strings: Success Green `#10b981`
- Comments: Medium Grey `#6c6c80`
- Background: Navy `#1a1a2e` or Deep Blue `#0f3460`

### Diagrams

Use clean, minimal diagrams with the brand colour palette. Prefer:
- Mermaid.js for documentation (renders in GitHub, GitBook, and most doc platforms)
- Excalidraw-style hand-drawn diagrams for blog posts and explainers (approachable tone)
- Formal architecture diagrams (boxes and arrows) for enterprise materials

### Iconography

If icons are needed, use a consistent set (Lucide, Heroicons, or Phosphor Icons). Do not mix icon libraries within a single page or document.

---

## 8. Application

### Website (attestara.ai)

- Dark theme by default (Navy background, white text)
- Signal Red for primary CTAs and interactive elements
- Deep Blue for cards, code blocks, secondary sections
- Inter for all text; JetBrains Mono for code

### Documentation (attestara.dev)

- Light theme (white background, Navy text) for extended reading
- Signal Red for links and inline code highlights
- Deep Blue for sidebar navigation and headers

### Presentations / Pitch Decks

- Dark slide backgrounds (Navy `#1a1a2e`)
- White text for body, Signal Red for emphasis
- One key message per slide
- Include the tagline on the title slide and closing slide

### Social Media

- Profile picture: Wordmark "A" (first letter) in white on Navy background, or full logo once designed
- Banner: Tagline "The clearing house for AI agents" on Navy background with Signal Red accent line
- Post style: Concise, technical, factual. Link to documentation or specifications rather than making unsupported claims.

---

*Attestara Brand Guidelines v0.1*
