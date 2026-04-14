# Deployment Guide

This guide walks through deploying Attestara to Render (recommended) or self-hosting with Docker.

## Prerequisites

- Node.js 20+, pnpm 9+
- PostgreSQL 16+
- Redis 7+
- Arbitrum Sepolia RPC URL (Alchemy, Infura, or similar)
- Pinata account for IPFS storage (optional but recommended)
- Deployer wallet with Arbitrum Sepolia ETH for contract deployment

## Environment Variables

### Required for Relay

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/attestara` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | 32+ char secret for JWT signing | `openssl rand -hex 32` |
| `PROVER_INTERNAL_SECRET` | 16+ char secret for relay↔prover auth | `openssl rand -hex 16` |
| `PROVER_URL` | Prover service URL | `http://prover:3002` |
| `ORG_MASTER_KEY_SECRET` | 32+ char key for webhook secret encryption | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Portal URL (comma-separated for multiple) | `https://portal.attestara.ai` |

### Optional for Relay

| Variable | Description | Default |
|----------|-------------|---------|
| `ARBITRUM_SEPOLIA_RPC_URL` | Enables chain event indexer | — |
| `ARBITRUM_ONE_RPC_URL` | For mainnet deployment | — |
| `PINATA_API_KEY` | IPFS storage (required for credential CID anchoring) | — |
| `PINATA_API_SECRET` | IPFS storage | — |
| `IPFS_GATEWAY_URL` | Custom IPFS gateway | `http://localhost:8080` |
| `JWT_EXPIRY` | Access token lifetime | `15m` |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime | `7d` |
| `PORT` | Server port | `3001` |
| `HOST` | Bind address | `0.0.0.0` |
| `NODE_ENV` | `production` for prod, `development` for dev | `development` |

### Required for Prover

| Variable | Description | Default |
|----------|-------------|---------|
| `PROVER_INTERNAL_SECRET` | Must match relay's value (16+ chars) | — |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `CIRCUIT_DIR` | Path to compiled Circom circuit files | `../contracts/circuits/build` |
| `WORKER_POOL_SIZE` | Parallel proof generation workers | `4` |
| `PORT` | Server port | `3002` |

### Required for Portal

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_RELAY_URL` | Public relay URL | — |
| `NEXT_PUBLIC_CHAIN_ID` | `421614` for Sepolia, `42161` for mainnet | `421614` |

## Render Deployment

The repo includes `render.yaml` for Infrastructure-as-Code deployment.

### 1. Fork and Connect Repo

1. Fork the repository to your GitHub account
2. In Render Dashboard, click **New → Blueprint**
3. Connect your forked repo
4. Render will detect `render.yaml` and propose 5 services:
   - `attestara-portal` (Next.js, public web service)
   - `attestara-relay` (Fastify API, public web service)
   - `attestara-prover` (ZK proof service, private service — not internet-accessible)
   - `attestara-db` (PostgreSQL)
   - `attestara-redis` (Redis)

### 2. Set Environment Variables

Render will auto-generate secrets marked `generateValue: true` in `render.yaml` (`JWT_SECRET`, `PROVER_INTERNAL_SECRET`, `ORG_MASTER_KEY_SECRET`). You must manually set:

| Variable | Where | Notes |
|----------|-------|-------|
| `ARBITRUM_SEPOLIA_RPC_URL` | relay | From Alchemy/Infura/Ankr |
| `PINATA_API_KEY` | relay | From Pinata dashboard |
| `PINATA_API_SECRET` | relay | From Pinata dashboard |
| `CORS_ORIGIN` | relay | Set to your portal's public URL |
| `NEXT_PUBLIC_RELAY_URL` | portal | Set to your relay's public URL |

The `PROVER_INTERNAL_SECRET` is automatically shared from the relay service to the prover via Render's `fromService` env var reference — no manual wiring needed.

### 3. Deploy

Click **Apply** in the Blueprint UI. Render will:
1. Provision PostgreSQL and Redis
2. Build and deploy relay, prover, and portal services
3. Run `npx prisma migrate deploy` on relay startup (via `preDeployCommand`)

The relay and prover use Docker builds (`infrastructure/Dockerfile.relay` and `infrastructure/Dockerfile.prover`). The portal uses a Node.js native build. First deploy takes approximately 10 minutes. Subsequent deploys are incremental.

### 4. Verify

```bash
# Health check
curl https://<relay-url>/health
# Expected: {"status":"ok"}

# Test registration
curl -X POST https://<relay-url>/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"..."}'
```

Visit `https://<portal-url>` — should show the landing page.

## Database Migrations

Migrations live in `packages/relay/prisma/migrations/` and are managed by Prisma.

### Run Migrations

```bash
cd packages/relay
pnpm db:generate  # Generate Prisma client types from schema
pnpm db:migrate   # Apply pending migrations (uses migrate deploy in CI/prod)
```

### Create a New Migration

```bash
cd packages/relay
npx prisma migrate dev --name <descriptive_name>
```

This updates `prisma/schema.prisma`, creates a new migration SQL file under `prisma/migrations/`, and applies it locally.

### Reset Database (Development Only)

```bash
cd packages/relay
pnpm db:reset  # WARNING: drops all data and reruns all migrations
```

### Production Migration Notes

- Render runs `npx prisma migrate deploy` automatically before each relay deploy via `preDeployCommand`
- `migrate deploy` (not `migrate dev`) is used in production — it does not require a shadow database
- If a migration fails mid-deploy, Render rolls back the service but the DB state may be partially applied — check Prisma migration history with `npx prisma migrate status`

## Smart Contract Deployment

Contracts deploy to Arbitrum Sepolia by default. Four contracts are deployed: `AgentRegistry`, `VerifierRegistry`, `CredentialRegistry`, and `CommitmentContract`.

### 1. Prerequisites

```bash
# Fund deployer wallet with Arbitrum Sepolia ETH
# Faucet: https://faucet.quicknode.com/arbitrum/sepolia

export DEPLOYER_PRIVATE_KEY=0x...
export ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 2. Deploy

```bash
cd packages/contracts
pnpm deploy:sepolia
```

This runs `scripts/deploy-testnet.ts` and writes deployed addresses to `deployments.arbitrum-sepolia.json`.

### 3. Verify on Arbiscan

```bash
cd packages/contracts
pnpm verify:sepolia
```

### 4. Wire Contracts to Relay

The relay loads contract addresses from `packages/contracts/deployments.arbitrum-sepolia.json` at startup. In the Docker build (`Dockerfile.relay`), the `packages/contracts` directory is copied into the image, so the deployment file is baked in at build time. If you redeploy contracts after building the relay image, rebuild the relay Docker image and redeploy the service.

## Self-Hosted Docker Deployment

```bash
# 1. Copy env file and fill in values
cp .env.example .env

# 2. Start PostgreSQL, Redis, and local IPFS node
docker-compose -f infrastructure/docker-compose.yml up -d postgres redis ipfs

# 3. Run migrations
cd packages/relay && pnpm db:generate && pnpm db:migrate && cd ../..

# 4. Build all packages
pnpm build

# 5. Start services (three terminals or use a process manager)
pnpm --filter @attestara/relay start
pnpm --filter @attestara/prover start
pnpm --filter @attestara/portal start
```

Portal runs on port 3000, relay on 3001, prover on 3002 by default.

To use Docker images instead of the Node dev server:

```bash
# Build relay image
docker build -f infrastructure/Dockerfile.relay -t attestara-relay .

# Build prover image
docker build -f infrastructure/Dockerfile.prover -t attestara-prover .

# Run relay
docker run -p 3001:3001 --env-file .env attestara-relay

# Run prover
docker run -p 3002:3002 --env-file .env attestara-prover
```

## Troubleshooting

### Relay fails to start: "Environment variable not found: DATABASE_URL"

Ensure `.env` exists in the repo root or `packages/relay/` directory, or that `DATABASE_URL` is exported in your shell before starting the service.

### Startup fails: "ZodError: JWT_SECRET must be at least 32 characters"

The relay and prover validate env vars on startup via Zod. Check that:
- `JWT_SECRET` is 32+ characters
- `PROVER_INTERNAL_SECRET` is 16+ characters
- `ORG_MASTER_KEY_SECRET` is 32+ characters

Generate valid values: `openssl rand -hex 32`

### Migration fails: "SHADOW_DATABASE_URL required"

This happens when running `prisma migrate dev` (not `deploy`) against a remote database. Use `migrate deploy` for production/staging, or set `SHADOW_DATABASE_URL` to a second throwaway database URL for local dev with a remote DB.

### Prover returns 502 from relay

1. Verify `PROVER_URL` in relay env matches the prover's actual URL (on Render this is the private service address, e.g. `http://attestara-prover:3002`)
2. Check `PROVER_INTERNAL_SECRET` is identical in both services
3. Check prover service logs — it may have failed to start due to missing circuit files

### Portal shows CORS errors

Set `CORS_ORIGIN` in relay env to the portal's exact public URL including protocol (e.g. `https://attestara-portal.onrender.com`). For multiple origins, use a comma-separated list.

### Indexer not detecting on-chain events

Check that `ARBITRUM_SEPOLIA_RPC_URL` is set and the API key has sufficient rate-limit quota. Relay logs should show "Chain event indexer started" on successful startup. If absent, the variable is missing or the RPC URL is malformed.

### WebSocket connections drop after 60 seconds

Expected behavior when idle connections sit behind proxies with aggressive timeouts. The server sends heartbeat pings every 30 seconds — ensure your client handles pong responses. If using Render's free plan, note that services spin down after 15 minutes of inactivity; upgrade to a paid plan to keep services always-on.

### Circuits not found in prover Docker image

The prover Dockerfile copies `packages/contracts/circuits/build` into the image. If circuits have not been compiled yet, run:

```bash
cd packages/contracts
npx hardhat compile        # Compiles Solidity
# Circuits require separate Circom compilation — see packages/contracts/circuits/README.md
```

Then rebuild the prover image.

## Monitoring

Recommended setup:

- **Uptime**: Render's built-in health checks on `/health` (already configured in `render.yaml`)
- **Logs**: Render log streaming or pipe to Datadog/Logtail
- **Errors**: Sentry SDK (add `@sentry/node` to relay and prover manually)
- **Metrics**: Expose Prometheus metrics on a separate port (not currently implemented — future work)

## Scaling

- **Relay**: Horizontal scaling requires Redis pub/sub for WebSocket broadcast. The current implementation uses in-memory pub/sub, so a single relay instance is recommended for production until this is addressed. Vertical scaling (larger Render plan) is the safe path today.
- **Prover**: Scales horizontally — each instance runs an independent worker pool. Add more prover instances and load-balance freely. Increase `WORKER_POOL_SIZE` (default: 4) to utilize multi-core VMs.
- **Portal**: Stateless Next.js — scale freely or deploy to Vercel/Netlify for edge delivery.
- **Database**: PostgreSQL connection pooling via pgBouncer is recommended above 50 concurrent users. Render's managed PostgreSQL does not include pgBouncer — add it as a separate service or use Supabase for connection pooling.

## Security Checklist Before Mainnet

- [ ] All critical security findings from `docs/ATTESTARA-PROJECT-REVIEW-2026-04-12.md` resolved
- [ ] Smart contract audit completed by an independent firm
- [ ] Deployer private key rotated post-deploy and stored in an HSM or hardware wallet
- [ ] All env secrets sourced from a secret manager (not plain config files or shell exports)
- [ ] Rate limits tuned for expected traffic volume
- [ ] Database backups configured and tested (point-in-time recovery)
- [ ] Monitoring and alerting in place for relay, prover, and portal
- [ ] DDoS protection (Cloudflare or similar) in front of relay and portal
- [ ] `ARBITRUM_ONE_RPC_URL` set and contract addresses updated to mainnet (`deployments.arbitrum-one.json`)
- [ ] `NEXT_PUBLIC_CHAIN_ID` updated to `42161` for portal mainnet build
