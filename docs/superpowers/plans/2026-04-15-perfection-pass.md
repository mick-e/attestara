# Attestara Perfection Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push every review dimension (Security, Code Quality, Architecture, Feature Quality, Usability) from the current 8.x baseline to ≥ 9.5/10.

**Architecture:** 5 dimension phases executed largely in parallel, serialized where files conflict. Each task is independently testable and committable. Security phase runs first where auth/CORS/CSP/rate-limit config files overlap with later phases.

**Tech Stack:** TypeScript 5, Fastify 5, Prisma 5, Next.js 16, Vitest 3, Hardhat, Circom, Solidity 0.8.24, OpenZeppelin 5, Pino, OpenTelemetry, Prometheus, ioredis, Commander.js, Playwright.

**Hard constraints:**
- Zero regressions — every task ends with `pnpm test` green
- Every commit passes `pnpm test`, `pnpm test:integration`, `pnpm exec vitest run tests/e2e/`, and contract tests
- Follow existing patterns; do not rewrite working code
- YAGNI — trim tasks to their listed scope
- ISO dates YYYY-MM-DD everywhere

---

## Phase Layout

```
Phase S: Security      (→ 9.8)  ── serialized first (server.ts, CORS, CSP, rate-limit touches)
Phase Q: Code Quality  (→ 9.5)  ┐
Phase A: Architecture  (→ 9.5)  ├─ parallel after Phase S
Phase F: Feature Qual  (→ 9.5)  │
Phase U: Usability     (→ 9.5)  ┘
```

---

## Phase S — Security (→ 9.8)

### Task S1: SECURITY.md and security contact

**Files:**
- Create: `SECURITY.md`

- [ ] **Step 1: Write SECURITY.md** covering: supported versions (only `master`/`main`), how to report (`security@attestara.ai`), expected response window (72h acknowledge, 30d fix target), PGP key placeholder, scope (contracts on Arbitrum, relay API, portal, SDK), out-of-scope (self-hosted forks, social engineering), safe-harbor clause for good-faith researchers.
- [ ] **Step 2: Commit** — `docs(security): add SECURITY.md with disclosure policy`

---

### Task S2: AUDIT-PREP.md (threat model, invariants, trust boundaries)

**Files:**
- Create: `docs/AUDIT-PREP.md`

- [ ] **Step 1: Write AUDIT-PREP.md** with sections:
  1. System overview (one Mermaid diagram of the 3-layer protocol + data flow)
  2. Trust boundaries table (each process/surface, what it trusts, what it verifies)
  3. Assets (agent identities, credentials, session terms, commitment signatures, org data, private keys)
  4. Adversary model (external attacker, malicious org member, compromised agent, malicious verifier contract, network observer)
  5. Solidity invariants per contract (AgentRegistry, CredentialRegistry, VerifierRegistry, CommitmentContract) — enumerated as testable properties
  6. Known residual risks & mitigations
  7. Auditor onboarding checklist (clone, build, run tests, recommended tools: Slither, Mythril, Echidna, Manticore)
  8. Contact + scope boundaries
- [ ] **Step 2: Commit** — `docs: add audit prep dossier for third-party review`

---

### Task S3: Session invite token single-use enforcement

**Files:**
- Modify: `packages/relay/prisma/schema.prisma` (add `consumedAt DateTime?` to Invite model if absent)
- Modify: `packages/relay/src/routes/sessions.ts` (invite accept path)
- Modify: `packages/relay/tests/session-invite.test.ts` (create if missing)

- [ ] **Step 1: Read current invite flow** in `packages/relay/src/routes/sessions.ts` and `services/session.service.ts` to find the invite accept handler.
- [ ] **Step 2: Add `consumedAt DateTime?` and `@@index([token])`** to the `Invite` model if not present.
- [ ] **Step 3: Create Prisma migration** — `cd packages/relay && pnpm prisma migrate dev --name invite_single_use`
- [ ] **Step 4: Write failing test** asserting a second acceptance of the same invite token returns 409.
- [ ] **Step 5: Implement** — wrap consumption in a transaction that checks `consumedAt IS NULL` and sets it atomically.
- [ ] **Step 6: Run tests.**
- [ ] **Step 7: Commit** — `security(relay): enforce single-use session invite tokens`

---

### Task S4: Session expiry mechanism

**Files:**
- Modify: `packages/relay/prisma/schema.prisma` (ensure `Session.expiresAt DateTime?`)
- Modify: `packages/relay/src/services/session.service.ts`
- Modify: `packages/relay/src/routes/sessions.ts`
- Create: `packages/relay/tests/session-expiry.test.ts`

- [ ] **Step 1: Verify `expiresAt` exists on Session**; if not, add and migrate (`name: session_expiry`).
- [ ] **Step 2: Set default `expiresAt = now + 7 days`** on session creation in `session.service.ts`.
- [ ] **Step 3: Write failing test**: accessing turns or submitting a turn on an expired session returns 410 Gone.
- [ ] **Step 4: Implement `assertNotExpired(session)`** in service; call in `getSessionById`, `addTurn`, `acceptInvite` paths.
- [ ] **Step 5: Commit** — `security(relay): add session expiry with 7-day default and 410 on access`

---

### Task S5: Per-endpoint rate limiting granularity

**Files:**
- Modify: `packages/relay/src/server.ts`
- Modify: `packages/relay/src/routes/auth.ts`, `sessions.ts` (invite accept), `api-keys.ts`

- [ ] **Step 1: Review existing auth rate limit** — the codebase already has stricter auth rate limiting from commit b602d06. Confirm coverage.
- [ ] **Step 2: Add per-route `config: { rateLimit: { max, timeWindow } }`** on:
  - POST `/v1/auth/login`, `/register`, `/wallet/verify` — 5/15min per IP
  - POST `/v1/auth/register` — 3/hour per IP
  - POST `/v1/sessions/:id/accept` (invite acceptance) — 20/hour per IP
  - POST `/v1/api-keys` — 10/hour per org
- [ ] **Step 3: Write test** asserting 429 on the 6th login attempt within 15 minutes from one IP.
- [ ] **Step 4: Commit** — `security(relay): tighten per-endpoint rate limits on auth and invite flows`

---

### Task S6: CORS strict env enforcement (comma-separated allowlist)

**Files:**
- Modify: `packages/relay/src/config.ts` (parse `CORS_ORIGIN` as comma list)
- Modify: `packages/relay/src/server.ts` (pass array, reject unknown origins)
- Modify: `.env.example`
- Create: `packages/relay/tests/cors.test.ts`

- [ ] **Step 1: Change `CORS_ORIGIN` schema** to `.transform(s => s.split(',').map(x => x.trim()).filter(Boolean))` producing `string[]`.
- [ ] **Step 2: In server.ts, pass `origin: config.CORS_ORIGIN`** directly (Fastify/cors accepts arrays).
- [ ] **Step 3: Remove any `origin: '*'` fallbacks**; in production mode, require the env var to be set explicitly.
- [ ] **Step 4: Write test** — request from a disallowed origin in production mode receives no `access-control-allow-origin` header.
- [ ] **Step 5: Update .env.example** with `CORS_ORIGIN=http://localhost:3000,https://attestara.ai`.
- [ ] **Step 6: Commit** — `security(relay): strict CORS allowlist from comma-separated env`

---

### Task S7: Content-Security-Policy with safe defaults

**Files:**
- Modify: `packages/relay/src/server.ts` (helmet config)
- Modify: `packages/portal/next.config.ts` or `middleware.ts`
- Create: `packages/relay/tests/csp.test.ts`

- [ ] **Step 1: Relay helmet** — replace `contentSecurityPolicy: false` with:
  ```ts
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // needed for Swagger UI
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  }
  ```
- [ ] **Step 2: Portal CSP** — add a `middleware.ts` emitting a strict-but-Next-compatible CSP; include nonce-based script-src using `crypto.randomUUID()` per request.
- [ ] **Step 3: Write test** asserting relay `/health` response carries `content-security-policy`.
- [ ] **Step 4: Run Swagger UI** locally and confirm `/docs` still renders.
- [ ] **Step 5: Commit** — `security: enable Content-Security-Policy on relay and portal`

---

### Task S8: X-Forwarded-Proto/Host spoofing protection

**Files:**
- Modify: `packages/relay/src/server.ts` (trustProxy, allowed hosts middleware)
- Create: `packages/relay/src/middleware/host-validation.ts`
- Create: `packages/relay/tests/host-validation.test.ts`

- [ ] **Step 1: Set Fastify `trustProxy: config.TRUSTED_PROXIES` list** (comma list from env, defaults to `false`).
- [ ] **Step 2: Add `ALLOWED_HOSTS` env** parsed to array; write `validateHost` pre-handler that rejects requests whose `Host` header is not in the list (in production only) with 400.
- [ ] **Step 3: Write test** — request with forged `Host: evil.com` rejected.
- [ ] **Step 4: Commit** — `security(relay): validate Host header and configure trustProxy`

---

### Task S9: Audit log table (append-only)

**Files:**
- Modify: `packages/relay/prisma/schema.prisma` — add `AuditLog` model
- Create: `packages/relay/src/services/audit.service.ts`
- Modify: `packages/relay/src/routes/auth.ts`, `orgs.ts`, `admin.ts`, `api-keys.ts`, `credentials.ts`, `sessions.ts`
- Create: `packages/relay/tests/audit-log.test.ts`

- [ ] **Step 1: Add model**:
  ```prisma
  model AuditLog {
    id        String   @id @default(cuid())
    orgId     String?
    userId    String?
    actorIp   String?
    action    String   // enum-like: auth.login.success, auth.login.failure, org.create, etc.
    resource  String?  // e.g., "Session:<id>"
    outcome   String   // "success" | "failure" | "denied"
    metadata  Json?
    createdAt DateTime @default(now())
    @@index([orgId, createdAt])
    @@index([action, createdAt])
  }
  ```
- [ ] **Step 2: Migrate** — `name: add_audit_log`.
- [ ] **Step 3: Implement `recordAudit(app, ctx)`** service that never throws (logs on failure).
- [ ] **Step 4: Wire audit events** at: auth login success/failure, register, wallet.verify, org.create, api-key.create/revoke, credential.revoke, session.create, commitment.anchor, admin.*.
- [ ] **Step 5: Add test** verifying a failed login writes `action='auth.login.failure', outcome='failure'`.
- [ ] **Step 6: Commit** — `security(relay): append-only audit log for security-sensitive events`

---

### Task S10: Slither + Semgrep CI

**Files:**
- Modify: `.github/workflows/ci.yml` (or create new `security.yml`)
- Create: `.semgrep.yml` (ruleset reference)
- Create: `packages/contracts/slither.config.json`

- [ ] **Step 1: Add `security.yml` workflow** with jobs:
  - `slither`: runs `crytic/slither-action@v0.4.0` against `packages/contracts` on push/PR
  - `semgrep`: runs `semgrep --config=auto packages/*/src` with failure on `ERROR` severity
- [ ] **Step 2: Configure Slither** to exclude `node_modules`, `artifacts`, `cache`, and OpenZeppelin.
- [ ] **Step 3: Add `.semgrep.yml`** extending `p/typescript`, `p/nodejs`, `p/owasp-top-ten`.
- [ ] **Step 4: Commit** — `ci(security): add Slither (Solidity) and Semgrep (TS) static analysis`

---

## Phase Q — Code Quality (→ 9.5)

### Task Q1: Zero `any` in source

**Files:**
- Modify: occurrences of `: any` in `packages/*/src`
- Modify: `tsconfig.base.json` — add `"noImplicitAny": true` (confirm already present) and consider `"noExplicitAny"` via ESLint

- [ ] **Step 1: List occurrences** — `grep -rn ": any" packages/*/src --include="*.ts"` (5 known).
- [ ] **Step 2: For each**: replace with the correct type. If the type is not knowable, use `unknown` + runtime narrow.
- [ ] **Step 3: `pnpm build`** to confirm no regressions.
- [ ] **Step 4: Commit** — `refactor: eliminate remaining any types from source`

---

### Task Q2: Zero bare `catch {}` — add structured logging or remove

**Files:**
- Modify: each of the 26 occurrences (concentrated in `packages/prover/src/cache/*`, `packages/cli/src/commands/*`, `packages/relay/src/server.ts`)

- [ ] **Step 1: Enumerate** — `grep -rnE "catch\s*\{" packages/*/src --include="*.ts"`.
- [ ] **Step 2: For each**: decide between (a) log at WARN with `logger.warn({ err }, 'context')`, (b) rethrow if caller cares, (c) remove the try/catch if it only existed to swallow errors.
- [ ] **Step 3: `pnpm test`**.
- [ ] **Step 4: Commit** — `refactor: replace silent catches with structured logging`

---

### Task Q3: Enable `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`

**Files:**
- Modify: `tsconfig.base.json`
- Fix resulting errors across all packages

- [ ] **Step 1: Add flags** to `tsconfig.base.json` compilerOptions.
- [ ] **Step 2: `pnpm build`** — record the error list.
- [ ] **Step 3: Fix errors** per package, usually by:
  - Guarding array/object access with `?? defaultValue` or narrowing
  - Using `Object.prototype.hasOwnProperty.call` or Map access
  - Adjusting optional fields to `field?: T | undefined` when explicitly undefined is intended
- [ ] **Step 4: `pnpm test && pnpm test:integration`**.
- [ ] **Step 5: Commit** — `refactor: enable noUncheckedIndexedAccess and exactOptionalPropertyTypes`

---

### Task Q4: ESLint strict + lint-staged pre-commit

**Files:**
- Create: `.eslintrc.json` (root) or `eslint.config.js`
- Create: `.lintstagedrc.json`
- Modify: `package.json` (add `lint-staged`, `husky` or `simple-git-hooks`)
- Create: `.husky/pre-commit` (or equivalent)

- [ ] **Step 1: Install** — `pnpm add -D -w eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-import lint-staged simple-git-hooks`
- [ ] **Step 2: ESLint flat config** with `@typescript-eslint/strict` and `plugin:import/typescript`; ignore `dist`, `artifacts`, `.next`, `node_modules`, `generated`.
- [ ] **Step 3: `lint-staged`** runs `eslint --fix` on `*.{ts,tsx}` and `prettier --write` on JSON/MD.
- [ ] **Step 4: Wire `simple-git-hooks`** `pre-commit: pnpm lint-staged`.
- [ ] **Step 5: Run `pnpm lint`** once and fix all reported issues (may be a follow-on task).
- [ ] **Step 6: Commit** — `chore: add ESLint strict ruleset and lint-staged pre-commit`

---

### Task Q5: Extract shared Zod schemas

**Files:**
- Create: `packages/relay/src/schemas/auth.ts`, `agent.ts`, `credential.ts`, `session.ts`, `commitment.ts`, `api-key.ts`, `webhook.ts`
- Modify: corresponding route files to import from `schemas/*`

- [ ] **Step 1: Per route file**, extract the inline Zod schemas into `schemas/<domain>.ts` preserving behavior.
- [ ] **Step 2: Re-export** from `schemas/index.ts`.
- [ ] **Step 3: `pnpm test`**.
- [ ] **Step 4: Commit** — `refactor(relay): extract Zod schemas from routes into packages/relay/src/schemas`

---

### Task Q6: Test coverage — CLI (+4 test files)

**Files:**
- Create: tests for 4 additional CLI command files (the 4 command files without tests)

- [ ] **Step 1: List**: `ls packages/cli/src/commands` vs `ls packages/cli/tests/commands` to identify the four untested commands.
- [ ] **Step 2: For each missing**, write a vitest suite with ≥3 tests covering: happy path, error path (missing required option), JSON output mode.
- [ ] **Step 3: Commit** — `test(cli): add coverage for <commands> to reach 10/10`

---

### Task Q7: Test coverage — SDK (+10 test files targeting chain/, credentials/, negotiation/, commitment/)

**Files:**
- Create: `packages/sdk/tests/**/*.test.ts`

- [ ] **Step 1: Audit** `packages/sdk/src` for files without tests.
- [ ] **Step 2: Write unit tests** for each (mock network/chain boundaries):
  - `chain/provider.ts` (connection, retry, error envelopes)
  - `chain/registry-read.ts` (parsing contract responses)
  - `credentials/issuer.ts` (VC creation, signing, hash uniqueness)
  - `credentials/verifier.ts` (signature verify, expiry, revocation check)
  - `negotiation/session.ts` (start, propose, accept, abandon)
  - `negotiation/redaction.ts` (term filtering)
  - `commitment/builder.ts` (payload assembly, signature aggregation)
  - `commitment/verifier.ts` (on-chain vs local verify)
  - remaining `sdk/src/*` utilities
- [ ] **Step 3: Commit incrementally** in chunks of 3-4 files — `test(sdk): add coverage for <modules>`

---

### Task Q8: Test coverage — Prover (+7 test files)

**Files:**
- Create: tests for 7 untested prover modules (likely `workers/`, `cache/`, `circuits/`, server middleware)

- [ ] **Step 1: Audit** source vs tests.
- [ ] **Step 2: Unit test** each (mock snarkjs where needed):
  - worker pool orchestration
  - redis cache hit/miss/eviction
  - in-memory cache fallback
  - circuit selection
  - proof validation endpoint
  - health endpoint
  - error handling middleware
- [ ] **Step 3: Commit** — `test(prover): reach ≥80% file coverage`

---

### Task Q9: Test coverage — Relay (+6 files for config/database/utils/redis/indexer internals)

- [ ] **Step 1: Identify** config.ts / database.ts / utils/* / redis / indexer internals without tests.
- [ ] **Step 2: Unit test** each (mock ioredis, mock Prisma).
- [ ] **Step 3: Commit** — `test(relay): cover config, database, redis, and indexer internals`

---

### Task Q10: Types package — Zod schema validation tests

**Files:**
- Create: `packages/types/tests/schemas.test.ts`

- [ ] **Step 1: If types package exports Zod schemas**, write parse-success and parse-failure tests for each.
- [ ] **Step 2: If types is purely type-only**, add a compile-time assertions file using `expectTypeOf` (vitest) and a trivial test harness.
- [ ] **Step 3: Commit** — `test(types): add schema and type assertion tests`

---

### Task Q11: Dependency-cruiser — enforce layer boundaries

**Files:**
- Create: `.dependency-cruiser.cjs`
- Modify: `package.json` (`"depcheck"` or `"depcruise"` script)
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Install** — `pnpm add -D -w dependency-cruiser`.
- [ ] **Step 2: Rule set**:
  - `no-routes-to-prisma`: `packages/relay/src/routes` must not import Prisma directly — must go through services
  - `no-services-to-routes`: services cannot import from routes
  - `no-orphans`: flag orphan files
  - `not-to-test`: source cannot import from `tests/`
  - `no-circular`
- [ ] **Step 3: CI job** — `pnpm depcruise packages/relay/src` (plus sdk, prover).
- [ ] **Step 4: Fix violations** surfaced.
- [ ] **Step 5: Commit** — `ci: enforce layer boundaries with dependency-cruiser`

---

### Task Q12: jscpd duplication detection on CI

**Files:**
- Modify: `package.json` (add `jscpd` dev dep + script)
- Create: `.jscpd.json`
- Modify: CI workflow

- [ ] **Step 1: Install** — `pnpm add -D -w jscpd`.
- [ ] **Step 2: Config** — `.jscpd.json` with `"threshold": 0` (fail on any duplicate block ≥10 tokens), ignore dist/artifacts/tests.
- [ ] **Step 3: Run `pnpm jscpd`** and refactor any hotspots into shared helpers.
- [ ] **Step 4: Commit** — `ci: add jscpd duplication gate`

---

## Phase A — Architecture (→ 9.5)

### Task A1: Redis pub/sub for WebSocket broadcast

**Files:**
- Modify: `packages/relay/src/websocket/index.ts`
- Create: `packages/relay/src/websocket/pubsub.ts`
- Modify: `packages/relay/tests/websocket.test.ts` (add 2-instance broadcast test)

- [ ] **Step 1: Review** current in-memory Maps in `websocket/index.ts`.
- [ ] **Step 2: Create `pubsub.ts`** wrapping ioredis `duplicate()` for `publish` + `subscribe`; channels keyed by `org:<orgId>:events`.
- [ ] **Step 3: Refactor broadcast** — local broadcast + publish to Redis; on subscribe, fan out Redis messages to local connections.
- [ ] **Step 4: Write test** spinning up two Fastify apps sharing the same Redis, asserting message published to instance A delivered to client connected to instance B.
- [ ] **Step 5: Commit** — `feat(relay): Redis pub/sub for horizontal WebSocket scaling`

---

### Task A2: Graceful shutdown for relay

**Files:**
- Modify: `packages/relay/src/start.ts`
- Create: `packages/relay/src/shutdown.ts`

- [ ] **Step 1: In `shutdown.ts`**, export `gracefulShutdown(app, options)` that:
  1. Stops accepting new connections (`app.close()` at end)
  2. Drains WebSocket connections (sends `close` frame, waits with 10s cap)
  3. Stops the indexer (if started)
  4. Waits for in-flight requests (Fastify `close()` handles)
  5. Disconnects Prisma + Redis
- [ ] **Step 2: Wire** SIGTERM/SIGINT in `start.ts` to call `gracefulShutdown`.
- [ ] **Step 3: Test** — integration test sends SIGTERM to a running instance; assert it exits with code 0 within 15s and no open connections remain.
- [ ] **Step 4: Commit** — `feat(relay): graceful shutdown with WebSocket draining and indexer cleanup`

---

### Task A3: Multi-stage Dockerfiles for relay and prover

**Files:**
- Modify: `packages/relay/Dockerfile`, `packages/prover/Dockerfile`

**Note:** Per memory, previous multi-stage attempts broke pnpm symlinks. Use `pnpm deploy` which materializes a standalone deployment target without symlinks.

- [ ] **Step 1: Stage 1 (builder)** — `node:20-alpine`, `pnpm install --frozen-lockfile`, `pnpm build`.
- [ ] **Step 2: Stage 2 (pruner)** — `pnpm --filter @attestara/<pkg> deploy --prod /out` to copy only runtime deps + built artifacts.
- [ ] **Step 3: Stage 3 (runtime)** — `node:20-alpine` with non-root user, `COPY --from=pruner /out /app`, `CMD ["node", "dist/start.js"]`.
- [ ] **Step 4: Build locally and compare sizes** pre/post; aim for ≥40% smaller.
- [ ] **Step 5: Smoke test** — `docker run` the image with postgres+redis env, hit `/health`.
- [ ] **Step 6: Commit** — `infra: multi-stage Dockerfiles for relay and prover via pnpm deploy`

---

### Task A4: Prometheus metrics at `/metrics`

**Files:**
- Modify: `packages/relay/src/server.ts`
- Create: `packages/relay/src/metrics.ts`
- Modify: `packages/prover/src/server.ts`
- Create: `packages/prover/src/metrics.ts`

- [ ] **Step 1: Install** — `pnpm add -F @attestara/relay -F @attestara/prover prom-client`.
- [ ] **Step 2: Metrics module** creates registry with:
  - `http_requests_total{method, route, status}` counter
  - `http_request_duration_ms{method, route}` histogram
  - `websocket_active_connections` gauge
  - `prover_queue_depth` gauge
  - `prover_cache_hits_total`, `prover_cache_misses_total`
- [ ] **Step 3: Register `onRequest`/`onResponse` hooks** to populate counters + histogram.
- [ ] **Step 4: `GET /metrics`** returns `registry.metrics()` with `text/plain; version=0.0.4`.
- [ ] **Step 5: Test** — `/metrics` returns 200 with non-empty body, includes `http_requests_total`.
- [ ] **Step 6: Commit** — `feat: expose Prometheus metrics on relay and prover`

---

### Task A5: OpenTelemetry tracing

**Files:**
- Create: `packages/relay/src/telemetry.ts`, `packages/prover/src/telemetry.ts`
- Modify: `packages/relay/src/start.ts`, `packages/prover/src/start.ts`

- [ ] **Step 1: Install** — `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`.
- [ ] **Step 2: telemetry.ts** initializes SDK with OTLP exporter (env-driven endpoint); instruments Fastify, HTTP, Prisma, ioredis.
- [ ] **Step 3: Import telemetry at the very top of start.ts** (before any other import that uses instrumented APIs).
- [ ] **Step 4: Propagate traceparent** on relay→prover HTTP calls (auto via http instrumentation).
- [ ] **Step 5: Gate on `OTEL_EXPORTER_OTLP_ENDPOINT`** so local dev/test doesn't require a collector.
- [ ] **Step 6: Commit** — `feat: add OpenTelemetry tracing with OTLP export`

---

### Task A6: Circuit breaker around prover calls from relay

**Files:**
- Create: `packages/relay/src/utils/circuit-breaker.ts`
- Modify: `packages/relay/src/services/prover-client.ts` (or the module that calls prover)

- [ ] **Step 1: Install** — `pnpm add -F @attestara/relay opossum`.
- [ ] **Step 2: Wrap prover HTTP client** with opossum breaker: 50% error rate over 20 requests triggers open, 30s reset timeout.
- [ ] **Step 3: Add fallback** — return cached proof if available, else `503 PROVER_UNAVAILABLE`.
- [ ] **Step 4: Test** — trip breaker by mocking 10 consecutive failures; assert subsequent calls fail fast.
- [ ] **Step 5: Commit** — `feat(relay): circuit breaker on prover calls via opossum`

---

### Task A7: Connection pool tuning

**Files:**
- Modify: `packages/relay/src/database.ts` (or prisma client setup)
- Modify: `packages/relay/src/config.ts` (add `DATABASE_POOL_SIZE`, `REDIS_MAX_CONN`)
- Modify: `packages/prover/src/config.ts` equivalent

- [ ] **Step 1: Prisma** — set `connection_limit` in `DATABASE_URL` or use `datasources.db.url` with query param; expose via env.
- [ ] **Step 2: ioredis** — `maxRetriesPerRequest`, `enableReadyCheck: true`, connection pool via `Cluster` or a pool wrapper.
- [ ] **Step 3: Document** defaults in .env.example.
- [ ] **Step 4: Commit** — `perf: tune Prisma and ioredis connection pools`

---

### Task A8: Zero raw `process.env` outside config.ts

**Files:**
- Modify: `packages/relay/src/database.ts`, `routes/auth.ts`, `server.ts`, `utils/prisma.ts`

- [ ] **Step 1: For each reference**, import `config` from the validated config and use it.
- [ ] **Step 2: Add missing config keys** (e.g., `TRUSTED_PROXIES`, `ALLOWED_HOSTS`) to the Zod schema.
- [ ] **Step 3: `grep -rn "process.env" packages/relay/src`** — only config.ts remains.
- [ ] **Step 4: Run same audit for other packages** and fix.
- [ ] **Step 5: Commit** — `refactor: route all env access through validated config modules`

---

### Task A9: Soft delete + audit trail on Prisma models

**Files:**
- Modify: `packages/relay/prisma/schema.prisma` (add `deletedAt DateTime?` to Agent, Credential, Organisation, User)
- Modify: services that delete

- [ ] **Step 1: Add `deletedAt DateTime?` + `@@index([deletedAt])`** to Agent, Credential, Organisation, User.
- [ ] **Step 2: Migrate** — `name: soft_delete_core_models`.
- [ ] **Step 3: Replace hard deletes** in services with `update({ data: { deletedAt: new Date() } })`.
- [ ] **Step 4: All read queries** filter `deletedAt: null` (or `where: { ..., deletedAt: null }` helper).
- [ ] **Step 5: Tests** — create, soft-delete, confirm hidden from list but present in `findUnique` with `includeDeleted: true`.
- [ ] **Step 6: Commit** — `feat(relay): soft delete for Agent, Credential, Organisation, User`

---

### Task A10: OpenAPI-generated API client

**Files:**
- Create: `scripts/generate-api-client.ts`
- Create: `packages/sdk/src/generated/api-types.ts` (output of openapi-typescript)
- Modify: `packages/sdk/package.json` (script)
- Modify: `.github/workflows/ci.yml` (verify generated types are fresh)

- [ ] **Step 1: Install** — `pnpm add -D -w openapi-typescript`.
- [ ] **Step 2: Script** — start relay in a temp mode that dumps `openapi.json`, run `openapi-typescript openapi.json -o packages/sdk/src/generated/api-types.ts`.
- [ ] **Step 3: Add `pnpm generate:api-types`** script.
- [ ] **Step 4: CI verifies** — run generator and `git diff --exit-code`.
- [ ] **Step 5: Commit** — `feat(sdk): generate API types from OpenAPI spec`

---

## Phase F — Feature Quality (→ 9.5)

### Task F1: Real analytics pipeline (remove Preview badges)

**Files:**
- Modify: `packages/relay/src/routes/analytics.ts`, `services/analytics.service.ts`
- Modify: `packages/portal/app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: List Preview-labeled charts** in portal analytics page.
- [ ] **Step 2: Implement DB aggregations** for: sessions over time, proof latency p50/p95, gas spent, commitments per org, credential issuance.
- [ ] **Step 3: Expose** `/v1/analytics/timeseries?metric=...` endpoint with proper query validation.
- [ ] **Step 4: Wire portal** — remove Preview badges, swap mock data for React Query fetches.
- [ ] **Step 5: Tests** — service unit tests with seeded data; portal test asserts no "Preview" text.
- [ ] **Step 6: Commit** — `feat: real analytics pipeline sourced from DB aggregations`

---

### Task F2: Real DID generation in portal via SDK

**Files:**
- Modify: `packages/portal/app/(dashboard)/agents/new/page.tsx` (or the agent provisioning modal/component)
- Modify: `packages/portal/lib/sdk.ts` (or equivalent SDK wrapper)

- [ ] **Step 1: Replace `Math.random()` hex DID generation** with a server-side call that invokes `@attestara/sdk` `client.identity.create()`.
- [ ] **Step 2: Expose a relay route** `POST /v1/agents/provision-did` that wraps SDK identity creation (SDK runs on server — not shipped to browser).
- [ ] **Step 3: Portal** posts to that route.
- [ ] **Step 4: Playwright test** — agent creation produces a `did:ethr:` identifier with a real secp256k1 public key (66 chars compressed or 130 uncompressed).
- [ ] **Step 5: Commit** — `feat(portal): real did:ethr generation via SDK Veramo integration`

---

### Task F3: x402 pay-per-use billing meter

**Files:**
- Create: `packages/relay/src/billing/x402.ts`
- Modify: `packages/relay/src/server.ts` (register billing plugin)
- Create: `packages/relay/tests/x402.test.ts`
- Modify: `packages/portal/app/(dashboard)/billing/page.tsx`

**Note:** x402 is an HTTP 402 Payment Required micropayments standard. If full implementation exceeds scope, ship the meter + 402 envelope + admin UI — do **not** ship live payments without user confirmation.

- [ ] **Step 1: Spec x402 envelope** — on metered endpoints, respond 402 with `{ accepts: [{ scheme, amount, recipient, asset }] }` when org lacks subscription/credit.
- [ ] **Step 2: Meter hook** — Fastify `onRequest` that reads org's current usage vs plan; increments usage atomically in Redis.
- [ ] **Step 3: Billing endpoints** — `GET /v1/billing/usage`, `GET /v1/billing/plan`, `POST /v1/billing/topup` (accepts mocked receipt for this pass — no real settlement).
- [ ] **Step 4: Portal page** — replace mock with real usage charts, plan info, a "Top up" button that hits the topup route.
- [ ] **Step 5: Tests** — unauthenticated meter hit returns 402 with envelope; topped-up org succeeds.
- [ ] **Step 6: Commit** — `feat: x402 pay-per-use billing meter and usage UI`

---

### Task F4: Fix regressed Playwright tests

**Files:**
- Modify: `packages/portal/tests/e2e/*.spec.ts`

- [ ] **Step 1: Run** `cd packages/portal && pnpm exec playwright test` — identify which 5 tests fail.
- [ ] **Step 2: For each**, diagnose (likely selector changes from recent UI edits) and fix.
- [ ] **Step 3: All 43 must pass.**
- [ ] **Step 4: Commit** — `test(portal): fix regressed Playwright selectors after UI updates`

---

### Task F5: Commitment detail page — full proof bundle

**Files:**
- Modify: `packages/portal/app/(dashboard)/commitments/[id]/page.tsx`

- [ ] **Step 1: Render** — full ZK proof JSON in a collapsible section, verification status per proof (MandateBound, ParameterRange, CredentialFreshness, IdentityBinding), Arbiscan link for tx, a "Verify on-chain" button that calls SDK `commitment.verify()`.
- [ ] **Step 2: Loading/error states** for each proof.
- [ ] **Step 3: Tests** — snapshot test + Playwright click-through.
- [ ] **Step 4: Commit** — `feat(portal): commitment detail shows full proof bundle with on-chain verify`

---

### Task F6: Webhook management UI

**Files:**
- Create/Modify: `packages/portal/app/(dashboard)/settings/webhooks/page.tsx`
- Ensure relay endpoints exist: `POST /v1/webhooks/:id/test`, `GET /v1/webhooks/:id/deliveries`, `POST /v1/webhooks/deliveries/:deliveryId/retry`

- [ ] **Step 1: Create endpoints** if missing.
- [ ] **Step 2: UI**:
  - List webhooks with test button per row
  - Delivery history table (status, response code, timestamp)
  - Retry failed button
- [ ] **Step 3: Tests** — component test for the deliveries table rendering + retry action.
- [ ] **Step 4: Commit** — `feat(portal): webhook management UI with test/history/retry`

---

### Task F7: API key management improvements

**Files:**
- Modify: `packages/portal/app/(dashboard)/settings/api-keys/page.tsx`
- Modify: `packages/relay/src/routes/api-keys.ts` — add `/v1/api-keys/:id/test`, `/v1/api-keys/:id/usage`

- [ ] **Step 1: Scope selector** with per-scope descriptions (pulled from a single source of truth `packages/types/src/scopes.ts`).
- [ ] **Step 2: "Test this key"** — POST against a canonical read endpoint using the key, show result.
- [ ] **Step 3: Rate-limit status** — display remaining quota for the current window.
- [ ] **Step 4: Commit** — `feat(portal): API key scope descriptions, test action, and rate-limit status`

---

### Task F8: Session lifecycle UI

**Files:**
- Modify: `packages/portal/app/(dashboard)/sessions/[id]/page.tsx`
- Modify: `packages/relay/src/routes/sessions.ts` — add `POST /v1/sessions/:id/abandon`
- Create: `packages/portal/lib/pdf-export.ts` (or use `@react-pdf/renderer`)

- [ ] **Step 1: Abandon** — button + confirmation modal, calls new endpoint.
- [ ] **Step 2: Redacted vs Full toggle** — based on caller's org membership of the session.
- [ ] **Step 3: Export PDF** — React-pdf renders session metadata + turn log + signatures.
- [ ] **Step 4: Tests**.
- [ ] **Step 5: Commit** — `feat(portal): session abandon, redacted toggle, PDF export`

---

### Task F9: CrewAI reference agent example

**Files:**
- Create: `examples/crewai-procurement-agent/` with `README.md`, `pyproject.toml` (Python — CrewAI is Python), `agent.py`, `.env.example`

**Note:** Keep the example self-contained and clearly labeled as a reference integration. It does not need to be in the main test suite.

- [ ] **Step 1: Python project** with CrewAI dependency.
- [ ] **Step 2: Workflow**:
  1. Register agent via `POST /v1/agents`
  2. Request credential via `POST /v1/credentials`
  3. Open session with counterparty, exchange turns
  4. Submit commitment
- [ ] **Step 3: README with setup**, .env template, expected output.
- [ ] **Step 4: Commit** — `docs: reference CrewAI agent demonstrating full Attestara lifecycle`

---

## Phase U — Usability (→ 9.5)

### Task U1: OpenAPI schema metadata on every route

**Files:**
- Modify: every `packages/relay/src/routes/*.ts`

- [ ] **Step 1: For each route**, add `schema: { tags: ['<Tag>'], summary, description, body, response }`. Use existing Zod schemas via `zod-to-json-schema` if convenient.
- [ ] **Step 2: Open `/docs`** — verify every route has a summary, not just the HTTP method.
- [ ] **Step 3: Commit** — `docs(relay): full OpenAPI metadata on every route`

---

### Task U2: API reference docs site generated from OpenAPI

**Files:**
- Create: `scripts/build-api-docs.ts`
- Create: `docs/api/` (gitignore generated HTML or commit it — commit per prompt requirement)
- Modify: `package.json` — `"docs:build": "tsx scripts/build-api-docs.ts"`

- [ ] **Step 1: Use `@redocly/cli` or `redoc-cli`** to render static HTML from `openapi.json`.
- [ ] **Step 2: Script** runs relay dump + redoc bundle → `docs/api/index.html`.
- [ ] **Step 3: Commit** — `docs: generated API reference site at docs/api/`

---

### Task U3: SDK tree-shaking via conditional exports

**Files:**
- Modify: `packages/sdk/package.json` (`exports` field with subpath exports: `./identity`, `./credentials`, `./prover`, `./negotiation`, `./commitment`, `./client`)
- Modify: SDK source structure — ensure each manager is a standalone module

- [ ] **Step 1: Reorganize exports** — subpath imports for each manager; main entry re-exports client (which imports all).
- [ ] **Step 2: Bundle size check** — `pnpm bundlesize` or `esbuild --bundle --analyze` for the import-only-what-you-need path.
- [ ] **Step 3: Document in SDK README.**
- [ ] **Step 4: Commit** — `perf(sdk): conditional subpath exports for tree-shaking`

---

### Task U4: SDK examples (3 working scripts)

**Files:**
- Create: `packages/sdk/examples/01-procurement-negotiation.ts`
- Create: `packages/sdk/examples/02-credential-issuance-flow.ts`
- Create: `packages/sdk/examples/03-commitment-verification.ts`
- Create: `packages/sdk/examples/README.md`

- [ ] **Step 1: Each example** is ≤150 lines, uses `dotenv`, includes CLI-style output.
- [ ] **Step 2: README** explains how to run each (pnpm tsx examples/01-*.ts).
- [ ] **Step 3: CI smoke-check** — `pnpm tsc --noEmit` on examples.
- [ ] **Step 4: Commit** — `docs(sdk): three runnable examples in packages/sdk/examples`

---

### Task U5: CLI interactive prompts

**Files:**
- Modify: CLI command files to prompt for missing required options using `@inquirer/prompts` (or inquirer)

- [ ] **Step 1: Install** — `pnpm add -F @attestara/cli @inquirer/prompts`.
- [ ] **Step 2: For each command**, when a required option is missing and stdin is a TTY, prompt via inquirer; otherwise error with the current message.
- [ ] **Step 3: `--no-interactive` flag** disables prompting globally.
- [ ] **Step 4: Tests** — mock TTY + inquirer response, assert command proceeds.
- [ ] **Step 5: Commit** — `feat(cli): interactive prompts for missing required options`

---

### Task U6: `attestara doctor` command

**Files:**
- Create: `packages/cli/src/commands/doctor.ts`
- Register in `packages/cli/src/index.ts`

- [ ] **Step 1: Doctor checks**:
  - Node version (≥20)
  - Config file exists and parses
  - Relay API reachable (HEAD /health)
  - Prover reachable (if configured)
  - Contract deployment addresses file exists
  - Chain RPC reachable (eth_chainId)
  - Keystore permissions OK
- [ ] **Step 2: Output** — table with ✓/✗ per check and remediation hint.
- [ ] **Step 3: Exit code** — non-zero if any check fails.
- [ ] **Step 4: Tests** — mock fetch; cover happy + fail paths.
- [ ] **Step 5: Commit** — `feat(cli): attestara doctor for config and connectivity diagnostics`

---

### Task U7: CLI shell completions

**Files:**
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/completions/attestara.bash`, `attestara.zsh`, `attestara.fish`
- Modify: `packages/cli/package.json` `bin` + a README section

- [ ] **Step 1: Use `commander`'s builtin `.command('completion')`** or integrate `@yarnpkg/shell`/`omelette`. (Commander has community extensions; pick the lightest dep.)
- [ ] **Step 2: Generate completion scripts** statically and commit them.
- [ ] **Step 3: `attestara completion [shell]`** prints the appropriate script.
- [ ] **Step 4: README install instructions** per shell.
- [ ] **Step 5: Commit** — `feat(cli): shell completion generation (bash/zsh/fish)`

---

### Task U8: Portal onboarding tour

**Files:**
- Create: `packages/portal/components/OnboardingTour.tsx` using `@reactour/tour` or `shepherd.js`
- Modify: dashboard layout to mount tour on first visit (localStorage `attestara.onboardingComplete`)

- [ ] **Step 1: Install** — `pnpm add -F @attestara/portal @reactour/tour`.
- [ ] **Step 2: Tour steps** — Overview, Agents (create your first agent), Credentials (issue), Sessions (start negotiation), Commitments (settle), API Keys (programmatic access), Docs link.
- [ ] **Step 3: Skip button** and re-run via `?tour=1` query.
- [ ] **Step 4: Test** — component test asserts first mount opens tour, dismissed state persists.
- [ ] **Step 5: Commit** — `feat(portal): onboarding tour for first-time users`

---

### Task U9: Portal `/docs` with searchable API reference

**Files:**
- Create: `packages/portal/app/(public)/docs/page.tsx`
- Create: `packages/portal/components/ApiDocs.tsx`

- [ ] **Step 1: Embed Redoc** (or Swagger UI React) in a portal page pointing at the relay `openapi.json` URL.
- [ ] **Step 2: Search** — Redoc has built-in search UI.
- [ ] **Step 3: Live examples** — include curl + SDK snippet under each endpoint (powered by x-code-samples in openapi.json, populated via Task U1 metadata).
- [ ] **Step 4: Commit** — `feat(portal): searchable API reference at /docs`

---

### Task U10: ARCHITECTURE.md with Mermaid diagrams

**Files:**
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Sections**: 3-layer protocol overview, sequence diagram for negotiation + commitment anchoring, deployment topology diagram, package dependency graph (Mermaid `graph LR`), data flow for proof generation.
- [ ] **Step 2: Commit** — `docs: architecture overview with Mermaid diagrams`

---

### Task U11: CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Sections**: dev setup (pnpm, Docker), branch/commit conventions (conventional-commits + scope per package), code style (ESLint, lint-staged), test expectations (TDD, coverage floors), PR process, release workflow, security disclosure pointer.
- [ ] **Step 2: Commit** — `docs: add CONTRIBUTING guide`

---

### Task U12: Scripted demo walkthroughs

**Files:**
- Create: `docs/demo/QUICKSTART-5MIN.md`
- Create: `docs/demo/DEEP-DIVE-15MIN.md`

- [ ] **Step 1: Quickstart** — timed script showing `attestara init`, `attestara demo`, explaining each step's on-chain + ZK outcome; target 5-minute read/watch.
- [ ] **Step 2: Deep dive** — portal walkthrough + SDK in code + contract inspection in Arbiscan; 15-minute read.
- [ ] **Step 3: Commit** — `docs: scripted demo walkthroughs (5-min quickstart, 15-min deep dive)`

---

## Final Task: Re-score review

**Files:**
- Create: `docs/ATTESTARA-PROJECT-REVIEW-2026-04-15.md`
- Update: `C:\Users\mpesb\.claude\projects\C--claude\memory\project_attestara.md`

- [ ] **Step 1: Copy structure from 2026-04-12 review** and update every section with current state, final scores per dimension (target: Security 9.5-9.8, Quality 9.5, Architecture 9.5, Features 9.5, Usability 9.5).
- [ ] **Step 2: Update the memory file** with v0.2.0 perfection pass, final scores, new architectural decisions (Redis pub/sub, OpenTelemetry, Prometheus, soft delete, x402 billing), paths to AUDIT-PREP.md and ARCHITECTURE.md.
- [ ] **Step 3: Final commit** — `docs: project re-review post-perfection-pass with re-scored dimensions`

---

## Execution Order Summary

Serialize only where files touch each other:

1. **Phase S** first (touches server.ts, CORS, CSP, rate-limit, config.ts). Within Phase S, S1/S2/S10 (docs + CI) can run anywhere.
2. Then run **Phase Q**, **Phase A**, **Phase F**, **Phase U** largely in parallel per task, serializing when two tasks touch the same file (e.g., A8 finalizes the config after S5/S6/S8 have added keys; U1 requires routes to exist before adding schemas; U2 requires U1).

Each task ends with:
```
pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm exec vitest run tests/e2e/
```
All must be green before committing.
