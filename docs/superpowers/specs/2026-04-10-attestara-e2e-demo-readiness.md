# Attestara E2E Testnet Demo Readiness Spec

> **Date**: 2026-04-10
> **Version**: 0.1.0 -> 0.2.0 (demo-ready)
> **Goal**: Complete end-to-end testnet deployment with dual demo capability (portal + CLI)
> **Approach**: Deploy First, Fix Forward

---

## 1. Context & Motivation

Attestara is a ZK trust protocol for AI agent commerce. The MVP is substantially built: 4 Solidity contracts deployed to Arbitrum Sepolia, 4 Circom circuits compiled with artifacts, 7 TypeScript packages passing tests, Dockerfiles and render.yaml functional, and recent security audit fixes shipped.

**What's missing is the last mile**: connecting real services end-to-end so a live demo works without any mocks. The demo must tell the Attestara story through two channels:

- **Portal (visual)**: Browser-based walkthrough showing agent registration, credential issuance, ZK proof generation, negotiation, and on-chain settlement
- **CLI (technical)**: Terminal-driven demo hitting deployed relay and Arbitrum Sepolia, proving the protocol works for real

**Success criteria**: A non-technical observer watches the portal demo and understands what Attestara does. A technical observer runs the CLI demo and sees real transactions on Arbiscan.

---

## 2. Current State Assessment

### What Works (Real, Not Mocked)

| Component | Status | Detail |
|-----------|--------|--------|
| Smart contracts | Deployed | 4 contracts on Arbitrum Sepolia (2026-04-06), circuit IDs registered |
| ZK circuits | Compiled | WASM, zkey, vkey.json artifacts in `circuits/build/` |
| Relay services | 7/8 on Prisma | Only org invites remain in-memory (intentionally ephemeral) |
| On-chain settlement | Implemented | `ChainCommitmentClient.submit()` + `verifyOnChain()` are real |
| Dockerfiles | Functional | Single-stage builds, pnpm-symlink-safe |
| render.yaml | 5 services defined | Portal, relay, prover, PostgreSQL, Redis |
| CI/CD | 6-job pipeline | Full test + build on push to master |
| CLI demo | Live + local modes | `--relay-url`, `--rpc-url`, `--private-key` flags |
| Portal pages | All built | Auth, dashboard (overview, agents, credentials, sessions, commitments, settings), marketing (demo, docs, pricing) |
| Security | Audit fixes shipped | IdentityBinding binding signal, ECDSA verification, access control |
| Whitepaper | v6.0 | Normative IdentityBinding section, circuit versioning |

### Gaps Blocking Demo

| ID | Gap | Root Cause | Impact |
|----|-----|-----------|--------|
| G1 | SDK SessionManager defaults to in-memory | `SessionManager` constructor only enables relay if `relay?.url` is passed | Cross-org negotiation requires explicit relay config |
| G2 | IPFS defaults to MemoryIPFSClient | `resolveIPFS()` in `client.ts` checks `PINATA_API_KEY` env var; if missing, falls back to memory | Credentials not persisted — lost on restart |
| G3 | Portal dashboard mock fallback | `useDashboardStats()` catches API errors and falls back to `mockStats` array | Dashboard shows fake data if relay unreachable |
| G4 | Render env vars incomplete | `NEXT_PUBLIC_RELAY_URL`, `CORS_ORIGIN`, `PINATA_*`, `ARBITRUM_SEPOLIA_RPC_URL` need manual values | Services can't connect to each other |
| G5 | No deployment smoke test | No script to verify deployed services work end-to-end | Can't validate deployment health |
| G6 | Indexer has no persistence callbacks | `ChainEventListener` fires callbacks but relay doesn't supply DB-writing callbacks | On-chain events not reflected in relay DB |
| G7 | Portal credential wizard modal missing | E2E tests expect it, component doesn't exist | 3 Playwright tests fail |
| G8 | Demo page step navigation incomplete | E2E tests expect Next/Previous buttons with full step logic | 2 Playwright tests fail |

---

## 3. Architecture (No Changes to Core)

The existing architecture is correct. This spec doesn't change any system boundaries, data models, or protocol flows. It wires existing components together and fills UI gaps.

```
                    Browser (Portal)
                         |
                    Next.js 16 (port 3000)
                         |
                    Direct HTTP (/v1/*)
                         |
                    Relay API (Fastify, port 3001)
                    /    |    \
              Prisma  Redis  Chain Indexer
              (PG)   (cache)  (ethers.js)
                         |
                    Prover Service (port 3002)
                    (snarkjs workers)
                         |
                    Arbitrum Sepolia
                    (4 contracts)
                         |
                    IPFS (Pinata)
```

**CLI path**: `attestara demo --relay-url ... --rpc-url ...` -> SDK -> Relay API -> Prover -> Chain

---

## 4. Phase 1: Render Deployment & Configuration

**Goal**: All 5 Render services running, health checks green, services can talk to each other.

### 4.1 Environment Variables

Configure these manually in Render dashboard (they have `sync: false` in render.yaml):

| Service | Variable | Value |
|---------|----------|-------|
| attestara-portal | `NEXT_PUBLIC_RELAY_URL` | `https://attestara-relay.onrender.com` |
| attestara-relay | `CORS_ORIGIN` | `https://attestara-portal.onrender.com` |
| attestara-relay | `ARBITRUM_SEPOLIA_RPC_URL` | `https://sepolia-rollup.arbitrum.io/rpc` (or Alchemy/Infura) |
| attestara-relay | `PINATA_API_KEY` | From Pinata dashboard |
| attestara-relay | `PINATA_API_SECRET` | From Pinata dashboard |

Auto-generated vars (already in render.yaml): `JWT_SECRET`, `PROVER_INTERNAL_SECRET`, `ORG_MASTER_KEY_SECRET`, `DATABASE_URL`, `REDIS_URL`.

### 4.2 Security: Rotate DEPLOYER_PRIVATE_KEY

The current `.env` has a deployer private key in plaintext. For the deployed relay indexer:

- Generate a new testnet-only deployer wallet (or use the existing one)
- Add `DEPLOYER_PRIVATE_KEY` as a Render secret on the relay service (for indexer/chain interactions)
- Remove it from the committed `.env` file
- Add `DEPLOYER_PRIVATE_KEY` to `.env.example` with placeholder

### 4.3 Deployment Steps

1. Push current master to GitHub (if not already up to date)
2. In Render dashboard: create services from render.yaml (or trigger auto-deploy)
3. Verify PostgreSQL and Redis are provisioned
4. Verify relay health check passes: `GET https://attestara-relay.onrender.com/health`
5. Verify prover starts (check Render logs for "Prover service listening on 3002")
6. Verify portal loads: `https://attestara-portal.onrender.com`

### 4.4 Prisma Migration on Deploy

render.yaml already has pre-deploy command `npx prisma migrate deploy`. Verify this runs successfully by checking Render deploy logs for "All migrations have been successfully applied."

### 4.5 Acceptance Criteria

- [ ] `GET /health` on relay returns 200 with `{"status":"ok"}`
- [ ] Portal loads in browser without errors
- [ ] Prover service logs show successful startup
- [ ] PostgreSQL has all 10 tables from Prisma schema
- [ ] Redis is connected (relay logs show no Redis connection errors)

---

## 5. Phase 2: SDK Wiring (Real Services by Default)

**Goal**: SDK uses real services (Pinata, relay) when configured, with graceful fallback.

### 5.1 IPFS Client Selection (G2) — Already Correct

The existing logic in `packages/sdk/src/client.ts:9-18` is actually correct:

```typescript
function resolveIPFS(config: AttestaraConfig): IPFSClient {
  const apiKey = process.env.PINATA_API_KEY
  if (apiKey) return new PinataIPFSClient(apiKey, ...)
  return new MemoryIPFSClient()
}
```

**No code change needed.** The fix is environmental: setting `PINATA_API_KEY` and `PINATA_API_SECRET` on the relay service (Phase 1) and in `.env` for local development.

**Action**: Add Pinata credentials to `.env` for local dev. Document in `.env.example`.

### 5.2 SessionManager Relay Mode (G1) — Already Correct

The existing logic in `packages/sdk/src/negotiation/index.ts:30-35` is correct:

```typescript
constructor(relay?: RelayConfig) {
  this.relay = relay?.url ? relay : null
}
```

**No code change needed.** The CLI demo already passes `--relay-url` to create a relay-backed SessionManager. The portal talks directly to relay endpoints (not through the SDK).

### 5.3 CLI Demo Live Mode Verification

The CLI demo at `packages/cli/src/commands/demo.ts` already:
- Reads contract addresses from `deployments.arbitrum-sepolia.json`
- Switches SessionManager and CommitmentManager based on `--relay-url` / `--rpc-url`
- Falls back to in-memory when flags are absent

**Action**: Test the CLI demo against deployed services:
```bash
npx attestara demo \
  --relay-url https://attestara-relay.onrender.com \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

Fix any issues that surface from this real integration test.

### 5.4 Acceptance Criteria

- [ ] `npx attestara demo --relay-url <render-url> --rpc-url <arb-sepolia>` completes all 7 steps
- [ ] Agents created in CLI demo appear in relay database
- [ ] Credentials are stored on Pinata (CID is a real IPFS hash, not `Qm000...`)
- [ ] Commitment transaction hash is valid on Arbiscan Sepolia

---

## 6. Phase 3: Portal Fixes (Visual Demo Works)

**Goal**: Portal connected to live relay, no mock data, missing UI components implemented.

### 6.1 Remove Dashboard Mock Fallback (G3)

**File**: `packages/portal/app/(dashboard)/overview/page.tsx`

The `mockStats` array (lines 12-33) and `recentActivity` array (lines 35-76) provide fake data when the API is unreachable. For demo readiness:

**Change**: Replace mock fallback with a proper loading/error state:
- When `useDashboardStats()` is loading: show skeleton cards
- When `useDashboardStats()` returns data: show real data
- When `useDashboardStats()` errors: show error state with "Unable to connect to relay" message and retry button — not fake data

**Rationale**: Showing mock data during a demo is worse than showing an error, because mock data is silently wrong. An error state is honest and debuggable.

**For recent activity**: Replace the hardcoded array with a real API call to relay. If no activity exists yet, show an empty state: "No activity yet. Create your first agent to get started."

### 6.2 Credential Wizard Modal (G7)

**Files affected**:
- `packages/portal/app/(dashboard)/credentials/page.tsx` — "Issue Credential" button needs to open modal
- New component: `packages/portal/components/credential-wizard.tsx`

**Wizard steps** (3-step flow matching the protocol):

1. **Select Agent** — Dropdown of org's registered agents (fetched from `/v1/orgs/{orgId}/agents`)
2. **Define Mandate** — Form fields:
   - Domain (text input, e.g. "procurement.contracts")
   - Region (text input, e.g. "EU")
   - Max Value (number input)
   - Currency (select: EUR, USD, GBP)
   - Expiry (date picker, default 90 days from now)
3. **Review & Issue** — Summary of agent + mandate, "Issue Credential" button that POSTs to `/v1/orgs/{orgId}/credentials`

**UI pattern**: Modal overlay (consistent with existing portal modals). Step indicators at top. Back/Next/Issue buttons at bottom.

**On success**: Close modal, show toast "Credential issued", refresh credentials list.

### 6.3 Demo Page Step Navigation (G8)

**File**: `packages/portal/app/(marketing)/demo/page.tsx`

The page already has 5 steps with content. Add:
- **Previous/Next buttons** at the bottom of each step
- Step 1: only "Next" visible
- Step 5: only "Previous" visible, plus "Get Started" CTA
- Steps 2-4: both buttons visible
- Buttons update the active step indicator at the top
- Step transitions should be smooth (no page reload)

**Implementation**: Use React `useState` for `activeStep` (already likely exists). Wire button `onClick` to increment/decrement.

### 6.4 Acceptance Criteria

- [ ] Dashboard overview shows real agent/session/credential counts from relay (0 is valid, mock data is not)
- [ ] Dashboard shows empty state when no activity exists
- [ ] Dashboard shows error state when relay is unreachable
- [ ] Credential wizard opens from "Issue Credential" button
- [ ] Credential wizard completes 3-step flow and creates credential via API
- [ ] Demo page Previous/Next buttons navigate between all 5 steps
- [ ] All 43 Playwright E2E tests pass (was 38/43)

---

## 7. Phase 4: Chain Event Indexer Persistence (G6)

**Goal**: On-chain events (agent registrations, commitments) are reflected in the relay database.

### 7.1 Wire Indexer Callbacks to Prisma

**File**: `packages/relay/src/indexer/index.ts`

The indexer already has a callback system (`ListenerCallbacks`). The relay server needs to supply callbacks that write to Prisma.

**Callbacks to implement**:

```typescript
// In relay server.ts or a new file: src/indexer/callbacks.ts
import { getPrisma } from '../database'

export const indexerCallbacks: ListenerCallbacks = {
  onAgentRegistered: async (agentId, did, orgAdmin) => {
    // Update agent record with on-chain confirmation
    await getPrisma().agent.updateMany({
      where: { did },
      data: { registeredTxHash: /* from event */, status: 'REGISTERED' }
    })
  },
  
  onCommitmentCreated: async (commitmentId, sessionId, agreementHash) => {
    // Update commitment record with on-chain confirmation
    await getPrisma().commitment.updateMany({
      where: { id: sessionId },
      data: { verified: true, blockNumber: /* from event */ }
    })
  }
}
```

**Wire in server startup** (`packages/relay/src/server.ts` or `start.ts`):
```typescript
import { startIndexer } from './indexer'
import { indexerCallbacks } from './indexer/callbacks'

// After server.listen():
startIndexer({
  rpcUrl: config.ARBITRUM_SEPOLIA_RPC_URL,
  contractAddresses: {
    agentRegistry: '0xAC3747Cd9265c87d9D8e3a101DAFe2afc107e7F7',
    commitmentContract: '0xc9E12435F45252A0ed2f46578f8a9b1b0db8f6Fd',
  },
  callbacks: indexerCallbacks,
})
```

**Contract addresses source**: Read from `@attestara/contracts/deployments.arbitrum-sepolia.json` or environment variable.

### 7.2 Acceptance Criteria

- [ ] Agent registration on-chain triggers Prisma update (registeredTxHash populated)
- [ ] Commitment creation on-chain triggers Prisma update (verified = true)
- [ ] Indexer logs show "Processing AgentRegistered event" and "Processing CommitmentCreated event"
- [ ] Indexer errors don't crash the relay server

---

## 8. Phase 5: E2E Smoke Test Script (G5)

**Goal**: A single script that validates the entire deployed stack works end-to-end.

### 8.1 Script: `scripts/smoke-test.ts`

A TypeScript script (runnable via `npx tsx scripts/smoke-test.ts`) that:

1. **Register org + user** — POST `/v1/auth/register` with test org
2. **Login** — POST `/v1/auth/login`, get JWT
3. **Create 2 agents** — POST `/v1/orgs/{orgId}/agents` (buyer + seller)
4. **Issue credential** — POST `/v1/orgs/{orgId}/credentials` with mandate params
5. **Generate ZK proof** — POST prover endpoint (or use SDK LocalProver)
6. **Create session** — POST `/v1/sessions`
7. **Submit turns** — POST `/v1/sessions/{id}/turns` (3 turns with proofs)
8. **Create commitment** — POST `/v1/commitments`
9. **Verify on Arbiscan** — Check transaction hash is valid (GET Arbiscan API or ethers.js provider)
10. **Report** — Print pass/fail for each step with timing

### 8.2 Configuration

```bash
# Usage
RELAY_URL=https://attestara-relay.onrender.com \
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc \
PRIVATE_KEY=0x... \
npx tsx scripts/smoke-test.ts
```

### 8.3 Cleanup

The smoke test should use a unique org name (e.g. `smoke-test-{timestamp}`) so repeated runs don't collide. No cleanup needed — testnet data is disposable.

### 8.4 CI Integration (Optional)

Add to `.github/workflows/ci.yml` as an optional manual-trigger job:

```yaml
smoke-test:
  if: github.event_name == 'workflow_dispatch'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - run: pnpm install
    - run: npx tsx scripts/smoke-test.ts
      env:
        RELAY_URL: ${{ secrets.RENDER_RELAY_URL }}
        RPC_URL: ${{ secrets.ARBITRUM_RPC_URL }}
        PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
```

### 8.5 Acceptance Criteria

- [ ] Smoke test passes against deployed Render services
- [ ] Each step reports pass/fail with timing
- [ ] Commitment transaction hash is viewable on Arbiscan Sepolia
- [ ] Script exits 0 on success, 1 on failure

---

## 9. Phase 6: Demo Script & Polish

**Goal**: Rehearsed demo flow that tells the Attestara story clearly.

### 9.1 Demo Flow Script (Human-Readable)

Create `docs/demo-script.md` with the guided walkthrough:

**Act 1: The Problem (30 seconds)**
- Open portal landing page
- "AI agents are making deals on behalf of organizations, but there's no way to verify what they're authorized to do"

**Act 2: Agent Identity (1 minute)**
- Portal: Login, navigate to Agents page
- Create agent "Procurement Bot" with DID
- Show DID document and on-chain registration on Arbiscan
- "Every agent gets a decentralized identity anchored on-chain"

**Act 3: Credential Issuance (1 minute)**
- Portal: Navigate to Credentials
- Open credential wizard, issue mandate: domain=procurement, maxValue=500000 EUR
- Show W3C Verifiable Credential with IPFS CID
- "Organizations define what their agents can do — and prove it cryptographically"

**Act 4: ZK Negotiation (2 minutes)**
- **Switch to CLI** for technical credibility:
  ```bash
  npx attestara demo --relay-url https://attestara-relay.onrender.com \
    --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
    --private-key $DEPLOYER_PRIVATE_KEY
  ```
- Show ZK proof generation (mandate bound, parameter range)
- Show negotiation turns with converging values
- "The buyer proves they can spend up to 500K without revealing the exact limit"

**Act 5: On-Chain Settlement (1 minute)**
- CLI output shows commitment creation with tx hash
- Open Arbiscan Sepolia, paste tx hash
- Show CommitmentContract call with agreement hash, dual signatures
- "The agreement is immutable, auditable, and enforceable"

**Act 6: Verification (30 seconds)**
- Portal: Navigate to Commitments page
- Show commitment detail with verified status, block number, Arbiscan link
- "Anyone can verify this commitment happened, but only the parties know the terms"

**Total: ~6 minutes**

### 9.2 CLI Output Polish

Review `packages/cli/src/commands/demo.ts` output formatting:
- Ensure timing values are realistic (proof generation ~300ms, not instant)
- Ensure currency formatting matches mandate (EUR with comma separators)
- Ensure Arbiscan links are printed for each transaction
- Add `--verbose` flag for technical audiences (show proof public signals, circuit constraints)

### 9.3 Portal Polish

- Ensure agents page shows the agent created during demo (real-time via `useDashboardStats` refetch)
- Ensure credential detail page shows IPFS CID as clickable Pinata gateway link
- Ensure commitment detail page shows Arbiscan link for tx hash
- Verify dark theme renders well for screen recording / presentation

### 9.4 Acceptance Criteria

- [ ] Full demo flow completes in under 7 minutes
- [ ] Portal and CLI show consistent data (same agents, credentials, commitments)
- [ ] All Arbiscan links resolve to real transactions
- [ ] IPFS CIDs resolve to real credential data on Pinata gateway
- [ ] No mock data visible anywhere in the demo flow
- [ ] Demo script document committed to `docs/demo-script.md`

---

## 10. Phase 7: Demo Dry Run & Final Verification

**Goal**: Complete end-to-end rehearsal, fix anything that breaks.

### 10.1 Dry Run Checklist

1. **Fresh state**: Reset relay database (or use new org) so demo starts clean
2. **Portal walkthrough**: Follow demo script Act 1-3, Act 6
3. **CLI walkthrough**: Follow demo script Act 4-5
4. **Cross-verify**: Data created in CLI appears in portal
5. **Failure modes**: Test what happens if network is slow, RPC rate-limited
6. **Screen recording**: Record the full demo for backup

### 10.2 Final Acceptance Criteria (Demo-Ready Gate)

- [ ] All 5 Render services healthy (green in dashboard)
- [ ] Relay health check returns 200
- [ ] Portal loads, login works, dashboard shows real data
- [ ] CLI demo completes with `--relay-url` and `--rpc-url`
- [ ] Smoke test script passes
- [ ] All 43 Playwright E2E tests pass
- [ ] All `pnpm test` tests pass
- [ ] Commitment visible on Arbiscan Sepolia
- [ ] Credential visible on Pinata IPFS gateway
- [ ] Demo flow rehearsed under 7 minutes
- [ ] No mock data visible in any demo path

---

## 11. Out of Scope

These are explicitly **not** part of this spec:

- **Mainnet deployment** — Testnet only for demo
- **Production security hardening** — Current testnet security is sufficient
- **Billing/pricing implementation** — Portal pricing page is informational only
- **Multi-org cross-org demo** — Single org demo is sufficient to show the protocol
- **DAO legal wrapper** — Post-demo concern
- **Standards body submission** — Whitepaper is ready, submission is a separate workstream
- **Mobile app** — Portal web only
- **Load testing** — Testnet, single-user demo
- **Monitoring/alerting** — Not needed for demo

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Render free-tier cold starts delay demo | High | Medium | Pre-warm services 5 minutes before demo. Add a `/wake` endpoint or use the health check. |
| Arbitrum Sepolia RPC rate limiting | Medium | High | Use Alchemy or Infura with API key instead of public RPC |
| Pinata free tier IPFS pinning limits | Low | Medium | Free tier allows 100 pins — sufficient for demo |
| Circuit proof generation slow on Render starter plan | Medium | Medium | Prover has Redis cache — first proof slow, subsequent proofs instant |
| Playwright E2E tests fragile | Medium | Low | Tests are UI-rendering validation with mock data — they don't test real API calls |
| Relay cold start exceeds Render health check timeout | Medium | High | Render default timeout is 300s — Fastify starts in <5s, Prisma migration adds ~10s |

---

## 13. Version Bump

On completion, bump version from `0.1.0` to `0.2.0` in:
- Root `package.json`
- All 7 `packages/*/package.json` files
- `CLAUDE.md` version field
- Memory file `project_attestara.md`

Tag: `git tag v0.2.0 -m "Demo-ready: E2E testnet deployment"`

---

## 14. Dependency Order

```
Phase 1 (Render Deploy)
    |
    v
Phase 2 (SDK Verification) --- Phase 3 (Portal Fixes)
    |                              |
    v                              v
Phase 4 (Indexer Persistence)  [independent]
    |
    v
Phase 5 (Smoke Test)
    |
    v
Phase 6 (Demo Script & Polish)
    |
    v
Phase 7 (Dry Run)
```

Phase 2 and Phase 3 can run in parallel after Phase 1.
Phase 4 can run in parallel with Phase 3.
Phase 5 depends on Phases 2 + 4.
Phase 6 depends on Phases 3 + 5.
Phase 7 depends on Phase 6.
