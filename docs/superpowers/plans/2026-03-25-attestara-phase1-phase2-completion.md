# Attestara MVP — Outstanding Phase 1 & Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining Phase 1 gaps (relay services layer, missing routes, WebSocket, indexer) and Phase 2 deliverables (integration tests, marketing pages, BFF API routes, Playwright E2E) to bring the Attestara MVP to demo-ready state.

**Architecture:** The relay currently embeds all business logic in route handlers with in-memory Maps. We extract to a services layer (still in-memory for now — Prisma wiring is a separate future task), add 5 missing route files + the missing `POST /turns` endpoint, WebSocket for real-time session tracking, and a chain event indexer. Portal gets marketing pages and BFF proxy routes. Integration tests validate cross-package flows.

**Important notes:**
- Services use in-memory Maps initially (same as current routes). Prisma/PostgreSQL migration is deferred.
- All route refactors must consolidate shared stores — auth.ts and orgs.ts currently have separate org Maps that must be unified into OrgService.
- The `verifyPassword` call sites change from sync to async when migrating to bcrypt — route handlers must add `await`.

**Tech Stack:** TypeScript, Fastify 5, Prisma + PostgreSQL, Redis (ioredis), ethers v6, Next.js 16, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-22-attestara-mvp-design-v1.3.md`

---

## File Structure Overview

### `packages/relay/src/services/`
```
auth.service.ts             — password hashing (bcrypt), token generation, SIWE validation
org.service.ts              — org CRUD, slug generation, membership
agent.service.ts            — agent CRUD, DID uniqueness
credential.service.ts       — credential issuance, revocation, hash uniqueness
session.service.ts          — session lifecycle, invite tokens, turn management, term redaction
commitment.service.ts       — commitment creation, on-chain verification
api-key.service.ts          — API key CRUD, scope validation
webhook.service.ts          — webhook CRUD, event delivery with HMAC signing
```

### `packages/relay/src/routes/` (new files)
```
commitments.ts              — GET/POST commitment endpoints
api-keys.ts                 — API key CRUD endpoints
webhooks.ts                 — webhook management + delivery history
analytics.ts                — dashboard metrics aggregation
admin.ts                    — admin-only endpoints (indexer backfill)
```

### `packages/relay/src/websocket/`
```
index.ts                    — WebSocket server setup (Fastify plugin)
session-channel.ts          — per-session turn streaming
org-feed.ts                 — per-org activity feed
presence.ts                 — agent online/offline tracking
```

### `packages/relay/src/indexer/`
```
index.ts                    — chain event indexer entry
listener.ts                 — ethers.js event listener for Arbitrum
backfill.ts                 — block gap backfill logic
```

### `packages/portal/app/(marketing)/`
```
page.tsx                    — landing page
layout.tsx                  — marketing layout (nav + footer)
pricing/page.tsx            — pricing tiers
docs/page.tsx               — documentation hub
demo/page.tsx               — interactive demo
```

### `packages/portal/app/api/`
```
[...proxy]/route.ts         — BFF proxy to relay (cookie → JWT, CSRF)
```

### `tests/`
```
integration/
  sdk-relay.test.ts         — SDK ↔ Relay integration
  relay-prover.test.ts      — Relay ↔ Prover integration
  full-flow.test.ts         — End-to-end: create agent → issue cred → negotiate → commit
e2e/
  playwright/
    demo.spec.ts            — investor demo flow
    onboarding.spec.ts      — registration → dashboard
    negotiation.spec.ts     — full negotiation via portal
```

---

## Phase 1 Outstanding Tasks

### Task 1: Relay Services — Auth Service

Extract auth business logic from `packages/relay/src/routes/auth.ts` into a dedicated service. Replace SHA-256 password hashing with bcrypt (already installed as dependency).

**Files:**
- Create: `packages/relay/src/services/auth.service.ts`
- Modify: `packages/relay/src/routes/auth.ts` (remove inline logic, delegate to service)
- Create: `packages/relay/test/services/auth.service.test.ts`

- [ ] **Step 1: Write failing tests for auth service**

```typescript
// packages/relay/test/services/auth.service.test.ts
import { describe, it, expect } from 'vitest'
import { AuthService } from '../../src/services/auth.service.js'

describe('AuthService', () => {
  const service = new AuthService()

  it('should hash and verify a password with bcrypt', async () => {
    const hash = await service.hashPassword('test-password')
    expect(hash).not.toContain('test-password')
    expect(await service.verifyPassword('test-password', hash)).toBe(true)
    expect(await service.verifyPassword('wrong', hash)).toBe(false)
  })

  it('should generate access and refresh tokens', () => {
    const payload = { sub: 'user-1', orgId: 'org-1', email: 'a@b.com', role: 'owner' }
    const secret = 'test-secret-at-least-32-chars-long!!'
    const access = service.generateAccessToken(payload, secret)
    const refresh = service.generateRefreshToken(payload, secret)
    expect(access).toBeTruthy()
    expect(refresh).toBeTruthy()
    expect(access).not.toBe(refresh)
  })

  it('should verify a valid access token', () => {
    const payload = { sub: 'user-1', orgId: 'org-1', email: 'a@b.com', role: 'owner' }
    const secret = 'test-secret-at-least-32-chars-long!!'
    const token = service.generateAccessToken(payload, secret)
    const decoded = service.verifyToken(token, secret)
    expect(decoded.sub).toBe('user-1')
    expect(decoded.type).toBe('access')
  })

})
```

Note: `slugify()` belongs in OrgService (Task 2), not here.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/relay && pnpm test -- test/services/auth.service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AuthService**

```typescript
// packages/relay/src/services/auth.service.ts
import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'
import type { JWTPayload } from '../middleware/auth.js'

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt')
    return bcrypt.hash(password, 10)
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt')
    return bcrypt.compare(password, storedHash)
  }

  generateAccessToken(
    payload: Omit<JWTPayload, 'type'>,
    secret: string,
    expiresIn = '15m',
  ): string {
    return jwt.sign({ ...payload, type: 'access' }, secret, { expiresIn: expiresIn as any })
  }

  generateRefreshToken(
    payload: Omit<JWTPayload, 'type'>,
    secret: string,
    expiresIn = '7d',
  ): string {
    return jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: expiresIn as any })
  }

  verifyToken(token: string, secret: string): JWTPayload {
    return jwt.verify(token, secret) as JWTPayload
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/relay && pnpm test -- test/services/auth.service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/relay/src/services/auth.service.ts packages/relay/test/services/auth.service.test.ts
git commit -m "feat(relay): extract AuthService with bcrypt password hashing"
```

---

### Task 2: Relay Services — Org Service

**Critical:** This task must consolidate the org/user stores. Currently `routes/auth.ts` owns its own `orgs` and `users` Maps (lines 93-96), and `routes/orgs.ts` has a separate `orgMembers` Map. OrgService must own the canonical org + user + membership stores, and auth routes must import from OrgService instead of maintaining local copies.

**Files:**
- Create: `packages/relay/src/services/org.service.ts`
- Create: `packages/relay/test/services/org.service.test.ts`
- Modify: `packages/relay/src/routes/orgs.ts`
- Modify: `packages/relay/src/routes/auth.ts` (import stores from OrgService)

- [ ] **Step 1: Write failing tests**

Tests cover: create org (with `slugify()` + membership), get org by ID, update org, list members, create invite, create user in org, find user by email, find user by wallet.

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement OrgService**

OrgService owns ALL in-memory Maps: `orgs`, `users`, `emailIndex`, `walletIndex`, `orgMembers`, `invites`. Methods: `createOrg()`, `getOrg()`, `updateOrg()`, `listMembers()`, `createInvite()`, `createUser()`, `getUserByEmail()`, `getUserByWallet()`, `getUserById()`, `slugify()`. Export `clearStores()` for test cleanup.

- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Refactor `routes/orgs.ts` to delegate to OrgService**

Replace inline Map operations with `OrgService` method calls. Keep Zod validation and HTTP response formatting in routes.

- [ ] **Step 6: Refactor `routes/auth.ts` to use OrgService stores**

Remove the local `users`, `orgs`, `emailIndex`, `walletIndex` Maps. Import from OrgService. Update `clearAuthStores()` to delegate to `OrgService.clearStores()`. All `verifyPassword()` calls must add `await` (now async with bcrypt).

- [ ] **Step 7: Run all relay tests to verify no regressions**

Run: `cd packages/relay && pnpm test`

- [ ] **Step 8: Commit**

---

### Task 3: Relay Services — Agent Service

**Files:**
- Create: `packages/relay/src/services/agent.service.ts`
- Create: `packages/relay/test/services/agent.service.test.ts`
- Modify: `packages/relay/src/routes/agents.ts`

- [ ] **Step 1: Write failing tests**

Tests cover: create agent (with DID uniqueness), list by org, get by ID, update, deactivate (soft delete).

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement AgentService**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Refactor `routes/agents.ts` to delegate to AgentService**
- [ ] **Step 6: Run all relay tests**
- [ ] **Step 7: Commit**

---

### Task 4: Relay Services — Credential Service

**Files:**
- Create: `packages/relay/src/services/credential.service.ts`
- Create: `packages/relay/test/services/credential.service.test.ts`
- Modify: `packages/relay/src/routes/credentials.ts`

- [ ] **Step 1: Write failing tests**

Tests cover: issue credential (hash uniqueness check), list by org, get by ID, revoke (soft delete).

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement CredentialService**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Refactor `routes/credentials.ts` to delegate**
- [ ] **Step 6: Run all relay tests**
- [ ] **Step 7: Commit**

---

### Task 5: Relay Services — Session Service + Turn Creation Route

The most complex service — handles cross-org invite tokens, turn management, and term redaction. Also adds the missing `POST /v1/sessions/:sessionId/turns` endpoint (currently only GET exists).

**Files:**
- Create: `packages/relay/src/services/session.service.ts`
- Create: `packages/relay/test/services/session.service.test.ts`
- Modify: `packages/relay/src/routes/sessions.ts` (add POST /turns route)

- [ ] **Step 1: Write failing tests**

Tests cover:
- Create intra_org session (auto-active)
- Create cross_org session (pending_acceptance + invite token)
- Accept session with valid token
- Reject invalid invite token
- List sessions filtered by org
- **Append turn with terms, proof, and signature**
- **Reject turn on non-active session**
- **Reject turn from agent not in session**
- Get turns with cross-org term redaction
- Generate new invite token

- [ ] **Step 2: Run test to verify they fail**
- [ ] **Step 3: Implement SessionService**

Key methods: `createSession()`, `acceptSession()`, `getSession()`, `listByOrg()`, `appendTurn()`, `getTurns()` (with redaction), `generateInviteToken()`.

`appendTurn()` validates: session is active, agent is a party, sequence number increments, stores turn. Returns the created turn.

- [ ] **Step 4: Run test to verify they pass**
- [ ] **Step 5: Refactor `routes/sessions.ts` to delegate + add POST /turns**

Add new endpoint: `POST /v1/sessions/:sessionId/turns` — Zod-validated body: `{ agentId, terms, proofType, proof, publicSignals, signature }`. Delegates to `SessionService.appendTurn()`.

- [ ] **Step 6: Write route-level tests for POST /turns**

Test via HTTP: create session, post turn, verify 201 + turn data. Verify 400 on invalid session status. Verify turn count increments on GET session.

- [ ] **Step 7: Run all relay tests**
- [ ] **Step 8: Commit**

---

### Task 6: Relay — Commitment Routes + Service

New route file. Prisma schema already has the `Commitment` model.

**Files:**
- Create: `packages/relay/src/services/commitment.service.ts`
- Create: `packages/relay/src/routes/commitments.ts`
- Create: `packages/relay/test/services/commitment.service.test.ts`
- Create: `packages/relay/test/commitments.test.ts`
- Modify: `packages/relay/src/server.ts` (register new routes)

- [ ] **Step 1: Write failing service tests**

Tests cover:
- Create commitment from completed session (agreement hash, parties, credential hashes, proofs)
- Get commitment by ID
- List commitments by org
- Verify commitment (check proofs valid)
- Reject commitment for non-completed session

- [ ] **Step 2: Run test to verify they fail**
- [ ] **Step 3: Implement CommitmentService**

Uses in-memory Map. Methods: `create()`, `getById()`, `listByOrg()`, `verify()`, `updateOnChainStatus()`.

- [ ] **Step 4: Write failing route tests**

Endpoints: `POST /v1/sessions/:sessionId/commitment`, `GET /v1/commitments`, `GET /v1/commitments/:id`, `POST /v1/commitments/:id/verify`.

- [ ] **Step 5: Implement commitment routes**
- [ ] **Step 6: Register routes in `server.ts`**

Add: `await app.register(commitmentRoutes, { prefix: '/v1' })`

- [ ] **Step 7: Run all tests**
- [ ] **Step 8: Commit**

---

### Task 7: Relay — API Key Routes + Service

**Files:**
- Create: `packages/relay/src/services/api-key.service.ts`
- Create: `packages/relay/src/routes/api-keys.ts`
- Create: `packages/relay/test/services/api-key.service.test.ts`
- Create: `packages/relay/test/api-keys.test.ts`
- Modify: `packages/relay/src/server.ts`

- [ ] **Step 1: Write failing service tests**

Tests cover: create API key (returns raw once, stores hash), list keys by org, revoke key, validate key hash lookup, scope checking.

- [ ] **Step 2: Implement ApiKeyService**

Uses existing `generateApiKey()` and `hashApiKey()` from `middleware/auth.ts`. Methods: `create()`, `listByOrg()`, `revoke()`, `validateByHash()`.

- [ ] **Step 3: Write failing route tests + implement routes**

Endpoints: `POST /v1/orgs/:orgId/api-keys`, `GET /v1/orgs/:orgId/api-keys`, `DELETE /v1/orgs/:orgId/api-keys/:id`.

- [ ] **Step 4: Register in server.ts, run all tests**
- [ ] **Step 5: Commit**

---

### Task 8: Relay — Webhook Routes + Service

**Files:**
- Create: `packages/relay/src/services/webhook.service.ts`
- Create: `packages/relay/src/routes/webhooks.ts`
- Create: `packages/relay/test/services/webhook.service.test.ts`
- Create: `packages/relay/test/webhooks.test.ts`
- Modify: `packages/relay/src/server.ts`

- [ ] **Step 1: Write failing service tests**

Tests cover: register webhook (URL, events, HMAC secret), list webhooks, deactivate webhook, deliver event (HMAC-signed payload), delivery retry logic, delivery history.

- [ ] **Step 2: Implement WebhookService**

Methods: `register()`, `listByOrg()`, `deactivate()`, `deliver()`, `getDeliveryHistory()`. HMAC signing uses `createHmac('sha256', secret)`.

**Note on secret storage:** The Prisma schema stores `secretHash`, but outbound delivery requires the raw secret for HMAC signing. Store the raw secret encrypted (using `ORG_MASTER_KEY_SECRET` from config) alongside the hash. The hash is for webhook identification; the encrypted secret is for signing.

- [ ] **Step 3: Write routes + route tests**

Endpoints: `POST /v1/orgs/:orgId/webhooks`, `GET /v1/orgs/:orgId/webhooks`, `DELETE /v1/orgs/:orgId/webhooks/:id`, `GET /v1/orgs/:orgId/webhooks/:id/deliveries`.

- [ ] **Step 4: Register, run all tests**
- [ ] **Step 5: Commit**

---

### Task 9: Relay — Analytics Routes

**Files:**
- Create: `packages/relay/src/routes/analytics.ts`
- Create: `packages/relay/test/analytics.test.ts`
- Modify: `packages/relay/src/server.ts`

- [ ] **Step 1: Write failing tests**

Tests cover: `GET /v1/orgs/:orgId/analytics` returns agent count, session count, credential count, commitment count, active sessions, avg turns per session.

- [ ] **Step 2: Implement analytics route**

Aggregates counts from existing in-memory stores (or service methods). Single endpoint returning a stats object.

- [ ] **Step 3: Register, run all tests**
- [ ] **Step 4: Commit**

---

### Task 10: Relay — WebSocket Server

**Files:**
- Create: `packages/relay/src/websocket/index.ts`
- Create: `packages/relay/src/websocket/session-channel.ts`
- Create: `packages/relay/src/websocket/org-feed.ts`
- Create: `packages/relay/src/websocket/presence.ts`
- Create: `packages/relay/test/websocket.test.ts`
- Modify: `packages/relay/src/server.ts`

- [ ] **Step 1: Write failing tests**

Tests cover:
- WebSocket connection with JWT auth
- Subscribe to session channel, receive turn events
- Subscribe to org feed, receive session/commitment events
- Presence: agent comes online, presence broadcast, agent goes offline
- Reject unauthenticated connection

- [ ] **Step 2: Implement WebSocket plugin**

`index.ts`: Fastify plugin using `@fastify/websocket` (already in deps). JWT validation on upgrade. Route: `GET /ws`.

`session-channel.ts`: Map<sessionId, Set<WebSocket>>. Broadcast turn events to subscribers.

`org-feed.ts`: Map<orgId, Set<WebSocket>>. Broadcast session/commitment lifecycle events.

`presence.ts`: Map<agentId, { ws, lastSeen }>. Heartbeat + cleanup.

- [ ] **Step 3: Register plugin in server.ts**
- [ ] **Step 4: Run all tests**
- [ ] **Step 5: Commit**

---

### Task 11: Relay — Chain Event Indexer

**Files:**
- Create: `packages/relay/src/indexer/index.ts`
- Create: `packages/relay/src/indexer/listener.ts`
- Create: `packages/relay/src/indexer/backfill.ts`
- Create: `packages/relay/test/indexer.test.ts`
- Modify: `packages/relay/src/server.ts`

- [ ] **Step 1: Write failing tests**

Tests cover:
- Listener processes AgentRegistered event and updates agent store
- Listener processes CommitmentRecorded event and updates commitment store
- Backfill requests blocks in a range and processes events
- Graceful shutdown disconnects provider

- [ ] **Step 2: Implement indexer**

`listener.ts`: Uses `ethers.Contract` to listen for events on AgentRegistry and CommitmentContract. Calls service methods to update local state. Contract ABIs are imported from `@attestara/contracts` — add `"@attestara/contracts": "workspace:*"` to relay's `package.json` dependencies.

`backfill.ts`: Queries past events from a given block number to current. Used on startup or admin trigger.

`index.ts`: Starts listener + optional backfill. Config: `ARBITRUM_SEPOLIA_RPC_URL` from relay config.

- [ ] **Step 3: Add optional startup in server.ts** (only when RPC URL configured)
- [ ] **Step 4: Run all tests**
- [ ] **Step 5: Commit**

---

### Task 12: Relay — Admin Routes

**Files:**
- Create: `packages/relay/src/routes/admin.ts`
- Create: `packages/relay/test/admin.test.ts`
- Modify: `packages/relay/src/server.ts`

- [ ] **Step 1: Write failing tests**

Tests cover: `POST /v1/admin/indexer/backfill` triggers backfill, requires admin role. `GET /v1/admin/stats` returns system-wide stats.

- [ ] **Step 2: Implement admin routes**

Admin role check via `requireAuth` + role === 'admin' guard.

- [ ] **Step 3: Register, run all tests**
- [ ] **Step 4: Commit**

---

## Phase 2 Tasks

### Task 13: Portal — Marketing Landing Page

**Files:**
- Create: `packages/portal/app/(marketing)/layout.tsx`
- Create: `packages/portal/app/(marketing)/page.tsx`

- [ ] **Step 1: Create marketing layout**

Shared nav (Logo, Docs, Pricing, Login links) + footer. Dark theme matching dashboard.

- [ ] **Step 2: Create landing page**

Hero section: "Cryptographic Trust for AI Agent Commerce". Feature grid (ZK Proofs, Verifiable Credentials, On-Chain Settlement, Cross-Org Negotiation). CTA: "Get Started" → `/register`, "View Demo" → `/demo`.

- [ ] **Step 3: Verify build**

Run: `cd packages/portal && pnpm build`

- [ ] **Step 4: Commit**

---

### Task 14: Portal — Pricing Page

**Files:**
- Create: `packages/portal/app/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Create pricing page**

3 tiers: Starter (free, 3 agents, 100 sessions/mo), Growth ($99/mo, 25 agents, unlimited sessions, WebSocket), Enterprise (custom, SAML SSO, SLA, dedicated indexer). Feature comparison table.

- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

---

### Task 15: Portal — Docs Hub Page

**Files:**
- Create: `packages/portal/app/(marketing)/docs/page.tsx`

- [ ] **Step 1: Create docs hub**

Card grid linking to: Quickstart, SDK Reference, API Reference, Circuits, Smart Contracts, CLI. Each card with icon, title, description. Links are placeholder (`#`) for now.

- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

---

### Task 16: Portal — Interactive Demo Page

**Files:**
- Create: `packages/portal/app/(marketing)/demo/page.tsx`

- [ ] **Step 1: Create interactive demo**

Step-by-step animated demo: (1) Agent registers DID, (2) Credential issued, (3) ZK proof generated, (4) Negotiation round, (5) Commitment anchored. Each step shows simulated terminal output + visual. Uses `useState` for step progression, no real API calls.

- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

---

### Task 17: Portal — BFF API Proxy Routes

**Files:**
- Create: `packages/portal/app/api/[...proxy]/route.ts`

- [ ] **Step 1: Write the proxy route**

```typescript
// packages/portal/app/api/[...proxy]/route.ts
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:3001'

async function proxyRequest(request: NextRequest, params: { proxy: string[] }) {
  const path = params.proxy.join('/')
  const url = `${RELAY_URL}/v1/${path}`

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  const headers = new Headers(request.headers)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  headers.delete('cookie')

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: request.method !== 'GET' ? await request.text() : undefined,
  })

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(req, await ctx.params)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(req, await ctx.params)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(req, await ctx.params)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(req, await ctx.params)
}
```

- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

---

### Task 18: Integration Tests — SDK ↔ Relay

**Pre-requisite:** Update root `vitest.config.ts` to add aliases for `@attestara/relay` and `@attestara/prover` packages so integration tests can import `buildServer` and `buildProverServer`.

**Files:**
- Modify: `vitest.config.ts` (add relay + prover aliases)
- Create: `tests/integration/sdk-relay.test.ts`

- [ ] **Step 1: Write integration tests**

Tests cover:
- SDK `AttestaraClient` registers agent via relay API
- SDK issues credential, relay stores it
- SDK creates session via relay, gets session back
- SDK lists sessions filtered by org

Uses `buildServer()` from relay to start a local Fastify instance, SDK `AttestaraClient` pointed at it.

- [ ] **Step 2: Run tests**

Run: `pnpm test:integration`

- [ ] **Step 3: Commit**

---

### Task 19: Integration Tests — Full Flow

**Files:**
- Create: `tests/integration/full-flow.test.ts`

- [ ] **Step 1: Write full-flow integration test**

Single test that exercises the complete Attestara pipeline:
1. Register two users (different orgs)
2. Each org provisions an agent
3. Org A issues a procurement credential to their agent
4. Create cross-org session with invite token
5. Org B accepts session
6. 3-turn negotiation (propose → counter → accept)
7. Create commitment from completed session
8. Verify commitment

Uses relay server + SDK testing utilities (`MockAgent`, `TestProver`, `TestCredentials`).

- [ ] **Step 2: Run test**
- [ ] **Step 3: Commit**

---

### Task 20: Integration Tests — Relay ↔ Prover

**Files:**
- Create: `tests/integration/relay-prover.test.ts`

- [ ] **Step 1: Write integration tests**

Tests cover:
- Relay calls prover service to generate MandateBound proof
- Relay calls prover to verify a proof
- Prover returns cached result on duplicate request
- Prover health check from relay

Uses `buildProverServer()` from prover package to start local instance.

- [ ] **Step 2: Run tests**
- [ ] **Step 3: Commit**

---

### Task 21: Playwright E2E — Setup + Onboarding Flow

**Files:**
- Create: `packages/portal/playwright.config.ts`
- Create: `packages/portal/e2e/onboarding.spec.ts`
- Modify: `packages/portal/package.json` (add playwright dep + script)

- [ ] **Step 1: Configure Playwright**

```typescript
// packages/portal/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  use: { headless: true },
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 2: Write onboarding E2E test**

Flow: Navigate to `/` → click "Get Started" → fill register form → submit → redirected to dashboard → see agents page.

- [ ] **Step 3: Run test**

Run: `cd packages/portal && npx playwright test`

- [ ] **Step 4: Commit**

---

### Task 22: Playwright E2E — Negotiation Flow

**Files:**
- Create: `packages/portal/e2e/negotiation.spec.ts`

- [ ] **Step 1: Write negotiation E2E test**

Flow: Login → navigate to Agents → provision agent → navigate to Credentials → issue credential (wizard) → navigate to Sessions → see session list → click session → view turns.

- [ ] **Step 2: Run test**
- [ ] **Step 3: Commit**

---

## Verification

After all tasks complete:

```bash
# Full build (all 7 packages)
pnpm build

# All unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Portal E2E (Playwright)
cd packages/portal && npx playwright test

# Naming regression
pnpm test:naming
```

Expected: All green. Zero regressions in existing 133 SDK + 33 CLI + relay + prover tests.
