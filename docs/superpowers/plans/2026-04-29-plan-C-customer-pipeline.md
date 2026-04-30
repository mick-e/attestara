# Plan C — First-Customer Pipeline + Reference Demos

> **Strategic priority:** #3 from `docs/attestara-next.txt`. Convert tech demo into a protocol with actual transactions. Surface real pain points internal review can't.
>
> **Goal:** 3-5 design partners running pilots within 90 days, with vertical-specific reference demos, white-glove onboarding, and quantitative success metrics.
>
> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Several tasks (partner outreach, contracts, marketing) are non-engineering — clearly marked `[USER DECISION]` or `[GTM]`.

**Constraints:**
- Pilots must produce real on-chain commitments (testnet OK initially, mainnet after Plan B closes).
- Each design partner gets a named Attestara engineering contact (no anonymous support).
- Quantitative metrics from day one: time-to-first-commitment, weekly active agents, retained agents at 4 weeks.
- ISO dates YYYY-MM-DD everywhere.

**Estimated timeline:** 12-16 weeks from kickoff to 5 pilots running.

---

## Phase Layout

```
Phase C1: ICP refinement              (1 week)  ── who exactly do we sell to
Phase C2: Vertical reference demos    (4 weeks) ── 3 demos in parallel
Phase C3: Outbound + qualification    (4 weeks) ── overlaps C2 final 2 weeks
Phase C4: Pilot kickoff (3-5 partners)(4 weeks)
Phase C5: Pilot execution + feedback  (8 weeks)
Phase C6: Case studies + GTM iteration(2 weeks)
```

---

## Phase C1 — ICP Refinement (1 week)

### Task C1.1: Define the three target verticals

**Files:**
- Create: `docs/gtm/IDEAL-CUSTOMER-PROFILE.md`

Per `docs/attestara-next.txt`, the three candidate verticals are:

1. **DeFi protocols automating treasury** — DAO-controlled treasuries delegating to bot agents for swaps, rebalancing, yield optimization. Pain: bots need spending limits that are cryptographically enforced, not just YAML.
2. **DAOs using agents for governance** — voting delegation to agent-personas with mandate-bounded scope. Pain: delegation today is binary; mandates need granularity (only environmental proposals, max budget X).
3. **B2B procurement platforms** — autonomous purchasing agents in cross-org workflows. Pain: counterparty cannot verify the buying agent has authority without revealing the underlying mandate.

- [ ] **Step 1:** For each vertical, document: top 3 pain points, current workarounds, decision-maker title, typical contract size, regulatory environment.
- [ ] **Step 2:** Identify 8-12 specific target companies per vertical (24-36 total) based on public signals (job posts mentioning "agent infrastructure," DAO forums discussing autonomous treasury).
- [ ] **Step 3:** Score each on: technical readiness, brand value as reference, deal velocity, expansion potential.
- [ ] **Step 4:** Commit — `docs(gtm): ICP definitions for DeFi treasury, DAO governance, B2B procurement`

### Task C1.2: Outreach narrative per vertical

**Files:**
- Create: `docs/gtm/NARRATIVES/`
  - `defi-treasury.md`
  - `dao-governance.md`
  - `b2b-procurement.md`

- [ ] **Step 1:** Each narrative answers (in customer's language, not ours): "What is broken in your current bot/agent infra? Here's the one thing Attestara unlocks. Here's the proof in 5 minutes."
- [ ] **Step 2:** Avoid protocol jargon ("ZK proofs," "Verifiable Credentials") in opening — lead with concrete outcome ("limit your treasury bot to $500k swaps with cryptographic enforcement, not YAML config").
- [ ] **Step 3:** Each narrative is 1 page max.
- [ ] **Step 4:** Commit — `docs(gtm): vertical-specific narratives for outbound`

### Task C1.3: Pricing model for pilots

**Files:**
- Create: `docs/gtm/PILOT-PRICING.md`

- [ ] **Step 1:** Pilot tier: free (white-glove) for first 5 partners in exchange for: case study, monthly call, public reference. 90-day window.
- [ ] **Step 2:** Post-pilot pricing options to test in conversations:
  - **Per-commitment fee** (x402-aligned): $0.05-0.50 per on-chain commitment
  - **Per-agent SaaS:** $99-499/agent/mo
  - **Volume tier:** $5k/mo for first 10k commitments, $0.10 each thereafter
- [ ] **Step 3:** Don't anchor on a number publicly until 2 paying customers exist.
- [ ] **Step 4:** Commit — `docs(gtm): pilot pricing terms and post-pilot price ladder`

---

## Phase C2 — Vertical Reference Demos (4 weeks, parallel)

Three demos shipped in parallel. Each is a runnable repo + 5-min Loom + landing page.

### Task C2.1: DeFi treasury demo — "Bounded swap bot"

**Files:**
- Create: `examples/defi-treasury-bot/`
  - `README.md`
  - `agent.py` (using Plan A's `attestara-langgraph` once available; falls back to direct SDK if Plan A not done)
  - `dao.sol` (sample DAO contract that issues mandates to bot)
  - `scenario.md` (the demo story)
- Create: `docs/demo/defi-treasury.mp4` (Loom recording)

- [ ] **Step 1:** Scenario: a DAO governance vote authorizes a bot to swap up to $500k of stablecoins per epoch on Uniswap v3. Bot proposes swaps; each proposal includes a ZK proof that swap amount ≤ mandate ceiling. DAO contract verifies proof on-chain before releasing funds.
- [ ] **Step 2:** Show the moment of value: revoke the credential mid-demo; prove that the bot can no longer swap, even though it's holding fresh signatures.
- [ ] **Step 3:** Loom recording walks through the demo end-to-end in 5 minutes.
- [ ] **Step 4:** Companion blog post: "Why YAML-defined bot permissions don't scale to autonomous agents."
- [ ] **Step 5:** Commit — `feat(examples): DeFi treasury bot with bounded swap mandate`

### Task C2.2: DAO governance demo — "Mandate-bounded delegate"

**Files:**
- Create: `examples/dao-delegate/`
  - `README.md`
  - `agent.py`
  - `delegation.sol`
  - `scenario.md`
- Create: `docs/demo/dao-delegate.mp4`

- [ ] **Step 1:** Scenario: a DAO member delegates voting power to a "climate-focused" agent persona that may only vote on proposals tagged `environmental` and never on treasury changes >$1M. Agent receives proposals, evaluates them, votes — each vote carries a ZK proof of mandate compliance.
- [ ] **Step 2:** Live test: feed the agent a proposal that violates its mandate. It refuses to vote and emits an audit log. Show the audit log entry.
- [ ] **Step 3:** Loom recording.
- [ ] **Step 4:** Companion blog post: "Delegation with cryptographic guardrails."
- [ ] **Step 5:** Commit — `feat(examples): DAO governance delegate with topic + budget mandates`

### Task C2.3: B2B procurement demo — "Privacy-preserving cross-org negotiation"

**Files:**
- Create: `examples/b2b-procurement/`
  - `README.md`
  - `buyer_agent.py`
  - `seller_agent.py`
  - `scenario.md`
- Create: `docs/demo/b2b-procurement.mp4`

- [ ] **Step 1:** Scenario: an enterprise buyer's agent has a $2M cloud-compute budget. A vendor's agent has rate cards. They negotiate over price/SLA; the buyer's agent never reveals its actual ceiling, only proves each offer is within mandate.
- [ ] **Step 2:** Show the "term redaction" in the relay: each side sees only the terms relevant to them; the on-chain commitment contains hashed terms with selective disclosure.
- [ ] **Step 3:** Highlight the audit trail: even though terms are private, regulators with appropriate keys can later audit the full negotiation.
- [ ] **Step 4:** Loom recording.
- [ ] **Step 5:** Companion blog post: "Negotiating without showing your hand: ZK proofs in B2B procurement."
- [ ] **Step 6:** Commit — `feat(examples): B2B procurement with selective-disclosure negotiation`

### Task C2.4: Demo gallery on portal

**Files:**
- Modify: `packages/portal/app/(public)/page.tsx` (landing page hero updated)
- Create: `packages/portal/app/(public)/use-cases/page.tsx`

- [ ] **Step 1:** Each demo gets a card on the portal landing with: thumbnail, 1-line problem, 1-line outcome, embedded 30-sec preview, CTA to "Run this demo in 10 minutes."
- [ ] **Step 2:** Use-cases page links to each example repo + Loom.
- [ ] **Step 3:** Commit — `feat(portal): use-case gallery on landing page`

---

## Phase C3 — Outbound + Qualification (4 weeks)

### Task C3.1: Outbound campaign infrastructure `[GTM]`

**Files:**
- Create: `docs/gtm/OUTBOUND-PLAYBOOK.md`

- [ ] **Step 1:** Tooling: Apollo or Clay for prospecting, Smartlead for sequencing, HubSpot or Attio for CRM.
- [ ] **Step 2:** Sequence per vertical: 4 emails over 2 weeks + 2 LinkedIn touches. First email opens with the demo Loom, not a sales pitch.
- [ ] **Step 3:** Tracking: open rate, reply rate, demo-booked rate, qualified-meeting rate.

### Task C3.2: Outbound waves `[GTM]`

- [ ] **Step 1:** Wave 1 (Week 1): 30 prospects across all 3 verticals, hand-personalized.
- [ ] **Step 2:** Wave 2 (Week 2): expand to 60.
- [ ] **Step 3:** Iterate on the worst-performing vertical's narrative based on Wave 1 data.
- [ ] **Step 4:** Target: 10-15 booked demos by end of Week 4.

### Task C3.3: Qualification framework

**Files:**
- Create: `docs/gtm/QUALIFICATION-CHECKLIST.md`

- [ ] **Step 1:** Qualification criteria for becoming a design partner:
  - **Pain validated:** they articulate a problem Attestara solves without prompting.
  - **Technical readiness:** they have at least one engineer who can integrate in 2 weeks.
  - **Authority:** decision-maker is in the room or signs off async within 1 week.
  - **Reference willingness:** they will publicly say they used Attestara if the pilot succeeds.
  - **Realistic scope:** their first integration is one workflow, not "rip out our entire stack."
- [ ] **Step 2:** Disqualifiers: needs SOC 2 today (we're not there), insists on on-prem, expects 99.99% SLA before mainnet audit complete.
- [ ] **Step 3:** Commit — `docs(gtm): design partner qualification checklist`

### Task C3.4: Discovery call template

**Files:**
- Create: `docs/gtm/DISCOVERY-CALL-TEMPLATE.md`

- [ ] **Step 1:** 30-min agenda: 5 min context, 15 min their problem (open questions), 10 min targeted demo + price discussion.
- [ ] **Step 2:** Decision points: are they a fit (use C3.3 checklist), what their first integration looks like, who else needs to be in the room.
- [ ] **Step 3:** Follow-up template: same-day recap email with proposed next steps + dates.
- [ ] **Step 4:** Commit — `docs(gtm): discovery call template and follow-up`

---

## Phase C4 — Pilot Kickoff (4 weeks, 3-5 partners)

### Task C4.1: Pilot agreement template

**Files:**
- Create: `docs/gtm/PILOT-AGREEMENT-TEMPLATE.md`

- [ ] **Step 1:** Lightweight 2-page agreement covering: scope, timeline (90 days), free in exchange for case study + reference, mutual confidentiality, IP retention, post-pilot conversion path.
- [ ] **Step 2:** [USER DECISION] Have legal review template (one-time cost, ~$2-5k).
- [ ] **Step 3:** Commit — `docs(gtm): design partner pilot agreement template`

### Task C4.2: Per-partner integration plan

**Files (per partner):**
- Create: `docs/partners/<partner>/INTEGRATION-PLAN.md`
- Create: `docs/partners/<partner>/SUCCESS-METRICS.md`

- [ ] **Step 1:** Joint document: their workflow today, what changes with Attestara, milestones (week 1: SDK installed, week 2: first agent registered, week 3: first commitment, week 4: first production transaction).
- [ ] **Step 2:** Success metrics agreed upfront: how do we know this worked? (e.g., "5 production swaps via mandated agent in 30 days," "1 governance vote cast via delegate").
- [ ] **Step 3:** Commit — `docs(partners): integration plan and metrics for <partner>`

### Task C4.3: Slack-shared channel + named contact

- [ ] **Step 1:** Create a shared Slack Connect channel per partner.
- [ ] **Step 2:** Assign a single named Attestara engineer as their primary contact (sub-4-hour response SLA during business hours).
- [ ] **Step 3:** Weekly 30-min sync for the first 4 weeks.

### Task C4.4: Telemetry setup

**Files:**
- Modify: `packages/relay/src/services/analytics.service.ts`

- [ ] **Step 1:** Per-partner telemetry: time-to-first-agent, time-to-first-commitment, weekly active agents, error rate, support ticket volume.
- [ ] **Step 2:** Internal dashboard tracking all pilots side-by-side.
- [ ] **Step 3:** Commit — `feat(analytics): per-partner pilot telemetry`

---

## Phase C5 — Pilot Execution + Feedback (8 weeks)

### Task C5.1: Weekly pilot review

- [ ] **Step 1:** Internal weekly review: each pilot's status, blockers, support tickets, telemetry.
- [ ] **Step 2:** Action items per pilot — assign owner + deadline.
- [ ] **Step 3:** Maintain a public-facing pilot status (anonymized) on portal: "X active pilots, Y commitments to date."

### Task C5.2: Pain-point capture

**Files:**
- Create: `docs/feedback/PILOT-FEEDBACK-LOG.md`

- [ ] **Step 1:** Every conversation, support ticket, or feature request logged with: partner, severity, theme.
- [ ] **Step 2:** Themed monthly: "what 3 things are blocking real adoption?"
- [ ] **Step 3:** Top 5 themes feed into product backlog with named partner attribution.
- [ ] **Step 4:** Commit (monthly) — `docs(feedback): pilot pain-point themes for <month>`

### Task C5.3: Feature flag pipeline for pilot-driven changes

**Files:**
- Modify: `packages/relay/src/feature-flags.ts` (create if missing)

- [ ] **Step 1:** Use feature flags (Unleash or simple env-var-based) to ship pilot-requested features without affecting other users.
- [ ] **Step 2:** Each flag has an owner, expected sunset date, and a removal task.
- [ ] **Step 3:** Commit — `feat(relay): feature flag system for pilot-targeted changes`

### Task C5.4: Mid-pilot expansion conversation

- [ ] **Step 1:** Around Week 8, schedule per-partner expansion conversation: "Are you seeing value? What would Year 1 look like?"
- [ ] **Step 2:** Get verbal commitment to convert at least 2 of 5 pilots into paid contracts.
- [ ] **Step 3:** Surface objections to address in remaining 4 weeks.

---

## Phase C6 — Case Studies + GTM Iteration (2 weeks)

### Task C6.1: Case study production (per converted partner)

**Files (per partner):**
- Create: `docs/case-studies/<partner>.md`
- Create: `packages/portal/app/(public)/case-studies/<partner>/page.tsx`

- [ ] **Step 1:** Standard structure: problem, solution, implementation, quantitative results, partner quote.
- [ ] **Step 2:** Get partner sign-off on every fact and quote.
- [ ] **Step 3:** Publish on portal + LinkedIn + relevant developer communities.
- [ ] **Step 4:** Commit — `docs(case-studies): <partner> public case study`

### Task C6.2: GTM playbook v2

**Files:**
- Modify: `docs/gtm/IDEAL-CUSTOMER-PROFILE.md`
- Modify: `docs/gtm/OUTBOUND-PLAYBOOK.md`
- Modify: `docs/gtm/PILOT-PRICING.md`

- [ ] **Step 1:** Update each doc with what we learned: which vertical converted best, which narrative worked, which pricing model resonated.
- [ ] **Step 2:** Refined ICP: narrow further based on conversion data.
- [ ] **Step 3:** Commit — `docs(gtm): playbook v2 refined from pilot conversions`

### Task C6.3: Public launch + first paid customer

- [ ] **Step 1:** Coordinated launch: blog post, Twitter/X thread, Hacker News post, podcast interview booked.
- [ ] **Step 2:** First paid customer announcement (with their permission).
- [ ] **Step 3:** Investor / stakeholder update.

---

## Final Task: Update memory + plan v2

- [ ] **Step 1:** Update `project_attestara.md` memory with: 5 design partners (anonymized status), commitments-to-date count, conversion rate, top 3 product pain themes from pilots.
- [ ] **Step 2:** Plan C v2 (paid-customer expansion) drafted in `docs/superpowers/plans/`.

---

## Success Criteria

- [ ] 30+ qualified outbound conversations
- [ ] 10+ booked demos
- [ ] 5 signed pilot agreements
- [ ] All 5 pilots produce ≥1 real on-chain commitment by Week 8
- [ ] ≥2 pilots convert to paid contracts by end of pilot window
- [ ] ≥1 published case study with partner attribution
- [ ] Aggregate of ≥100 commitments across all pilots in the 90-day window
- [ ] Top 5 pain themes captured + at least 3 addressed in product backlog

---

## Budget Summary

| Item | Cost (USD) |
|------|-----------|
| Outbound tooling (Apollo + Smartlead + Attio) | $500-1000/mo |
| Legal review of pilot template | $2-5k one-time |
| Demo production (Loom Pro, video editing) | $500-1500 |
| Conference / event presence (1 booth, 1 talk) | $5-15k |
| Engineering hours for white-glove (~0.5 FTE for 90 days) | salary cost |
| Travel for top-2 in-person meetings | $2-5k |
| **Total upfront:** | **$10-30k + 0.5 FTE** |

---

## Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| Outbound conversion below 1% | Re-do narrative work in C1.2; consider inbound channels (content, conferences) |
| Pilots stall on integration | Engineering pre-builds reference scaffolding; C2 demos must be plug-and-play |
| No vertical converts disproportionately well | Run all 3 simultaneously to find product-market fit fast; pivot focus to winner by Week 8 |
| Partner asks for features blocking other roadmap | Feature flags (C5.3); say no to one-off requests that don't generalize |
| Free pilots never convert to paid | Mid-pilot expansion conversation (C5.4); make pricing clear at signing |
| Compliance asks (SOC 2, ISO 27001) block enterprise | Have a roadmap to point to; some pilots will need to wait |
| Partner negative reference | Single-named-contact + weekly sync catches issues early; structured exit if pilot fails |

---

## Execution Order Summary

1. **Phase C1** sequential, completes before C2 starts.
2. **Phase C2** parallel (3 demos in parallel) + **C3 begins in C2 Week 3** (overlap final 2 weeks of C2 with first 2 of C3).
3. **Phase C4** as soon as first qualified pilot lands (rolling).
4. **Phase C5** runs continuously per partner from their kickoff.
5. **Phase C6** at Week 12-14, after first conversions land.

Per pilot, weekly cadence:
```
Mon: telemetry review → identify blockers
Wed: 30-min sync with partner
Fri: write up theme observations to PILOT-FEEDBACK-LOG
```
