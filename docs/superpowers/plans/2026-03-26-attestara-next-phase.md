# Attestara Next Phase — Full Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Prisma to all relay services (replacing in-memory Maps), deploy to staging, deploy contracts to testnet, and execute the full business/legal/product roadmap through mainnet and framework adapters.

**Architecture:** Three parallel tracks — (1) Engineering: Prisma wiring → staging → testnet → monitoring → mainnet, (2) Business/Legal: DIF + legal counsel + domains/branding from day 1, (3) Product: portal + CLI + SDK polish. The Prisma migration is big-bang (all 8 services in one pass) with production patterns (connection pooling, retry logic, error mapping, transaction boundaries). All tests run against real PostgreSQL via docker-compose.

**Tech Stack:** TypeScript monorepo (pnpm + Turborepo), Fastify 5, Prisma 6 + PostgreSQL 16, Vitest, Hardhat + Solidity 0.8.24, Circom/snarkjs, Next.js 16, Arbitrum L2

**Key Decisions:**
- Prisma wiring: Production-quality (pooling, retries, transactions, error mapping)
- Testing: Real PostgreSQL for ALL tests (docker-compose.test.yml on port 5433)
- Migration strategy: Big-bang — all 8 services in one pass
- Scope: Full roadmap (immediate → long-term, ~8 months)

---

## File Structure

### New Files (Prisma Wiring)

| File | Responsibility |
|------|---------------|
| `packages/relay/src/lib/db-errors.ts` | Prisma error → service error mapping, retry wrapper, transaction helper |
| `packages/relay/src/lib/db-utils.ts` | Date conversion, JSON serialization helpers for Prisma ↔ service types |
| `packages/relay/test/setup.ts` | Global test setup: Prisma migrate, seed, cleanup between tests |
| `packages/relay/test/helpers/db.ts` | Test database helpers: reset tables, create fixtures |

### Modified Files (Prisma Wiring)

| File | Changes |
|------|---------|
| `packages/relay/src/services/org.service.ts` | Replace 6 Maps with Prisma queries (Organisation + User tables) |
| `packages/relay/src/services/agent.service.ts` | Replace 2 Maps with Prisma queries (Agent table) |
| `packages/relay/src/services/credential.service.ts` | Replace 1 Map with Prisma queries (Credential table) |
| `packages/relay/src/services/session.service.ts` | Replace 3 Maps with Prisma queries (Session + Turn tables) |
| `packages/relay/src/services/commitment.service.ts` | Replace 2 Maps with Prisma queries (Commitment table) |
| `packages/relay/src/services/api-key.service.ts` | Replace 2 Maps with Prisma queries (ApiKey table) |
| `packages/relay/src/services/webhook.service.ts` | Replace 2 Maps with Prisma queries (Webhook + WebhookDelivery tables) |
| `packages/relay/src/database.ts` | Add retry wrapper, enhanced connection management |
| `packages/relay/vitest.config.ts` | Add globalSetup pointing to test/setup.ts |
| `packages/relay/package.json` | Add `test:db:up` and `test:db:down` scripts |

### New Files (Testnet & Deployment)

| File | Responsibility |
|------|---------------|
| `packages/contracts/scripts/deploy-mainnet.ts` | Mainnet deployment script (Arbitrum One) |
| `packages/contracts/deployments/` | Deployment address JSON files (gitignored except committed records) |
| `packages/relay/src/services/email.service.ts` | Email delivery via SendGrid/Resend |
| `packages/relay/src/services/billing.service.ts` | Stripe billing integration |
| `infrastructure/docker-compose.staging.yml` | Staging environment compose |

---

## TRACK 1: ENGINEERING

---

### Task 1: Commit Uncommitted Portal Files

**Files:**
- Stage: `packages/portal/app/(auth)/login/page.tsx`, `packages/portal/app/(auth)/register/page.tsx`, `packages/portal/app/(dashboard)/*` (6 files), `packages/portal/lib/api-client.ts`, `packages/portal/lib/hooks.ts`, `packages/portal/test/`, `packages/portal/vitest.config.ts`
- Stage: `packages/relay/src/middleware/auth.ts`, `packages/relay/test/server.test.ts`, `packages/relay/vitest.config.ts`, `packages/relay/src/utils/`
- Stage: `packages/sdk/src/credentials/index.ts`, `packages/sdk/src/snarkjs.d.ts`
- Stage: `packages/prover/src/snarkjs.d.ts`
- Stage: `packages/relay/test/auth-wallet.test.ts`
- Stage: `CLAUDE.md`, `.claude/`

- [ ] **Step 1: Review all uncommitted changes**

```bash
cd /c/claude/attestara
git status
git diff --stat
```

Verify no secrets or `.env` files are staged.

- [ ] **Step 2: Stage and commit portal enhancements**

```bash
git add packages/portal/app packages/portal/lib packages/portal/test packages/portal/vitest.config.ts
git commit -m "feat(portal): add dashboard enhancements, hooks, and vitest config"
```

- [ ] **Step 3: Stage and commit relay changes**

```bash
git add packages/relay/src/middleware/auth.ts packages/relay/test/ packages/relay/vitest.config.ts packages/relay/src/utils/
git commit -m "feat(relay): add wallet auth, vitest config, and utility modules"
```

- [ ] **Step 4: Stage and commit SDK, prover, and project config**

```bash
git add packages/sdk/src/credentials/index.ts packages/sdk/src/snarkjs.d.ts packages/prover/src/snarkjs.d.ts CLAUDE.md .claude/
git commit -m "chore: add snarkjs type declarations, update SDK credentials, add project config"
```

- [ ] **Step 5: Verify clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

---

### Task 2: Fix CLI Test Timeouts

**Files:**
- Modify: `packages/cli/vitest.config.ts`
- Test: `packages/cli/test/**/*.test.ts`

- [ ] **Step 1: Read current CLI vitest config**

```bash
cat packages/cli/vitest.config.ts
```

Current `testTimeout` is 15000 (15s).

- [ ] **Step 2: Increase timeout to 30s**

In `packages/cli/vitest.config.ts`, change `testTimeout: 15000` → `testTimeout: 30000`.

- [ ] **Step 3: Run CLI tests to verify**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/cli test
```

Expected: All tests pass with no timeout failures.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/vitest.config.ts
git commit -m "fix(cli): increase test timeout to 30s to prevent flaky failures"
```

---

### Task 3: Database Error Mapping & Retry Infrastructure

**Files:**
- Create: `packages/relay/src/lib/db-errors.ts`
- Create: `packages/relay/src/lib/db-utils.ts`
- Test: `packages/relay/test/lib/db-errors.test.ts`
- Test: `packages/relay/test/lib/db-utils.test.ts`

This task creates the shared foundation all 8 service migrations depend on.

- [ ] **Step 1: Write failing tests for error mapping**

Create `packages/relay/test/lib/db-errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapPrismaError, withRetry } from '../../src/lib/db-errors.js'
import { Prisma } from '@prisma/client'

describe('mapPrismaError', () => {
  it('maps unique constraint violation to DUPLICATE error', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', meta: { target: ['email'] }, clientVersion: '6.2.0' },
    )
    const result = mapPrismaError(prismaError, 'User')
    expect(result).toEqual({
      error: 'User with this email already exists',
      code: 'DUPLICATE_email',
    })
  })

  it('maps not found to NOT_FOUND error', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      { code: 'P2025', meta: {}, clientVersion: '6.2.0' },
    )
    const result = mapPrismaError(prismaError, 'Agent')
    expect(result).toEqual({
      error: 'Agent not found',
      code: 'AGENT_NOT_FOUND',
    })
  })

  it('maps foreign key violation to REFERENCE_ERROR', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      { code: 'P2003', meta: { field_name: 'orgId' }, clientVersion: '6.2.0' },
    )
    const result = mapPrismaError(prismaError, 'Agent')
    expect(result).toEqual({
      error: 'Referenced orgId does not exist',
      code: 'REFERENCE_ERROR',
    })
  })

  it('rethrows unknown Prisma errors', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unknown',
      { code: 'P9999', meta: {}, clientVersion: '6.2.0' },
    )
    expect(() => mapPrismaError(prismaError, 'Agent')).toThrow()
  })
})

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = async () => 'ok'
    const result = await withRetry(fn)
    expect(result).toBe('ok')
  })

  it('retries on connection error and succeeds', async () => {
    let attempts = 0
    const fn = async () => {
      attempts++
      if (attempts < 2) {
        throw new Prisma.PrismaClientInitializationError(
          'Connection refused',
          '6.2.0',
        )
      }
      return 'recovered'
    }
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 })
    expect(result).toBe('recovered')
    expect(attempts).toBe(2)
  })

  it('throws after max retries exhausted', async () => {
    const fn = async () => {
      throw new Prisma.PrismaClientInitializationError(
        'Connection refused',
        '6.2.0',
      )
    }
    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/lib/db-errors.test.ts
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement db-errors.ts**

Create `packages/relay/src/lib/db-errors.ts`:

```typescript
import { Prisma } from '@prisma/client'

export interface ServiceError {
  error: string
  code: string
}

/**
 * Map Prisma errors to service-layer error objects.
 * Keeps the same { error, code } shape that existing route handlers expect.
 */
export function mapPrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  entityName: string,
): ServiceError {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (err.meta?.target as string[])?.join(', ') ?? 'field'
      return {
        error: `${entityName} with this ${target} already exists`,
        code: `DUPLICATE_${target}`,
      }
    }
    case 'P2025':
      // Record not found
      return {
        error: `${entityName} not found`,
        code: `${entityName.toUpperCase()}_NOT_FOUND`,
      }
    case 'P2003': {
      // Foreign key constraint
      const field = (err.meta?.field_name as string) ?? 'reference'
      return {
        error: `Referenced ${field} does not exist`,
        code: 'REFERENCE_ERROR',
      }
    }
    default:
      throw err
  }
}

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
}

/**
 * Retry a database operation on transient connection errors.
 * Uses exponential backoff. Only retries PrismaClientInitializationError
 * (connection failures), not query errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelayMs = options?.baseDelayMs ?? 100

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (
        err instanceof Prisma.PrismaClientInitializationError &&
        attempt < maxRetries
      ) {
        await new Promise(resolve =>
          setTimeout(resolve, baseDelayMs * 2 ** attempt),
        )
        continue
      }
      throw err
    }
  }
  throw lastError
}

/**
 * Run multiple operations in a Prisma transaction.
 * Re-export for convenience so services don't import prisma directly.
 */
export { Prisma }
```

- [ ] **Step 4: Write and implement db-utils.ts**

Create `packages/relay/src/lib/db-utils.ts`:

```typescript
/**
 * Convert a Prisma DateTime to an ISO string (matching existing service interfaces).
 */
export function toISOString(date: Date): string {
  return date.toISOString()
}

/**
 * Convert an ISO string to a Date for Prisma writes.
 */
export function toDate(iso: string): Date {
  return new Date(iso)
}

/**
 * Safely parse a Prisma Json field to Record<string, unknown>.
 */
export function toRecord(json: unknown): Record<string, unknown> {
  if (json === null || json === undefined) return {}
  if (typeof json === 'object' && !Array.isArray(json)) return json as Record<string, unknown>
  return {}
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/lib/db-errors.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/relay/src/lib/ packages/relay/test/lib/
git commit -m "feat(relay): add Prisma error mapping, retry wrapper, and DB utilities"
```

---

### Task 4: PostgreSQL Test Infrastructure

**Files:**
- Create: `packages/relay/test/setup.ts`
- Create: `packages/relay/test/helpers/db.ts`
- Modify: `packages/relay/vitest.config.ts`
- Modify: `packages/relay/package.json`

- [ ] **Step 1: Write the global test setup**

Create `packages/relay/test/setup.ts`:

```typescript
import { execSync } from 'child_process'

/**
 * Vitest globalSetup — runs once before all test files.
 * Ensures the test database has the latest schema applied.
 *
 * Requires: docker-compose.test.yml running (postgres-test on port 5433)
 * DATABASE_URL is set to the test database.
 */
export async function setup() {
  // Set test DATABASE_URL if not already set
  process.env.DATABASE_URL ??=
    'postgresql://attestara:attestara_test@localhost:5433/attestara_test'
  process.env.NODE_ENV = 'test'

  // Push schema to test database (faster than migrate for tests)
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
    env: { ...process.env },
    stdio: 'pipe',
  })
}

export async function teardown() {
  // Prisma disconnects automatically when process exits
}
```

- [ ] **Step 2: Write test database helpers**

Create `packages/relay/test/helpers/db.ts`:

```typescript
import { prisma } from '../../src/database.js'

/**
 * Truncate all tables between tests for isolation.
 * Respects foreign key order (children first).
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.webhookDelivery.deleteMany(),
    prisma.webhook.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.commitment.deleteMany(),
    prisma.turn.deleteMany(),
    prisma.session.deleteMany(),
    prisma.credential.deleteMany(),
    prisma.agent.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organisation.deleteMany(),
  ])
}

/**
 * Create a standard test org + user for service tests.
 */
export async function createTestOrg(overrides?: { name?: string; plan?: string }) {
  const org = await prisma.organisation.create({
    data: {
      name: overrides?.name ?? 'Test Org',
      slug: 'test-org-' + Math.random().toString(36).slice(2, 8),
      plan: overrides?.plan ?? 'starter',
    },
  })
  return org
}

/**
 * Create a test user within an org.
 */
export async function createTestUser(orgId: string, overrides?: { email?: string; role?: string }) {
  const user = await prisma.user.create({
    data: {
      orgId,
      email: overrides?.email ?? `test-${Math.random().toString(36).slice(2, 8)}@example.com`,
      passwordHash: '$2b$10$fakehashfortesting',
      role: overrides?.role ?? 'admin',
    },
  })
  return user
}

/**
 * Create a test agent within an org.
 */
export async function createTestAgent(orgId: string, overrides?: { did?: string; name?: string }) {
  const agent = await prisma.agent.create({
    data: {
      orgId,
      did: overrides?.did ?? `did:ethr:0x${Math.random().toString(16).slice(2, 42)}`,
      name: overrides?.name ?? 'Test Agent',
      publicKey: '0x' + Math.random().toString(16).slice(2, 66),
    },
  })
  return agent
}

export { prisma }
```

- [ ] **Step 3: Update vitest.config.ts**

In `packages/relay/vitest.config.ts`, add the globalSetup:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 30_000,
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/setup.ts'],
  },
})
```

- [ ] **Step 4: Update package.json with DB test scripts**

In `packages/relay/package.json`, add to `"scripts"`:

```json
"test:db:up": "docker compose -f ../../infrastructure/docker-compose.test.yml up -d",
"test:db:down": "docker compose -f ../../infrastructure/docker-compose.test.yml down",
"pretest": "docker compose -f ../../infrastructure/docker-compose.test.yml up -d --wait"
```

- [ ] **Step 5: Start test database and verify setup**

```bash
cd /c/claude/attestara
docker compose -f infrastructure/docker-compose.test.yml up -d
cd packages/relay && npx prisma db push --force-reset
```

Expected: Schema pushed to `attestara_test` database on port 5433.

- [ ] **Step 6: Write a smoke test to verify DB connectivity**

Create `packages/relay/test/helpers/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDatabase, createTestOrg, createTestUser, createTestAgent, prisma } from './db.js'

describe('test database helpers', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('connects to test database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as ok`
    expect(result).toEqual([{ ok: 1 }])
  })

  it('creates org, user, and agent', async () => {
    const org = await createTestOrg({ name: 'Acme Corp' })
    expect(org.name).toBe('Acme Corp')
    expect(org.slug).toMatch(/^acme-corp-/)

    const user = await createTestUser(org.id)
    expect(user.orgId).toBe(org.id)

    const agent = await createTestAgent(org.id)
    expect(agent.orgId).toBe(org.id)
    expect(agent.did).toMatch(/^did:ethr:0x/)
  })

  it('resetDatabase clears all tables', async () => {
    const org = await createTestOrg()
    await createTestUser(org.id)
    await resetDatabase()

    const count = await prisma.organisation.count()
    expect(count).toBe(0)
  })
})
```

- [ ] **Step 7: Run the smoke test**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/helpers/db.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/relay/test/setup.ts packages/relay/test/helpers/ packages/relay/vitest.config.ts packages/relay/package.json
git commit -m "feat(relay): add PostgreSQL test infrastructure with global setup and fixtures"
```

---

### Task 5: Migrate OrgService to Prisma

**Files:**
- Modify: `packages/relay/src/services/org.service.ts`
- Test: `packages/relay/test/services/org.service.test.ts`

OrgService is the most complex (6 Maps → Organisation + User tables). It must be done first because other services reference orgs.

- [ ] **Step 1: Write failing tests for Prisma-backed OrgService**

Create `packages/relay/test/services/org.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { orgService } from '../../src/services/org.service.js'
import { resetDatabase } from '../helpers/db.js'

describe('OrgService (Prisma)', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  describe('createOrg', () => {
    it('creates an organisation with slug', async () => {
      const org = await orgService.createOrg('Acme Corp')
      expect(org.name).toBe('Acme Corp')
      expect(org.slug).toMatch(/^acme-corp-/)
      expect(org.plan).toBe('starter')
      expect(org.id).toBeDefined()
    })

    it('creates org with custom plan', async () => {
      const org = await orgService.createOrg('BigCo', 'enterprise')
      expect(org.plan).toBe('enterprise')
    })
  })

  describe('getOrg', () => {
    it('returns org by id', async () => {
      const created = await orgService.createOrg('Test')
      const found = await orgService.getOrg(created.id)
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Test')
    })

    it('returns null for missing org', async () => {
      const found = await orgService.getOrg('nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('updateOrg', () => {
    it('updates name', async () => {
      const org = await orgService.createOrg('Old Name')
      const updated = await orgService.updateOrg(org.id, { name: 'New Name' })
      expect(updated!.name).toBe('New Name')
    })

    it('returns null for missing org', async () => {
      const result = await orgService.updateOrg('nonexistent', { name: 'X' })
      expect(result).toBeNull()
    })
  })

  describe('createUser', () => {
    it('creates a user in an org', async () => {
      const org = await orgService.createOrg('Test')
      const user = await orgService.createUser(org.id, {
        email: 'alice@example.com',
        passwordHash: '$2b$10$hash',
        walletAddress: null,
        role: 'admin',
      })
      expect(user.email).toBe('alice@example.com')
      expect(user.orgId).toBe(org.id)
    })
  })

  describe('getUserByEmail', () => {
    it('finds user by email', async () => {
      const org = await orgService.createOrg('Test')
      await orgService.createUser(org.id, {
        email: 'bob@example.com',
        passwordHash: '$2b$10$hash',
        walletAddress: null,
        role: 'member',
      })
      const found = await orgService.getUserByEmail('bob@example.com')
      expect(found).not.toBeNull()
      expect(found!.email).toBe('bob@example.com')
    })

    it('returns null for unknown email', async () => {
      const found = await orgService.getUserByEmail('nobody@example.com')
      expect(found).toBeNull()
    })
  })

  describe('getUserByWallet', () => {
    it('finds user by wallet address', async () => {
      const org = await orgService.createOrg('Test')
      await orgService.createUser(org.id, {
        email: 'charlie@example.com',
        passwordHash: '$2b$10$hash',
        walletAddress: '0xabc123',
        role: 'member',
      })
      const found = await orgService.getUserByWallet('0xabc123')
      expect(found).not.toBeNull()
    })

    it('returns null for unknown wallet', async () => {
      const found = await orgService.getUserByWallet('0xnonexistent')
      expect(found).toBeNull()
    })
  })

  describe('hasEmail', () => {
    it('returns true for existing email', async () => {
      const org = await orgService.createOrg('Test')
      await orgService.createUser(org.id, {
        email: 'exists@example.com',
        passwordHash: '$2b$10$hash',
        walletAddress: null,
        role: 'member',
      })
      expect(await orgService.hasEmail('exists@example.com')).toBe(true)
    })

    it('returns false for unknown email', async () => {
      expect(await orgService.hasEmail('nope@example.com')).toBe(false)
    })
  })

  describe('listMembers', () => {
    it('lists user IDs in org', async () => {
      const org = await orgService.createOrg('Test')
      const u1 = await orgService.createUser(org.id, {
        email: 'a@example.com',
        passwordHash: '$2b$10$hash',
        walletAddress: null,
        role: 'member',
      })
      const u2 = await orgService.createUser(org.id, {
        email: 'b@example.com',
        passwordHash: '$2b$10$hash',
        walletAddress: null,
        role: 'member',
      })
      const members = await orgService.listMembers(org.id)
      expect(members).toContain(u1.id)
      expect(members).toContain(u2.id)
    })
  })

  describe('invites', () => {
    it('creates and retrieves invite', async () => {
      const org = await orgService.createOrg('Test')
      const inviteId = orgService.createInvite(org.id, 'invite@example.com', 'member')
      const invite = orgService.getInvite(inviteId)
      expect(invite).toEqual({ orgId: org.id, email: 'invite@example.com', role: 'member' })
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/org.service.test.ts
```

Expected: FAIL — methods are synchronous but tests call them with `await`.

- [ ] **Step 3: Rewrite OrgService with Prisma**

Replace `packages/relay/src/services/org.service.ts` with:

```typescript
import { randomUUID } from 'crypto'
import { prisma } from '../database.js'
import { mapPrismaError } from '../lib/db-errors.js'
import { toRecord } from '../lib/db-utils.js'

export interface StoredUser {
  id: string
  orgId: string
  email: string
  passwordHash: string
  walletAddress: string | null
  role: string
  emailVerified: boolean
}

export interface StoredOrg {
  id: string
  name: string
  slug: string
  plan: string
}

export interface CreateUserData {
  email: string
  passwordHash: string
  walletAddress: string | null
  role: string
}

export class OrgService {
  // Invites remain in-memory — they are short-lived tokens, not persisted data.
  // A future migration can add an Invite model if needed.
  private invites = new Map<string, { orgId: string; email: string; role: string }>()

  slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async createOrg(name: string, plan = 'starter'): Promise<StoredOrg> {
    const slug = this.slugify(name) + '-' + randomUUID().slice(0, 6)
    const org = await prisma.organisation.create({
      data: { name, slug, plan },
    })
    return { id: org.id, name: org.name, slug: org.slug, plan: org.plan }
  }

  async getOrg(id: string): Promise<StoredOrg | null> {
    const org = await prisma.organisation.findUnique({ where: { id } })
    if (!org) return null
    return { id: org.id, name: org.name, slug: org.slug, plan: org.plan }
  }

  async updateOrg(id: string, updates: Partial<Pick<StoredOrg, 'name' | 'plan'>>): Promise<StoredOrg | null> {
    try {
      const org = await prisma.organisation.update({
        where: { id },
        data: updates,
      })
      return { id: org.id, name: org.name, slug: org.slug, plan: org.plan }
    } catch (err: any) {
      if (err.code === 'P2025') return null
      throw err
    }
  }

  async createUser(orgId: string, data: CreateUserData): Promise<StoredUser> {
    const user = await prisma.user.create({
      data: {
        orgId,
        email: data.email,
        passwordHash: data.passwordHash,
        walletAddress: data.walletAddress,
        role: data.role,
      },
    })
    return {
      id: user.id,
      orgId: user.orgId,
      email: user.email,
      passwordHash: user.passwordHash,
      walletAddress: user.walletAddress,
      role: user.role,
      emailVerified: user.emailVerified,
    }
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null
    return this._mapUser(user)
  }

  async getUserByWallet(address: string): Promise<StoredUser | null> {
    const user = await prisma.user.findUnique({ where: { walletAddress: address } })
    if (!user) return null
    return this._mapUser(user)
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return null
    return this._mapUser(user)
  }

  async hasEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } })
    return count > 0
  }

  async listMembers(orgId: string): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: { orgId },
      select: { id: true },
    })
    return users.map(u => u.id)
  }

  async addMember(orgId: string, userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { orgId },
    })
  }

  // Invites stay in-memory (short-lived, no persistence needed)
  createInvite(orgId: string, email: string, role: string): string {
    const inviteId = randomUUID()
    this.invites.set(inviteId, { orgId, email, role })
    return inviteId
  }

  getInvite(inviteId: string): { orgId: string; email: string; role: string } | null {
    return this.invites.get(inviteId) ?? null
  }

  clearStores(): void {
    this.invites.clear()
    // DB cleanup is handled by test helpers (resetDatabase)
  }

  private _mapUser(user: any): StoredUser {
    return {
      id: user.id,
      orgId: user.orgId,
      email: user.email,
      passwordHash: user.passwordHash,
      walletAddress: user.walletAddress,
      role: user.role,
      emailVerified: user.emailVerified,
    }
  }
}

/** Singleton instance shared across routes */
export const orgService = new OrgService()
```

- [ ] **Step 4: Run OrgService tests**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/org.service.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/relay/src/services/org.service.ts packages/relay/test/services/org.service.test.ts
git commit -m "feat(relay): migrate OrgService from in-memory Maps to Prisma PostgreSQL"
```

---

### Task 6: Migrate AgentService to Prisma

**Files:**
- Modify: `packages/relay/src/services/agent.service.ts`
- Test: `packages/relay/test/services/agent.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/relay/test/services/agent.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { agentService } from '../../src/services/agent.service.js'
import { resetDatabase, createTestOrg } from '../helpers/db.js'

describe('AgentService (Prisma)', () => {
  let orgId: string

  beforeEach(async () => {
    await resetDatabase()
    const org = await createTestOrg()
    orgId = org.id
  })

  it('creates an agent', async () => {
    const result = await agentService.create(orgId, {
      did: 'did:ethr:0xabc',
      name: 'Agent A',
      publicKey: '0xpub123',
    })
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.name).toBe('Agent A')
      expect(result.did).toBe('did:ethr:0xabc')
      expect(result.status).toBe('active')
    }
  })

  it('rejects duplicate DID', async () => {
    await agentService.create(orgId, { did: 'did:ethr:0xdup', name: 'A1', publicKey: '0x1' })
    const result = await agentService.create(orgId, { did: 'did:ethr:0xdup', name: 'A2', publicKey: '0x2' })
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.code).toBe('DID_ALREADY_REGISTERED')
    }
  })

  it('lists agents by org', async () => {
    await agentService.create(orgId, { did: 'did:ethr:0x1', name: 'A1', publicKey: '0x1' })
    await agentService.create(orgId, { did: 'did:ethr:0x2', name: 'A2', publicKey: '0x2' })
    const list = await agentService.listByOrg(orgId)
    expect(list).toHaveLength(2)
  })

  it('gets agent by ID with org check', async () => {
    const created = await agentService.create(orgId, { did: 'did:ethr:0x3', name: 'A3', publicKey: '0x3' })
    if ('error' in created) throw new Error('unexpected')
    const found = await agentService.getById(created.id, orgId)
    expect(found).not.toBeNull()
    expect(found!.name).toBe('A3')

    // Wrong org returns null
    const notFound = await agentService.getById(created.id, 'wrong-org')
    expect(notFound).toBeNull()
  })

  it('updates agent', async () => {
    const created = await agentService.create(orgId, { did: 'did:ethr:0x4', name: 'Old', publicKey: '0x4' })
    if ('error' in created) throw new Error('unexpected')
    const updated = await agentService.update(created.id, orgId, { name: 'New' })
    expect(updated!.name).toBe('New')
  })

  it('deactivates agent', async () => {
    const created = await agentService.create(orgId, { did: 'did:ethr:0x5', name: 'Active', publicKey: '0x5' })
    if ('error' in created) throw new Error('unexpected')
    const deactivated = await agentService.deactivate(created.id, orgId)
    expect(deactivated!.status).toBe('deactivated')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/agent.service.test.ts
```

- [ ] **Step 3: Rewrite AgentService with Prisma**

Replace `packages/relay/src/services/agent.service.ts`:

```typescript
import { prisma } from '../database.js'
import { toRecord } from '../lib/db-utils.js'

export interface StoredAgent {
  id: string
  orgId: string
  did: string
  name: string
  status: string
  metadata: Record<string, unknown>
  publicKey: string
  registeredTxHash: string | null
  createdAt: string
}

export interface CreateAgentData {
  did: string
  name: string
  publicKey: string
  metadata?: Record<string, unknown>
}

export interface UpdateAgentData {
  name?: string
  metadata?: Record<string, unknown>
  status?: string
}

export class AgentService {
  async create(orgId: string, data: CreateAgentData): Promise<StoredAgent | { error: string; code: string }> {
    // Check DID uniqueness
    const existing = await prisma.agent.findUnique({ where: { did: data.did } })
    if (existing) {
      return { error: 'DID is already registered', code: 'DID_ALREADY_REGISTERED' }
    }

    const agent = await prisma.agent.create({
      data: {
        orgId,
        did: data.did,
        name: data.name,
        publicKey: data.publicKey,
        metadata: (data.metadata ?? {}) as any,
      },
    })
    return this._map(agent)
  }

  async listByOrg(orgId: string): Promise<StoredAgent[]> {
    const agents = await prisma.agent.findMany({ where: { orgId } })
    return agents.map(a => this._map(a))
  }

  async getById(agentId: string, orgId: string): Promise<StoredAgent | null> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent || agent.orgId !== orgId) return null
    return this._map(agent)
  }

  async update(agentId: string, orgId: string, updates: UpdateAgentData): Promise<StoredAgent | null> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent || agent.orgId !== orgId) return null

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.metadata !== undefined && { metadata: updates.metadata as any }),
        ...(updates.status !== undefined && { status: updates.status }),
      },
    })
    return this._map(updated)
  }

  async deactivate(agentId: string, orgId: string): Promise<StoredAgent | null> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent || agent.orgId !== orgId) return null

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'deactivated' },
    })
    return this._map(updated)
  }

  clearStores(): void {
    // DB cleanup handled by test helpers
  }

  private _map(agent: any): StoredAgent {
    return {
      id: agent.id,
      orgId: agent.orgId,
      did: agent.did,
      name: agent.name,
      status: agent.status,
      metadata: toRecord(agent.metadata),
      publicKey: agent.publicKey,
      registeredTxHash: agent.registeredTxHash,
      createdAt: agent.createdAt instanceof Date ? agent.createdAt.toISOString() : agent.createdAt,
    }
  }
}

/** Singleton instance shared across routes */
export const agentService = new AgentService()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/agent.service.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/relay/src/services/agent.service.ts packages/relay/test/services/agent.service.test.ts
git commit -m "feat(relay): migrate AgentService from in-memory Maps to Prisma PostgreSQL"
```

---

### Task 7: Migrate CredentialService, CommitmentService, ApiKeyService to Prisma

**Files:**
- Modify: `packages/relay/src/services/credential.service.ts`
- Modify: `packages/relay/src/services/commitment.service.ts`
- Modify: `packages/relay/src/services/api-key.service.ts`
- Test: `packages/relay/test/services/credential.service.test.ts`
- Test: `packages/relay/test/services/commitment.service.test.ts`
- Test: `packages/relay/test/services/api-key.service.test.ts`

These three services follow the same simple pattern: 1-2 Maps → single Prisma table. Batch them together.

- [ ] **Step 1: Write failing tests for all three services**

Create `packages/relay/test/services/credential.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { credentialService } from '../../src/services/credential.service.js'
import { resetDatabase, createTestOrg, createTestAgent } from '../helpers/db.js'

describe('CredentialService (Prisma)', () => {
  let orgId: string
  let agentId: string

  beforeEach(async () => {
    await resetDatabase()
    const org = await createTestOrg()
    orgId = org.id
    const agent = await createTestAgent(orgId)
    agentId = agent.id
  })

  it('creates a credential', async () => {
    const result = await credentialService.create(orgId, {
      agentId,
      credentialHash: 'hash-1',
      schemaHash: 'schema-1',
      expiry: new Date(Date.now() + 86400000).toISOString(),
    })
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.credentialHash).toBe('hash-1')
      expect(result.revoked).toBe(false)
    }
  })

  it('rejects duplicate credential hash', async () => {
    await credentialService.create(orgId, {
      agentId, credentialHash: 'dup-hash', schemaHash: 's1',
      expiry: new Date(Date.now() + 86400000).toISOString(),
    })
    const result = await credentialService.create(orgId, {
      agentId, credentialHash: 'dup-hash', schemaHash: 's2',
      expiry: new Date(Date.now() + 86400000).toISOString(),
    })
    expect('error' in result).toBe(true)
  })

  it('lists by org and revokes', async () => {
    const cred = await credentialService.create(orgId, {
      agentId, credentialHash: 'h1', schemaHash: 's1',
      expiry: new Date(Date.now() + 86400000).toISOString(),
    })
    if ('error' in cred) throw new Error('unexpected')

    const list = await credentialService.listByOrg(orgId)
    expect(list).toHaveLength(1)

    const revoked = await credentialService.revoke(cred.id, orgId)
    expect(revoked!.revoked).toBe(true)
  })
})
```

Create `packages/relay/test/services/commitment.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { commitmentService } from '../../src/services/commitment.service.js'
import { resetDatabase, createTestOrg, createTestAgent, prisma } from '../helpers/db.js'

describe('CommitmentService (Prisma)', () => {
  let sessionId: string

  beforeEach(async () => {
    await resetDatabase()
    const org1 = await createTestOrg({ name: 'Org1' })
    const org2 = await createTestOrg({ name: 'Org2' })
    const agent1 = await createTestAgent(org1.id)
    const agent2 = await createTestAgent(org2.id)
    // Create a session directly in DB for commitment tests
    const session = await prisma.session.create({
      data: {
        initiatorAgentId: agent1.id,
        initiatorOrgId: org1.id,
        counterpartyAgentId: agent2.id,
        counterpartyOrgId: org2.id,
        sessionType: 'cross_org',
        status: 'active',
      },
    })
    sessionId = session.id
  })

  it('creates a commitment', async () => {
    const result = await commitmentService.create({
      sessionId,
      agreementHash: 'agreement-1',
      parties: ['agent-a', 'agent-b'],
      credentialHashes: ['cred-1'],
      proofs: { pi_a: [1, 2] },
      circuitVersions: ['v1'],
    })
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.verified).toBe(false)
      expect(result.txHash).toBeNull()
    }
  })

  it('rejects duplicate session commitment', async () => {
    await commitmentService.create({
      sessionId,
      agreementHash: 'a1', parties: ['a'], credentialHashes: [], proofs: {}, circuitVersions: [],
    })
    const dup = await commitmentService.create({
      sessionId,
      agreementHash: 'a2', parties: ['b'], credentialHashes: [], proofs: {}, circuitVersions: [],
    })
    expect('error' in dup).toBe(true)
  })

  it('verifies and updates on-chain status', async () => {
    const created = await commitmentService.create({
      sessionId,
      agreementHash: 'a1', parties: ['a'], credentialHashes: [], proofs: {}, circuitVersions: [],
    })
    if ('error' in created) throw new Error('unexpected')

    const verified = await commitmentService.verify(created.id)
    expect(verified!.verified).toBe(true)

    const onChain = await commitmentService.updateOnChainStatus(created.id, '0xtxhash', 12345)
    expect(onChain!.txHash).toBe('0xtxhash')
    expect(onChain!.blockNumber).toBe(12345)
  })
})
```

Create `packages/relay/test/services/api-key.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { apiKeyService } from '../../src/services/api-key.service.js'
import { resetDatabase, createTestOrg } from '../helpers/db.js'

describe('ApiKeyService (Prisma)', () => {
  let orgId: string

  beforeEach(async () => {
    await resetDatabase()
    const org = await createTestOrg()
    orgId = org.id
  })

  it('creates an API key and returns raw key', async () => {
    const { apiKey, rawKey } = await apiKeyService.create(orgId, 'Test Key', ['read'])
    expect(apiKey.name).toBe('Test Key')
    expect(apiKey.scopes).toEqual(['read'])
    expect(rawKey).toBeDefined()
    expect(rawKey.length).toBeGreaterThan(0)
  })

  it('lists keys by org', async () => {
    await apiKeyService.create(orgId, 'K1', ['read'])
    await apiKeyService.create(orgId, 'K2', ['write'])
    const list = await apiKeyService.listByOrg(orgId)
    expect(list).toHaveLength(2)
  })

  it('revokes a key', async () => {
    const { apiKey } = await apiKeyService.create(orgId, 'ToRevoke', ['read'])
    const result = await apiKeyService.revoke(apiKey.id, orgId)
    expect(result).toBe(true)
    const list = await apiKeyService.listByOrg(orgId)
    expect(list).toHaveLength(0)
  })

  it('validates by hash with expiry check', async () => {
    const { apiKey } = await apiKeyService.create(orgId, 'Valid', ['read'])
    const found = await apiKeyService.validateByHash(apiKey.keyHash)
    expect(found).not.toBeNull()
    expect(found!.lastUsedAt).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/credential.service.test.ts test/services/commitment.service.test.ts test/services/api-key.service.test.ts
```

- [ ] **Step 3: Rewrite CredentialService with Prisma**

Replace `packages/relay/src/services/credential.service.ts` — same pattern as AgentService: replace Map operations with `prisma.credential.*` calls, keep the same `StoredCredential` interface, make all methods `async`, use `prisma.credential.findUnique({ where: { credentialHash } })` for the duplicate check instead of iterating.

- [ ] **Step 4: Rewrite CommitmentService with Prisma**

Replace `packages/relay/src/services/commitment.service.ts` — use `prisma.commitment.findUnique({ where: { sessionId } })` for duplicate check (the `sessionId @unique` constraint). The `listByOrg` method uses a join: `prisma.commitment.findMany({ where: { session: { OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }] } }, include: { session: true } })`.

- [ ] **Step 5: Rewrite ApiKeyService with Prisma**

Replace `packages/relay/src/services/api-key.service.ts` — the `validateByHash` method uses `prisma.apiKey.findUnique({ where: { keyHash } })` instead of iterating. For revoke, use `prisma.apiKey.delete({ where: { id, orgId } })`.

- [ ] **Step 6: Run all three test files**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/credential.service.test.ts test/services/commitment.service.test.ts test/services/api-key.service.test.ts
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/relay/src/services/credential.service.ts packages/relay/src/services/commitment.service.ts packages/relay/src/services/api-key.service.ts packages/relay/test/services/
git commit -m "feat(relay): migrate CredentialService, CommitmentService, ApiKeyService to Prisma"
```

---

### Task 8: Migrate SessionService to Prisma

**Files:**
- Modify: `packages/relay/src/services/session.service.ts`
- Test: `packages/relay/test/services/session.service.test.ts`

SessionService is the second most complex: 3 Maps, invite token hashing, turn management, term redaction. The turn creation must use a transaction (create turn + update session.turnCount atomically).

- [ ] **Step 1: Write failing tests**

Create `packages/relay/test/services/session.service.test.ts` covering:
- `createSession` (intra-org → active, cross-org → pending_acceptance with invite token)
- `getSession`, `getSessionWithOrgCheck`
- `listByOrg` (finds sessions where org is initiator OR counterparty)
- `acceptSession` (hash matching, status transition)
- `generateInviteToken` (cross-org only validation)
- `appendTurn` (auto-increment, agent party validation, session.turnCount update)
- `getTurns` (term redaction for cross-org sessions)

Use `createTestOrg` and `createTestAgent` from helpers.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/session.service.test.ts
```

- [ ] **Step 3: Rewrite SessionService with Prisma**

Key implementation details:
- `createSession`: Use `prisma.session.create()`. For cross-org, generate token, hash with SHA256, store in `inviteTokenHash`.
- `acceptSession`: `prisma.session.findUnique()`, compare SHA256 hash, `prisma.session.update({ status: 'active' })`.
- `appendTurn`: Use `prisma.$transaction()`:
  ```typescript
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } })
    // validate...
    const turn = await tx.turn.create({
      data: { sessionId, agentId, sequenceNumber: session.turnCount + 1, ... }
    })
    await tx.session.update({
      where: { id: sessionId },
      data: { turnCount: { increment: 1 } }
    })
    return this._mapTurn(turn)
  })
  ```
- `getTurns`: Query with `prisma.turn.findMany({ where: { sessionId }, orderBy: { sequenceNumber: 'asc' } })`, then apply redaction logic.
- `listByOrg`: Use `prisma.session.findMany({ where: { OR: [{ initiatorOrgId: orgId }, { counterpartyOrgId: orgId }] } })`.

- [ ] **Step 4: Run tests**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/session.service.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/relay/src/services/session.service.ts packages/relay/test/services/session.service.test.ts
git commit -m "feat(relay): migrate SessionService to Prisma with transactional turn creation"
```

---

### Task 9: Migrate WebhookService to Prisma

**Files:**
- Modify: `packages/relay/src/services/webhook.service.ts`
- Test: `packages/relay/test/services/webhook.service.test.ts`

WebhookService has a special concern: the `rawSecretEncrypted` field exists in the in-memory `StoredWebhook` but the Prisma `Webhook` model only stores `secretHash`. The encrypted raw secret must be stored somewhere for `signPayload` to work. Options: (a) add a column to Prisma schema, (b) use an in-memory cache for decrypted secrets. The plan uses option (a) — add `rawSecretEncrypted` to the Prisma schema via a new migration.

- [ ] **Step 1: Add rawSecretEncrypted column to Prisma schema**

In `packages/relay/prisma/schema.prisma`, add to the `Webhook` model:

```prisma
rawSecretEncrypted String @map("raw_secret_encrypted")
```

Then run:

```bash
cd /c/claude/attestara/packages/relay
npx prisma migrate dev --name add_webhook_raw_secret
```

- [ ] **Step 2: Write failing tests**

Create `packages/relay/test/services/webhook.service.test.ts` covering:
- `register` (creates webhook, returns secret, view omits secrets)
- `listByOrg` (returns views without secrets)
- `deactivate` (sets active=false)
- `deliver` (creates delivery record)
- `getDeliveryHistory` (returns deliveries for webhook with org check)
- `signPayload` (HMAC-SHA256 using decrypted secret)

- [ ] **Step 3: Rewrite WebhookService with Prisma**

Keep the XOR encryption/decryption functions (they're used for at-rest encryption of the raw secret). Store `rawSecretEncrypted` in the DB column. The `signPayload` method decrypts from DB.

Deliveries use `prisma.webhookDelivery.create()` and `prisma.webhookDelivery.findMany({ where: { webhookId } })`.

- [ ] **Step 4: Run tests**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/services/webhook.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/relay/prisma/ packages/relay/src/services/webhook.service.ts packages/relay/test/services/webhook.service.test.ts
git commit -m "feat(relay): migrate WebhookService to Prisma, add rawSecretEncrypted column"
```

---

### Task 10: Update Route Handlers for Async Services

**Files:**
- Modify: All route files in `packages/relay/src/routes/` that call service methods
- Test: Existing route tests in `packages/relay/test/`

All service methods are now async. Route handlers must `await` them. This is mostly mechanical — add `await` before every `orgService.createOrg(...)`, `agentService.create(...)`, etc.

- [ ] **Step 1: Find all route files that import services**

```bash
cd /c/claude/attestara && grep -rl "Service\|service\." packages/relay/src/routes/ --include='*.ts'
```

- [ ] **Step 2: Add `await` to all service method calls in route handlers**

For each route file, ensure:
- The route handler function is `async` (most already are for Fastify)
- All service method calls are awaited: `const org = await orgService.createOrg(...)`
- Error checking still works: `if ('error' in result)` pattern unchanged

- [ ] **Step 3: Run the full relay test suite**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay test
```

Expected: All ~404 relay tests + new service tests PASS.

- [ ] **Step 4: Run integration and E2E tests**

```bash
cd /c/claude/attestara && pnpm test:integration
cd /c/claude/attestara && pnpm test:e2e
```

Expected: All passing. If failures, fix the affected tests (likely need `await` additions).

- [ ] **Step 5: Commit**

```bash
git add packages/relay/src/routes/
git commit -m "feat(relay): update all route handlers for async Prisma-backed services"
```

---

### Task 11: Full Test Suite Validation & Cleanup

**Files:**
- Modify: Various test files as needed
- Modify: `packages/relay/src/server.ts` (add graceful shutdown)

- [ ] **Step 1: Add Prisma disconnect to server shutdown**

In `packages/relay/src/server.ts`, import `disconnectDatabase` and add:

```typescript
app.addHook('onClose', async () => {
  await disconnectDatabase()
})
```

- [ ] **Step 2: Run entire monorepo test suite**

```bash
cd /c/claude/attestara && pnpm test
```

Expected: All ~900+ tests PASS across all packages.

- [ ] **Step 3: Run security tests**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay exec vitest run test/security/
```

Expected: All 104 security tests PASS.

- [ ] **Step 4: Build all packages**

```bash
cd /c/claude/attestara && pnpm build
```

Expected: 7/7 packages build clean.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(relay): post-migration test fixes and graceful shutdown"
```

---

### Task 12: Deploy to Render Staging

**Files:**
- Modify: `infrastructure/render.yaml` (if needed)
- Reference: `.env.example`

- [ ] **Step 1: Verify render.yaml has correct DATABASE_URL binding**

Check that `attestara-relay` service references `attestara-db` for `DATABASE_URL`.

- [ ] **Step 2: Push to master**

```bash
cd /c/claude/attestara && git push origin master
```

Render auto-deploys from master.

- [ ] **Step 3: Verify deployment health**

```bash
curl https://attestara-relay.onrender.com/v1/health
```

Expected: `{"status":"ok","database":"connected"}`

- [ ] **Step 4: Run Prisma migrations on staging**

Render's Dockerfile should run `npx prisma migrate deploy` on startup. Verify logs show successful migration.

- [ ] **Step 5: Smoke test staging API**

```bash
# Register an org
curl -X POST https://attestara-relay.onrender.com/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"orgName":"Test","email":"test@example.com","password":"testpass123!"}'
```

Verify: 201 response with org and token.

---

### Task 13: Testnet Contract Deployment (Arbitrum Sepolia)

**Files:**
- Reference: `packages/contracts/scripts/deploy-testnet.ts`
- Reference: `packages/contracts/hardhat.config.ts`
- Create: `packages/contracts/deployments/arbitrum-sepolia.json` (generated)

- [ ] **Step 1: Fund deployer wallet on Arbitrum Sepolia**

Get Sepolia ETH from a faucet. Bridge to Arbitrum Sepolia via the Arbitrum bridge.

- [ ] **Step 2: Set environment variables**

```bash
export DEPLOYER_PRIVATE_KEY="0x..."
export ARBITRUM_SEPOLIA_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
```

- [ ] **Step 3: Compile contracts**

```bash
cd /c/claude/attestara/packages/contracts && npx hardhat compile
```

Expected: 4 contracts compiled.

- [ ] **Step 4: Deploy to testnet**

```bash
npx hardhat run scripts/deploy-testnet.ts --network arbitrum-sepolia
```

Expected: Deployment addresses output + saved to `deployments/arbitrum-sepolia.json`.

- [ ] **Step 5: Verify contracts on Arbiscan**

```bash
npx hardhat verify --network arbitrum-sepolia <AgentRegistryAddress>
npx hardhat verify --network arbitrum-sepolia <CredentialRegistryAddress>
npx hardhat verify --network arbitrum-sepolia <VerifierRegistryAddress>
npx hardhat verify --network arbitrum-sepolia <CommitmentContractAddress> <AgentRegistryAddress> <VerifierRegistryAddress>
```

- [ ] **Step 6: Commit deployment record**

```bash
git add packages/contracts/deployments/
git commit -m "deploy(contracts): Arbitrum Sepolia testnet deployment"
```

---

### Task 14: Dev Trusted Setup Ceremony (4 Circuits)

**Files:**
- Reference: `packages/contracts/circuits/` (4 Circom circuits)
- Create: `packages/contracts/ceremony/` (ceremony artifacts)

- [ ] **Step 1: Compile circuits to R1CS**

```bash
cd /c/claude/attestara/packages/contracts
circom circuits/MandateBound.circom --r1cs --wasm --sym -o build/
circom circuits/ParameterRange.circom --r1cs --wasm --sym -o build/
circom circuits/CredentialFreshness.circom --r1cs --wasm --sym -o build/
circom circuits/IdentityBinding.circom --r1cs --wasm --sym -o build/
```

- [ ] **Step 2: Run Powers of Tau Phase 1**

```bash
snarkjs powersoftau new bn128 14 ceremony/pot14_0000.ptau
snarkjs powersoftau contribute ceremony/pot14_0000.ptau ceremony/pot14_0001.ptau --name="dev-contribution-1"
snarkjs powersoftau prepare phase2 ceremony/pot14_0001.ptau ceremony/pot14_final.ptau
```

- [ ] **Step 3: Run Phase 2 for each circuit**

For each of the 4 circuits:
```bash
snarkjs groth16 setup build/MandateBound.r1cs ceremony/pot14_final.ptau ceremony/MandateBound_0000.zkey
snarkjs zkey contribute ceremony/MandateBound_0000.zkey ceremony/MandateBound_final.zkey --name="dev-contributor"
snarkjs zkey export verificationkey ceremony/MandateBound_final.zkey ceremony/MandateBound_vkey.json
```

Repeat for ParameterRange, CredentialFreshness, IdentityBinding.

- [ ] **Step 4: Deploy Groth16 verifier contracts**

```bash
snarkjs zkey export solidityverifier ceremony/MandateBound_final.zkey contracts/verifiers/MandateBoundVerifier.sol
# ... repeat for each circuit
npx hardhat run scripts/deploy-verifiers.ts --network arbitrum-sepolia
```

- [ ] **Step 5: Register verifiers in VerifierRegistry**

Call `VerifierRegistry.registerVerifier(circuitName, version, verifierAddress)` for each circuit.

- [ ] **Step 6: Commit ceremony artifacts**

```bash
git add packages/contracts/ceremony/ packages/contracts/contracts/verifiers/
git commit -m "feat(contracts): dev trusted setup ceremony for 4 circuits"
```

---

### Task 15: Production Monitoring (Sentry + Structured Logging)

**Files:**
- Modify: `packages/relay/package.json` (add `@sentry/node`)
- Create: `packages/relay/src/lib/sentry.ts`
- Modify: `packages/relay/src/server.ts` (add Sentry plugin)

- [ ] **Step 1: Install Sentry**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay add @sentry/node
```

- [ ] **Step 2: Create Sentry initialization module**

Create `packages/relay/src/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node'

export function initSentry() {
  if (!process.env.SENTRY_DSN) return

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  })
}

export { Sentry }
```

- [ ] **Step 3: Wire Sentry error handler into Fastify**

In `packages/relay/src/server.ts`, add global error hook:

```typescript
import { initSentry, Sentry } from './lib/sentry.js'
initSentry()

app.setErrorHandler(async (error, request, reply) => {
  Sentry.captureException(error, { extra: { requestId: request.id } })
  reply.status(500).send({ error: 'Internal server error', requestId: request.id })
})
```

- [ ] **Step 4: Add SENTRY_DSN to render.yaml and .env.example**

- [ ] **Step 5: Commit**

```bash
git add packages/relay/src/lib/sentry.ts packages/relay/src/server.ts packages/relay/package.json infrastructure/render.yaml .env.example
git commit -m "feat(relay): add Sentry error monitoring"
```

---

### Task 16: Email Service (SendGrid/Resend)

**Files:**
- Create: `packages/relay/src/services/email.service.ts`
- Test: `packages/relay/test/services/email.service.test.ts`

- [ ] **Step 1: Install email dependency**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay add resend
```

- [ ] **Step 2: Write tests with mock transport**

Test that `sendInviteEmail`, `sendVerificationEmail` call the transport with correct to/subject/body.

- [ ] **Step 3: Implement email service**

```typescript
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export class EmailService {
  async sendInviteEmail(to: string, orgName: string, inviteUrl: string): Promise<boolean> { ... }
  async sendVerificationEmail(to: string, verifyUrl: string): Promise<boolean> { ... }
}

export const emailService = new EmailService()
```

- [ ] **Step 4: Run tests, commit**

---

### Task 17: Stripe Billing Integration

**Files:**
- Create: `packages/relay/src/services/billing.service.ts`
- Create: `packages/relay/src/routes/billing.ts`
- Test: `packages/relay/test/services/billing.service.test.ts`

- [ ] **Step 1: Install Stripe SDK**

```bash
cd /c/claude/attestara && pnpm --filter @attestara/relay add stripe
```

- [ ] **Step 2: Create billing service**

Implement: `createCheckoutSession`, `createPortalSession`, `handleWebhook` (Stripe webhook events for subscription lifecycle).

- [ ] **Step 3: Create billing routes**

```
POST /v1/billing/checkout — create checkout session
POST /v1/billing/portal — create customer portal session
POST /v1/billing/webhook — Stripe webhook handler
```

- [ ] **Step 4: Tests and commit**

---

### Task 18: Pre-Mainnet Security Audit Preparation

**Files:**
- Create: `docs/security/audit-scope.md`

- [ ] **Step 1: Document audit scope**

Cover: 4 Solidity contracts, Prisma service layer, JWT auth, webhook HMAC, ZK circuit soundness.

- [ ] **Step 2: Run Slither on contracts**

```bash
cd /c/claude/attestara/packages/contracts && slither .
```

Fix any high/medium findings.

- [ ] **Step 3: Run npm audit**

```bash
cd /c/claude/attestara && pnpm audit
```

Fix any critical/high vulnerabilities.

- [ ] **Step 4: Engage audit firm**

Budget: Part of EUR 80K legal allocation. Recommended firms: Trail of Bits, OpenZeppelin, Consensys Diligence.

---

### Task 19: Production Trusted Setup Ceremony (20+ Participants)

- [ ] **Step 1: Plan ceremony logistics**

- Coordinate 20+ participants (DIF members, pilot customers, advisory board)
- Use `snarkjs` ceremony mode with sequential contributions
- Each participant generates entropy, contributes to Phase 2 zkey

- [ ] **Step 2: Run ceremony**

Each participant runs:
```bash
snarkjs zkey contribute prev.zkey next.zkey --name="participant-N"
```

- [ ] **Step 3: Finalize and verify**

```bash
snarkjs zkey verify circuit.r1cs pot_final.ptau final.zkey
```

- [ ] **Step 4: Publish ceremony transcript**

Publish all contributions, hashes, and verification to project repository and IPFS.

---

### Task 20: Mainnet Deployment (Arbitrum One)

**Files:**
- Create: `packages/contracts/scripts/deploy-mainnet.ts`
- Create: `packages/contracts/deployments/arbitrum-one.json` (generated)

- [ ] **Step 1: Create mainnet deployment script**

Copy `deploy-testnet.ts` → `deploy-mainnet.ts`, change network to `arbitrum-one`.

- [ ] **Step 2: Fund deployer with real ETH on Arbitrum One**

- [ ] **Step 3: Deploy contracts**

```bash
npx hardhat run scripts/deploy-mainnet.ts --network arbitrum-one
```

- [ ] **Step 4: Verify on Arbiscan**

- [ ] **Step 5: Deploy production verifier contracts from ceremony artifacts**

- [ ] **Step 6: Register verifiers in production VerifierRegistry**

- [ ] **Step 7: Update relay config with mainnet contract addresses**

- [ ] **Step 8: Commit and tag release**

```bash
git add packages/contracts/deployments/ packages/contracts/scripts/deploy-mainnet.ts
git commit -m "deploy(contracts): Arbitrum One mainnet deployment"
git tag v0.2.0
```

---

## TRACK 2: BUSINESS & LEGAL

---

### Task 21: DIF Working Group Engagement

**Reference:** `docs/standards/dif-engagement-checklist.md`

This runs in parallel with engineering from Week 1.

- [ ] **Step 1: Join DIF (Month 0)**

Go to https://identity.foundation/join — free for <1000 employees. Sign Operating Addendum.

- [ ] **Step 2: Subscribe to mailing lists and Slack**

Join #trusted-ai-agents channel. Introduce Attestara use case.

- [ ] **Step 3: Request Trusted AI Agents WG access**

Email WG chair or fill out form on DIF website.

- [ ] **Step 4: Prepare 15-minute presentation (Month 1)**

Content: Attestara protocol overview, ZK authority verification use case, how it maps to DIF DIDComm + Presentation Exchange. Include live demo if staging is ready.

- [ ] **Step 5: Deliver presentation at WG call (Month 1-2)**

Capture feedback, identify co-editors, document WG consensus.

- [ ] **Step 6: Submit protocol bindings (Month 1-3)**

- DIDComm v2 message types for sessions + negotiation turns
- DIF Presentation Exchange v2 binding for agent authority verification
- DIF Credential Manifest for issuance requirements

- [ ] **Step 7: Offer SDK as reference implementation (Month 3-4)**

Apply for DIF Labs programme.

---

### Task 22: Legal Counsel Engagement (Priority 1-2)

**Reference:** `docs/legal/counsel-engagement-plan.md`

- [ ] **Step 1: Engage Gibraltar DLT counsel (Month 1)**

Contact ISOLAS LLP or Hassans. Scope: DLT Provider licence assessment, corporate structure (CLG vs Ltd), governance token classification. Budget: EUR 15K–25K.

- [ ] **Step 2: Engage smart contract enforceability counsel (Month 2)**

Contact Bird & Bird or Mishcon de Reya. Scope: English law opinion on on-chain commitment enforceability, AI agent authority, eIDAS classification. Budget: EUR 20K–35K.

- [ ] **Step 3: Engage IP/Licensing counsel (Month 2)**

Contact Moorcrofts or Kilburn & Strode. Scope: licence strategy (CC BY 4.0/MIT/LGPL), trademark filings, CLA design. Budget: EUR 8K–12K.

- [ ] **Step 4: DAO governance legal wrapper (Month 4-6)**

After Priority 1-3 opinions received. Budget: EUR 15K–20K.

- [ ] **Step 5: Regulatory compliance (Month 6+)**

EU AI Act Article 9 mapping, DORA compliance, GDPR DPA. Budget: EUR 10K–15K.

---

### Task 23: Domain Registration & Branding

- [ ] **Step 1: Register domains**

Priority: `attestara.ai`, `attestara.io`, `attestara.com`, `attestara.org`, `attestara.xyz`, `attestara.network`, `attestara.protocol`, `attestara.dev`

- [ ] **Step 2: Set up DNS for staging**

Point `api.attestara.ai` → Render relay. Point `app.attestara.ai` → Render portal.

- [ ] **Step 3: Trademark filings**

EU (EUIPO), UK (IPO), US (USPTO) — file via IP counsel from Task 22 Step 3.

---

### Task 24: GitHub Organization & Social Media

- [ ] **Step 1: Create GitHub org `attestara`**

Transfer `mick-e/attestara` to `attestara/attestara`. Set up branch protection on master.

- [ ] **Step 2: Create social accounts**

Twitter/X: `@attestara`. LinkedIn company page. Discord server for developer community.

- [ ] **Step 3: Publish whitepaper**

Host on `attestara.ai/whitepaper`. Add to SSRN or arXiv.

---

### Task 25: Pilot Customer Engagement (Month 2-4)

- [ ] **Step 1: Identify 2-3 financial services/supply chain targets**

Use GTM strategy from `07-gtm-strategy.md`. Focus: firms with AI agent procurement workflows.

- [ ] **Step 2: Prepare pilot package**

- Dedicated sandbox environment
- 30-day free trial
- SDK integration support
- Custom circuit configuration

- [ ] **Step 3: Run pilots**

Collect feedback on SDK DX, relay performance, ZK proof latency.

- [ ] **Step 4: Document learnings**

Publish case studies (anonymized if needed) for DIF presentation and investor materials.

---

## TRACK 3: PRODUCT

---

### Task 26: Portal Dashboard Hardening

**Files:**
- Modify: `packages/portal/app/(dashboard)/*`
- Test: `packages/portal/test/`

- [ ] **Step 1: Ensure all dashboard pages use BFF proxy**

Verify all API calls in dashboard go through `/api/proxy` BFF route, not directly to relay.

- [ ] **Step 2: Add loading states and error boundaries**

Each dashboard page should have a Suspense boundary with skeleton loader.

- [ ] **Step 3: Add real-time session updates via WebSocket**

Connect dashboard to relay WebSocket for live session/turn updates.

- [ ] **Step 4: Run portal tests**

```bash
cd /c/claude/attestara && pnpm test:portal
```

- [ ] **Step 5: Run Playwright E2E**

```bash
cd /c/claude/attestara && pnpm test:e2e
```

---

### Task 27: CLI Hardening & Documentation

**Files:**
- Modify: `packages/cli/src/commands/*.ts`
- Create: `packages/cli/README.md` (only if needed for npm publish)

- [ ] **Step 1: Test all 7 commands against staging relay**

```bash
npx attestara init --relay-url https://api.attestara.ai
npx attestara identity create
npx attestara credential issue --domain procurement.contracts --max-value 500000
npx attestara session create --counterparty <did>
npx attestara negotiate propose --session <id> --value 400000
npx attestara commitment verify <id>
npx attestara demo
```

- [ ] **Step 2: Fix any failures**

- [ ] **Step 3: Add `--output json` format to all commands (if not already)**

- [ ] **Step 4: Publish to npm (when ready)**

```bash
cd /c/claude/attestara/packages/cli && npm publish --access public
```

---

### Task 28: SDK Documentation & Testing Utilities

**Files:**
- Modify: `packages/sdk/src/testing/` (if exists)
- Test: `packages/sdk/test/`

- [ ] **Step 1: Ensure SDK testing utilities work with Prisma-backed relay**

The SDK test helpers may need to account for async service initialization.

- [ ] **Step 2: Run SDK tests against staging**

```bash
cd /c/claude/attestara && RELAY_URL=https://api.attestara.ai pnpm test:sdk
```

- [ ] **Step 3: Write SDK quickstart guide**

```typescript
import { AttestaraClient } from '@attestara/sdk'

const client = new AttestaraClient({ relayUrl: 'https://api.attestara.ai' })

// Create identity
const identity = await client.identity.create()

// Issue credential
const credential = await client.credentials.issue({
  agentDid: identity.did,
  domain: 'procurement.contracts',
  mandateParams: { maxValue: 500000 },
})

// Start negotiation
const session = await client.negotiation.createSession({
  counterpartyDid: 'did:ethr:0xcounterparty',
})

// Propose terms with ZK proof
await client.negotiation.proposeTurn(session.id, {
  value: 400000,
  proof: await client.prover.generateProof('MandateBound', { value: 400000, maxValue: 500000 }),
})
```

---

## TRACK 3 (LONG-TERM): ADVANCED FEATURES

---

### Task 29: W3C CCG Work Item Submission (Month 8)

**Reference:** `docs/standards/dif-engagement-checklist.md` Phase 5

- [ ] **Step 1: Publish JSON-LD context**

Host `https://attestara.ai/contexts/v1` and `/vocab/v1` at stable URLs.

- [ ] **Step 2: Submit AgentAuthorityCredential Work Item**

Requires: Primary editor + co-editor from second organisation + W3C CLA signed.

- [ ] **Step 3: Present at W3C CCG call**

---

### Task 30: DisputeResolution Contract

**Files:**
- Create: `packages/contracts/contracts/DisputeResolution.sol`
- Test: `packages/contracts/test/DisputeResolution.test.ts`

- [ ] **Step 1: Design dispute flow**

States: `filed → evidence_collection → arbitration → resolved`
Roles: disputant, respondent, arbitrator (multisig or oracle)

- [ ] **Step 2: Implement contract**

```solidity
contract DisputeResolution {
  enum DisputeStatus { Filed, EvidenceCollection, Arbitration, Resolved }

  struct Dispute {
    uint256 commitmentId;
    address disputant;
    address respondent;
    DisputeStatus status;
    bytes32 evidenceHash;
    bytes32 resolutionHash;
  }

  function fileDispute(uint256 commitmentId, bytes32 evidenceHash) external;
  function submitEvidence(uint256 disputeId, bytes32 evidenceHash) external;
  function resolveDispute(uint256 disputeId, bytes32 resolutionHash) external;
}
```

- [ ] **Step 3: Write Hardhat tests**

- [ ] **Step 4: Deploy to testnet, then mainnet**

---

### Task 31: Recursive Proof Aggregation & PLONK Evaluation

**Files:**
- Create: `packages/contracts/circuits/recursive/`
- Modify: `packages/prover/src/circuits.ts`

- [ ] **Step 1: Research PLONK vs Groth16 for aggregation**

PLONK enables universal trusted setup (no per-circuit ceremony). Evaluate circom PLONK support and snarkjs PLONK backend.

- [ ] **Step 2: Implement recursive proof composition**

Aggregate multiple proofs (MandateBound + ParameterRange + CredentialFreshness) into a single proof for on-chain verification — reducing gas costs.

- [ ] **Step 3: Benchmark aggregated vs individual verification gas costs**

- [ ] **Step 4: Deploy if gas savings > 30%**

---

### Task 32: Framework Adapters & Python SDK

**Files:**
- Create: `packages/adapter-langchain/`
- Create: `packages/adapter-autogen/`
- Create: `sdks/python/`

- [ ] **Step 1: LangChain adapter**

```typescript
import { AttestaraClient } from '@attestara/sdk'
import { Tool } from 'langchain/tools'

export class AttestaraNegotiateTool extends Tool {
  name = 'attestara-negotiate'
  description = 'Negotiate terms with a counterparty agent using ZK proofs'

  async _call(input: string): Promise<string> {
    // Parse input, call SDK, return result
  }
}
```

- [ ] **Step 2: AutoGen adapter**

Similar pattern — wrap SDK operations as AutoGen tools.

- [ ] **Step 3: Python SDK**

Thin wrapper over the relay HTTP API. Use `httpx` for async HTTP, `pydantic` for types.

```python
from attestara import AttestaraClient

client = AttestaraClient(relay_url="https://api.attestara.ai", api_key="...")
identity = await client.identity.create()
```

- [ ] **Step 4: A2A (Agent-to-Agent) compatibility**

Map Attestara sessions to Google's A2A protocol message format.

---

## Timeline Summary

| Week | Track 1 (Engineering) | Track 2 (Business/Legal) | Track 3 (Product) |
|------|----------------------|--------------------------|-------------------|
| 1 | Tasks 1-4: Commit, fix CLI, DB infra, error mapping | Task 21.1-3: Join DIF | Task 26: Portal hardening |
| 2 | Tasks 5-9: Big-bang Prisma migration (all 8 services) | Task 23: Domains | Task 27: CLI hardening |
| 3 | Tasks 10-11: Route updates, full test validation | Task 22.1: Gibraltar counsel | Task 28: SDK docs |
| 4 | Task 12: Deploy to Render staging | Task 21.4: Prepare DIF presentation | |
| 5-8 | Task 13: Testnet deployment | Task 21.5: DIF presentation | |
| 8-12 | Task 14: Dev trusted setup | Task 22.2-3: Contract + IP counsel | Task 25: Pilot engagement |
| 12-16 | Tasks 15-17: Monitoring, email, billing | Task 22.4: DAO wrapper | |
| 16-20 | Task 18: Security audit prep | Task 22.5: Regulatory compliance | Task 29: W3C CCG |
| 20-24 | Tasks 19-20: Prod ceremony + mainnet | Task 24: GitHub org + social | |
| 24-32 | Tasks 30-32: Disputes, PLONK, adapters | | |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prisma migration breaks existing tests | High | Big-bang approach + full test suite run after each service. Keep `clearStores()` methods for backward compatibility. |
| DIF WG rejects protocol bindings | Medium | Engage early, build relationships, offer reference implementation. Prepare fallback: publish as independent spec. |
| Legal opinion delays | Medium | Engage multiple firms in parallel. Budget buffer: EUR 15K contingency. |
| Testnet deployment gas costs | Low | Arbitrum Sepolia is free testnet. Mainnet gas is minimal on L2. |
| Trusted setup ceremony coordination | Medium | Start with dev ceremony (solo). Production ceremony at Month 16-20 with established community. |
| Pilot customer adoption | High | Start with warm introductions from advisory board. Offer free integration support. |
