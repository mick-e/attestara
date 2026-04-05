# Attestara Render Deployment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy relay, prover, and portal to Render so Attestara can be demoed end-to-end against Arbitrum Sepolia.

**Architecture:** Three Render services (relay web, prover private, portal web) backed by Render-managed PostgreSQL and Redis. Contracts already deployed to Arbitrum Sepolia. Relay and prover use Docker; portal uses Render native Node runtime. Pre-deploy hook runs Prisma migrations.

**Tech Stack:** Fastify 5, Next.js 16, Prisma, PostgreSQL, Redis, Docker, Render PaaS, Arbitrum Sepolia (chain ID 421614)

**Deployed Contracts (Arbitrum Sepolia):**
- AgentRegistry: `0x18fDE761a217A91Be8bD3A35fA285dCc7307B808`
- CredentialRegistry: `0xB29a580fd2c7D72Ff0e49DF595F9B63837E0Ec86`
- VerifierRegistry: `0x7B1969CBB1001C1fEAA2259153ada679d09CE5d5`
- CommitmentContract: `0x8f6a1496314B76464e36ee5c04ebDd270f9AF6f8`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/relay/src/start.ts` | Relay production entry point (calls `loadConfig` + `buildServer` + `listen`) |
| Create | `packages/prover/src/start.ts` | Prover production entry point (calls `startProver`) |
| Modify | `infrastructure/Dockerfile.relay` | Point CMD at `dist/start.js`, add Prisma generate step, copy contracts package |
| Modify | `infrastructure/Dockerfile.prover` | Point CMD at `dist/start.js` |
| Modify | `render.yaml` | Add missing env vars, pre-deploy migration hook, fix service config |
| Create | `tests/deployment/startup.test.ts` | Verify both servers start and respond to `/health` |
| Modify | `packages/relay/tsconfig.json` | Ensure `start.ts` is included (already covered by `"include": ["src"]`) |

---

### Task 1: Create Relay Server Entry Point

The relay's `server.ts` exports `buildServer()` but never calls `app.listen()`. The Dockerfile runs `node dist/server.js` which loads the module, exports the function, and the process exits. We need a dedicated startup file.

**Files:**
- Create: `packages/relay/src/start.ts`
- Test: `tests/deployment/startup.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/deployment/startup.test.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest'
import { buildServer } from '../packages/relay/src/server.js'
import { buildProverServer } from '../packages/prover/src/server.js'
import { loadProverConfig } from '../packages/prover/src/config.js'

describe('relay startup', () => {
  it('buildServer returns a listening-capable Fastify instance with /health', async () => {
    const app = await buildServer({ logger: false, corsOrigin: '*' })
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
    await app.close()
  })
})
```

- [ ] **Step 2: Run test to verify it passes (validates buildServer works)**

Run: `cd C:\claude\attestara && pnpm vitest run tests/deployment/startup.test.ts`
Expected: PASS (this confirms `buildServer` is functional; we're testing our understanding before writing `start.ts`)

- [ ] **Step 3: Create the relay entry point**

Create `packages/relay/src/start.ts`:

```typescript
import { loadConfig } from './config.js'
import { buildServer } from './server.js'

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

  // Graceful shutdown
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      app.log.info(`${signal} received, shutting down`)
      await app.close()
      process.exit(0)
    })
  }
}

main()
```

- [ ] **Step 4: Verify it compiles**

Run: `cd C:\claude\attestara && pnpm --filter @attestara/relay build`
Expected: Compiles without errors, `packages/relay/dist/start.js` exists

- [ ] **Step 5: Commit**

```bash
cd C:\claude\attestara
git add packages/relay/src/start.ts tests/deployment/startup.test.ts
git commit -m "feat(relay): add production entry point with graceful shutdown"
```

---

### Task 2: Create Prover Server Entry Point

The prover has `startProver()` in `index.ts` but it's only exported, never called. The Dockerfile runs `node dist/server.js` which has no startup logic. Same pattern as relay: dedicated `start.ts`.

**Files:**
- Create: `packages/prover/src/start.ts`
- Modify: `tests/deployment/startup.test.ts`

- [ ] **Step 1: Add prover health check test**

Append to `tests/deployment/startup.test.ts`:

```typescript
describe('prover startup', () => {
  it('buildProverServer returns a Fastify instance with health endpoint', async () => {
    const config = {
      PROVER_INTERNAL_SECRET: 'test-secret-minimum-16',
      REDIS_URL: 'redis://localhost:6379',
      CIRCUIT_DIR: './packages/contracts/circuits/build',
      WORKER_POOL_SIZE: 1,
      PORT: 3099,
      HOST: '127.0.0.1',
      NODE_ENV: 'test' as const,
    }
    const app = await buildProverServer({ config, logger: false })
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })
})
```

- [ ] **Step 2: Run test to verify prover builds correctly**

Run: `cd C:\claude\attestara && pnpm vitest run tests/deployment/startup.test.ts`
Expected: Both tests PASS

- [ ] **Step 3: Create the prover entry point**

Create `packages/prover/src/start.ts`:

```typescript
import { loadProverConfig } from './config.js'
import { buildProverServer } from './server.js'

async function main() {
  const config = loadProverConfig()
  const app = await buildProverServer({ config })

  try {
    await app.listen({ port: config.PORT, host: config.HOST })
    console.log(`Prover service listening on ${config.HOST}:${config.PORT}`)
  } catch (err) {
    console.error('Failed to start prover:', err)
    process.exit(1)
  }

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      console.log(`${signal} received, shutting down`)
      await app.close()
      process.exit(0)
    })
  }
}

main()
```

- [ ] **Step 4: Verify it compiles**

Run: `cd C:\claude\attestara && pnpm --filter @attestara/prover build`
Expected: Compiles without errors, `packages/prover/dist/start.js` exists

- [ ] **Step 5: Commit**

```bash
cd C:\claude\attestara
git add packages/prover/src/start.ts tests/deployment/startup.test.ts
git commit -m "feat(prover): add production entry point"
```

---

### Task 3: Fix Dockerfile.relay

The relay Dockerfile has two issues: (a) CMD points at `dist/server.js` (no startup code), and (b) it doesn't run `prisma generate` (needed for Prisma Client). It also needs the contracts package for the indexer's ABI imports.

**Files:**
- Modify: `infrastructure/Dockerfile.relay`

- [ ] **Step 1: Update Dockerfile.relay**

Replace the full contents of `infrastructure/Dockerfile.relay` with:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/types ./packages/types
COPY packages/contracts ./packages/contracts
COPY packages/relay ./packages/relay
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @attestara/relay db:generate
RUN pnpm --filter @attestara/relay build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/relay/dist ./dist
COPY --from=builder /app/packages/relay/prisma ./prisma
COPY --from=builder /app/packages/relay/node_modules/.prisma ./.prisma
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/start.js"]
```

Changes from original:
- Added `COPY packages/contracts` (relay imports contract ABIs for indexer)
- Added `RUN pnpm --filter @attestara/relay db:generate` (generates Prisma Client)
- Added `COPY --from=builder ... .prisma` (copies generated Prisma Client to runtime)
- Changed CMD from `dist/server.js` to `dist/start.js`

- [ ] **Step 2: Verify Docker build locally (if Docker available)**

Run: `cd C:\claude\attestara && docker build -f infrastructure/Dockerfile.relay -t attestara-relay .`
Expected: Builds successfully (if Docker not available, skip — Render will build it)

- [ ] **Step 3: Commit**

```bash
cd C:\claude\attestara
git add infrastructure/Dockerfile.relay
git commit -m "fix(docker): relay Dockerfile — add start entrypoint, prisma generate, contracts"
```

---

### Task 4: Fix Dockerfile.prover

The prover Dockerfile CMD points at `dist/server.js` which only exports functions. Change to `dist/start.js`.

**Files:**
- Modify: `infrastructure/Dockerfile.prover`

- [ ] **Step 1: Update Dockerfile.prover**

Replace the full contents of `infrastructure/Dockerfile.prover` with:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/types ./packages/types
COPY packages/prover ./packages/prover
COPY packages/contracts/circuits/build ./circuits/build
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @attestara/prover build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/prover/dist ./dist
COPY --from=builder /app/circuits/build ./circuits/build
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/start.js"]
```

Changes from original:
- Changed CMD from `dist/server.js` to `dist/start.js`

- [ ] **Step 2: Verify Docker build locally (if Docker available)**

Run: `cd C:\claude\attestara && docker build -f infrastructure/Dockerfile.prover -t attestara-prover .`
Expected: Builds successfully

- [ ] **Step 3: Commit**

```bash
cd C:\claude\attestara
git add infrastructure/Dockerfile.prover
git commit -m "fix(docker): prover Dockerfile — use start.js entrypoint"
```

---

### Task 5: Update render.yaml With Complete Configuration

The current `render.yaml` is missing critical env vars (`CORS_ORIGIN`, `ORG_MASTER_KEY_SECRET`, `IPFS_GATEWAY_URL`, `NEXT_PUBLIC_CHAIN_ID`), has no database migration hook, and the prover `CIRCUIT_DIR` needs adjusting for the Docker container layout.

**Files:**
- Modify: `render.yaml`

- [ ] **Step 1: Replace render.yaml with complete configuration**

Replace the full contents of `render.yaml` with:

```yaml
services:
  # ── Portal (Next.js) ────────────────────────────────────────────────────
  - type: web
    name: attestara-portal
    runtime: node
    plan: starter
    buildCommand: corepack enable && pnpm install && pnpm --filter @attestara/portal build
    startCommand: pnpm --filter @attestara/portal start
    envVars:
      - key: NEXT_PUBLIC_RELAY_URL
        sync: false
      - key: NEXT_PUBLIC_CHAIN_ID
        value: "421614"
      - key: NODE_ENV
        value: production

  # ── Relay API (Fastify + Prisma) ────────────────────────────────────────
  - type: web
    name: attestara-relay
    runtime: docker
    plan: starter
    dockerfilePath: infrastructure/Dockerfile.relay
    preDeployCommand: npx prisma migrate deploy --schema ./prisma/schema.prisma
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: attestara-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: attestara-redis
          type: redis
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: PROVER_INTERNAL_SECRET
        generateValue: true
      - key: ORG_MASTER_KEY_SECRET
        generateValue: true
      - key: PROVER_URL
        value: http://attestara-prover:3002
      - key: CORS_ORIGIN
        sync: false
      - key: IPFS_GATEWAY_URL
        value: https://gateway.pinata.cloud
      - key: PINATA_API_KEY
        sync: false
      - key: PINATA_API_SECRET
        sync: false
      - key: ARBITRUM_SEPOLIA_RPC_URL
        sync: false
      - key: NODE_ENV
        value: production

  # ── Prover Service (Fastify, private) ───────────────────────────────────
  - type: pserv
    name: attestara-prover
    runtime: docker
    plan: starter
    dockerfilePath: infrastructure/Dockerfile.prover
    envVars:
      - key: PROVER_INTERNAL_SECRET
        fromService:
          name: attestara-relay
          type: web
          envVarKey: PROVER_INTERNAL_SECRET
      - key: REDIS_URL
        fromService:
          name: attestara-redis
          type: redis
          property: connectionString
      - key: CIRCUIT_DIR
        value: ./circuits/build
      - key: NODE_ENV
        value: production

databases:
  - name: attestara-db
    plan: starter

  - name: attestara-redis
    plan: starter
```

Key changes from original:
- **Portal:** Added `corepack enable` to build command, added `NEXT_PUBLIC_CHAIN_ID`, `NODE_ENV`, `plan`
- **Relay:** Added `preDeployCommand` for Prisma migrations, `healthCheckPath`, `ORG_MASTER_KEY_SECRET`, `CORS_ORIGIN`, `IPFS_GATEWAY_URL`, `PINATA_API_KEY`, `PINATA_API_SECRET`, `ARBITRUM_SEPOLIA_RPC_URL`, `NODE_ENV`, `plan`
- **Prover:** Added `CIRCUIT_DIR` (matches Docker container layout `./circuits/build`), `NODE_ENV`, `plan`

- [ ] **Step 2: Validate YAML syntax**

Run: `cd C:\claude\attestara && node -e "const fs=require('fs'); const yaml=require('js-yaml'); yaml.load(fs.readFileSync('render.yaml','utf8')); console.log('YAML valid');" 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('render.yaml')); print('YAML valid')"`
Expected: "YAML valid"

- [ ] **Step 3: Commit**

```bash
cd C:\claude\attestara
git add render.yaml
git commit -m "feat(deploy): complete render.yaml — migrations, env vars, health checks"
```

---

### Task 6: Configure Render Dashboard (Manual Steps)

These are manual configuration steps in the Render web dashboard after the infrastructure blueprint deploys. They cannot be automated via code.

**Files:** None (Render dashboard configuration)

- [ ] **Step 1: Deploy blueprint to Render**

Go to https://dashboard.render.com → New → Blueprint Instance → connect the `mick-e/attestara` GitHub repo → select `master` branch → click "Apply".

Render will create: attestara-portal, attestara-relay, attestara-prover, attestara-db, attestara-redis.

- [ ] **Step 2: Set `sync: false` env vars on Relay**

In Render dashboard → attestara-relay → Environment:

| Key | Value |
|-----|-------|
| `CORS_ORIGIN` | `https://attestara-portal.onrender.com` (use your actual portal URL) |
| `PINATA_API_KEY` | Your Pinata API key (or leave empty to skip IPFS pinning) |
| `PINATA_API_SECRET` | Your Pinata API secret (or leave empty) |
| `ARBITRUM_SEPOLIA_RPC_URL` | `https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY` (Alchemy/Infura Arbitrum Sepolia RPC) |

- [ ] **Step 3: Set `sync: false` env vars on Portal**

In Render dashboard → attestara-portal → Environment:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_RELAY_URL` | `https://attestara-relay.onrender.com` (use your actual relay URL) |

- [ ] **Step 4: Trigger redeploy after env vars are set**

Render dashboard → each service → Manual Deploy → Deploy latest commit.

Wait for all three services to show "Live".

- [ ] **Step 5: Verify health endpoints**

Run:
```bash
curl https://attestara-relay.onrender.com/health
```
Expected: `{"status":"ok","timestamp":"2026-04-..."}` (HTTP 200)

Run:
```bash
curl https://attestara-portal.onrender.com
```
Expected: HTML response (HTTP 200), the Attestara landing page

---

### Task 7: End-to-End Smoke Test Against Live Deployment

Verify the full protocol flow works against the Render deployment talking to Arbitrum Sepolia.

**Files:** None (manual verification using CLI)

- [ ] **Step 1: Set up CLI environment**

Create a temporary `.env` file for CLI testing:

```bash
cd C:\claude\attestara
cat > .env.smoke <<EOF
RELAY_URL=https://attestara-relay.onrender.com
PROVER_URL=https://attestara-prover.onrender.com
CHAIN_ID=421614
EOF
```

- [ ] **Step 2: Register an org and get auth token**

```bash
curl -X POST https://attestara-relay.onrender.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@attestara.xyz","password":"DemoPass123!","orgName":"Demo Org"}'
```

Expected: `{"accessToken":"eyJ...","refreshToken":"...","expiresIn":900,"user":{...}}`

Save the `accessToken` for subsequent requests.

- [ ] **Step 3: Create an agent**

```bash
TOKEN="<accessToken from step 2>"
ORG_ID="<orgId from step 2 user response>"

curl -X POST "https://attestara-relay.onrender.com/v1/orgs/${ORG_ID}/agents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"did":"did:ethr:0x1234567890abcdef1234567890abcdef12345678","name":"Demo Agent","publicKey":"0x04abc...","metadata":{}}'
```

Expected: HTTP 201 with agent object including `id`, `did`, `status: "active"`

- [ ] **Step 4: Issue a credential**

```bash
AGENT_ID="<agentId from step 3>"
EXPIRY=$(date -u -d "+30 days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+30d +%Y-%m-%dT%H:%M:%SZ)

curl -X POST "https://attestara-relay.onrender.com/v1/orgs/${ORG_ID}/credentials" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"agentId\":\"${AGENT_ID}\",\"credentialHash\":\"0x$(openssl rand -hex 32)\",\"schemaHash\":\"0x$(openssl rand -hex 32)\",\"expiry\":\"${EXPIRY}\",\"credentialData\":{\"domain\":\"commerce\",\"maxValue\":1000}}"
```

Expected: HTTP 201 with credential object

- [ ] **Step 5: Verify portal loads and shows dashboard**

Open in browser: `https://attestara-portal.onrender.com`

1. Landing page loads with Attestara branding
2. Navigate to login, sign in with the demo credentials from Step 2
3. Dashboard shows the registered agent and credential

- [ ] **Step 6: Check the chain indexer is running (if RPC URL configured)**

```bash
curl https://attestara-relay.onrender.com/health
```

Check logs in Render dashboard → attestara-relay → Logs. Look for:
- `Relay listening on 0.0.0.0:3001`
- `Indexer started` (only if `ARBITRUM_SEPOLIA_RPC_URL` was set)

- [ ] **Step 7: Document the live URLs**

Once everything is verified, record the live deployment URLs:

```
Portal:  https://attestara-portal.onrender.com
Relay:   https://attestara-relay.onrender.com
Chain:   Arbitrum Sepolia (421614)
```

- [ ] **Step 8: Commit smoke test cleanup**

```bash
cd C:\claude\attestara
rm -f .env.smoke
```

No commit needed — `.env.smoke` was temporary.

---

## Summary

| Task | What | Blocking? |
|------|------|-----------|
| 1 | Relay entry point (`start.ts`) | Yes — relay won't start without it |
| 2 | Prover entry point (`start.ts`) | Yes — prover won't start without it |
| 3 | Fix Dockerfile.relay | Yes — depends on Task 1 |
| 4 | Fix Dockerfile.prover | Yes — depends on Task 2 |
| 5 | Update render.yaml | Yes — depends on Tasks 3 & 4 |
| 6 | Configure Render dashboard | Yes — depends on Task 5, manual |
| 7 | E2E smoke test | No — validation only |

**Dependency chain:** Tasks 1+2 (parallel) → Tasks 3+4 (parallel) → Task 5 → Task 6 → Task 7

**Estimated scope:** ~5 files changed/created, ~150 lines of code, plus Render dashboard config.
