# Attestara

## Project Overview

Attestara is an open cryptographic trust protocol for autonomous AI agent commerce. It enables AI agents to negotiate, commit, and be held accountable across organisational boundaries using zero-knowledge proofs, W3C Verifiable Credentials, and on-chain settlement (Arbitrum L2).

**Version:** 0.1.0 (MVP implementation phase)

## Quick Start

Prerequisites: Node 20+, pnpm 9+, PostgreSQL, Redis

```bash
pnpm install
cp .env.example .env          # Fill in values (DB, Redis, RPC URLs, secrets)
cd packages/relay && pnpm db:generate && pnpm db:migrate && cd ../..
pnpm build
pnpm test
```

## Monorepo Structure

pnpm workspace with Turborepo orchestration. All packages under `packages/`.

| Package | Purpose | Entry Point |
|---------|---------|-------------|
| `@attestara/types` | Shared TypeScript types (DID, credentials, ZK, negotiation, commitment, strategy, config, errors, API) | `src/index.ts` |
| `@attestara/contracts` | Solidity smart contracts (AgentRegistry, CommitmentContract, CredentialRegistry, VerifierRegistry) + Circom ZK circuits (CredentialFreshness, IdentityBinding, MandateBound, ParameterRange) | `hardhat.config.ts` |
| `@attestara/relay` | Backend API server (Fastify). Auth, orgs, agents, credentials, sessions routes. Prisma ORM, Redis, JWT auth | `src/server.ts` |
| `@attestara/prover` | ZK proof generation service (Fastify). Circuit management, worker pool, Redis/in-memory cache | `src/server.ts` |
| `@attestara/sdk` | Client library. DID management (Veramo), credential issuance, proof generation (snarkjs), negotiation sessions, on-chain commitments | `src/client.ts` |
| `@attestara/portal` | Web dashboard (Next.js 16, React 19, Tailwind v4). Auth and dashboard route groups | `app/layout.tsx` |
| `@attestara/cli` | CLI tool (`attestara` binary). Commands: init, identity, credential, session, negotiate, commitment, demo | `src/index.ts` |

## Development Commands

```bash
# Build all packages (respects dependency order)
pnpm build

# Run all tests
pnpm test

# Per-package tests
pnpm test:contracts          # Hardhat contract + circuit tests
pnpm test:sdk                # SDK unit tests (vitest)
pnpm test:relay              # Relay API tests (vitest)
pnpm test:portal             # Portal tests

# Integration and E2E
pnpm test:integration        # Cross-package integration tests
pnpm test:e2e                # End-to-end tests (tests/e2e/)
pnpm test:ci                 # test + test:integration (CI pipeline)
pnpm test:naming             # Naming regression tests (root tests/)

# Lint and typecheck
pnpm lint
pnpm typecheck

# Dev mode (all packages, watch mode)
pnpm dev

# Clean build artifacts
pnpm clean

# Database (from packages/relay)
cd packages/relay
pnpm db:generate             # Generate Prisma client
pnpm db:migrate              # Run migrations
pnpm db:seed                 # Seed database
pnpm db:reset                # Reset database

# CLI
npx attestara init           # Initialize project config + keys
npx attestara demo           # Run interactive end-to-end demo
npx attestara identity create
npx attestara credential issue --domain procurement.contracts --max-value 500000
npx attestara session create --counterparty <did>
npx attestara negotiate propose --session <id> --value 400000
npx attestara commitment verify <id>
```

## Architecture

### 3-Layer Protocol

1. **Credential Layer** -- W3C Verifiable Credentials (VC 2.0) issued to agents defining their authority/mandate. Managed via Veramo DID framework with `did:ethr` method.
2. **ZK Proof Layer** -- Groth16 proofs (Circom/snarkjs) prove authority properties (mandate bounds, parameter ranges, credential freshness, identity binding) without revealing the underlying mandate to counterparties.
3. **Commitment Layer** -- Agreed terms settled on Arbitrum L2 smart contracts with dual agent signatures, creating immutable on-chain records.

### Tech Stack

- **Language:** TypeScript (strict mode, ES2022 target, ESM)
- **Backend services:** Fastify 5 (relay on port 3001, prover on port 3002)
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4
- **Smart contracts:** Solidity 0.8.24, Hardhat, OpenZeppelin 5, ethers v6
- **ZK circuits:** Circom 2, snarkjs, circomlib
- **Identity:** Veramo (DID management, key management), did:ethr
- **Database:** PostgreSQL (Prisma ORM), Redis (caching, prover cache)
- **Chain:** Arbitrum Sepolia (testnet), Arbitrum One (mainnet)
- **IPFS:** Pinata for credential/proof storage
- **CLI:** Commander.js, chalk, ora

### Key Patterns

- Fastify plugin architecture for relay and prover services
- Prover uses worker pool for parallel proof generation with Redis cache (in-memory fallback)
- SDK client exposes 5 managers: `identity`, `credentials`, `prover`, `negotiation`, `commitment`
- All API routes under `/v1/` prefix
- Request IDs via `crypto.randomUUID()` on all services
- Global error handlers with structured error responses
- Rate limiting on all services (100 req/min default)

## Testing

```bash
pnpm test                    # All packages via turbo
```

- **contracts:** Hardhat test runner (`hardhat test`) -- Solidity + circuit tests
- **relay, sdk, prover, cli:** Vitest (`vitest run`)
- **portal:** ESLint (lint only currently)
- **Root:** `tests/naming-regression.test.ts` (vitest), `tests/e2e/` directory

## Key Files

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo task config (build, test, dev, lint, typecheck, clean) |
| `pnpm-workspace.yaml` | Workspace definition |
| `tsconfig.base.json` | Shared TS config (strict, ES2022, ESM, bundler resolution) |
| `.env.example` | All environment variables (DB, Redis, RPC, IPFS, auth, CORS) |
| `packages/types/src/index.ts` | All shared type exports |
| `packages/relay/src/server.ts` | Relay API server setup |
| `packages/relay/prisma/schema.prisma` | Database schema |
| `packages/prover/src/server.ts` | Prover service setup |
| `packages/contracts/hardhat.config.ts` | Hardhat config (Solidity 0.8.24, Arbitrum networks) |
| `packages/contracts/circuits/` | 4 Circom circuits (MandateBound, ParameterRange, CredentialFreshness, IdentityBinding) |
| `packages/contracts/contracts/` | 4 Solidity contracts (AgentRegistry, CommitmentContract, CredentialRegistry, VerifierRegistry) |
| `packages/sdk/src/client.ts` | AttestaraClient class (main SDK entry) |
| `packages/cli/src/index.ts` | CLI entry point (7 commands) |
| `packages/portal/app/layout.tsx` | Portal root layout |
| `Attestara_Whitepaper_v5.md` | Protocol whitepaper (v5, March 2026) |

## Conventions

- TypeScript strict mode everywhere (`tsconfig.base.json`)
- ESM (`"type": "module"`) in all packages except contracts and portal
- Vitest for unit/integration tests (relay, sdk, prover, cli); Hardhat for contract tests
- Zod for request validation (relay, prover)
- Prisma for database access (relay package)
- All packages scoped under `@attestara/` namespace
- Workspace dependencies via `workspace:*`
- Master branch, direct push workflow

## Reference Documents (Root)

| Doc | Title |
|-----|-------|
| `01-zk-circuit-poc.md` | ZK Circuit Proof of Concept |
| `02-latency-cost-analysis.md` | Performance Viability Assessment |
| `03-threat-model.md` | Expanded Threat Model |
| `04-reference-architecture.md` | Reference Implementation Architecture |
| `05-legal-enforceability.md` | Legal Enforceability Framework |
| `06-ip-licensing.md` | IP and Licensing Strategy |
| `07-gtm-strategy.md` | Go-to-Market Strategy |
| `08-financial-model.md` | 36-Month Financial Projection |
| `09-investor-one-pager.md` | Seed Round One-Pager |
| `10-standards-strategy.md` | Standards Contribution Strategy |
| `11-dx-specification.md` | Developer Experience Specification |
| `12-advisory-board-plan.md` | Advisory Board and Technical Credibility Plan |
| `13-dao-legal-wrapper.md` | DAO Legal Wrapper Structure |
