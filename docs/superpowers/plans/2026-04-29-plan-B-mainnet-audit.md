# Plan B — Mainnet Path + Security Audit

> **Strategic priority:** #2 from `docs/attestara-next.txt`. Unlock mainnet + enterprise conversations. Without a third-party audit, no serious customer will anchor real value.
>
> **Goal:** Engage a tier-1 auditor, complete remediation, deploy contracts to Arbitrum One mainnet with hardware-wallet-controlled keys, and establish post-deployment monitoring.
>
> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Some tasks (auditor selection, key custody) require user/business decisions, not code execution.

**Constraints:**
- Zero-tolerance for skipping audit findings — every issue gets a documented disposition (fix / accept / out-of-scope).
- Mainnet deployment uses a multisig + hardware wallet, not a hot deployer key.
- Every contract deployed to mainnet has source verified on Arbiscan within 24h.
- ISO dates YYYY-MM-DD everywhere.
- Non-engineering tasks (auditor selection, contracts, payment) clearly marked `[USER DECISION]`.

**Estimated timeline:** 12-18 weeks total. Audit lead times dominate.

---

## Phase Layout

```
Phase B1: Pre-audit hardening      (3 weeks)  ── code freeze + internal review
Phase B2: Auditor engagement       (4-6 weeks) ── external audit window
Phase B3: Remediation              (2-3 weeks) ── fix + re-audit
Phase B4: Key custody + multisig   (1 week)
Phase B5: Mainnet deployment       (1 week)
Phase B6: Monitoring + bug bounty  (ongoing)
```

---

## Phase B1 — Pre-audit Hardening (3 weeks)

### Task B1.1: Code freeze on contracts

**Files:**
- Create: `packages/contracts/CODE-FREEZE.md`
- Modify: `.github/workflows/ci.yml` (add freeze gate)

- [ ] **Step 1:** Tag the audit baseline: `git tag audit-baseline-2026-XX-XX`.
- [ ] **Step 2:** Add CI rule: changes under `packages/contracts/contracts/` or `packages/contracts/circuits/` require label `post-audit` on the PR.
- [ ] **Step 3:** Communication: pin GitHub Discussions thread "Pre-audit code freeze in effect — non-trivial contract changes blocked until audit complete."
- [ ] **Step 4:** Commit — `chore(contracts): code freeze for audit baseline`

### Task B1.2: Run all open-source security tools internally

**Files:**
- Create: `docs/audit/internal-tool-results/`
  - `slither-report.md`
  - `mythril-report.md`
  - `echidna-fuzzing.md`
  - `semgrep-typescript.md`

- [ ] **Step 1:** Slither: `cd packages/contracts && slither . --exclude-dependencies --json slither.json`. Triage every finding.
- [ ] **Step 2:** Mythril: `myth analyze contracts/*.sol --solv 0.8.24 --execution-timeout 600`. Address symbolic execution warnings.
- [ ] **Step 3:** Echidna fuzzing: write property tests in `contracts/echidna/` (e.g., "credential cannot be re-used after revocation," "commitment hash uniqueness," "verifier always returns false on tampered proof"). Run for ≥4 hours.
- [ ] **Step 4:** Semgrep across TS: `semgrep --config=p/owasp-top-ten --config=p/typescript packages/relay packages/sdk packages/prover --error`.
- [ ] **Step 5:** Document each finding with disposition.
- [ ] **Step 6:** Commit — `audit(prep): internal tool sweep with Slither/Mythril/Echidna/Semgrep`

### Task B1.3: Formal Solidity invariants

**Files:**
- Create: `packages/contracts/contracts/invariants/AgentRegistryInvariants.sol`
- Create: `packages/contracts/contracts/invariants/CommitmentInvariants.sol`
- Create: `packages/contracts/contracts/invariants/CredentialRegistryInvariants.sol`
- Create: `packages/contracts/test/invariants/`

- [ ] **Step 1:** Write Foundry invariant tests (or Hardhat-Foundry hybrid). Properties to express:
  - **AgentRegistry:** registered agent's owner cannot be changed without their signature; deactivation is monotonic.
  - **CredentialRegistry:** credential hash is immutable after issuance; revocation is monotonic.
  - **CommitmentContract:** total committed value never exceeds sum of valid commitments; no double-settlement.
  - **VerifierRegistry:** verifier address per circuit is set-once unless owner replaces.
- [ ] **Step 2:** Run with high call counts (`runs = 5000, depth = 100`).
- [ ] **Step 3:** Commit — `test(contracts): foundry invariant tests for all 4 contracts`

### Task B1.4: Trusted-setup ceremony documentation

**Files:**
- Modify: `packages/contracts/circuits/build.sh` (record ceremony provenance)
- Create: `docs/audit/TRUSTED-SETUP-CEREMONY.md`

- [ ] **Step 1:** Document the original Powers of Tau used (Hermez Phase 2), each contributor's hash, and the per-circuit Phase 2 contributions.
- [ ] **Step 2:** For mainnet, plan a multi-party ceremony: ≥3 unrelated contributors. Coordinate via Drand-based randomness.
- [ ] **Step 3:** Verify ceremony via `snarkjs zkey verify` per circuit — output verification log.
- [ ] **Step 4:** Commit — `docs(audit): trusted setup ceremony provenance + mainnet plan`

### Task B1.5: Threat model refresh

**Files:**
- Modify: `docs/AUDIT-PREP.md` (already exists from Perfection Pass S2)

- [ ] **Step 1:** Add adversary scenarios specific to mainnet:
  - MEV bots front-running commitment submissions
  - Verifier registry compromise (governance attack)
  - Oracle manipulation if any oracles are added later
  - Cross-chain bridge risk if Attestara is bridged off Arbitrum
- [ ] **Step 2:** Per scenario: mitigation + residual risk + monitoring detection.
- [ ] **Step 3:** Commit — `docs(audit): expanded threat model for mainnet adversaries`

### Task B1.6: Internal red-team exercise

**Files:**
- Create: `docs/audit/RED-TEAM-RESULTS-<DATE>.md`

- [ ] **Step 1:** Engage 1-2 trusted external security folks (paid 1-2 day engagement) to attack the testnet deployment with no prior context.
- [ ] **Step 2:** Document findings, remediations.
- [ ] **Step 3:** Optional but high-value: catches the "obvious in hindsight" issues before paid auditors find them.
- [ ] **Step 4:** Commit — `docs(audit): internal red-team findings and remediations`

---

## Phase B2 — Auditor Engagement (4-6 weeks)

### Task B2.1: Auditor RFP + selection `[USER DECISION]`

**Files:**
- Create: `docs/audit/AUDIT-RFP.md` — outbound brief
- Create: `docs/audit/AUDITOR-EVALUATION.md` — internal scorecard

**Top 4 candidates (with rationale):**

| Auditor | Why | Lead time | Cost (rough) |
|---------|-----|-----------|--------------|
| **Trail of Bits** | Best-in-class for novel cryptographic protocols (ZK + on-chain). Has reviewed similar credential systems. | 6-8 weeks queue | $80-120k |
| **OpenZeppelin** | Strong on standard contract patterns (registries, multisigs). Less novel-crypto experience. | 4-6 weeks | $60-90k |
| **Sherlock** | Contest-based — broader attacker coverage at lower cost. Good if scope fits their model. | 3-4 weeks (contest window) | $30-60k |
| **Spearbit** | Boutique, hand-picks specialists. Excellent for ZK-heavy reviews. | 4-6 weeks | $50-100k |

- [ ] **Step 1:** Draft RFP with: scope (4 contracts + 4 circuits), commit hash, expected timeline, deliverable format.
- [ ] **Step 2:** [USER DECISION] Send to all 4. Score on: ZK familiarity, prior reports for similar systems, lead time, cost, post-audit support.
- [ ] **Step 3:** [USER DECISION] Engage chosen auditor. **Recommendation: Trail of Bits or Spearbit** for the ZK depth.
- [ ] **Step 4:** Sign engagement contract.

### Task B2.2: Auditor onboarding kit

**Files:**
- Create: `docs/audit/AUDITOR-ONBOARDING.md`

- [ ] **Step 1:** Single doc with: clone instructions, build commands, all artifacts (R1CS, zkey, vkey), threat model link, point of contact, communication channel (private Slack/Signal).
- [ ] **Step 2:** Pre-deploy testnet copy with seeded data for live exercise.
- [ ] **Step 3:** Daily check-in scheduled during audit window.
- [ ] **Step 4:** Commit — `docs(audit): auditor onboarding kit with full reproduction artifacts`

### Task B2.3: Audit window — daily liaison

- [ ] **Step 1:** Designate a single point of contact for auditor questions (sub-2-hour response SLA during business hours).
- [ ] **Step 2:** Maintain a private "audit findings" tracker (Linear or similar) with status: new / triaged / in-fix / resolved / accepted-risk.
- [ ] **Step 3:** Bi-weekly checkpoint with auditor lead: progress, blockers, preliminary findings.

### Task B2.4: Receive draft report

- [ ] **Step 1:** Audit firm delivers draft report.
- [ ] **Step 2:** Internally classify each finding: critical / high / medium / low / informational.
- [ ] **Step 3:** Plan remediation timeline based on severity.

---

## Phase B3 — Remediation (2-3 weeks)

### Task B3.1: Fix critical + high findings

**Files:**
- Modify: contract source files per finding
- Create: `docs/audit/REMEDIATION-LOG-<DATE>.md`

- [ ] **Step 1:** For each critical/high: write failing test that demonstrates the issue, then fix, then re-run tests.
- [ ] **Step 2:** Each fix is a separate commit referencing the audit finding ID.
- [ ] **Step 3:** Re-run all internal tools (B1.2) after each fix.
- [ ] **Step 4:** Commit each fix — `fix(audit-<ID>): <one-line summary>`

### Task B3.2: Disposition medium / low / informational findings

**Files:**
- Modify: `docs/audit/REMEDIATION-LOG-<DATE>.md`

- [ ] **Step 1:** Per medium: fix or document accepted risk with justification.
- [ ] **Step 2:** Per low/informational: fix where cheap, defer the rest with explicit issue tracker entries.
- [ ] **Step 3:** Commit — `chore(audit): disposition for medium/low/informational findings`

### Task B3.3: Re-audit fix verification

- [ ] **Step 1:** Auditor verifies fixes against draft report.
- [ ] **Step 2:** If new issues found in fixes, repeat B3.1.
- [ ] **Step 3:** Receive final report with "fixed/acknowledged" annotations.

### Task B3.4: Public release of audit report

**Files:**
- Create: `docs/audit/REPORTS/<auditor>-<date>.pdf`
- Modify: `README.md` (link audit report)

- [ ] **Step 1:** Publish final audit report to `docs/audit/REPORTS/`.
- [ ] **Step 2:** Update README, portal, and pitch deck with audit attestation.
- [ ] **Step 3:** Commit — `docs(audit): publish final audit report from <auditor>`

---

## Phase B4 — Key Custody + Multisig (1 week)

### Task B4.1: Hardware wallet provisioning

- [ ] **Step 1:** Procure 3 hardware wallets (Ledger Nano X or GridPlus Lattice) for signers.
- [ ] **Step 2:** Each signer initializes their wallet in a clean room (offline, fresh seed phrase, encrypted backup to airgapped device).
- [ ] **Step 3:** Document signer identities (encrypted) and chain of custody.

### Task B4.2: Deploy Safe (Gnosis Safe) multisig on Arbitrum

**Files:**
- Create: `packages/contracts/scripts/deploy-multisig.ts`
- Create: `docs/operations/MULTISIG-RUNBOOK.md`

- [ ] **Step 1:** 2-of-3 Safe multisig with hardware-wallet signers as owners.
- [ ] **Step 2:** Multisig becomes the eventual owner of all four production contracts.
- [ ] **Step 3:** Test all admin operations through the multisig flow on testnet first.
- [ ] **Step 4:** Commit — `infra: deploy 2-of-3 Safe multisig with HW-wallet signers`

### Task B4.3: Rotate `DEPLOYER_PRIVATE_KEY` out of env vars

**Files:**
- Modify: `.env.example` (remove DEPLOYER_PRIVATE_KEY for mainnet path)
- Modify: `packages/contracts/scripts/deploy-mainnet.ts` (use HW wallet signer)
- Modify: `infrastructure/render.yaml` (drop key from prod env)

- [ ] **Step 1:** Mainnet deploy uses `frame.sh` or `WalletConnect` with a hardware wallet — no plaintext keys in CI or env vars.
- [ ] **Step 2:** Add CI guard: any commit adding `DEPLOYER_PRIVATE_KEY` to env files fails CI.
- [ ] **Step 3:** Existing testnet deployer key rotated to a new burner key (old one revoked from any allowlists).
- [ ] **Step 4:** Commit — `security: remove DEPLOYER_PRIVATE_KEY from env, use HW wallet for mainnet`

### Task B4.4: Operational runbooks

**Files:**
- Create: `docs/operations/INCIDENT-RESPONSE.md`
- Create: `docs/operations/CONTRACT-UPGRADE-RUNBOOK.md`
- Create: `docs/operations/KEY-COMPROMISE-RUNBOOK.md`

- [ ] **Step 1:** Incident response: pager rotation, on-call hours, escalation tree, public communication template.
- [ ] **Step 2:** Contract upgrade (if any contract is upgradeable): step-by-step multisig flow, dry-run on testnet, post-upgrade verification.
- [ ] **Step 3:** Key compromise: detection signals, signer rotation process, public disclosure template.
- [ ] **Step 4:** Commit — `docs(ops): incident response, upgrade, and key compromise runbooks`

---

## Phase B5 — Mainnet Deployment (1 week)

### Task B5.1: Final pre-flight checklist

**Files:**
- Create: `docs/audit/MAINNET-LAUNCH-CHECKLIST.md`

- [ ] **Step 1:** Items: audit complete, all critical/high fixed and re-verified, multisig live, monitoring infra ready, incident runbook signed-off, gas estimate confirmed, mainnet RPC URL ready (Alchemy + fallback).
- [ ] **Step 2:** Each item signed-off by owner before proceeding.
- [ ] **Step 3:** Commit — `docs: mainnet launch checklist`

### Task B5.2: Deploy contracts to Arbitrum One

**Files:**
- Modify: `packages/contracts/scripts/deploy-mainnet.ts`
- Create: `packages/contracts/deployments.arbitrum-one.json`

- [ ] **Step 1:** Deploy in order: AgentRegistry, CredentialRegistry, VerifierRegistry, CommitmentContract.
- [ ] **Step 2:** Register Groth16 verifier contracts for all 4 circuits.
- [ ] **Step 3:** Transfer ownership of each contract to the multisig.
- [ ] **Step 4:** Verify source on Arbiscan for each contract within 1 hour.
- [ ] **Step 5:** Commit — `chore(contracts): mainnet deployment + Arbiscan verification`

### Task B5.3: Smoke test mainnet

- [ ] **Step 1:** Run `attestara demo --network arbitrum-one` against the deployed contracts. Use a small test value.
- [ ] **Step 2:** Verify the resulting commitment on Arbiscan.
- [ ] **Step 3:** Document the first mainnet commitment hash in launch announcement.

### Task B5.4: Update SDK + portal config

**Files:**
- Modify: `packages/sdk/src/config.ts` (add mainnet contract addresses)
- Modify: `packages/portal/lib/chains.ts`
- Modify: `.env.example`

- [ ] **Step 1:** Add Arbitrum One as a supported network alongside Sepolia.
- [ ] **Step 2:** Default network selection: testnet for dev/portal, mainnet via explicit flag.
- [ ] **Step 3:** Commit — `feat: add Arbitrum One mainnet support in SDK and portal`

---

## Phase B6 — Monitoring + Bug Bounty (ongoing)

### Task B6.1: On-chain event monitoring

**Files:**
- Modify: `packages/relay/src/indexer/` (existing indexer extended)
- Create: `infrastructure/monitoring/grafana-dashboards/contracts.json`

- [ ] **Step 1:** Indexer already tails events; add Prometheus metrics:
  - `attestara_agent_registrations_total`
  - `attestara_credentials_issued_total`
  - `attestara_credentials_revoked_total`
  - `attestara_commitments_total`
  - `attestara_admin_actions_total` (multisig calls)
- [ ] **Step 2:** Grafana dashboard with alerting on anomalies (sudden spike in revocations, unexpected admin calls).
- [ ] **Step 3:** Commit — `feat(infra): on-chain event metrics and Grafana dashboards`

### Task B6.2: PagerDuty / Opsgenie integration

**Files:**
- Modify: `infrastructure/monitoring/alertmanager.yml`

- [ ] **Step 1:** Critical alerts page on-call (any unexpected admin call, contract balance anomaly, RPC outage >5min).
- [ ] **Step 2:** Warning alerts go to Slack only.
- [ ] **Step 3:** Commit — `infra: PagerDuty integration for critical contract anomalies`

### Task B6.3: Bug bounty program

**Files:**
- Create: `docs/audit/BUG-BOUNTY.md`
- Modify: `SECURITY.md`

- [ ] **Step 1:** Launch on Immunefi or Hats Finance with tiered rewards:
  - Critical: $50k
  - High: $20k
  - Medium: $5k
  - Low: $1k
- [ ] **Step 2:** Scope: mainnet contracts only initially; add testnet/relay/SDK if budget allows.
- [ ] **Step 3:** Disclosure policy + safe harbor.
- [ ] **Step 4:** Commit — `docs: launch bug bounty program with Immunefi`

### Task B6.4: Annual re-audit cadence

- [ ] **Step 1:** Schedule annual re-audit (or after any non-trivial contract change).
- [ ] **Step 2:** Budget reserve for re-audits in operational planning.

---

## Final Task: Update memory + announce mainnet

- [ ] **Step 1:** Update `project_attestara.md` memory: mainnet contract addresses, multisig address, audit firm, audit report URL, bug bounty URL.
- [ ] **Step 2:** Public launch: blog post, conference talk submission, partner outreach.
- [ ] **Step 3:** Investor / stakeholder update with audit + mainnet milestones.

---

## Success Criteria

- [ ] Audit report published with zero critical/high findings unresolved
- [ ] All four contracts live on Arbitrum One with verified source
- [ ] Multisig owns all admin functions (no single-key control)
- [ ] First successful real-value commitment recorded on Arbitrum One
- [ ] Bug bounty live with at least one Immunefi-listed entry
- [ ] On-chain monitoring alerting verified via game-day exercise
- [ ] First enterprise customer reference paying for mainnet usage

---

## Budget Summary

| Item | Cost (USD) |
|------|-----------|
| Audit (Trail of Bits or Spearbit) | $50-120k |
| Internal red team | $5-10k |
| Hardware wallets | $300-500 |
| Mainnet gas (deployment + 1 year ops buffer) | $2-5k |
| Bug bounty pool (initial) | $50-100k |
| Monitoring infra (PagerDuty + extended Grafana) | $200/mo |
| **Total upfront:** | **$110-235k** |
| **Recurring:** | **~$3k/mo** |

---

## Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| Audit finds protocol-level flaws requiring redesign | Phase B1 internal tools + red team should surface these first; budget for 2-week redesign window |
| Auditor calendar slips beyond 8 weeks | RFP to all 4 candidates; engage backup if primary slips |
| Trusted setup ceremony coordination friction | Lock contributors + dates before audit kickoff |
| Mainnet gas costs exceed estimate | Pre-deploy estimate via testnet; have $5k buffer |
| Post-launch critical bug | Bug bounty incentive + multisig pause function (if implemented) + insurance via Nexus Mutual |
| Multisig signer unavailable in incident | 2-of-3 threshold tolerates one missing signer; document signer-replacement flow |

---

## Execution Order Summary

Strictly serial:

1. **Phase B1** complete before B2 starts (auditor needs hardened code).
2. **Phase B2** end-to-end before B3 (audit must finish before remediation).
3. **Phase B3** complete before B4 (no key custody until contracts are clean).
4. **Phase B4** complete before B5 (no mainnet deploy without multisig + HW keys).
5. **Phase B5** complete before B6 (monitoring + bounty target the live contracts).
6. **Phase B6** ongoing.
