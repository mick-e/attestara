# Attestara Three-Track Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Attestara across three parallel tracks: (A) wire portal dashboard pages to real relay API endpoints removing mock data, (B) fix Playwright test failures and verify integration tests, (C) migrate SIWE nonces to Redis and org invites to Prisma for production readiness.

**Architecture:** Track A modifies portal `lib/api-client.ts` and `lib/hooks.ts` to add missing commitment/analytics/api-key API methods, then updates 5 dashboard pages to consume real data instead of hardcoded mocks. Track B runs existing Playwright and integration test suites, diagnoses failures, and fixes the portal UI to match test expectations. Track C adds a shared Redis client utility, migrates SIWE nonce storage from in-memory Map to Redis SETEX, and adds a Prisma `Invite` model with migration to replace the ephemeral invite Map.

**Important notes:**
- All relay API endpoints already exist (`/v1/commitments`, `/v1/orgs/:orgId/analytics`, `/v1/orgs/:orgId/api-keys`). The portal just never wired to them.
- Portal pages use a consistent pattern: `useFetch<T>()` hook → `apiClient` method → fallback to mock data if API unavailable. We replace stubs with real hooks while keeping mock fallback for offline dev.
- The Playwright tests test against a built portal with no relay backend — pages must render gracefully with mock data.
- Track C: `ioredis` is already in relay's `package.json`. Redis URL is already in config (`REDIS_URL` with `redis://localhost:6379` default).

**Tech Stack:** TypeScript, Next.js 16, React 19, Fastify 5, Prisma, ioredis, Vitest, Playwright

**Spec:** Based on codebase analysis 2026-04-11 (no separate spec — this addresses existing gaps, not new features).

---

## File Structure Overview

### Track A: Portal Hardening

```
packages/portal/lib/api-client.ts     — Add commitments + analytics + apiKeys namespaces
packages/portal/lib/hooks.ts          — Wire useCommitments, useCommitment, useAnalytics, useApiKeys, useSubmitTurn
packages/portal/app/(dashboard)/commitments/page.tsx          — Use real hook data
packages/portal/app/(dashboard)/commitments/[id]/page.tsx     — Use real hook data
packages/portal/app/(dashboard)/analytics/page.tsx            — Use real analytics endpoint
packages/portal/app/(dashboard)/settings/api-keys/page.tsx    — Use real API key endpoints
packages/portal/app/(dashboard)/sessions/[id]/page.tsx        — Wire real turn data + submission form
```

### Track B: Test Coverage

```
packages/portal/e2e/onboarding.spec.ts    — Diagnose + fix demo page test failures
packages/portal/e2e/negotiation.spec.ts   — Diagnose + fix credential/session test failures
packages/relay/src/indexer/callbacks.ts    — Commit untracked file
packages/relay/test/indexer-callbacks.test.ts — Commit untracked test
```

### Track C: Production Readiness

```
packages/relay/src/utils/redis.ts          — New: shared Redis client singleton
packages/relay/src/utils/siwe.ts           — Migrate nonce store to Redis
packages/relay/test/siwe-redis.test.ts     — New: Redis nonce store tests
packages/relay/prisma/schema.prisma        — Add Invite model
packages/relay/src/services/org.service.ts — Migrate invites to Prisma
packages/relay/test/services/org.service.test.ts — Update invite tests
```

---

## Track A: Portal Hardening

### Task 1: Add Commitments + Analytics + API Keys to ApiClient

Add the missing API client methods that match existing relay endpoints.

**Files:**
- Modify: `packages/portal/lib/api-client.ts`

- [ ] **Step 1: Add Commitment type to api-client.ts**

Add after the existing `Invite` interface (line ~93):

```typescript
export interface CommitmentResponse {
  id: string;
  sessionId: string;
  agreementHash: string;
  parties: string[];
  credentialHashes: string[];
  proofs: Record<string, unknown>;
  circuitVersions: string[];
  verified: boolean;
  txHash: string | null;
  blockNumber: number | null;
  createdAt: string;
}

export interface AnalyticsResponse {
  agentCount: number;
  credentialCount: number;
  sessionCount: number;
  commitmentCount: number;
  activeSessionCount: number;
  avgTurnsPerSession: number;
}

export interface ApiKeyResponse {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  rawKey?: string; // Only present on creation response
}
```

- [ ] **Step 2: Add commitments namespace to ApiClient class**

Add after the `orgs` namespace (line ~311):

```typescript
  // ── Commitments ──────────────────────────────────────────────────────────

  commitments = {
    list: () =>
      this.get<Paginated<CommitmentResponse>>("/commitments"),

    get: (id: string) =>
      this.get<CommitmentResponse>(`/commitments/${id}`),

    verify: (id: string) =>
      this.post<CommitmentResponse>(`/commitments/${id}/verify`),
  };

  // ── Analytics ────────────────────────────────────────────────────────────

  analytics = {
    get: (orgId: string) =>
      this.get<AnalyticsResponse>(`/orgs/${orgId}/analytics`),
  };

  // ── API Keys ─────────────────────────────────────────────────────────────

  apiKeys = {
    list: (orgId: string) =>
      this.get<Paginated<ApiKeyResponse>>(`/orgs/${orgId}/api-keys`),

    create: (orgId: string, data: { name: string; scopes?: string[]; expiresAt?: string }) =>
      this.post<ApiKeyResponse>(`/orgs/${orgId}/api-keys`, data),

    revoke: (orgId: string, keyId: string) =>
      this.delete(`/orgs/${orgId}/api-keys/${keyId}`),
  };

  // ── Turns ────────────────────────────────────────────────────────────────

  turns = {
    submit: (sessionId: string, data: {
      agentId: string;
      terms: Record<string, unknown>;
      proofType: string;
      proof: Record<string, unknown>;
      publicSignals: Record<string, unknown>;
      signature: string;
    }) => this.post<Turn>(`/sessions/${sessionId}/turns`, data),
  };
```

- [ ] **Step 3: Verify portal builds**

Run: `cd packages/portal && pnpm build`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/portal/lib/api-client.ts
git commit -m "feat(portal): add commitments, analytics, apiKeys, turns to ApiClient"
```

---

### Task 2: Wire Commitment Hooks to Real API

Replace the stubbed `useCommitments`/`useCommitment` hooks with real API calls.

**Files:**
- Modify: `packages/portal/lib/hooks.ts`

- [ ] **Step 1: Replace stubbed commitment hooks**

Find the comment block and stubbed hooks (lines 365-387) and replace with:

```typescript
// ─── Commitments ────────────────────────────────────────────────────────────

export interface Commitment {
  id: string;
  sessionId: string;
  agreementHash: string;
  parties: string[];
  credentialHashes: string[];
  proofs: Record<string, unknown>;
  circuitVersions: string[];
  verified: boolean;
  txHash: string | null;
  blockNumber: number | null;
  createdAt: string;
}

export function useCommitments(): FetchState<Commitment[]> {
  const result = useFetch<Paginated<Commitment>>(
    () => apiClient.commitments.list(),
    [],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useCommitment(id: string): FetchState<Commitment> {
  return useFetch<Commitment>(
    id ? () => apiClient.commitments.get(id) : null,
    [id],
  );
}
```

Also import `CommitmentResponse` as `Commitment` type alias is redefined locally (or use the api-client type). Since hooks.ts already defines its own `Commitment` interface, update it to match the full relay response shape.

Update the import at the top of hooks.ts to also import the `Paginated` type (already imported) and add imports for the new api-client types:

The existing import (line 6-15) already imports `Paginated`. Add `CommitmentResponse`, `AnalyticsResponse`, `ApiKeyResponse` to the import if desired, or keep using local interfaces. The local interface approach is fine and avoids import churn.

- [ ] **Step 2: Add useAnalytics hook**

Add after the commitments section:

```typescript
// ─── Analytics ──────────────────────────────────────────────────────────────

export interface OrgAnalytics {
  agentCount: number;
  credentialCount: number;
  sessionCount: number;
  commitmentCount: number;
  activeSessionCount: number;
  avgTurnsPerSession: number;
}

export function useAnalytics(): FetchState<OrgAnalytics> {
  const orgId = getOrgIdFromToken();
  return useFetch<OrgAnalytics>(
    orgId ? () => apiClient.analytics.get(orgId) : null,
    [orgId],
  );
}
```

- [ ] **Step 3: Add useApiKeys and useCreateApiKey hooks**

```typescript
// ─── API Keys ───────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  rawKey?: string;
}

export function useApiKeys(): FetchState<ApiKey[]> {
  const orgId = getOrgIdFromToken();
  const result = useFetch<Paginated<ApiKey>>(
    orgId ? () => apiClient.apiKeys.list(orgId) : null,
    [orgId],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useCreateApiKey() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createKey = useCallback(
    async (name: string, scopes: string[] = []) => {
      const orgId = getOrgIdFromToken();
      if (!orgId) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const key = await apiClient.apiKeys.create(orgId, { name, scopes });
        return key;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create API key";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { createKey, loading, error };
}

export function useRevokeApiKey() {
  const [loading, setLoading] = useState(false);

  const revokeKey = useCallback(async (keyId: string) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) throw new Error("Not authenticated");
    setLoading(true);
    try {
      await apiClient.apiKeys.revoke(orgId, keyId);
    } finally {
      setLoading(false);
    }
  }, []);

  return { revokeKey, loading };
}
```

- [ ] **Step 4: Add useSubmitTurn hook**

```typescript
// ─── Turn Submission ────────────────────────────────────────────────────────

export function useSubmitTurn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitTurn = useCallback(
    async (
      sessionId: string,
      data: {
        agentId: string;
        terms: Record<string, unknown>;
        proofType: string;
        proof: Record<string, unknown>;
        publicSignals: Record<string, unknown>;
        signature: string;
      },
    ) => {
      setLoading(true);
      setError(null);
      try {
        const turn = await apiClient.turns.submit(sessionId, data);
        return turn;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to submit turn";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { submitTurn, loading, error };
}
```

- [ ] **Step 5: Verify portal builds**

Run: `cd packages/portal && pnpm build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/portal/lib/hooks.ts
git commit -m "feat(portal): wire commitment, analytics, api-key, turn hooks to real API"
```

---

### Task 3: Wire Commitments Pages to Real Data

Replace hardcoded mock data in both commitment pages with hook-driven data + mock fallback.

**Files:**
- Modify: `packages/portal/app/(dashboard)/commitments/page.tsx`
- Modify: `packages/portal/app/(dashboard)/commitments/[id]/page.tsx`

- [ ] **Step 1: Update commitments list page**

In `packages/portal/app/(dashboard)/commitments/page.tsx`, the page already calls `useCommitments()` (line ~155) and falls back to `mockCommitments` when data is null (lines ~158-169). Now that the hook returns real data, update the display mapping to handle the full `Commitment` response shape.

Find the section where `displayCommitments` is derived from the hook data (or where `mockCommitments` is used as fallback). Add a mapping from the API response to the display format:

```typescript
  const { data: commitments, loading, error, refetch } = useCommitments();

  const displayCommitments = commitments
    ? commitments.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        agreementHash: c.agreementHash,
        parties: c.parties.join(", "),
        verified: c.verified,
        txHash: c.txHash,
        createdAt: c.createdAt,
      }))
    : mockCommitments;
```

Add loading and empty states (matching the pattern from `credentials/page.tsx`):

```typescript
  {loading ? (
    <div className="py-12">
      <LoadingSpinner label="Loading commitments..." />
    </div>
  ) : displayCommitments.length === 0 ? (
    <EmptyState
      title="No commitments yet"
      description="Commitments are created when negotiation sessions reach agreement."
    />
  ) : (
    <DataTable
      columns={columns}
      data={displayCommitments as unknown as Record<string, unknown>[]}
    />
  )}
```

Import `LoadingSpinner`, `EmptyState` from `@/components/ui` and `useCommitments` from `@/lib/hooks`.

- [ ] **Step 2: Update commitment detail page**

In `packages/portal/app/(dashboard)/commitments/[id]/page.tsx`, add the `useCommitment` hook call and merge with existing mock data as fallback:

Add imports at top:
```typescript
import { useCommitment } from "@/lib/hooks";
import { LoadingSpinner, ErrorState } from "@/components/ui";
```

Add hook call inside the component:
```typescript
  const { id } = useParams<{ id: string }>();
  const { data: commitment, loading, error } = useCommitment(id);

  // Derive display values from API data with mock fallback
  const display = commitment ?? mockCommitment;
```

Add loading/error states before the main render:
```typescript
  if (loading) return <div className="py-12"><LoadingSpinner label="Loading commitment..." /></div>;
  if (error) return <ErrorState message={error} />;
```

Then replace all `mockCommitment.field` references with `display.field`.

- [ ] **Step 3: Verify portal builds**

Run: `cd packages/portal && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/portal/app/\(dashboard\)/commitments/
git commit -m "feat(portal): wire commitment pages to real relay API with mock fallback"
```

---

### Task 4: Wire Analytics Page to Real API

Replace all hardcoded analytics mock data with the relay analytics endpoint.

**Files:**
- Modify: `packages/portal/app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Add hook import and API call**

Add imports at top of file:
```typescript
"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { LoadingSpinner, ErrorState } from "@/components/ui";
```

Inside the component, add:
```typescript
  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: analytics, loading, error } = useAnalytics();
```

- [ ] **Step 2: Replace hardcoded summaryStats with real data**

Replace the `summaryStats` constant with dynamic values derived from the hook:

```typescript
  const summaryStats = analytics
    ? [
        { label: "Total Sessions", value: analytics.sessionCount.toLocaleString(), change: "" },
        { label: "Completed", value: String(analytics.commitmentCount), change: "" },
        { label: "Active Now", value: String(analytics.activeSessionCount), change: "" },
        { label: "Avg Turns/Session", value: analytics.avgTurnsPerSession.toFixed(1), change: "" },
      ]
    : [
        { label: "Total Sessions", value: "0", change: "" },
        { label: "Completed", value: "0", change: "" },
        { label: "Active Now", value: "0", change: "" },
        { label: "Avg Turns/Session", value: "0.0", change: "" },
      ];
```

Keep the `sessionVolumeData`, `gasCostData`, and `proofLatencyData` arrays as mock since the relay analytics endpoint doesn't return time-series data. Add a comment:

```typescript
// Time-series data requires a dedicated analytics endpoint — using placeholder data
const sessionVolumeData = [ /* existing mock */ ];
```

- [ ] **Step 3: Add loading state**

Wrap the page content with loading/error handling:
```typescript
  if (loading) return <div className="py-12"><LoadingSpinner label="Loading analytics..." /></div>;
```

- [ ] **Step 4: Verify portal builds**

Run: `cd packages/portal && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/portal/app/\(dashboard\)/analytics/page.tsx
git commit -m "feat(portal): wire analytics summary stats to relay API"
```

---

### Task 5: Wire API Keys Page to Real Endpoints

Replace mock data and client-side key generation with real relay API calls.

**Files:**
- Modify: `packages/portal/app/(dashboard)/settings/api-keys/page.tsx`

- [ ] **Step 1: Add hook imports and API integration**

Replace mock data with hooks at the top of the component:

```typescript
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { LoadingSpinner, EmptyState } from "@/components/ui";
```

Inside the component:
```typescript
  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: apiKeys, loading, refetch } = useApiKeys();
  const { createKey } = useCreateApiKey();
  const { revokeKey } = useRevokeApiKey();

  // Map API keys to display rows, or use mock data
  const displayKeys = apiKeys
    ? apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        scopes: k.scopes.join(", ") || "all",
        lastUsed: "-",
        createdAt: k.createdAt.split("T")[0],
      }))
    : mockApiKeys;
```

- [ ] **Step 2: Replace client-side key generation with API call**

Replace the `handleGenerate` function:

```typescript
  async function handleGenerate() {
    if (!keyName.trim()) return;
    try {
      const key = await createKey(keyName, selectedScopes);
      setGeneratedKey(key.rawKey ?? "");
      refetch();
    } catch {
      // Error handled by hook
    }
  }
```

- [ ] **Step 3: Add revoke handler**

Add a revoke handler and update the actions column in the table to include a revoke button:

```typescript
  async function handleRevoke(keyId: string) {
    await revokeKey(keyId);
    refetch();
  }
```

- [ ] **Step 4: Add loading state**

```typescript
  {loading ? (
    <div className="py-12"><LoadingSpinner label="Loading API keys..." /></div>
  ) : displayKeys.length === 0 ? (
    <EmptyState title="No API keys" description="Generate your first API key to get started." />
  ) : (
    <DataTable columns={columns} data={displayKeys as unknown as Record<string, unknown>[]} />
  )}
```

- [ ] **Step 5: Verify portal builds**

Run: `cd packages/portal && pnpm build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/portal/app/\(dashboard\)/settings/api-keys/page.tsx
git commit -m "feat(portal): wire API keys page to relay endpoints"
```

---

### Task 6: Wire Session Detail Turns + Add Turn Submission

Wire session detail page to show real turn data and add a form for submitting new turns.

**Files:**
- Modify: `packages/portal/app/(dashboard)/sessions/[id]/page.tsx`

- [ ] **Step 1: Import turn hooks and api-client**

Add at top of file:
```typescript
import { useSession, useSubmitTurn } from "@/lib/hooks";
import { apiClient, type Turn } from "@/lib/api-client";
```

- [ ] **Step 2: Fetch real turns from API**

Inside the component, add a `useFetch` call for turns alongside the existing `useSession` call:

```typescript
  const { data: session, loading: sessionLoading } = useSession(sessionId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [turnsLoading, setTurnsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
    apiClient.sessions.getTurns(sessionId)
      .then((res) => { setTurns(res.data); setTurnsLoading(false); })
      .catch(() => { setTurnsLoading(false); });
  }, [sessionId]);
```

Update the turns display to prefer real data:
```typescript
  const displayTurns = turns.length > 0
    ? turns.map((t) => ({
        sequence: t.sequenceNumber,
        agentId: t.agentId,
        terms: t.terms,
        proofType: t.proofType,
        proofStatus: "verified",
        createdAt: t.createdAt,
      }))
    : mockSession.turns;
```

- [ ] **Step 3: Add turn submission form**

Add a form at the bottom of the session detail page (before the closing `</div>`), visible only when session is active:

```typescript
  const sessionStatus = session?.status ?? mockSession.status;

  {sessionStatus === "active" && (
    <TurnSubmissionForm sessionId={sessionId} onSubmitted={() => {
      apiClient.sessions.getTurns(sessionId)
        .then((res) => setTurns(res.data))
        .catch(() => {});
    }} />
  )}
```

Add the `TurnSubmissionForm` component in the same file (before the default export):

```typescript
function TurnSubmissionForm({ sessionId, onSubmitted }: { sessionId: string; onSubmitted: () => void }) {
  const { submitTurn, loading, error } = useSubmitTurn();
  const [termsJson, setTermsJson] = useState("{}");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    try {
      await submitTurn(sessionId, {
        agentId: formData.get("agentId") as string,
        terms: JSON.parse(termsJson),
        proofType: "Groth16",
        proof: {},
        publicSignals: {},
        signature: "pending",
      });
      onSubmitted();
      form.reset();
      setTermsJson("{}");
    } catch {
      // Error displayed via hook
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-navy-800 bg-navy-900 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Submit Turn</h3>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Agent ID</label>
          <input name="agentId" required className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-accent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Terms (JSON)</label>
          <textarea
            value={termsJson}
            onChange={(e) => setTermsJson(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white font-mono outline-none focus:border-accent"
          />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors">
          {loading ? "Submitting..." : "Submit Turn"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verify portal builds**

Run: `cd packages/portal && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/portal/app/\(dashboard\)/sessions/\[id\]/page.tsx
git commit -m "feat(portal): wire session turns to API + add turn submission form"
```

---

## Track B: Test Coverage

### Task 7: Commit Pending Indexer Work + Push

Commit the untracked indexer files and push all pending work to origin.

**Files:**
- Stage: `packages/relay/src/indexer/callbacks.ts`
- Stage: `packages/relay/test/indexer-callbacks.test.ts`

- [ ] **Step 1: Run indexer callback tests to verify they pass**

Run: `cd packages/relay && pnpm test -- test/indexer-callbacks.test.ts`
Expected: All tests pass.

- [ ] **Step 2: Commit untracked indexer files**

```bash
git add packages/relay/src/indexer/callbacks.ts packages/relay/test/indexer-callbacks.test.ts
git commit -m "feat(relay): add Prisma-backed indexer callbacks for on-chain events"
```

- [ ] **Step 3: Push all pending commits**

```bash
git push origin master
```

---

### Task 8: Run Playwright Tests + Fix Failures

Run the full Playwright suite, identify which tests fail, and fix the portal UI to match.

**Files:**
- Modify: `packages/portal/app/(marketing)/demo/page.tsx` (if demo tests fail)
- Modify: `packages/portal/app/(dashboard)/credentials/page.tsx` (if credential wizard tests fail)
- Modify: `packages/portal/app/(dashboard)/sessions/page.tsx` (if sessions table tests fail)

- [ ] **Step 1: Build portal and run Playwright tests**

Run:
```bash
cd packages/portal && pnpm build && npx playwright test --reporter=list 2>&1 | head -100
```

Note which tests pass and which fail. Record the exact failure messages.

- [ ] **Step 2: Diagnose each failure**

For each failing test, compare the test's expected selectors against the actual rendered HTML:

**Demo page tests** (`onboarding.spec.ts` lines 117-129):
- Test expects `page.getByRole('button', { name: /next/i })` — demo page button text is `Next →` which should match.
- Test expects `page.getByText(/2 \/ /)` — demo page renders `{currentStep + 1} / {steps.length}` = "2 / 5".
- Test expects `page.getByRole('button', { name: /previous/i })` disabled — button text is `← Previous`.

If these fail, likely causes: build error, missing `"use client"` directive, or CSS causing layout issues.

**Credential wizard tests** (`negotiation.spec.ts` lines 51-66):
- Test expects `page.getByText(/step 1/i)` — modal title is `Issue Credential — Step 1: Select Agent`.
- Test expects `page.getByText(/select agent/i)` — also in title.
- Test expects `page.getByRole('button', { name: /cancel/i })` — Cancel button exists in modal footer.

If these fail, likely cause: Modal component doesn't render when `open=true` on server, or the title doesn't match (check the Modal `title` prop rendering).

**Sessions table test** (`negotiation.spec.ts` line 88):
- Test expects `page.getByRole('table')` — sessions page uses `<DataTable>` which should render `<table>`.

- [ ] **Step 3: Fix each identified failure**

Apply targeted fixes based on diagnosis. Common fixes:

If demo Next/Previous buttons aren't found — verify the button text renders correctly after hydration. The `←` and `→` characters might cause matching issues. If so, add `aria-label` attributes:

```tsx
<button
  onClick={() => setCurrentStep((s) => s - 1)}
  disabled={isFirst}
  aria-label="Previous"
  className="..."
>
  ← Previous
</button>
```

```tsx
<button
  onClick={() => setCurrentStep((s) => s + 1)}
  aria-label="Next"
  className="..."
>
  Next →
</button>
```

If credential wizard modal doesn't show — check that the `Modal` component renders its children when `open={true}` during Playwright tests (SSR vs client hydration).

If sessions table not found — ensure the `DataTable` component renders a `<table>` element (check `components/ui/data-table.tsx`).

- [ ] **Step 4: Re-run Playwright tests to verify fixes**

Run: `cd packages/portal && npx playwright test --reporter=list`
Expected: All 45 tests pass.

- [ ] **Step 5: Commit fixes**

```bash
git add packages/portal/
git commit -m "fix(portal): fix Playwright test failures in demo, credential wizard, and sessions pages"
```

---

### Task 9: Verify Integration Tests Pass

Run the integration test suite and fix any issues.

**Files:**
- Potentially modify: `tests/integration/*.test.ts`
- Potentially modify: `vitest.config.ts`

- [ ] **Step 1: Run integration tests**

Run: `pnpm test:integration 2>&1 | tail -30`
Expected: All tests pass (sdk-relay, relay-prover, full-flow).

- [ ] **Step 2: If any fail, diagnose and fix**

Read the failure output. Common issues:
- Import path errors — check vitest.config.ts aliases match current package structure.
- Service API changes — if relay endpoints changed shape, update test assertions.
- Port conflicts — integration tests start local servers; ensure no port collisions.

- [ ] **Step 3: Run full test suite**

Run: `pnpm test 2>&1 | tail -20`
Expected: All package tests pass.

- [ ] **Step 4: Commit any fixes**

```bash
git add tests/ vitest.config.ts
git commit -m "fix: resolve integration test issues"
```

(Skip this commit if no changes were needed.)

---

## Track C: Production Readiness

### Task 10: Create Shared Redis Client Utility

Create a singleton Redis client for the relay package, usable by SIWE nonce store and any future Redis-backed features.

**Files:**
- Create: `packages/relay/src/utils/redis.ts`
- Create: `packages/relay/test/redis.test.ts`

- [ ] **Step 1: Write failing test for Redis client**

```typescript
// packages/relay/test/redis.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ioredis before importing
vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    status: 'ready',
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  }))
  return { default: MockRedis }
})

describe('Redis client', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should export getRedis and closeRedis', async () => {
    const { getRedis, closeRedis } = await import('../src/utils/redis.js')
    expect(typeof getRedis).toBe('function')
    expect(typeof closeRedis).toBe('function')
  })

  it('should return a Redis instance', async () => {
    const { getRedis } = await import('../src/utils/redis.js')
    const redis = getRedis()
    expect(redis).toBeTruthy()
    expect(redis.status).toBe('ready')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/relay && pnpm test -- test/redis.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Redis client**

```typescript
// packages/relay/src/utils/redis.ts
import Redis from 'ioredis'
import { config } from '../config.js'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
      lazyConnect: false,
    })
    redis.on('error', (err) => {
      console.error('[redis] connection error:', err.message)
    })
  }
  return redis
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/relay && pnpm test -- test/redis.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/relay/src/utils/redis.ts packages/relay/test/redis.test.ts
git commit -m "feat(relay): add shared Redis client singleton"
```

---

### Task 11: Migrate SIWE Nonce Store to Redis

Replace the in-memory `nonceStore` Map in `siwe.ts` with Redis SETEX for production-ready nonce storage.

**Files:**
- Modify: `packages/relay/src/utils/siwe.ts`
- Create: `packages/relay/test/siwe-redis.test.ts`

- [ ] **Step 1: Write failing tests for Redis-backed nonce store**

```typescript
// packages/relay/test/siwe-redis.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSetex = vi.fn().mockResolvedValue('OK')
const mockGet = vi.fn().mockResolvedValue(null)
const mockDel = vi.fn().mockResolvedValue(1)

vi.mock('../src/utils/redis.js', () => ({
  getRedis: () => ({
    setex: mockSetex,
    get: mockGet,
    del: mockDel,
  }),
}))

describe('SIWE nonce store (Redis)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('storeNonce stores address with 300s TTL in Redis', async () => {
    const { storeNonce } = await import('../src/utils/siwe.js')
    await storeNonce('test-nonce', '0xAbC123')
    expect(mockSetex).toHaveBeenCalledWith(
      'siwe:nonce:test-nonce',
      300,
      '0xabc123', // lowercased
    )
  })

  it('consumeNonce returns address and deletes key', async () => {
    mockGet.mockResolvedValueOnce('0xabc123')
    const { consumeNonce } = await import('../src/utils/siwe.js')
    const address = await consumeNonce('test-nonce')
    expect(address).toBe('0xabc123')
    expect(mockDel).toHaveBeenCalledWith('siwe:nonce:test-nonce')
  })

  it('consumeNonce returns null for missing nonce', async () => {
    mockGet.mockResolvedValueOnce(null)
    const { consumeNonce } = await import('../src/utils/siwe.js')
    const address = await consumeNonce('missing-nonce')
    expect(address).toBeNull()
    expect(mockDel).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/relay && pnpm test -- test/siwe-redis.test.ts`
Expected: FAIL — `storeNonce` is not async / doesn't use Redis.

- [ ] **Step 3: Migrate siwe.ts nonce functions to Redis**

In `packages/relay/src/utils/siwe.ts`, replace the in-memory nonce store:

**Remove:** The `nonceStore` Map, `NonceEntry` interface, `NONCE_TTL_MS` constant, and the `getNonceStore()` export.

**Add** Redis import at top:
```typescript
import { getRedis } from './redis.js'
```

**Replace `storeNonce`:**
```typescript
const NONCE_PREFIX = 'siwe:nonce:'
const NONCE_TTL_SECONDS = 300 // 5 minutes

/**
 * Store a nonce for a given wallet address with a 5-minute TTL in Redis.
 */
export async function storeNonce(nonce: string, address: string): Promise<void> {
  const redis = getRedis()
  await redis.setex(`${NONCE_PREFIX}${nonce}`, NONCE_TTL_SECONDS, address.toLowerCase())
}
```

**Replace `consumeNonce`:**
```typescript
/**
 * Consume a nonce — returns the associated address if valid, null if expired or missing.
 * Nonces are single-use: consumed on retrieval.
 */
export async function consumeNonce(nonce: string): Promise<string | null> {
  const redis = getRedis()
  const key = `${NONCE_PREFIX}${nonce}`
  const address = await redis.get(key)
  if (!address) return null
  await redis.del(key)
  return address
}
```

**Replace `clearNonceStore`:**
```typescript
/**
 * Clear all nonces (for testing). Uses Redis SCAN to find and delete nonce keys.
 */
export async function clearNonceStore(): Promise<void> {
  const redis = getRedis()
  let cursor = '0'
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${NONCE_PREFIX}*`, 'COUNT', 100)
    cursor = nextCursor
    if (keys.length > 0) await redis.del(...keys)
  } while (cursor !== '0')
}
```

**Remove `getNonceStore`** — no longer needed (was only for tests inspecting the Map).

- [ ] **Step 4: Update validateSiweMessage to be async**

`validateSiweMessage` calls `consumeNonce` which is now async. Update:

```typescript
export async function validateSiweMessage(
  message: string,
  options: ValidateSiweOptions,
): Promise<{ ok: true; params: SiweMessageParams } | { ok: false; error: string }> {
  const params = parseSiweMessage(message)
  if (!params) {
    return { ok: false, error: 'Invalid SIWE message format' }
  }

  if (params.domain !== options.expectedDomain) {
    return { ok: false, error: 'Domain mismatch' }
  }

  if (options.expectedStatement && params.statement !== options.expectedStatement) {
    return { ok: false, error: 'Statement mismatch' }
  }

  const nonceAddress = await consumeNonce(params.nonce)
  if (!nonceAddress) {
    return { ok: false, error: 'Invalid or expired nonce' }
  }

  if (nonceAddress !== params.address.toLowerCase()) {
    return { ok: false, error: 'Nonce address mismatch' }
  }

  return { ok: true, params }
}
```

- [ ] **Step 5: Update callers of storeNonce/consumeNonce/validateSiweMessage to await**

Search for calls to these functions in the auth routes and update them:

Run: `grep -rn "storeNonce\|consumeNonce\|validateSiweMessage\|clearNonceStore\|getNonceStore" packages/relay/src/ packages/relay/test/`

For each call site, add `await` if not already present. The `storeNonce` in auth routes likely needs `await storeNonce(...)`. The `validateSiweMessage` call also needs `await`.

- [ ] **Step 6: Run Redis nonce tests**

Run: `cd packages/relay && pnpm test -- test/siwe-redis.test.ts`
Expected: PASS.

- [ ] **Step 7: Run all relay tests to check for regressions**

Run: `cd packages/relay && pnpm test`
Expected: All pass. If existing SIWE tests fail due to the async change, update them to use `await` and mock `getRedis()`.

- [ ] **Step 8: Commit**

```bash
git add packages/relay/src/utils/siwe.ts packages/relay/src/utils/redis.ts packages/relay/test/siwe-redis.test.ts packages/relay/src/routes/auth.ts packages/relay/test/
git commit -m "feat(relay): migrate SIWE nonce store from in-memory Map to Redis"
```

---

### Task 12: Add Prisma Invite Model + Migrate Org Invites

Add a Prisma `Invite` model to replace the ephemeral in-memory Map in OrgService.

**Files:**
- Modify: `packages/relay/prisma/schema.prisma`
- Modify: `packages/relay/src/services/org.service.ts`
- Modify: `packages/relay/test/services/org.service.test.ts`

- [ ] **Step 1: Add Invite model to Prisma schema**

Append to `packages/relay/prisma/schema.prisma` (before the closing of the file):

```prisma
model Invite {
  id        String   @id @default(uuid())
  orgId     String   @map("org_id")
  email     String
  role      String   @default("member")
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  org Organisation @relation(fields: [orgId], references: [id])

  @@map("invites")
}
```

Also add the `invites` relation to the `Organisation` model:

Find the `Organisation` model and add:
```prisma
  invites    Invite[]
```

- [ ] **Step 2: Generate Prisma client and create migration**

Run:
```bash
cd packages/relay && pnpm db:generate && npx prisma migrate dev --name add_invite_model
```

Expected: Migration created successfully. Prisma client regenerated.

- [ ] **Step 3: Update OrgService to use Prisma for invites**

In `packages/relay/src/services/org.service.ts`, replace the in-memory `_invites` Map with Prisma calls.

**Remove:**
```typescript
private _invites = new Map<string, { orgId: string; email: string; role: string }>()
```

**Replace `createInvite`:**
```typescript
async createInvite(orgId: string, email: string, role: string): Promise<string> {
  const invite = await getPrisma().invite.create({
    data: {
      orgId,
      email,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day expiry
    },
  })
  return invite.id
}
```

**Replace `getInvite`:**
```typescript
async getInvite(inviteId: string): Promise<{ orgId: string; email: string; role: string } | null> {
  const invite = await getPrisma().invite.findUnique({ where: { id: inviteId } })
  if (!invite) return null
  if (new Date() > invite.expiresAt) return null
  return { orgId: invite.orgId, email: invite.email, role: invite.role }
}
```

Note: `getInvite` becomes async. Update callers to `await`.

**Update `clearStores`:**
```typescript
async clearStores(): Promise<void> {
  await getPrisma().invite.deleteMany()
  await getPrisma().user.deleteMany()
  await getPrisma().organisation.deleteMany()
}
```

- [ ] **Step 4: Update callers of getInvite to use await**

Search: `grep -rn "getInvite\|_invites" packages/relay/src/`

Any call to `orgService.getInvite(...)` must now be `await orgService.getInvite(...)`.

- [ ] **Step 5: Update org.service tests**

In `packages/relay/test/services/org.service.test.ts`, update invite tests:
- `getInvite` calls need `await`
- Tests should verify invites persist across service calls (no longer ephemeral)

- [ ] **Step 6: Run all relay tests**

Run: `cd packages/relay && pnpm test`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add packages/relay/prisma/ packages/relay/src/services/org.service.ts packages/relay/test/
git commit -m "feat(relay): add Prisma Invite model, migrate org invites from in-memory Map"
```

---

## Verification

After all tasks complete:

```bash
# Full build (all packages)
pnpm build

# All unit tests
pnpm test

# Integration tests
pnpm test:integration

# Portal Playwright E2E
cd packages/portal && npx playwright test

# Push
git push origin master
```

Expected: All green.

---

## Task Dependencies & Parallelism

```
Track A (Portal):     Task 1 → Task 2 → Task 3, Task 4, Task 5, Task 6 (3-6 parallel after 2)
Track B (Tests):      Task 7 → Task 8, Task 9 (8, 9 parallel)
Track C (Production): Task 10 → Task 11, Task 12 (11, 12 parallel after 10)

All three tracks are fully independent — can run in parallel.
```
