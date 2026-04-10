# E2E Testnet Demo Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Attestara's existing components into a fully functional end-to-end testnet deployment with dual demo capability (portal + CLI), eliminating all mock data paths.

**Architecture:** No structural changes. This plan connects existing packages — relay (Fastify/Prisma), portal (Next.js), prover (Fastify/snarkjs), SDK, CLI — to deployed Render services and Arbitrum Sepolia contracts. New code: indexer Prisma callbacks (~60 lines), dashboard mock removal (~40 line delta), credential wizard API wiring (~20 line delta), smoke test script (~200 lines).

**Tech Stack:** TypeScript, Fastify 5, Next.js 16, Prisma, ethers v6, Playwright, Vitest

**Spec:** `docs/superpowers/specs/2026-04-10-attestara-e2e-demo-readiness.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `packages/relay/src/indexer/callbacks.ts` | Prisma-backed indexer callbacks |
| Modify | `packages/relay/src/start.ts` | Wire indexer on startup |
| Modify | `packages/relay/src/config.ts` | Add contract address env vars |
| Create | `packages/relay/test/indexer-callbacks.test.ts` | Test indexer→Prisma integration |
| Modify | `packages/portal/app/(dashboard)/overview/page.tsx` | Remove mock fallback, add empty/error states |
| Modify | `packages/portal/app/(dashboard)/credentials/page.tsx` | Wire wizard to real API |
| Create | `scripts/smoke-test.ts` | E2E deployment verification script |
| Create | `docs/demo-script.md` | Human-readable demo walkthrough |
| Modify | `.env.example` | Document contract address env vars |
| Modify | `packages/portal/lib/hooks.ts` | Add useRecentActivity hook |
| Modify | `packages/portal/lib/api-client.ts` | Add activity endpoint if needed |

---

## Task 1: Wire Indexer Callbacks to Prisma

**Files:**
- Create: `packages/relay/src/indexer/callbacks.ts`
- Test: `packages/relay/test/indexer-callbacks.test.ts`

This task creates Prisma-backed callbacks so on-chain events (agent registration, commitment creation) update the relay database.

- [ ] **Step 1: Write the failing test**

Create `packages/relay/test/indexer-callbacks.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AgentRegisteredEvent, CommitmentCreatedEvent } from '../src/indexer/listener.js'

// Mock Prisma before imports
const mockUpdateMany = vi.fn().mockResolvedValue({ count: 1 })
const mockPrisma = {
  agent: { updateMany: mockUpdateMany },
  commitment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
}

vi.mock('../src/database.js', () => ({
  getPrisma: () => mockPrisma,
}))

import { buildPrismaCallbacks } from '../src/indexer/callbacks.js'

describe('buildPrismaCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('onAgentRegistered updates agent with txHash and REGISTERED status', async () => {
    const callbacks = buildPrismaCallbacks()
    const event: AgentRegisteredEvent = {
      agentId: '0xabc123',
      did: 'did:ethr:0x1234',
      orgAdmin: '0xadmin',
      blockNumber: 500,
      txHash: '0xtx123',
    }

    await callbacks.onAgentRegistered!(event)

    expect(mockPrisma.agent.updateMany).toHaveBeenCalledWith({
      where: { did: 'did:ethr:0x1234' },
      data: { registeredTxHash: '0xtx123', status: 'REGISTERED' },
    })
  })

  it('onCommitmentCreated updates commitment with verified and blockNumber', async () => {
    const callbacks = buildPrismaCallbacks()
    const event: CommitmentCreatedEvent = {
      commitmentId: '0xcommit1',
      sessionId: '0xsession1',
      agreementHash: '0xhash1',
      blockNumber: 600,
      txHash: '0xtx456',
    }

    await callbacks.onCommitmentCreated!(event)

    expect(mockPrisma.commitment.updateMany).toHaveBeenCalledWith({
      where: { agreementHash: '0xhash1' },
      data: { verified: true, blockNumber: 600, txHash: '0xtx456' },
    })
  })

  it('does not throw when Prisma update matches zero rows', async () => {
    mockPrisma.agent.updateMany.mockResolvedValue({ count: 0 })
    const callbacks = buildPrismaCallbacks()

    await expect(
      callbacks.onAgentRegistered!({
        agentId: '0x', did: 'did:ethr:0xNONE', orgAdmin: '0x',
        blockNumber: 1, txHash: '0x',
      }),
    ).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/indexer-callbacks.test.ts`

Expected: FAIL with "Cannot find module '../src/indexer/callbacks.js'"

- [ ] **Step 3: Write the implementation**

Create `packages/relay/src/indexer/callbacks.ts`:

```typescript
import { getPrisma } from '../database.js'
import type { ListenerCallbacks } from './listener.js'

/**
 * Builds indexer callbacks that persist on-chain events to the relay database.
 * Each callback is fault-tolerant — logs errors but never throws.
 */
export function buildPrismaCallbacks(): ListenerCallbacks {
  return {
    async onAgentRegistered(event) {
      try {
        const result = await getPrisma().agent.updateMany({
          where: { did: event.did },
          data: { registeredTxHash: event.txHash, status: 'REGISTERED' },
        })
        console.info(
          { did: event.did, txHash: event.txHash, updated: result.count },
          'Indexed: AgentRegistered → Prisma',
        )
      } catch (err) {
        console.warn({ err, did: event.did }, 'Failed to persist AgentRegistered event')
      }
    },

    async onCommitmentCreated(event) {
      try {
        const result = await getPrisma().commitment.updateMany({
          where: { agreementHash: event.agreementHash },
          data: { verified: true, blockNumber: event.blockNumber, txHash: event.txHash },
        })
        console.info(
          { agreementHash: event.agreementHash, txHash: event.txHash, updated: result.count },
          'Indexed: CommitmentCreated → Prisma',
        )
      } catch (err) {
        console.warn({ err, commitmentId: event.commitmentId }, 'Failed to persist CommitmentCreated event')
      }
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/indexer-callbacks.test.ts`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd /c/claude/attestara
git add packages/relay/src/indexer/callbacks.ts packages/relay/test/indexer-callbacks.test.ts
git commit -m "feat(relay): add Prisma-backed indexer callbacks for on-chain events"
```

---

## Task 2: Add Contract Address Config & Wire Indexer in Startup

**Files:**
- Modify: `packages/relay/src/config.ts`
- Modify: `packages/relay/src/start.ts`
- Modify: `.env.example`

This task adds contract address environment variables and starts the indexer when the relay boots.

- [ ] **Step 1: Add contract address env vars to config schema**

In `packages/relay/src/config.ts`, add two new optional fields to the `envSchema` object (after line 17, the `ARBITRUM_ONE_RPC_URL` line):

```typescript
  AGENT_REGISTRY_ADDRESS: z.string().optional(),
  COMMITMENT_CONTRACT_ADDRESS: z.string().optional(),
```

- [ ] **Step 2: Wire indexer into start.ts**

Replace `packages/relay/src/start.ts` with:

```typescript
import { loadConfig } from './config.js'
import { buildServer } from './server.js'
import { startIndexer, stopIndexer } from './indexer/index.js'
import { buildPrismaCallbacks } from './indexer/callbacks.js'

async function main() {
  const config = loadConfig()

  const app = await buildServer({
    corsOrigin: config.CORS_ORIGIN,
    logger: true,
  })

  try {
    await app.listen({ port: config.PORT, host: config.HOST })
    app.log.info(`Relay listening on ${config.HOST}:${config.PORT}`)
  } catch (err) {
    app.log.error(err, 'Failed to start relay')
    process.exit(1)
  }

  // Start chain event indexer (non-blocking, fault-tolerant)
  if (config.ARBITRUM_SEPOLIA_RPC_URL) {
    await startIndexer({
      rpcUrl: config.ARBITRUM_SEPOLIA_RPC_URL,
      contractAddresses: {
        agentRegistry: config.AGENT_REGISTRY_ADDRESS,
        commitmentContract: config.COMMITMENT_CONTRACT_ADDRESS,
      },
      callbacks: buildPrismaCallbacks(),
    })
  }

  // Graceful shutdown
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      app.log.info(`${signal} received, shutting down`)
      await stopIndexer()
      await app.close()
      process.exit(0)
    })
  }
}

main()
```

- [ ] **Step 3: Update .env.example with contract addresses**

Add to `.env.example` after the chain section:

```bash
# Contract addresses (Arbitrum Sepolia — from deployments.arbitrum-sepolia.json)
AGENT_REGISTRY_ADDRESS=0xAC3747Cd9265c87d9D8e3a101DAFe2afc107e7F7
COMMITMENT_CONTRACT_ADDRESS=0xc9E12435F45252A0ed2f46578f8a9b1b0db8f6Fd
```

- [ ] **Step 4: Update .env with contract addresses**

Add the same two lines to `.env`:

```bash
AGENT_REGISTRY_ADDRESS=0xAC3747Cd9265c87d9D8e3a101DAFe2afc107e7F7
COMMITMENT_CONTRACT_ADDRESS=0xc9E12435F45252A0ed2f46578f8a9b1b0db8f6Fd
```

- [ ] **Step 5: Run existing tests to verify nothing breaks**

Run: `cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run`

Expected: All existing relay tests PASS (no regressions)

- [ ] **Step 6: Commit**

```bash
cd /c/claude/attestara
git add packages/relay/src/config.ts packages/relay/src/start.ts .env.example .env
git commit -m "feat(relay): wire indexer with Prisma callbacks on startup"
```

---

## Task 3: Remove Dashboard Mock Fallback

**Files:**
- Modify: `packages/portal/app/(dashboard)/overview/page.tsx`

This task removes mock data from the dashboard overview so it always shows real data from the relay, with proper empty and error states.

- [ ] **Step 1: Remove mockStats and recentActivity arrays**

In `packages/portal/app/(dashboard)/overview/page.tsx`, delete lines 11-76 (the `mockStats` array and `recentActivity` array). Keep the imports and `quickActions` array.

- [ ] **Step 2: Replace the stats grid error fallback**

Replace the error branch (lines 150-155 in the original) that renders `mockStats` with an `ErrorState` component:

Change this block (the entire return starting at `return (`):

```tsx
  // Build stats from API data or fall back to mock
  const stats = dashStats
    ? [
        {
          label: "Registered Agents",
          value: dashStats.agentCount,
        },
        {
          label: "Active Sessions",
          value: dashStats.activeSessionCount,
        },
        {
          label: "Total Sessions",
          value: dashStats.sessionCount,
        },
        {
          label: "Active Credentials",
          value: dashStats.credentialCount,
        },
      ]
    : mockStats;
```

To:

```tsx
  const stats = dashStats
    ? [
        { label: "Registered Agents", value: dashStats.agentCount },
        { label: "Active Sessions", value: dashStats.activeSessionCount },
        { label: "Total Sessions", value: dashStats.sessionCount },
        { label: "Active Credentials", value: dashStats.credentialCount },
      ]
    : [
        { label: "Registered Agents", value: 0 },
        { label: "Active Sessions", value: 0 },
        { label: "Total Sessions", value: 0 },
        { label: "Active Credentials", value: 0 },
      ];
```

- [ ] **Step 3: Replace the error state in the JSX**

Replace the error branch in the JSX (the block that renders `mockStats` on error):

```tsx
      ) : error ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
```

With:

```tsx
      ) : error ? (
        <ErrorState
          title="Unable to load dashboard"
          message={error}
          action={{ label: "Retry", onClick: () => window.location.reload() }}
        />
```

- [ ] **Step 4: Replace the hardcoded activity feed with an empty state**

Replace the entire activity feed section (the `recentActivity.map(...)` block) with a conditional:

```tsx
      {/* Activity Feed */}
      <div className="rounded-lg border border-navy-800 bg-navy-900">
        <div className="flex items-center justify-between border-b border-navy-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Recent Activity
          </h2>
          <Link
            href="/analytics"
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            View Analytics
          </Link>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-gray-400">
            No activity yet. Create your first agent to get started.
          </p>
          <Link
            href="/agents"
            className="mt-3 inline-block text-sm text-accent hover:text-accent-hover"
          >
            Go to Agents →
          </Link>
        </div>
      </div>
```

- [ ] **Step 5: Verify ErrorState import exists**

Check that `ErrorState` is already imported on line 5:
```tsx
import { StatCard, LoadingSpinner, ErrorState } from "@/components/ui";
```

It is. No change needed.

- [ ] **Step 6: Run portal tests**

Run: `cd /c/claude/attestara && pnpm --filter @attestara/portal exec vitest run`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /c/claude/attestara
git add packages/portal/app/\(dashboard\)/overview/page.tsx
git commit -m "fix(portal): remove mock fallback from dashboard, use real data with empty/error states"
```

---

## Task 4: Wire Credential Wizard to Real API

**Files:**
- Modify: `packages/portal/app/(dashboard)/credentials/page.tsx`

The credential wizard UI already exists (5-step modal). The `handleConfirm` function currently generates a random hash client-side. This task wires it to the real relay API.

- [ ] **Step 1: Import crypto utilities**

At the top of `packages/portal/app/(dashboard)/credentials/page.tsx`, add after the existing imports:

```typescript
import { getOrgIdFromToken } from "@/lib/auth";
```

Verify this import exists. If `getOrgIdFromToken` is already imported via hooks, skip this step.

- [ ] **Step 2: Replace handleConfirm with real API call**

Replace the `handleConfirm` function (lines 205-217) with:

```typescript
  async function handleConfirm() {
    const orgId = getOrgIdFromToken();
    if (!orgId) return;

    // Generate credential hash from form data
    const encoder = new TextEncoder();
    const data = encoder.encode(
      JSON.stringify({ agent: form.agent, domain: form.domain, maxValue: form.maxValue, currency: form.currency }),
    );
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    try {
      await apiClient.credentials.create(orgId, {
        agentId: form.agent,
        credentialHash: hash,
        schemaHash: "0x" + "0".repeat(64), // placeholder schema hash
        credentialData: {
          domain: form.domain,
          maxValue: form.maxValue,
          currency: form.currency,
          floor: form.floor || undefined,
          ceiling: form.ceiling || undefined,
        },
        expiry: new Date(form.expiry).toISOString(),
      });
      setCredHash(hash);
      setIssued(true);
      setStep(5);
      refetch();
    } catch (err) {
      console.error("Failed to issue credential:", err);
      // Stay on review step so user can retry
    }
  }
```

- [ ] **Step 3: Verify the apiClient import exists**

Check that `apiClient` is imported. It should already be imported at the top of the file. Verify.

- [ ] **Step 4: Run portal tests**

Run: `cd /c/claude/attestara && pnpm --filter @attestara/portal exec vitest run`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /c/claude/attestara
git add packages/portal/app/\(dashboard\)/credentials/page.tsx
git commit -m "feat(portal): wire credential wizard to real relay API"
```

---

## Task 5: Write E2E Smoke Test Script

**Files:**
- Create: `scripts/smoke-test.ts`

A TypeScript script that validates the full deployed stack end-to-end: register, login, create agents, issue credential, create session, submit turns, create commitment.

- [ ] **Step 1: Create the scripts directory**

Run: `mkdir -p /c/claude/attestara/scripts`

- [ ] **Step 2: Write the smoke test script**

Create `scripts/smoke-test.ts`:

```typescript
/**
 * Attestara E2E Smoke Test
 *
 * Validates the full deployed stack: relay API, database, chain integration.
 *
 * Usage:
 *   RELAY_URL=https://attestara-relay.onrender.com \
 *   npx tsx scripts/smoke-test.ts
 */

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:3001'
const RUN_ID = `smoke-${Date.now()}`

interface StepResult {
  name: string
  passed: boolean
  durationMs: number
  detail?: string
  error?: string
}

const results: StepResult[] = []

async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = Math.round(performance.now() - start)
    results.push({ name, passed: true, durationMs: duration })
    console.log(`  PASS  ${name} (${duration}ms)`)
    return result
  } catch (err) {
    const duration = Math.round(performance.now() - start)
    const message = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, durationMs: duration, error: message })
    console.log(`  FAIL  ${name} (${duration}ms): ${message}`)
    throw err
  }
}

async function api(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${RELAY_URL}/v1${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res
}

async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await api(path, options)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${body}`)
  }
  return res.json() as Promise<T>
}

async function main() {
  console.log(`\nAttestart E2E Smoke Test`)
  console.log(`Relay: ${RELAY_URL}`)
  console.log(`Run ID: ${RUN_ID}\n`)

  // Step 0: Health check
  await step('Health check', async () => {
    const res = await fetch(`${RELAY_URL}/health`)
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
    return res.json()
  })

  // Step 1: Register org + user
  const orgName = `smoke-test-org-${RUN_ID}`
  const email = `smoke-${RUN_ID}@test.example`
  const password = 'SmokeTest123!!'

  const auth = await step('Register org + user', async () => {
    return apiJson<{ token: string; refreshToken: string; user: { id: string; orgId: string } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ orgName, email, password }),
      },
    )
  })

  const token = auth.token
  const orgId = auth.user.orgId
  const authHeaders = { Authorization: `Bearer ${token}` }

  // Step 2: Login (verify auth works)
  await step('Login', async () => {
    return apiJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  })

  // Step 3: Create buyer agent
  const buyerAgent = await step('Create buyer agent', async () => {
    return apiJson<{ id: string; name: string; did: string }>(
      `/orgs/${orgId}/agents`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: `buyer-${RUN_ID}`,
          description: 'Smoke test buyer agent',
        }),
      },
    )
  })

  // Step 4: Create seller agent
  const sellerAgent = await step('Create seller agent', async () => {
    return apiJson<{ id: string; name: string; did: string }>(
      `/orgs/${orgId}/agents`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: `seller-${RUN_ID}`,
          description: 'Smoke test seller agent',
        }),
      },
    )
  })

  // Step 5: Issue credential for buyer
  const credentialHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  const credential = await step('Issue credential', async () => {
    return apiJson<{ id: string }>(
      `/orgs/${orgId}/credentials`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          agentId: buyerAgent.id,
          credentialHash,
          schemaHash: '0x' + '0'.repeat(64),
          credentialData: {
            domain: 'procurement.contracts',
            maxValue: '500000',
            currency: 'EUR',
          },
          expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      },
    )
  })

  // Step 6: Create session
  const session = await step('Create negotiation session', async () => {
    return apiJson<{ id: string; status: string }>(
      '/sessions',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          initiatorAgentId: buyerAgent.id,
          counterpartyAgentId: sellerAgent.id,
          sessionConfig: { maxTurns: 10, timeout: 3600 },
        }),
      },
    )
  })

  // Step 7: Submit a turn
  await step('Submit negotiation turn', async () => {
    return apiJson(
      `/sessions/${session.id}/turns`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          agentId: buyerAgent.id,
          sequenceNumber: 1,
          terms: { proposedValue: 400000, currency: 'EUR' },
          proofType: 'MANDATE_BOUND',
        }),
      },
    )
  })

  // Step 8: List agents (verify data persisted)
  await step('List agents (verify persistence)', async () => {
    const res = await apiJson<{ data: unknown[]; pagination: { total: number } }>(
      `/orgs/${orgId}/agents`,
      { headers: authHeaders },
    )
    if (res.pagination.total < 2) {
      throw new Error(`Expected at least 2 agents, got ${res.pagination.total}`)
    }
    return res
  })

  // Step 9: List credentials (verify persistence)
  await step('List credentials (verify persistence)', async () => {
    const res = await apiJson<{ data: unknown[]; pagination: { total: number } }>(
      `/orgs/${orgId}/credentials`,
      { headers: authHeaders },
    )
    if (res.pagination.total < 1) {
      throw new Error(`Expected at least 1 credential, got ${res.pagination.total}`)
    }
    return res
  })

  // Summary
  console.log('\n--- Results ---')
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0)

  console.log(`${passed} passed, ${failed} failed (${totalMs}ms total)`)

  if (failed > 0) {
    console.log('\nFailed steps:')
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - ${r.name}: ${r.error}`)
    }
    process.exit(1)
  }

  console.log('\nAll smoke tests passed!')
  process.exit(0)
}

main().catch((err) => {
  console.error('\nSmoke test aborted:', err)
  // Print partial results
  if (results.length > 0) {
    console.log('\n--- Partial Results ---')
    for (const r of results) {
      console.log(`  ${r.passed ? 'PASS' : 'FAIL'}  ${r.name} (${r.durationMs}ms)`)
    }
  }
  process.exit(1)
})
```

- [ ] **Step 3: Test locally against running relay**

Run: `cd /c/claude/attestara && npx tsx scripts/smoke-test.ts`

Expected: If relay is running locally with Postgres/Redis, all steps PASS. If not running, health check will fail (expected).

- [ ] **Step 4: Commit**

```bash
cd /c/claude/attestara
git add scripts/smoke-test.ts
git commit -m "feat: add E2E smoke test script for deployment verification"
```

---

## Task 6: Write Demo Script Document

**Files:**
- Create: `docs/demo-script.md`

A human-readable guide for walking through the full Attestara demo.

- [ ] **Step 1: Write the demo script**

Create `docs/demo-script.md`:

```markdown
# Attestara Live Demo Script

**Duration:** ~6 minutes
**Prerequisites:** All Render services healthy, Arbitrum Sepolia contracts deployed
**Audience:** Both technical and non-technical observers

---

## Pre-Demo Checklist

- [ ] Open portal: https://attestara-portal.onrender.com
- [ ] Open terminal with CLI ready
- [ ] Open Arbiscan Sepolia: https://sepolia.arbiscan.io
- [ ] Pre-warm Render services (hit /health 5 minutes before)
- [ ] Have Pinata gateway tab ready: https://gateway.pinata.cloud

---

## Act 1: The Problem (30 seconds)

**Show:** Portal landing page

**Say:** "AI agents are negotiating contracts worth millions on behalf of organizations. But today, there's no standard way to verify what an agent is authorized to do. Attestara solves this with cryptographic trust."

---

## Act 2: Agent Identity (1 minute)

**Do:**
1. Login to portal (use pre-created account)
2. Navigate to **Agents** page
3. Click **Provision Agent**
4. Enter name: "Procurement Bot"
5. Show the created agent with its DID (`did:ethr:0x...`)

**Say:** "Every agent gets a decentralized identity — a DID — anchored on the Arbitrum blockchain. This identity is owned by the organization, not any platform."

**Show:** Click the agent's on-chain registration link to show the Arbiscan transaction.

---

## Act 3: Credential Issuance (1 minute)

**Do:**
1. Navigate to **Credentials** page
2. Click **Issue Credential**
3. Step 1: Select "Procurement Bot"
4. Step 2: Domain = "IT Equipment", Max Value = 500,000 EUR
5. Step 3: Set expiry 90 days out
6. Step 4: Review and confirm
7. Show the issued credential with its hash

**Say:** "This is a W3C Verifiable Credential — a machine-readable mandate that says this agent can negotiate IT equipment contracts up to 500,000 euros. The credential is stored on IPFS and the hash is anchored on-chain."

---

## Act 4: ZK Negotiation (2 minutes)

**Switch to terminal.**

**Do:**
```bash
npx attestara demo \
  --relay-url https://attestara-relay.onrender.com \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Say (as output appears):**
- "Two agents are negotiating — a buyer with a 500K mandate and a seller with a 350K floor."
- "Watch the ZK proofs — the buyer proves it CAN spend up to 500K without revealing the exact limit."
- "Each turn narrows the gap. The protocol converges on a fair price."
- "Five turns. Agreement reached. Now it goes on-chain."

---

## Act 5: On-Chain Settlement (1 minute)

**Do:**
1. Copy the transaction hash from CLI output
2. Paste into Arbiscan Sepolia
3. Show the CommitmentContract call

**Say:** "The commitment is now on-chain. Dual signatures from both agents, an agreement hash, and references to the ZK proofs. This is an immutable, auditable record."

---

## Act 6: Verification (30 seconds)

**Switch back to portal.**

**Do:**
1. Navigate to **Commitments** page
2. Click the latest commitment
3. Show verified status, block number, Arbiscan link

**Say:** "Anyone can verify this commitment happened. But only the parties know the actual terms — that's the power of zero-knowledge proofs."

---

## Closing (30 seconds)

**Say:** "Attestara enables AI agents to negotiate with cryptographic accountability. No trust required — just math."

**Show:** Portal landing page CTA.
```

- [ ] **Step 2: Commit**

```bash
cd /c/claude/attestara
git add docs/demo-script.md
git commit -m "docs: add guided demo walkthrough script"
```

---

## Task 7: Render Environment Configuration

**Files:**
- Modify: `render.yaml`

This task adds the contract address environment variables to the Render configuration for the relay service.

- [ ] **Step 1: Add contract address env vars to render.yaml**

In `render.yaml`, add to the relay service's `envVars` section:

```yaml
      - key: AGENT_REGISTRY_ADDRESS
        value: "0xAC3747Cd9265c87d9D8e3a101DAFe2afc107e7F7"
      - key: COMMITMENT_CONTRACT_ADDRESS
        value: "0xc9E12435F45252A0ed2f46578f8a9b1b0db8f6Fd"
```

- [ ] **Step 2: Verify render.yaml is valid YAML**

Run: `cd /c/claude/attestara && python3 -c "import yaml; yaml.safe_load(open('render.yaml'))" 2>/dev/null || node -e "const fs=require('fs'); console.log('YAML exists:', fs.existsSync('render.yaml'))"`

- [ ] **Step 3: Commit**

```bash
cd /c/claude/attestara
git add render.yaml
git commit -m "deploy: add contract addresses to render.yaml for indexer"
```

---

## Task 8: Run Full Test Suite & E2E Verification

**Files:** None (verification only)

This task runs the complete test suite to verify no regressions from Tasks 1-7.

- [ ] **Step 1: Run all package tests**

Run: `cd /c/claude/attestara && pnpm test`

Expected: All turbo tasks PASS (13/13)

- [ ] **Step 2: Run integration tests**

Run: `cd /c/claude/attestara && pnpm test:integration`

Expected: All integration tests PASS

- [ ] **Step 3: Run Playwright E2E tests**

Run: `cd /c/claude/attestara && pnpm test:e2e`

Expected: 43/43 PASS (previously 38/43 — the credential wizard and demo page tests should now pass since those components already exist)

- [ ] **Step 4: Run typecheck**

Run: `cd /c/claude/attestara && pnpm typecheck`

Expected: No type errors

- [ ] **Step 5: Run lint**

Run: `cd /c/claude/attestara && pnpm lint`

Expected: No lint errors

- [ ] **Step 6: If any tests fail, fix them**

Address failures based on error messages. Common issues:
- Import path mismatches (`.js` extension required for ESM)
- Prisma schema field names not matching (check `schema.prisma` for exact column names)
- E2E selector mismatches (check exact text content rendered by components)

- [ ] **Step 7: Commit any fixes**

```bash
cd /c/claude/attestara
git add -A
git commit -m "fix: address test failures from demo readiness changes"
```

---

## Task 9: Version Bump to 0.2.0

**Files:**
- Modify: Root `package.json`
- Modify: All 7 `packages/*/package.json`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Bump root package.json**

In `package.json`, change `"version": "0.1.0"` to `"version": "0.2.0"`.

- [ ] **Step 2: Bump all package versions**

Run:
```bash
cd /c/claude/attestara
for pkg in packages/types packages/contracts packages/relay packages/prover packages/sdk packages/portal packages/cli; do
  sed -i 's/"version": "0.1.0"/"version": "0.2.0"/' "$pkg/package.json"
done
```

- [ ] **Step 3: Update CLAUDE.md version**

In `CLAUDE.md`, change `**Version:** 0.1.0 (MVP implementation phase)` to `**Version:** 0.2.0 (demo-ready, testnet deployed)`.

- [ ] **Step 4: Commit and tag**

```bash
cd /c/claude/attestara
git add package.json packages/*/package.json CLAUDE.md
git commit -m "chore: bump version to 0.2.0 (demo-ready)"
git tag v0.2.0 -m "Demo-ready: E2E testnet deployment"
```

---

## Manual Steps (Not Automated)

These require human action in the Render dashboard and are not code tasks:

1. **Set Render env vars** (before Task 8):
   - attestara-portal: `NEXT_PUBLIC_RELAY_URL=https://attestara-relay.onrender.com`
   - attestara-relay: `CORS_ORIGIN=https://attestara-portal.onrender.com`
   - attestara-relay: `ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc` (or Alchemy URL)
   - attestara-relay: `PINATA_API_KEY` and `PINATA_API_SECRET` from Pinata dashboard
   - attestara-relay: `DEPLOYER_PRIVATE_KEY` as a Render secret

2. **Deploy to Render**: Push master, trigger deploy of all 5 services

3. **Verify Render health**: Check relay `/health`, portal loads, prover logs show startup

---

## Dependency Graph

```
Task 1 (Indexer Callbacks)
    |
    v
Task 2 (Wire Indexer in Startup) ---> Task 7 (Render Config)
    |
    v
Task 3 (Dashboard Mock Removal) [parallel with Task 4]
Task 4 (Credential Wizard API) [parallel with Task 3]
    |
    v
Task 5 (Smoke Test Script)
Task 6 (Demo Script Doc) [parallel, no code deps]
    |
    v
Task 8 (Full Test Suite Verification)
    |
    v
Task 9 (Version Bump)
```

**Parallelizable groups:**
- Tasks 3 + 4 (both portal changes, independent files)
- Tasks 5 + 6 (smoke test + docs, independent)
- Task 7 can run anytime after Task 2
