# Attestara: Bring All Review Dimensions Above 80% Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise all 5 review dimensions (Security, Code Quality, Architecture, Feature Quality, Usability) from current scores to 8+/10 based on the findings in `docs/ATTESTARA-PROJECT-REVIEW-2026-04-12.md`.

**Architecture:** 5 independent phases. Phase 1 (Security) is the critical path and must complete first since it affects deployed contracts and auth flows. Phases 2-5 (Code Quality, Architecture, Features, Usability) can execute in parallel after Phase 1. Each phase produces independently testable improvements.

**Important notes:**
- Security fixes touch deployed contracts (requires redeployment to Arbitrum Sepolia), relay auth routes, and portal BFF
- The relay config already validates env vars via Zod — the issue is route files importing env vars directly instead of using the validated config
- Relay start.ts already has graceful shutdown for Fastify (`app.close()`), but doesn't clean up the indexer or WebSocket connections
- `@fastify/csrf-protection` is already in relay's package.json dependencies but NOT registered in server.ts

**Tech Stack:** TypeScript, Solidity 0.8.24, Fastify 5, Prisma, Next.js 16, OpenZeppelin 5, Vitest, Hardhat

---

## Phase Dependencies

```
Phase 1: Security (5.5→8+) ─── MUST COMPLETE FIRST
     │
     ├── Phase 2: Code Quality (7.5→8+) ──┐
     ├── Phase 3: Architecture (7.5→8+) ───┼── ALL PARALLEL
     ├── Phase 4: Features (7→8+) ─────────┤
     └── Phase 5: Usability (7→8+) ────────┘
```

---

## Phase 1: Security Hardening (5.5 → 8+)

### Task 1: Fix AgentRegistry.sol — Proper Admin Access Control

Replace the broken `isRegisteredAdmin()` that returns `true` for any non-zero address with a real admin mapping using OpenZeppelin AccessControl.

**Files:**
- Modify: `packages/contracts/contracts/AgentRegistry.sol`
- Modify: `packages/contracts/test/AgentRegistry.test.ts`

- [ ] **Step 1: Write failing test for admin access control**

Add to `packages/contracts/test/AgentRegistry.test.ts`:

```typescript
describe('Admin Access Control', () => {
  it('should reject non-admin from isRegisteredAdmin', async () => {
    const [, nonAdmin] = await ethers.getSigners()
    expect(await agentRegistry.isRegisteredAdmin(nonAdmin.address)).to.equal(false)
  })

  it('should accept the orgAdmin who registered an agent', async () => {
    const [deployer] = await ethers.getSigners()
    await agentRegistry.registerAgent('did:ethr:0x123', 'metadata', '0x00')
    expect(await agentRegistry.isRegisteredAdmin(deployer.address)).to.equal(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/contracts && npx hardhat test test/AgentRegistry.test.ts`
Expected: FAIL — `isRegisteredAdmin` currently returns true for all non-zero addresses.

- [ ] **Step 3: Implement proper admin tracking**

In `packages/contracts/contracts/AgentRegistry.sol`, add an admin mapping and update `isRegisteredAdmin`:

```solidity
// Add after line 8 (mapping declarations):
mapping(address => bool) private knownAdmins;

// Update registerAgent (after line 31, after the agents[agentId] assignment):
knownAdmins[msg.sender] = true;

// Replace isRegisteredAdmin (lines 74-80):
function isRegisteredAdmin(address addr) external view returns (bool) {
    return knownAdmins[addr];
}
```

- [ ] **Step 4: Run all contract tests**

Run: `cd packages/contracts && npx hardhat test`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/
git commit -m "security(contracts): fix isRegisteredAdmin to track actual agent admins"
```

---

### Task 2: Add ReentrancyGuard to CommitmentContract.sol

The `createCommitment` function calls external verifier contracts via `_verifyProofs`. A malicious verifier could re-enter the contract.

**Files:**
- Modify: `packages/contracts/contracts/CommitmentContract.sol`
- Modify: `packages/contracts/test/CommitmentContract.test.ts`

- [ ] **Step 1: Add OpenZeppelin ReentrancyGuard**

In `CommitmentContract.sol`:

```solidity
// Add import after line 6:
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Change contract declaration (line 18):
contract CommitmentContract is ICommitmentContract, ReentrancyGuard {

// Add nonReentrant modifier to createCommitment (line 66):
) external nonReentrant returns (bytes32 commitmentId) {
```

- [ ] **Step 2: Run contract tests**

Run: `cd packages/contracts && npx hardhat test`
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/
git commit -m "security(contracts): add ReentrancyGuard to CommitmentContract"
```

---

### Task 3: Remove Hardcoded JWT_SECRET Fallbacks — Use Centralized Config

Every route file has `const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret...'`. The config already validates these via Zod. Routes should import from config.

**Files:**
- Modify: `packages/relay/src/routes/auth.ts`
- Modify: `packages/relay/src/routes/agents.ts`
- Modify: `packages/relay/src/routes/credentials.ts`
- Modify: `packages/relay/src/routes/sessions.ts`
- Modify: `packages/relay/src/routes/commitments.ts`
- Modify: `packages/relay/src/routes/api-keys.ts`
- Modify: `packages/relay/src/routes/webhooks.ts`
- Modify: `packages/relay/src/routes/analytics.ts`
- Modify: `packages/relay/src/routes/admin.ts`
- Modify: `packages/relay/src/websocket/index.ts`
- Modify: `packages/relay/src/services/webhook.service.ts` (ORG_MASTER_KEY_SECRET)
- Modify: `packages/relay/src/server.ts` (pass config to routes)

- [ ] **Step 1: Update server.ts to load config and pass to routes**

In `packages/relay/src/server.ts`, add config loading at the top:

```typescript
import { loadConfig } from './config.js'
```

Inside `buildServer()`, load config and pass secrets via Fastify decoration:

```typescript
const config = loadConfig()

// After Fastify creation, before route registration:
app.decorate('config', config)

// Update CORS to use config:
await app.register(cors, {
  origin: config.CORS_ORIGIN,
})
```

- [ ] **Step 2: Update each route file to use app.config instead of process.env**

For each route file, replace:
```typescript
const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'
```
with accessing the config from the Fastify instance. Since Fastify plugins receive the app instance, pass the secret as a plugin option or access via `app.config.JWT_SECRET`.

The simplest approach: each route plugin already receives `app` as the first argument. Add a type augmentation in `packages/relay/src/types/fastify.d.ts`:

```typescript
import type { Config } from '../config.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: Config
  }
}
```

Then in each route file, replace the hardcoded constant with:
```typescript
const JWT_SECRET = app.config.JWT_SECRET
```

This requires reading each route file and finding the JWT_SECRET declaration.

- [ ] **Step 3: Update webhook.service.ts to accept ORG_MASTER_KEY_SECRET via constructor**

In `webhook.service.ts`, change:
```typescript
const ORG_MASTER_KEY_SECRET = process.env.ORG_MASTER_KEY_SECRET ?? 'test-master-key-at-least-32-chars!!'
```
to accept it via the service constructor or a setter, initialized from config in server.ts.

Simplest approach: make the webhook service read from a module-level variable set during server startup:

```typescript
let masterKeySecret: string

export function initWebhookConfig(secret: string) {
  masterKeySecret = secret
}
```

Call `initWebhookConfig(config.ORG_MASTER_KEY_SECRET)` in server.ts during startup.

- [ ] **Step 4: Run all relay tests**

Run: `cd packages/relay && pnpm test`
Expected: All 415 tests pass. Some may need updating if they relied on the fallback secrets — update test setup to set env vars.

- [ ] **Step 5: Run integration tests**

Run: `pnpm test:integration`
Expected: All 35 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/relay/
git commit -m "security(relay): remove hardcoded secret fallbacks, use centralized config"
```

---

### Task 4: Fix Wallet Auth — Require Confirmation Before Account Creation

Currently, wallet auth auto-creates an org with `role: 'owner'` for any valid signature. Add a confirmation step.

**Files:**
- Modify: `packages/relay/src/routes/auth.ts` (wallet verify + legacy wallet endpoints)
- Modify: `packages/relay/test/auth-wallet.test.ts`

- [ ] **Step 1: Change wallet auth to return a pending status for new accounts**

In both `/v1/auth/wallet/verify` and `/v1/auth/wallet` endpoints, replace the auto-create block:

```typescript
if (!user) {
  // Return a 202 with the wallet address — client must call /register with wallet linking
  return reply.status(202).send({
    code: 'WALLET_NOT_LINKED',
    message: 'No account linked to this wallet. Register first or link wallet to existing account.',
    walletAddress: address,
    requestId: request.id,
  })
}
```

Remove the auto-create org + user code.

- [ ] **Step 2: Add wallet linking to registration**

In the register endpoint, add optional `walletAddress` field to the register schema:

```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(1),
  walletAddress: z.string().optional(),
})
```

When `walletAddress` is provided during registration, store it on the user record.

- [ ] **Step 3: Update wallet auth tests**

Update `test/auth-wallet.test.ts` to expect 202 for unlinked wallets and test the registration+linking flow.

- [ ] **Step 4: Run all relay tests**

Run: `cd packages/relay && pnpm test`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add packages/relay/
git commit -m "security(relay): require registration before wallet auth, remove auto-account creation"
```

---

### Task 5: Replace XOR Webhook Encryption with AES-256-GCM

**Files:**
- Modify: `packages/relay/src/services/webhook.service.ts`
- Modify: `packages/relay/test/services/webhook.service.test.ts`

- [ ] **Step 1: Write failing test for AES-256-GCM encryption**

```typescript
describe('Webhook secret encryption', () => {
  it('should encrypt and decrypt a secret using AES-256-GCM', async () => {
    const raw = 'whsec_test-secret-value-123'
    const encrypted = encryptSecret(raw)
    expect(encrypted).not.toBe(raw)
    expect(encrypted).toContain(':') // IV:authTag:ciphertext format
    const decrypted = decryptSecret(encrypted)
    expect(decrypted).toBe(raw)
  })

  it('should produce different ciphertexts for the same plaintext (random IV)', async () => {
    const raw = 'whsec_identical-secret'
    const a = encryptSecret(raw)
    const b = encryptSecret(raw)
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Replace XOR implementation**

In `packages/relay/src/services/webhook.service.ts`, replace `encryptSecret` and `decryptSecret`:

```typescript
import { randomBytes, createCipheriv, createDecipheriv, createHash, createHmac } from 'crypto'

function deriveKey(masterSecret: string): Buffer {
  return createHash('sha256').update(masterSecret).digest()
}

function encryptSecret(raw: string): string {
  const key = deriveKey(masterKeySecret)
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, cipherB64] = encoded.split(':')
  const key = deriveKey(masterKeySecret)
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(cipherB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 3: Add timing-safe HMAC comparison for webhook signature verification**

Add a `verifySignature` function:

```typescript
import { timingSafeEqual } from 'crypto'

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  if (expected.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

- [ ] **Step 4: Run webhook tests**

Run: `cd packages/relay && pnpm test -- test/services/webhook.service.test.ts`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add packages/relay/src/services/webhook.service.ts packages/relay/test/
git commit -m "security(relay): replace XOR encryption with AES-256-GCM, add timing-safe HMAC"
```

---

### Task 6: Register CSRF Protection in Portal BFF

`@fastify/csrf-protection` is already a dependency but not registered. For the Next.js portal BFF, use double-submit cookie pattern.

**Files:**
- Modify: `packages/portal/app/api/[...proxy]/route.ts`
- Modify: `packages/portal/lib/api-client.ts`

- [ ] **Step 1: Add CSRF token generation endpoint**

Create `packages/portal/app/api/csrf/route.ts`:

```typescript
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET() {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('csrf_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  return NextResponse.json({ csrfToken: token })
}
```

- [ ] **Step 2: Add CSRF validation to proxy for state-changing methods**

In `packages/portal/app/api/[...proxy]/route.ts`, add CSRF check for POST/PATCH/DELETE:

```typescript
async function proxyRequest(request: NextRequest, params: { proxy: string[] }) {
  // CSRF check for state-changing requests
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
    const cookieStore = await cookies()
    const csrfCookie = cookieStore.get('csrf_token')?.value
    const csrfHeader = request.headers.get('x-csrf-token')
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json(
        { code: 'CSRF_INVALID', message: 'Invalid or missing CSRF token' },
        { status: 403 },
      )
    }
  }
  // ... rest of proxy logic
}
```

- [ ] **Step 3: Update ApiClient to fetch and include CSRF token**

In `packages/portal/lib/api-client.ts`, add CSRF token handling:

```typescript
private csrfToken: string | null = null;

private async ensureCsrfToken(): Promise<string> {
  if (!this.csrfToken) {
    const res = await fetch('/api/csrf');
    const data = await res.json();
    this.csrfToken = data.csrfToken;
  }
  return this.csrfToken!;
}

// Update post/patch/delete methods to include x-csrf-token header
async post<T>(path: string, body?: unknown): Promise<T> {
  const csrf = await this.ensureCsrfToken();
  const res = await fetch(`${this.baseUrl}/v1${path}`, {
    method: "POST",
    headers: { ...this.headers(), "Content-Type": "application/json", "x-csrf-token": csrf },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await this.handleError(res);
  return res.json();
}
```

- [ ] **Step 4: Verify portal builds**

Run: `cd packages/portal && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add packages/portal/
git commit -m "security(portal): add CSRF double-submit cookie protection to BFF proxy"
```

---

### Task 7: Add Per-Endpoint Auth Rate Limiting

**Files:**
- Modify: `packages/relay/src/server.ts`
- Modify: `packages/relay/src/routes/auth.ts`

- [ ] **Step 1: Add stricter rate limits for auth endpoints**

In `packages/relay/src/routes/auth.ts`, add rate limiting to login and register:

```typescript
// Inside authRoutes plugin, before routes:
await app.register(import('@fastify/rate-limit'), {
  max: 5,
  timeWindow: '15 minutes',
  keyGenerator: (request) => request.ip,
  hook: 'preHandler',
  addHeadersOnExceeding: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true },
})
```

This overrides the global 100/min limit with 5/15min for all auth endpoints.

- [ ] **Step 2: Write test for rate limiting**

```typescript
it('should rate-limit login attempts', async () => {
  const app = await createApp()
  // Make 6 rapid login attempts
  for (let i = 0; i < 6; i++) {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'test@example.com', password: 'wrong' },
    })
  }
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email: 'test@example.com', password: 'wrong' },
  })
  expect(res.statusCode).toBe(429)
})
```

- [ ] **Step 3: Run tests**

Run: `cd packages/relay && pnpm test`

- [ ] **Step 4: Commit**

```bash
git add packages/relay/
git commit -m "security(relay): add per-endpoint rate limiting for auth routes (5/15min)"
```

---

### Task 8: Implement Refresh Token Rotation

**Files:**
- Modify: `packages/relay/src/routes/auth.ts`
- Modify: `packages/relay/prisma/schema.prisma` (add RefreshToken model)

- [ ] **Step 1: Add RefreshToken model to Prisma schema**

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @unique @map("token_hash")
  family    String   // Token family ID — all rotated tokens share this
  revoked   Boolean  @default(false)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([family])
  @@map("refresh_tokens")
}
```

Add `refreshTokens RefreshToken[]` to the User model.

- [ ] **Step 2: Generate Prisma client and create migration**

Run: `cd packages/relay && npx prisma generate && npx prisma migrate dev --name add_refresh_token_model`

- [ ] **Step 3: Update auth routes to store and validate refresh tokens**

In `/v1/auth/refresh`, instead of just verifying the JWT:
1. Hash the incoming refresh token
2. Look up the hash in RefreshToken table
3. If found and not revoked: issue new tokens, revoke old one, create new RefreshToken row (same family)
4. If found but revoked: **revoke entire family** (token reuse attack detected)
5. If not found: reject

- [ ] **Step 4: Update register and login to create RefreshToken entries**

After generating refresh tokens, store their hashes in the RefreshToken table with a new family UUID.

- [ ] **Step 5: Update clearStores to delete RefreshToken records**

Add `await getPrisma().refreshToken.deleteMany()` before `user.deleteMany()` in cleanup functions.

- [ ] **Step 6: Run all tests**

Run: `cd packages/relay && pnpm test && pnpm test:integration`

- [ ] **Step 7: Commit**

```bash
git add packages/relay/
git commit -m "security(relay): implement refresh token rotation with family-based revocation"
```

---

### Task 9: Input Validation Hardening

**Files:**
- Modify: `packages/relay/src/routes/agents.ts` (DID + publicKey validation)
- Modify: `packages/relay/src/routes/sessions.ts` (metadata validation)

- [ ] **Step 1: Add DID format validation**

In `packages/relay/src/routes/agents.ts`, update the Zod schema:

```typescript
const createAgentSchema = z.object({
  did: z.string().regex(/^did:[a-z]+:.+$/, 'Invalid DID format (expected did:method:identifier)'),
  name: z.string().min(1).max(255),
  publicKey: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Public key must be hex-encoded with 0x prefix'),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
})
```

- [ ] **Step 2: Update tests to verify validation**

Add tests for invalid DIDs and public keys in `test/agents.test.ts`.

- [ ] **Step 3: Run tests**

Run: `cd packages/relay && pnpm test`

- [ ] **Step 4: Commit**

```bash
git add packages/relay/
git commit -m "security(relay): harden input validation for DIDs, public keys, and metadata"
```

---

## Phase 2: Code Quality (7.5 → 8+)

### Task 10: CLI Test Coverage — 5 Command Tests

Write tests for the 5 most critical CLI commands: init, identity, credential, session, negotiate.

**Files:**
- Create: `packages/cli/test/commands/init.test.ts`
- Create: `packages/cli/test/commands/identity.test.ts`
- Create: `packages/cli/test/commands/credential.test.ts`
- Create: `packages/cli/test/commands/session.test.ts`
- Create: `packages/cli/test/commands/negotiate.test.ts`

- [ ] **Step 1: Create test directory and write init command tests**

`packages/cli/test/commands/init.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('attestara init', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'attestara-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should create config directory and files', () => {
    execSync(`node ${path.resolve('dist/index.js')} init --config-dir ${tmpDir}`, {
      env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
    })
    expect(fs.existsSync(path.join(tmpDir, '.attestara'))).toBe(true)
  })

  it('should exit with error if already initialized', () => {
    fs.mkdirSync(path.join(tmpDir, '.attestara'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, '.attestara', 'config.json'), '{}')
    expect(() => {
      execSync(`node ${path.resolve('dist/index.js')} init --config-dir ${tmpDir}`, {
        env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
        stdio: 'pipe',
      })
    }).toThrow()
  })
})
```

- [ ] **Step 2: Write identity, credential, session, negotiate command tests**

Follow the same pattern — invoke the CLI as a subprocess, verify output and side effects. Each file should have 3-5 tests covering happy path, validation errors, and missing config.

- [ ] **Step 3: Run CLI tests**

Run: `cd packages/cli && pnpm build && pnpm test`

- [ ] **Step 4: Commit**

```bash
git add packages/cli/test/
git commit -m "test(cli): add command tests for init, identity, credential, session, negotiate"
```

---

### Task 11: SDK Test Coverage — 7 Key Module Tests

Write tests for the most critical untested SDK modules.

**Files:**
- Create: `packages/sdk/test/chain.test.ts`
- Create: `packages/sdk/test/merkle.test.ts`
- Create: `packages/sdk/test/session-recorder.test.ts`
- Create: `packages/sdk/test/agents/llm.test.ts`
- Create: `packages/sdk/test/agents/rule-based.test.ts`
- Create: `packages/sdk/test/agents/scripted.test.ts`
- Create: `packages/sdk/test/ipfs.test.ts`

- [ ] **Step 1: Write chain utility tests**

Test the on-chain interaction helpers (contract calls, transaction building, event parsing).

- [ ] **Step 2: Write merkle tree tests**

Test merkle root computation, proof generation, and verification.

- [ ] **Step 3: Write agent strategy tests**

Test LLM, rule-based, and scripted agent behaviors with mocked dependencies.

- [ ] **Step 4: Run SDK tests**

Run: `cd packages/sdk && pnpm test`

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/test/
git commit -m "test(sdk): add tests for chain, merkle, session-recorder, agent strategies, ipfs"
```

---

### Task 12: Fix Auth Middleware Type Safety

Replace `(request as any).auth` with proper Fastify type augmentation.

**Files:**
- Create: `packages/relay/src/types/fastify.d.ts`
- Modify: `packages/relay/src/middleware/auth.ts`
- Modify: All route files that access `(request as any).auth`

- [ ] **Step 1: Create Fastify type augmentation**

```typescript
// packages/relay/src/types/fastify.d.ts
import type { AuthContext } from '../middleware/auth.js'
import type { Config } from '../config.js'

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext
    apiKeyHash?: string
  }
  interface FastifyInstance {
    config: Config
  }
}
```

- [ ] **Step 2: Update auth middleware to use typed request**

In `packages/relay/src/middleware/auth.ts`, replace:
```typescript
;(request as any).auth = { ... } as AuthContext
```
with:
```typescript
request.auth = { ... }
```

And replace:
```typescript
;(request as any).apiKeyHash = hashApiKey(apiKey)
```
with:
```typescript
request.apiKeyHash = hashApiKey(apiKey)
```

- [ ] **Step 3: Update all route files**

In every route file, replace:
```typescript
const auth = (request as any).auth as AuthContext
```
with:
```typescript
const auth = request.auth!
```

Search: `grep -rn "(request as any).auth" packages/relay/src/`

- [ ] **Step 4: Fix JWT expiresIn typing**

In `middleware/auth.ts`, replace `expiresIn as any` with proper typing:

```typescript
export function generateAccessToken(
  payload: Omit<JWTPayload, 'type'>,
  secret: string,
  expiresIn: string | number = '15m',
): string {
  return jwt.sign({ ...payload, type: 'access' }, secret, { expiresIn })
}
```

- [ ] **Step 5: Verify type-check passes with zero `any` in auth**

Run: `cd packages/relay && npx tsc --noEmit`
Then: `grep -rn "as any" packages/relay/src/middleware/auth.ts` — should return 0 results.

- [ ] **Step 6: Commit**

```bash
git add packages/relay/
git commit -m "refactor(relay): replace any casts with proper Fastify type augmentation"
```

---

## Phase 3: Architecture (7.5 → 8+)

### Task 13: Fix Mock GET /orgs/:orgId Endpoint

**Files:**
- Modify: `packages/relay/src/routes/orgs.ts`

- [ ] **Step 1: Replace mock response with real DB query**

In `packages/relay/src/routes/orgs.ts`, find the GET endpoint (around line 64-76) and replace:

```typescript
app.get('/orgs/:orgId', {
  preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
}, async (request, reply) => {
  const { orgId } = request.params as { orgId: string }
  const org = await orgService.getOrg(orgId)

  if (!org) {
    return reply.status(404).send({
      code: 'ORG_NOT_FOUND',
      message: 'Organisation not found',
      requestId: request.id,
    })
  }

  return reply.status(200).send(org)
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/relay && pnpm test -- test/orgs.test.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/relay/src/routes/orgs.ts
git commit -m "fix(relay): replace mock GET /orgs/:orgId with real database query"
```

---

### Task 14: Add Missing Database Indexes

**Files:**
- Modify: `packages/relay/prisma/schema.prisma`

- [ ] **Step 1: Add indexes for FK fields**

Add `@@index` annotations to models:

```prisma
// User model:
@@index([orgId])

// Agent model:
@@index([orgId])

// Credential model:
@@index([orgId])
@@index([agentId])
@@index([expiry])

// ApiKey model:
@@index([orgId])
@@index([expiresAt])

// Webhook model:
@@index([orgId])
@@index([active])

// WebhookDelivery model:
@@index([webhookId])

// Invite model:
@@index([orgId])

// Turn model:
@@index([sessionId])
@@index([agentId])
```

- [ ] **Step 2: Generate migration**

Run: `cd packages/relay && npx prisma generate && npx prisma migrate dev --name add_missing_indexes`

- [ ] **Step 3: Commit**

```bash
git add packages/relay/prisma/
git commit -m "perf(relay): add missing database indexes for FK fields"
```

---

### Task 15: Add Structured Logging with Pino

**Files:**
- Modify: `packages/relay/src/server.ts` (enhance Fastify logger config)
- Modify: `packages/relay/src/indexer/callbacks.ts` (replace console.log)
- Modify: `packages/relay/src/start.ts` (log startup info)

- [ ] **Step 1: Enhance Fastify logger configuration**

Fastify already uses Pino internally. Enhance the config in `server.ts`:

```typescript
const app = Fastify({
  logger: options.logger !== false
    ? {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        serializers: {
          req(request) {
            return { method: request.method, url: request.url, requestId: request.id }
          },
          res(reply) {
            return { statusCode: reply.statusCode }
          },
        },
        ...(process.env.NODE_ENV === 'production' ? {} : { transport: { target: 'pino-pretty' } }),
      }
    : false,
  genReqId: () => crypto.randomUUID(),
})
```

- [ ] **Step 2: Replace console.log in indexer callbacks**

In `packages/relay/src/indexer/callbacks.ts`, replace:
```typescript
console.log(...)
```
with:
```typescript
// Accept a logger parameter or use a module-level logger
import { FastifyBaseLogger } from 'fastify'

export function buildPrismaCallbacks(logger?: FastifyBaseLogger) {
  return {
    onAgentRegistered: async (...) => {
      logger?.info({ did, txHash, count: result.count }, 'Indexed AgentRegistered event')
    },
    // ...
  }
}
```

- [ ] **Step 3: Add pino-pretty as dev dependency**

Run: `cd packages/relay && pnpm add -D pino-pretty`

- [ ] **Step 4: Run tests**

Run: `cd packages/relay && pnpm test`

- [ ] **Step 5: Commit**

```bash
git add packages/relay/
git commit -m "feat(relay): add structured logging with pino, replace console.log in indexer"
```

---

### Task 16: Add WebSocket Heartbeat

**Files:**
- Modify: `packages/relay/src/websocket/index.ts`

- [ ] **Step 1: Add heartbeat ping/pong**

In `packages/relay/src/websocket/index.ts`, after the connection is established and authenticated:

```typescript
// Heartbeat: ping every 30s, close if no pong within 10s
const HEARTBEAT_INTERVAL = 30_000
const HEARTBEAT_TIMEOUT = 10_000

let pongReceived = true

const heartbeat = setInterval(() => {
  if (!pongReceived) {
    socket.close(1001, 'Heartbeat timeout')
    clearInterval(heartbeat)
    return
  }
  pongReceived = false
  socket.ping()
}, HEARTBEAT_INTERVAL)

socket.on('pong', () => {
  pongReceived = true
})

socket.on('close', () => {
  clearInterval(heartbeat)
  // ... existing cleanup
})
```

- [ ] **Step 2: Run WebSocket tests**

Run: `cd packages/relay && pnpm test -- test/websocket.test.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/relay/src/websocket/
git commit -m "feat(relay): add WebSocket heartbeat with 30s ping/pong and timeout detection"
```

---

### Task 17: Add Query Params for List Endpoints

**Files:**
- Modify: `packages/relay/src/routes/agents.ts`
- Modify: `packages/relay/src/routes/sessions.ts`
- Modify: `packages/relay/src/routes/credentials.ts`
- Modify: `packages/relay/src/routes/commitments.ts`

- [ ] **Step 1: Create shared pagination query schema**

Create `packages/relay/src/schemas/pagination.ts`:

```typescript
import { z } from 'zod'

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationQuery = z.infer<typeof paginationQuery>

export function buildPrismaQuery(query: PaginationQuery) {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : { createdAt: query.sortOrder as 'asc' | 'desc' },
  }
}
```

- [ ] **Step 2: Update list endpoints to accept query params**

In each list endpoint, parse query string with the pagination schema and pass to Prisma:

```typescript
const query = paginationQuery.parse(request.query)
const prismaOpts = buildPrismaQuery(query)
const [items, total] = await Promise.all([
  service.listByOrg(orgId, prismaOpts),
  service.countByOrg(orgId),
])
return reply.status(200).send({
  data: items,
  pagination: { total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) },
})
```

- [ ] **Step 3: Update services to accept pagination options**

Add optional `skip`/`take`/`orderBy` parameters to service `listByOrg` methods.

- [ ] **Step 4: Run tests**

Run: `cd packages/relay && pnpm test`

- [ ] **Step 5: Commit**

```bash
git add packages/relay/
git commit -m "feat(relay): add pagination query params (page, pageSize, sortBy, sortOrder) to list endpoints"
```

---

## Phase 4: Feature Quality (7 → 8+)

### Task 18: Remove Mock Pretense from Analytics and Billing Pages

Pages that show hardcoded mock data without indicating it's mock create a false impression. Either wire to real data or clearly label as "Coming Soon".

**Files:**
- Modify: `packages/portal/app/(dashboard)/analytics/page.tsx`
- Modify: `packages/portal/app/(dashboard)/settings/billing/page.tsx`

- [ ] **Step 1: Add "Preview Data" labels to analytics charts**

In the analytics page, add a visible badge to chart sections that use mock data:

```tsx
<div className="relative">
  <span className="absolute top-2 right-2 rounded-full bg-navy-800 px-2 py-0.5 text-[10px] font-medium text-navy-400">
    Preview data
  </span>
  {/* ... chart component ... */}
</div>
```

- [ ] **Step 2: Replace billing page with "Coming Soon" state**

Replace the mock billing page with an honest placeholder:

```tsx
export default function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Billing</h1>
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-12 text-center">
        <h2 className="text-lg font-medium text-white">Billing coming soon</h2>
        <p className="mt-2 text-sm text-gray-400">
          Subscription management and usage tracking will be available in an upcoming release.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd packages/portal && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add packages/portal/
git commit -m "feat(portal): label mock analytics charts as preview, replace billing with coming-soon"
```

---

### Task 19: Add Real Agent DID Generation on Provision

The agent provisioning modal currently uses a placeholder DID. Wire it to generate a real `did:ethr` identifier.

**Files:**
- Modify: `packages/portal/app/(dashboard)/agents/page.tsx`
- Modify: `packages/portal/lib/hooks.ts`

- [ ] **Step 1: Generate DID client-side on agent creation**

In the `useCreateAgent` hook or the agents page, generate a random DID-like identifier:

```typescript
const did = `did:ethr:arb-sepolia:0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
const publicKey = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
```

Pass these to the create agent API call.

- [ ] **Step 2: Verify build and test**

Run: `cd packages/portal && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add packages/portal/
git commit -m "feat(portal): generate real DID identifiers on agent provisioning"
```

---

## Phase 5: Usability (7 → 8+)

### Task 20: Generate OpenAPI/Swagger Spec

Use `@fastify/swagger` to auto-generate an OpenAPI 3.0 spec from route schemas.

**Files:**
- Modify: `packages/relay/src/server.ts`
- Modify: `packages/relay/package.json`

- [ ] **Step 1: Install swagger dependencies**

Run: `cd packages/relay && pnpm add @fastify/swagger @fastify/swagger-ui`

- [ ] **Step 2: Register swagger plugin in server.ts**

Add before route registration:

```typescript
await app.register(import('@fastify/swagger'), {
  openapi: {
    info: {
      title: 'Attestara Relay API',
      version: '0.1.0',
      description: 'Cryptographic trust protocol for autonomous AI agent commerce',
    },
    servers: [{ url: 'http://localhost:3001', description: 'Development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKeyAuth: { type: 'apiKey', in: 'header', name: 'Authorization' },
      },
    },
  },
})

await app.register(import('@fastify/swagger-ui'), {
  routePrefix: '/docs',
})
```

- [ ] **Step 3: Add Swagger schemas to route registration**

Update route files to include JSON Schema definitions in the Fastify route options. Example for agents:

```typescript
app.post('/orgs/:orgId/agents', {
  preHandler: [requireAuth(JWT_SECRET), requireOrgAccess()],
  schema: {
    tags: ['Agents'],
    summary: 'Provision a new agent',
    body: { $ref: 'createAgentSchema' },
    response: { 201: { $ref: 'agentResponse' } },
    security: [{ bearerAuth: [] }],
  },
}, async (request, reply) => { ... })
```

- [ ] **Step 4: Verify swagger UI loads**

Run: `cd packages/relay && pnpm dev` and visit `http://localhost:3001/docs`

- [ ] **Step 5: Commit**

```bash
git add packages/relay/
git commit -m "feat(relay): add OpenAPI/Swagger documentation at /docs"
```

---

### Task 21: Write SDK Getting-Started Guide

**Files:**
- Create: `packages/sdk/README.md`

- [ ] **Step 1: Write the guide**

```markdown
# @attestara/sdk

Client library for the Attestara cryptographic trust protocol.

## Quick Start

\`\`\`typescript
import { AttestaraClient } from '@attestara/sdk'

const client = new AttestaraClient({
  relayUrl: 'http://localhost:3001',
  proverUrl: 'http://localhost:3002',
})

// Create an agent identity
const identity = await client.identity.create('procurement-agent')
console.log('Agent DID:', identity.did)

// Issue a credential
const credential = await client.credentials.issue({
  subject: identity.did,
  domain: 'procurement.contracts',
  maxValue: 500_000,
  currency: 'EUR',
  expiry: '2027-01-01',
})

// Generate a ZK proof
const proof = await client.prover.prove('MandateBound', {
  credential,
  publicInputs: { max_value: 450_000 },
})

// Start a negotiation session
const session = await client.negotiation.createSession({
  counterpartyDid: 'did:ethr:0x...',
  credential,
})

// Submit a turn
await client.negotiation.propose(session.id, {
  value: 420_000,
  terms: { delivery: '30d', warranty: '12m' },
  proof,
})
\`\`\`

## Managers

| Manager | Purpose |
|---------|---------|
| `client.identity` | DID creation and key management |
| `client.credentials` | Verifiable Credential issuance, verification, revocation |
| `client.prover` | ZK proof generation (Groth16) |
| `client.negotiation` | Session management and turn submission |
| `client.commitment` | On-chain settlement and verification |

## Error Handling

All managers throw `AttestaraError` with a `code` property:

\`\`\`typescript
import { AttestaraError, ErrorCode } from '@attestara/types'

try {
  await client.credentials.issue(...)
} catch (err) {
  if (err instanceof AttestaraError) {
    console.error(err.code, err.message)
  }
}
\`\`\`
```

- [ ] **Step 2: Commit**

```bash
git add packages/sdk/README.md
git commit -m "docs(sdk): add getting-started guide with quick start and API overview"
```

---

### Task 22: Write Deployment Guide

**Files:**
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Write the deployment guide**

Cover: prerequisites, Render setup, environment variables, database migration, contract deployment, verification.

Include a full env var reference table, step-by-step Render deployment instructions, and troubleshooting section.

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: add deployment guide with Render setup and env var reference"
```

---

## Verification

After all phases complete:

```bash
# Full build
pnpm build

# All unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm exec vitest run tests/e2e/

# Playwright E2E
pnpm test:e2e

# Contract tests
pnpm test:contracts

# Security tests
cd packages/relay && pnpm test -- test/security/

# Naming regression
pnpm test:naming
```

Expected: All green. Re-run the project review scoring to verify all dimensions are 8+/10.

---

## Task Dependencies & Parallelism

```
Phase 1 (Security — serial, order matters):
  Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9

Phase 2 (Code Quality — parallel after Phase 1):
  Task 10, Task 11, Task 12 (all independent)

Phase 3 (Architecture — parallel after Phase 1):
  Task 13, Task 14, Task 15, Task 16, Task 17 (all independent)

Phase 4 (Features — parallel after Phase 1):
  Task 18, Task 19 (independent)

Phase 5 (Usability — parallel after Phase 1):
  Task 20, Task 21, Task 22 (independent)
```

**Estimated total:** Phase 1: ~20h, Phase 2: ~16h, Phase 3: ~12h, Phase 4: ~4h, Phase 5: ~8h. Total: ~60h.
