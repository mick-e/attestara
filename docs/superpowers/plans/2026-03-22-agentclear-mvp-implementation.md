# Attestara MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready MVP of the Attestara cryptographic trust protocol — ZK circuits, smart contracts, TypeScript SDK, backend services, CLI tools, and a full Next.js portal — ready for investor demos and pilot customer engagement.

**Architecture:** Middle-Out with 3 parallel tracks converging at bi-weekly checkpoints. Phase 0 defines shared interfaces; Track 1 (ZK + Contracts) validates the cryptographic core; Track 2 (SDK + Backend) builds the developer-facing SDK and API; Track 3 (Portal + DX) builds the web experience. All packages share types from `@attestara/types`.

**Tech Stack:** TypeScript (end-to-end), Circom 2.x + Groth16 (ZK), Solidity 0.8.x + Hardhat + OpenZeppelin v5 (contracts), Fastify (backend), Next.js App Router + Tailwind (portal), Prisma + PostgreSQL + Redis + IPFS/Pinata (data), Turborepo + pnpm (monorepo), Veramo (DID/VC), ethers.js (chain), RainbowKit/wagmi (wallet), Vitest (tests), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-03-22-attestara-mvp-design-v1.3.md`

---

## File Structure Overview

### `packages/types/src/`
```
index.ts                    — barrel export
did.ts                      — DID, AgentRecord, DIDDocument types
credentials.ts              — AuthorityCredential, MandateParams, CredentialStatus
zk.ts                       — ZKProof, CircuitId, ProofType, PublicSignals
negotiation.ts              — Session, NegotiationTurn, TurnDecision, Terms, TurnContext
commitment.ts               — Commitment, CommitmentRecord, AgreementHash
strategy.ts                 — NegotiationStrategy interface, StrategyConfig
config.ts                   — AttestaraConfig, NetworkConfig, ProverConfig
errors.ts                   — AttestaraError, ErrorCode enum
api.ts                      — API request/response types, PaginatedResponse
```

### `packages/contracts/`
```
circuits/
  MandateBound.circom        — proposed ≤ max_value proof
  ParameterRange.circom      — floor ≤ proposed ≤ ceiling proof
  CredentialFreshness.circom — credential validity proof
  IdentityBinding.circom     — DID key ownership proof
  lib/Poseidon.circom        — Poseidon hash helper (from circomlib)
  build/                     — compiled artifacts (gitignored)
contracts/
  AgentRegistry.sol          — DID registration + agent metadata
  CredentialRegistry.sol     — credential hash storage + revocation
  CommitmentContract.sol     — session anchoring + commitment recording + proof verification
  VerifierRegistry.sol       — circuit version → verifier address mapping
  interfaces/
    IAgentRegistry.sol
    ICredentialRegistry.sol
    ICommitmentContract.sol
    IVerifierRegistry.sol
test/
  AgentRegistry.test.ts
  CredentialRegistry.test.ts
  CommitmentContract.test.ts
  VerifierRegistry.test.ts
  circuits/
    MandateBound.test.ts
    ParameterRange.test.ts
    CredentialFreshness.test.ts
    IdentityBinding.test.ts
scripts/
  deploy-local.ts
  deploy-testnet.ts
  deploy-mainnet.ts
  generate-verifiers.ts
hardhat.config.ts
```

### `packages/sdk/src/`
```
client.ts                   — AttestaraClient main entry
identity/
  index.ts                  — DIDManager class (create, resolve, rotateKey)
  veramo.ts                 — Veramo agent setup + configuration
credentials/
  index.ts                  — CredentialManager class (issue, verify, store, revoke)
  ipfs.ts                   — IPFS storage client (Pinata)
  schemas.ts                — W3C VC schema definitions
prover/
  index.ts                  — ProverManager class (prove, verify)
  local.ts                  — Local prover (snarkjs)
  remote.ts                 — Remote prover (HTTP client to prover service)
negotiation/
  index.ts                  — SessionManager class (create, propose, counter, accept)
  session.ts                — Session class with event emitter
  merkle.ts                 — Merkle tree accumulator for turns
  turn.ts                   — Turn signing + validation
commitment/
  index.ts                  — CommitmentManager class (create, get, list, verify)
  chain.ts                  — On-chain interaction helpers
agents/
  strategy.ts               — Base NegotiationStrategy interface re-export
  rule-based.ts             — RuleBasedStrategy implementation
  llm.ts                    — LLMStrategy implementation (Claude/GPT)
  scripted.ts               — ScriptedStrategy for testing/demos
testing/
  index.ts                  — barrel export for test utilities
  mock-agent.ts             — MockAgent with in-memory keys
  local-chain.ts            — LocalChain (Hardhat node wrapper)
  test-credentials.ts       — TestCredentials factory
  test-prover.ts            — TestProver (deterministic, no real ZK)
  session-recorder.ts       — SessionRecorder for replay
```

### `packages/prover/src/`
```
server.ts                   — Fastify server setup + routes
routes/
  prove.ts                  — POST /prove/* endpoints
  verify.ts                 — POST /verify endpoint
  health.ts                 — GET /health + GET /metrics
worker.ts                   — Proof generation worker pool
cache.ts                    — Redis cache for verification keys + proof results
config.ts                   — Prover service configuration
```

### `packages/relay/src/`
```
server.ts                   — Fastify server setup
routes/
  auth.ts                   — register, login, wallet, refresh
  orgs.ts                   — org CRUD + invites
  agents.ts                 — agent provisioning + DID management
  credentials.ts            — credential issuance + revocation
  sessions.ts               — session CRUD + invite/accept + turns
  commitments.ts            — commitment queries + verification
  analytics.ts              — dashboard analytics
  api-keys.ts               — API key management
  webhooks.ts               — webhook CRUD + delivery history
  admin.ts                  — admin-only endpoints (indexer backfill)
middleware/
  auth.ts                   — JWT + API key + SIWE validation
  org-scope.ts              — multi-tenancy org_id enforcement
  rate-limit.ts             — rate limiting per endpoint type
  error-handler.ts          — global error handler + correlation IDs
websocket/
  index.ts                  — WebSocket server setup
  session-channel.ts        — per-session turn streaming
  org-feed.ts               — per-org activity feed
  presence.ts               — agent online/offline tracking
indexer/
  index.ts                  — chain event indexer
  listener.ts               — ethers.js event listener
  backfill.ts               — block gap backfill logic
services/
  auth.service.ts           — auth business logic (JWT, bcrypt, SIWE)
  org.service.ts            — org business logic
  agent.service.ts          — agent business logic
  credential.service.ts     — credential business logic + IPFS
  session.service.ts        — session lifecycle + cross-org logic
  commitment.service.ts     — commitment business logic
  webhook.service.ts        — webhook delivery + HMAC signing
prisma/
  schema.prisma             — database schema
  migrations/               — Prisma migrations
config.ts                   — relay service configuration
```

### `packages/cli/src/`
```
index.ts                    — commander.js entry point
commands/
  init.ts                   — attestara init [--demo]
  agent.ts                  — agent create|list|info|rotate-key
  credential.ts             — credential issue|list|verify|revoke
  session.ts                — session create|list|watch|replay
  commitment.ts             — commitment list|verify|show
  prove.ts                  — prove <circuit> --input <file>
  verify.ts                 — verify <proof-file>
  config.ts                 — config set|show
  status.ts                 — connection health check
utils/
  config-loader.ts          — .attestara config file loader
  output.ts                 — formatted terminal output
  spinner.ts                — progress indicators
templates/
  demo/                     — demo scaffold template files
```

### `packages/portal/`
```
app/
  layout.tsx                — root layout (Inter font, providers)
  (marketing)/
    page.tsx                — landing page
    pricing/page.tsx        — pricing tiers
    demo/page.tsx           — interactive demo
    docs/page.tsx           — documentation hub
  (auth)/
    login/page.tsx
    register/page.tsx
    verify-email/page.tsx
  (dashboard)/
    layout.tsx              — dashboard shell (sidebar, header)
    page.tsx                — overview dashboard
    agents/
      page.tsx              — agent list
      [id]/page.tsx         — agent detail
    credentials/
      page.tsx              — credential list + issuance wizard
      [id]/page.tsx         — credential detail
    sessions/
      page.tsx              — session list
      [id]/page.tsx         — live session monitor
    commitments/
      page.tsx              — commitment explorer
      [id]/page.tsx         — commitment detail
    analytics/page.tsx      — analytics dashboard
    settings/
      page.tsx              — org settings
      api-keys/page.tsx     — API key management
      billing/page.tsx      — plan management
  api/                      — BFF routes (proxy to relay)
components/
  ui/                       — base UI components
    stat-card.tsx
    data-table.tsx
    status-badge.tsx
    proof-badge.tsx
    turn-timeline.tsx
    chain-link.tsx
    live-indicator.tsx
    modal.tsx
    wizard.tsx
    toast.tsx
    wallet-button.tsx
  layout/
    sidebar.tsx
    header.tsx
    org-switcher.tsx
  charts/
    time-series-chart.tsx
    cost-breakdown.tsx
lib/
  api-client.ts             — relay API wrapper
  auth.ts                   — auth helpers (JWT, session)
  websocket.ts              — WebSocket client wrapper
  hooks/
    use-session.ts          — live session data hook
    use-org.ts              — org context hook
    use-agents.ts           — agent queries
    use-credentials.ts      — credential queries
    use-commitments.ts      — commitment queries
    use-analytics.ts        — analytics queries
```

### `infrastructure/`
```
docker-compose.yml          — postgres, redis, ipfs, hardhat, relay, prover, portal
docker-compose.test.yml     — test environment (isolated DB)
Dockerfile.relay            — relay service container
Dockerfile.prover           — prover service container
render.yaml                 — Render deployment config
```

---

## Phase 0: Foundation (Week 1)

### Task 1: Initialize Turborepo Monorepo

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `.npmrc`
- Create: `packages/types/package.json`, `packages/types/tsconfig.json`
- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`
- Create: `packages/sdk/package.json`, `packages/sdk/tsconfig.json`
- Create: `packages/prover/package.json`, `packages/prover/tsconfig.json`
- Create: `packages/relay/package.json`, `packages/relay/tsconfig.json`
- Create: `packages/cli/package.json`, `packages/cli/tsconfig.json`
- Create: `packages/portal/package.json`

- [ ] **Step 1: Initialize git repo and root package.json**

```bash
cd C:\claude\attestara
git init
```

```json
// package.json
{
  "name": "attestara",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "test:contracts": "turbo test --filter=@attestara/contracts",
    "test:sdk": "turbo test --filter=@attestara/sdk",
    "test:relay": "turbo test --filter=@attestara/relay",
    "test:portal": "turbo test --filter=@attestara/portal",
    "test:integration": "turbo test:integration",
    "test:e2e": "turbo test:e2e",
    "test:ci": "turbo test test:integration",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "test:integration": {
      "dependsOn": ["build"],
      "cache": false
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

```gitignore
# .gitignore
node_modules/
dist/
.turbo/
*.tsbuildinfo
.env
.env.local
packages/contracts/circuits/build/
packages/contracts/artifacts/
packages/contracts/cache/
packages/contracts/typechain-types/
packages/portal/.next/
coverage/
```

```
# .npmrc
auto-install-peers=true
```

- [ ] **Step 2: Create all package scaffolds**

Each package needs `package.json` + `tsconfig.json`. Create them all:

```json
// packages/types/package.json
{
  "name": "@attestara/types",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

```json
// packages/types/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Repeat pattern for each package with appropriate names:
- `@attestara/contracts` — add `hardhat`, `@openzeppelin/contracts`, `circomlib`, `snarkjs` as deps
- `@attestara/sdk` — add `@attestara/types`, `ethers`, `@veramo/core`, `snarkjs` as deps
- `@attestara/prover` — add `@attestara/types`, `fastify`, `snarkjs`, `ioredis` as deps
- `@attestara/relay` — add `@attestara/types`, `fastify`, `@fastify/websocket`, `prisma`, `@prisma/client`, `ioredis`, `ethers` as deps
- `@attestara/cli` — add `@attestara/types`, `@attestara/sdk`, `commander` as deps
- `@attestara/portal` — Next.js app (use `npx create-next-app@latest` then customize)

- [ ] **Step 3: Install dependencies and verify build**

```bash
pnpm install
pnpm build
```

Expected: All packages compile with zero errors (empty dist/ dirs since no source yet).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: initialize Turborepo monorepo with 7 package scaffolds"
```

---

### Task 2: Define Shared Types (`@attestara/types`)

**Files:**
- Create: `packages/types/src/index.ts`
- Create: `packages/types/src/did.ts`
- Create: `packages/types/src/credentials.ts`
- Create: `packages/types/src/zk.ts`
- Create: `packages/types/src/negotiation.ts`
- Create: `packages/types/src/commitment.ts`
- Create: `packages/types/src/strategy.ts`
- Create: `packages/types/src/config.ts`
- Create: `packages/types/src/errors.ts`
- Create: `packages/types/src/api.ts`

- [ ] **Step 1: Create DID types**

```typescript
// packages/types/src/did.ts
export interface AgentRecord {
  id: string
  did: string
  orgId: string
  name: string
  status: AgentStatus
  publicKey: string
  metadata: Record<string, unknown>
  registeredTxHash: string | null
  createdAt: Date
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEACTIVATED = 'deactivated',
}

export interface DIDDocument {
  id: string
  verificationMethod: VerificationMethod[]
  authentication: string[]
  service?: ServiceEndpoint[]
}

export interface VerificationMethod {
  id: string
  type: string
  controller: string
  publicKeyHex?: string
}

export interface ServiceEndpoint {
  id: string
  type: string
  serviceEndpoint: string
}
```

- [ ] **Step 2: Create credential types**

```typescript
// packages/types/src/credentials.ts
export interface MandateParams {
  maxValue: bigint
  currency: string
  domain: string
  parameterFloor?: bigint
  parameterCeiling?: bigint
  allowedCounterparties?: string[]  // DIDs
}

export interface AuthorityCredential {
  id: string
  type: string[]
  issuer: string
  issuanceDate: string
  expirationDate: string
  credentialSubject: {
    id: string  // agent DID
    mandateParams: MandateParams
  }
  proof: CredentialProof
}

export interface CredentialProof {
  type: string
  created: string
  verificationMethod: string
  proofPurpose: string
  jws: string
}

export interface CredentialRecord {
  id: string
  orgId: string
  agentId: string
  credentialHash: string
  schemaHash: string
  ipfsCid: string | null
  mandateParamsEncrypted: Buffer | null
  expiry: Date
  revoked: boolean
  registeredTxHash: string | null
  createdAt: Date
}

export enum CredentialStatus {
  VALID = 'valid',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}
```

- [ ] **Step 3: Create ZK types**

```typescript
// packages/types/src/zk.ts
export enum CircuitId {
  MANDATE_BOUND = 'MandateBound',
  PARAMETER_RANGE = 'ParameterRange',
  CREDENTIAL_FRESHNESS = 'CredentialFreshness',
  IDENTITY_BINDING = 'IdentityBinding',
}

export interface ZKProof {
  pi_a: [string, string]
  pi_b: [[string, string], [string, string]]
  pi_c: [string, string]
  protocol: 'groth16'
  curve: 'bn128'
}

export interface PublicSignals {
  signals: string[]
}

export interface ProofRequest {
  circuit: CircuitId
  publicInputs: Record<string, string | bigint>
  privateInputs: Record<string, string | bigint>
}

export interface ProofResult {
  proof: ZKProof
  publicSignals: PublicSignals
  circuitId: CircuitId
  circuitVersion: string
  generationTimeMs: number
}

export interface VerificationResult {
  valid: boolean
  circuitId: CircuitId
  circuitVersion: string
  verificationTimeMs: number
}
```

- [ ] **Step 4: Create negotiation types**

```typescript
// packages/types/src/negotiation.ts
import { ZKProof, PublicSignals, CircuitId } from './zk.js'

export interface Terms {
  value: bigint
  currency: string
  deliveryDays?: number
  paymentTerms?: string
  additionalTerms?: Record<string, unknown>
}

export interface NegotiationTurn {
  id: string
  sessionId: string
  agentId: string
  sequenceNumber: number
  terms: Terms
  proofType: CircuitId
  proof: ZKProof
  publicSignals: PublicSignals
  signature: string
  createdAt: Date
}

export enum SessionStatus {
  PENDING_ACCEPTANCE = 'pending_acceptance',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  COMMITTED = 'committed',
  PAUSED = 'paused', // Entered on proof_failed; auto-expires after 15min; either party can resume or reject
}

export enum SessionType {
  INTRA_ORG = 'intra_org',
  CROSS_ORG = 'cross_org',
}

export interface Session {
  id: string
  initiatorAgentId: string
  initiatorOrgId: string
  counterpartyAgentId: string
  counterpartyOrgId: string
  sessionType: SessionType
  status: SessionStatus
  config: SessionConfig
  merkleRoot: string | null
  turnCount: number
  anchorTxHash: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SessionConfig {
  maxTurns: number
  turnTimeoutSeconds: number
  sessionTimeoutSeconds: number
  requiredProofs: CircuitId[]
}

export interface TurnContext {
  session: Session
  turnHistory: NegotiationTurn[]
  mandate: {
    maxValue: bigint
    currency: string
    floor?: bigint
    ceiling?: bigint
  }
  currentTurnNumber: number
}

export type TurnDecision =
  | { action: 'counter'; terms: Terms }
  | { action: 'accept' }
  | { action: 'reject'; reason: string }

export type SessionEvent =
  | { type: 'turn.proposed'; turn: NegotiationTurn }
  | { type: 'turn.countered'; turn: NegotiationTurn }
  | { type: 'turn.accepted'; turn: NegotiationTurn }
  | { type: 'turn.rejected'; reason: string }
  | { type: 'proof.verified'; turnId: string; valid: boolean }
  | { type: 'commitment.created'; commitmentId: string; txHash: string }
  | { type: 'turn.proof_failed'; turnId: string; error: string }
```

- [ ] **Step 5: Create commitment types**

```typescript
// packages/types/src/commitment.ts
import { ZKProof, PublicSignals } from './zk.js'

export interface Commitment {
  id: string
  sessionId: string
  agreementHash: string
  parties: string[]  // agent IDs
  credentialHashes: string[]
  proofs: CommitmentProof[]
  txHash: string | null
  blockNumber: number | null
  verified: boolean
  createdAt: Date
}

export interface CommitmentProof {
  circuitId: string
  circuitVersion: string
  proof: ZKProof
  publicSignals: PublicSignals
}

export interface CommitmentRecord {
  commitmentId: string
  sessionId: string
  agreementHash: string
  parties: string[]
  merkleRoot: string
  txHash: string
  blockNumber: number
  chainId: number
  timestamp: Date
}
```

- [ ] **Step 6: Create strategy, config, error, and API types**

```typescript
// packages/types/src/strategy.ts
import { MandateParams } from './credentials.js'
import { NegotiationTurn, TurnContext, TurnDecision } from './negotiation.js'

export interface NegotiationStrategy {
  name: string
  initialize(mandate: MandateParams): Promise<void>
  decideTurn(context: TurnContext): Promise<TurnDecision>
  onCounterOffer(turn: NegotiationTurn): Promise<TurnDecision>
  shouldAccept(turn: NegotiationTurn): Promise<boolean>
  shouldWalkAway(context: TurnContext): Promise<boolean>
}

export interface RuleBasedConfig {
  initialOfferRatio: number    // e.g. 0.7 = 70% of max mandate
  concessionRate: number       // e.g. 0.05 = 5% per turn
  walkAwayThreshold: number    // e.g. 0.95 = reject if > 95% of max
  maxTurns: number
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai'
  model: string
  systemPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface ScriptedConfig {
  responses: TurnDecision[]
}
```

```typescript
// packages/types/src/config.ts
export interface AttestaraConfig {
  agent: {
    did: string
    keyFile: string
    credentialFile?: string
  }
  network: NetworkConfig
  prover: ProverConfig
  relay?: {
    url: string
    apiKey?: string
  }
}

export interface NetworkConfig {
  chain: 'local' | 'arbitrum-sepolia' | 'arbitrum-one'
  rpcUrl: string | string[]  // array for fallback
  contracts?: {
    agentRegistry: string
    credentialRegistry: string
    commitmentContract: string
  }
}

export interface ProverConfig {
  mode: 'local' | 'remote'
  remoteUrl?: string
  circuitDir?: string
}
```

```typescript
// packages/types/src/errors.ts
export enum ErrorCode {
  // Auth
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  // Agent
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_DEACTIVATED = 'AGENT_DEACTIVATED',
  DID_ALREADY_REGISTERED = 'DID_ALREADY_REGISTERED',
  // Credential
  CREDENTIAL_NOT_FOUND = 'CREDENTIAL_NOT_FOUND',
  CREDENTIAL_EXPIRED = 'CREDENTIAL_EXPIRED',
  CREDENTIAL_REVOKED = 'CREDENTIAL_REVOKED',
  // Session
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_NOT_ACTIVE = 'SESSION_NOT_ACTIVE',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TURN = 'INVALID_TURN',
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  MAX_TURNS_REACHED = 'MAX_TURNS_REACHED',
  // Proof
  PROOF_GENERATION_FAILED = 'PROOF_GENERATION_FAILED',
  PROOF_VERIFICATION_FAILED = 'PROOF_VERIFICATION_FAILED',
  CIRCUIT_NOT_FOUND = 'CIRCUIT_NOT_FOUND',
  // Commitment
  COMMITMENT_NOT_FOUND = 'COMMITMENT_NOT_FOUND',
  COMMITMENT_ALREADY_EXISTS = 'COMMITMENT_ALREADY_EXISTS',
  // Chain
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  RPC_ERROR = 'RPC_ERROR',
  // General
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AttestaraError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AttestaraError'
  }
}
```

```typescript
// packages/types/src/api.ts
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  requestId: string
}

// Auth
export interface RegisterRequest {
  email: string
  password: string
  orgName: string
  walletAddress?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface WalletAuthRequest {
  message: string
  signature: string
  address: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    email: string
    orgId: string
    role: string
  }
}

// Webhook
export interface WebhookPayload {
  id: string
  event: string
  timestamp: string
  data: Record<string, unknown>
}
```

- [ ] **Step 7: Create barrel export**

```typescript
// packages/types/src/index.ts
export * from './did.js'
export * from './credentials.js'
export * from './zk.js'
export * from './negotiation.js'
export * from './commitment.js'
export * from './strategy.js'
export * from './config.js'
export * from './errors.js'
export * from './api.js'
```

- [ ] **Step 8: Build and verify types compile**

```bash
cd packages/types && pnpm build
```

Expected: Clean compilation, `dist/` populated with `.js` and `.d.ts` files.

- [ ] **Step 9: Commit**

```bash
git add packages/types/
git commit -m "feat: define @attestara/types — all shared interfaces for DID, VC, ZK, negotiation, commitment"
```

---

### Task 3: Define Smart Contract Interfaces (Solidity)

**Files:**
- Create: `packages/contracts/contracts/interfaces/IAgentRegistry.sol`
- Create: `packages/contracts/contracts/interfaces/ICredentialRegistry.sol`
- Create: `packages/contracts/contracts/interfaces/ICommitmentContract.sol`
- Create: `packages/contracts/contracts/interfaces/IVerifierRegistry.sol`
- Create: `packages/contracts/hardhat.config.ts`

- [ ] **Step 1: Set up Hardhat config**

```typescript
// packages/contracts/hardhat.config.ts
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    'arbitrum-sepolia': {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || '',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    'arbitrum-one': {
      url: process.env.ARBITRUM_ONE_RPC_URL || '',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
}

export default config
```

- [ ] **Step 2: Create IAgentRegistry interface**

```solidity
// packages/contracts/contracts/interfaces/IAgentRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    struct AgentRecord {
        bytes32 agentId;
        string did;
        address orgAdmin;
        bytes publicKey;
        string metadata;
        bool active;
        uint256 registeredAt;
    }

    event AgentRegistered(bytes32 indexed agentId, string did, address indexed orgAdmin);
    event AgentUpdated(bytes32 indexed agentId, string metadata);
    event KeyRotated(bytes32 indexed agentId, bytes newPublicKey);
    event AgentDeactivated(bytes32 indexed agentId);

    // Note: spec says registerAgent(did, orgId, metadata) but we use msg.sender as orgAdmin
    // instead of an explicit orgId param. This is an intentional simplification — org identity
    // is inferred from the signing address. The relay maps wallet addresses to org IDs off-chain.
    function registerAgent(string calldata did, string calldata metadata, bytes calldata publicKey) external returns (bytes32 agentId);
    function updateAgent(bytes32 agentId, string calldata metadata) external;
    function rotateKey(bytes32 agentId, bytes calldata newPublicKey) external;
    function resolveAgent(string calldata did) external view returns (AgentRecord memory);
    function resolveAgentById(bytes32 agentId) external view returns (AgentRecord memory);
    function deactivateAgent(bytes32 agentId) external;
    function isRegistered(string calldata did) external view returns (bool);
}
```

- [ ] **Step 3: Create ICredentialRegistry interface**

```solidity
// packages/contracts/contracts/interfaces/ICredentialRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICredentialRegistry {
    event CredentialRegistered(bytes32 indexed credentialHash, bytes32 indexed agentId, uint256 expiry);
    event CredentialRevoked(bytes32 indexed credentialHash);

    function registerCredential(bytes32 credentialHash, bytes32 agentId, bytes32 schemaHash, uint256 expiry) external;
    function revokeCredential(bytes32 credentialHash) external;
    function isValid(bytes32 credentialHash) external view returns (bool);
    function getExpiry(bytes32 credentialHash) external view returns (uint256);
    function getIssuer(bytes32 credentialHash) external view returns (address);
}
```

- [ ] **Step 4: Create IVerifierRegistry interface**

```solidity
// packages/contracts/contracts/interfaces/IVerifierRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifierRegistry {
    event VerifierRegistered(bytes32 indexed circuitId, address verifier);
    event CircuitVersionDeprecated(bytes32 indexed circuitId);

    function registerVerifier(bytes32 circuitId, address verifier) external;
    function getVerifier(bytes32 circuitId) external view returns (address);
    function deprecateCircuit(bytes32 circuitId) external;
    function isDeprecated(bytes32 circuitId) external view returns (bool);
}
```

- [ ] **Step 5: Create ICommitmentContract interface**

```solidity
// packages/contracts/contracts/interfaces/ICommitmentContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICommitmentContract {
    struct CommitmentRecord {
        bytes32 commitmentId;
        bytes32 sessionId;
        bytes32 agreementHash;
        bytes32[] parties;         // agent IDs
        bytes32[] credentialHashes;
        bytes32[] proofTypes;      // circuit IDs for verifier lookup
        bytes32 merkleRoot;
        bool verified;
        uint256 createdAt;
    }

    event SessionAnchored(bytes32 indexed sessionId, bytes32 merkleRoot, bytes32[] parties, uint256 turnCount);
    event CommitmentCreated(bytes32 indexed commitmentId, bytes32 indexed sessionId, bytes32 agreementHash);
    event CommitmentFlagged(bytes32 indexed commitmentId, address flaggedBy, string reason);

    function anchorSession(
        bytes32 sessionId,
        bytes32 merkleRoot,
        bytes32[] calldata parties,
        uint256 turnCount
    ) external;

    function createCommitment(
        bytes32 sessionId,
        bytes32 agreementHash,
        bytes32[] calldata parties,
        bytes32[] calldata credentialHashes,
        uint256[8][] calldata proofs,
        uint256[][] calldata publicSignals,
        bytes32[] calldata proofTypes,
        bytes[] calldata signatures
    ) external returns (bytes32 commitmentId);

    function getCommitment(bytes32 commitmentId) external view returns (CommitmentRecord memory);
    function getSessionCommitments(bytes32 sessionId) external view returns (CommitmentRecord[] memory);
    function flagCommitment(bytes32 commitmentId, string calldata reason) external;
}
```

- [ ] **Step 6: Verify contracts compile**

```bash
cd packages/contracts && npx hardhat compile
```

Expected: Clean compilation, no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/
git commit -m "feat: define Solidity interfaces for AgentRegistry, CredentialRegistry, CommitmentContract, VerifierRegistry"
```

---

### Task 4: Set Up Docker Compose + CI Pipeline

**Files:**
- Create: `infrastructure/docker-compose.yml`
- Create: `infrastructure/docker-compose.test.yml`
- Create: `.github/workflows/ci.yml`
- Create: `scripts/setup.sh`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
# infrastructure/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: attestara
      POSTGRES_USER: attestara
      POSTGRES_PASSWORD: attestara_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  ipfs:
    image: ipfs/kubo:latest
    ports:
      - '5001:5001'
      - '8080:8080'
    volumes:
      - ipfs_data:/data/ipfs

  hardhat:
    build:
      context: ..
      dockerfile: infrastructure/Dockerfile.hardhat
    ports:
      - '8545:8545'
    command: npx hardhat node --hostname 0.0.0.0

volumes:
  postgres_data:
  ipfs_data:
```

- [ ] **Step 2: Create test docker-compose**

```yaml
# infrastructure/docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: attestara_test
      POSTGRES_USER: attestara
      POSTGRES_PASSWORD: attestara_test
    ports:
      - '5433:5432'

  redis-test:
    image: redis:7-alpine
    ports:
      - '6380:6379'
```

- [ ] **Step 3: Create CI pipeline**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - name: Cache circuit artifacts
        uses: actions/cache@v4
        with:
          path: packages/contracts/circuits/build
          key: circuits-${{ hashFiles('packages/contracts/circuits/**/*.circom') }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:contracts

  test-sdk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:sdk

  test-relay:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: attestara_test
          POSTGRES_USER: attestara
          POSTGRES_PASSWORD: attestara_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:relay
        env:
          DATABASE_URL: postgresql://attestara:attestara_test@localhost:5432/attestara_test
          REDIS_URL: redis://localhost:6379

  test-portal:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:portal

  build:
    needs: [lint-typecheck, test-contracts, test-sdk, test-relay, test-portal]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

- [ ] **Step 4: Create setup script**

```bash
#!/usr/bin/env bash
# scripts/setup.sh
set -euo pipefail

echo "=== Attestara Dev Setup ==="

echo "1. Installing dependencies..."
pnpm install

echo "2. Building types package..."
pnpm --filter @attestara/types build

echo "3. Starting infrastructure..."
docker-compose -f infrastructure/docker-compose.yml up -d

echo "4. Running Prisma migrations..."
pnpm --filter @attestara/relay exec prisma migrate dev

echo "5. Compiling contracts..."
pnpm --filter @attestara/contracts exec hardhat compile

echo "=== Setup complete! ==="
echo "Run 'pnpm dev' to start all services."
```

- [ ] **Step 5: Create Dockerfiles**

```dockerfile
# infrastructure/Dockerfile.relay
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/types ./packages/types
COPY packages/relay ./packages/relay
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @attestara/relay build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/relay/dist ./dist
COPY --from=builder /app/packages/relay/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

```dockerfile
# infrastructure/Dockerfile.prover
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
CMD ["node", "dist/server.js"]
```

- [ ] **Step 6: Create render.yaml**

```yaml
# infrastructure/render.yaml
services:
  - type: web
    name: attestara-portal
    runtime: node
    buildCommand: pnpm install && pnpm --filter @attestara/portal build
    startCommand: pnpm --filter @attestara/portal start
    envVars:
      - key: NEXT_PUBLIC_RELAY_URL
        sync: false

  - type: web
    name: attestara-relay
    runtime: docker
    dockerfilePath: infrastructure/Dockerfile.relay
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
      - key: PROVER_URL
        value: http://attestara-prover:3002

  - type: pserv  # private service — no public ingress
    name: attestara-prover
    runtime: docker
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

databases:
  - name: attestara-db
    plan: starter

  - name: attestara-redis
    plan: starter
```

- [ ] **Step 7: Commit**

```bash
git add infrastructure/ .github/ scripts/
git commit -m "feat: add docker-compose, Dockerfiles, render.yaml, GitHub Actions CI, and dev setup script"
```

---

### Task 5: Create .env.example and Configuration

**Files:**
- Create: `.env.example`
- Create: `packages/relay/src/config.ts`
- Create: `packages/prover/src/config.ts`

- [ ] **Step 1: Create .env.example**

```bash
# .env.example

# Database
DATABASE_URL=postgresql://attestara:attestara_dev@localhost:5432/attestara

# Redis
REDIS_URL=redis://localhost:6379

# Chain
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_ONE_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=

# IPFS
PINATA_API_KEY=
PINATA_API_SECRET=
IPFS_GATEWAY_URL=http://localhost:8080

# Auth
JWT_SECRET=change-me-in-production
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Service-to-service
PROVER_INTERNAL_SECRET=change-me-in-production
PROVER_URL=http://localhost:3002

# Encryption
ORG_MASTER_KEY_SECRET=change-me-in-production

# Portal
NEXT_PUBLIC_RELAY_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=421614

# LLM (optional, for LLMStrategy)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

- [ ] **Step 2: Create relay config**

```typescript
// packages/relay/src/config.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  PROVER_INTERNAL_SECRET: z.string().min(16),
  PROVER_URL: z.string().url().default('http://localhost:3002'),
  ORG_MASTER_KEY_SECRET: z.string().min(32),
  PINATA_API_KEY: z.string().optional(),
  PINATA_API_SECRET: z.string().optional(),
  IPFS_GATEWAY_URL: z.string().default('http://localhost:8080'),
  ARBITRUM_SEPOLIA_RPC_URL: z.string().optional(),
  ARBITRUM_ONE_RPC_URL: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Config = z.infer<typeof envSchema>

export function loadConfig(): Config {
  return envSchema.parse(process.env)
}
```

- [ ] **Step 3: Create prover config**

```typescript
// packages/prover/src/config.ts
import { z } from 'zod'

const envSchema = z.object({
  PROVER_INTERNAL_SECRET: z.string().min(16),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CIRCUIT_DIR: z.string().default('./circuits/build'),
  WORKER_POOL_SIZE: z.coerce.number().default(4),
  PORT: z.coerce.number().default(3002),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type ProverConfig = z.infer<typeof envSchema>

export function loadProverConfig(): ProverConfig {
  return envSchema.parse(process.env)
}
```

- [ ] **Step 4: Commit**

```bash
git add .env.example packages/relay/src/config.ts packages/prover/src/config.ts
git commit -m "feat: add environment configuration with Zod validation"
```

---

## Track 1: ZK + Contracts (Weeks 2-10)

> **Owner:** You (contracts) + ZK Contractor (circuits)
> **Dependency:** Phase 0 complete (types + interfaces defined)

### Task 6: Implement MandateBound Circuit

**Files:**
- Create: `packages/contracts/circuits/MandateBound.circom`
- Create: `packages/contracts/test/circuits/MandateBound.test.ts`

**Note:** This task is primarily for the ZK contractor. The circuit spec and test requirements are documented here for handoff.

- [ ] **Step 1: Write failing circuit tests**

```typescript
// packages/contracts/test/circuits/MandateBound.test.ts
import { expect } from 'chai'
import { wasm as wasmTester } from 'circom_tester'
import path from 'path'

describe('MandateBound Circuit', () => {
  let circuit: any

  before(async () => {
    circuit = await wasmTester(
      path.join(__dirname, '../../circuits/MandateBound.circom')
    )
  })

  it('should generate valid proof when proposed ≤ max_value', async () => {
    const input = {
      proposed: 400000n,
      max_value: 500000n,
      randomness: 12345n,
    }
    const witness = await circuit.calculateWitness(input)
    await circuit.checkConstraints(witness)
  })

  it('should generate valid proof when proposed == max_value (boundary)', async () => {
    const input = {
      proposed: 500000n,
      max_value: 500000n,
      randomness: 99999n,
    }
    const witness = await circuit.calculateWitness(input)
    await circuit.checkConstraints(witness)
  })

  it('should generate valid proof when proposed is 0', async () => {
    const input = {
      proposed: 0n,
      max_value: 500000n,
      randomness: 11111n,
    }
    const witness = await circuit.calculateWitness(input)
    await circuit.checkConstraints(witness)
  })

  // SOUNDNESS TEST: must fail
  it('should FAIL when proposed > max_value', async () => {
    const input = {
      proposed: 500001n,
      max_value: 500000n,
      randomness: 12345n,
    }
    try {
      await circuit.calculateWitness(input)
      expect.fail('Should have thrown — proposed > max_value')
    } catch (err) {
      // Expected: witness generation fails
    }
  })

  it('should verify commitment hash matches Poseidon(max_value, randomness)', async () => {
    const input = {
      proposed: 400000n,
      max_value: 500000n,
      randomness: 12345n,
    }
    const witness = await circuit.calculateWitness(input)
    // commitment output (public signal) should equal Poseidon(max_value, randomness)
    // Verify the output signals match expected Poseidon hash
    await circuit.checkConstraints(witness)
  })

  it('should have approximately 350 constraints', async () => {
    // Regression test: constraint count should not drift significantly
    const constraintCount = await circuit.getConstraintCount?.()
    if (constraintCount !== undefined) {
      expect(constraintCount).to.be.lessThan(500)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (circuit not yet implemented)**

```bash
cd packages/contracts && npx hardhat test test/circuits/MandateBound.test.ts
```

Expected: FAIL — circuit file not found.

- [ ] **Step 3: Implement MandateBound circuit**

```circom
// packages/contracts/circuits/MandateBound.circom
pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";

template MandateBound(n) {
    // Public inputs
    signal input proposed;
    signal input commitment;

    // Private inputs
    signal input max_value;
    signal input randomness;

    // 1. Range check: proposed ≤ max_value
    //    Equivalent to: max_value - proposed ≥ 0 (fits in n bits)
    signal diff;
    diff <== max_value - proposed;

    component rangeCheck = Num2Bits(n);
    rangeCheck.in <== diff;
    // If diff is negative (underflow), it won't fit in n bits → constraint fails

    // 2. Verify commitment = Poseidon(max_value, randomness)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== max_value;
    hasher.inputs[1] <== randomness;
    commitment === hasher.out;
}

component main {public [proposed, commitment]} = MandateBound(64);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/contracts && npx hardhat test test/circuits/MandateBound.test.ts
```

Expected: All tests PASS, including the soundness test (proposed > max_value fails).

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/circuits/MandateBound.circom packages/contracts/test/circuits/
git commit -m "feat: implement MandateBound circuit with Poseidon commitment and range check"
```

---

### Task 7: Implement ParameterRange Circuit

**Files:**
- Create: `packages/contracts/circuits/ParameterRange.circom`
- Create: `packages/contracts/test/circuits/ParameterRange.test.ts`

- [ ] **Step 1: Write failing circuit tests**

Tests should cover:
- Valid: `floor < proposed < ceiling` → passes
- Boundary: `proposed == floor` → passes
- Boundary: `proposed == ceiling` → passes
- SOUNDNESS: `proposed < floor` → fails
- SOUNDNESS: `proposed > ceiling` → fails
- Valid: `floor == 0, proposed == 0` → passes
- Commitment verification: `Poseidon(floor, ceiling, randomness)` matches

- [ ] **Step 2: Implement ParameterRange circuit**

```circom
// packages/contracts/circuits/ParameterRange.circom
pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";

template ParameterRange(n) {
    signal input proposed;
    signal input commitment;

    signal input floor;
    signal input ceiling;
    signal input randomness;

    // 1. Range check: proposed - floor ≥ 0
    signal diffLower;
    diffLower <== proposed - floor;
    component lowerCheck = Num2Bits(n);
    lowerCheck.in <== diffLower;

    // 2. Range check: ceiling - proposed ≥ 0
    signal diffUpper;
    diffUpper <== ceiling - proposed;
    component upperCheck = Num2Bits(n);
    upperCheck.in <== diffUpper;

    // 3. Verify commitment = Poseidon(floor, ceiling, randomness)
    component hasher = Poseidon(3);
    hasher.inputs[0] <== floor;
    hasher.inputs[1] <== ceiling;
    hasher.inputs[2] <== randomness;
    commitment === hasher.out;
}

component main {public [proposed, commitment]} = ParameterRange(64);
```

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: implement ParameterRange circuit with dual range check and single commitment"
```

---

### Task 8: Implement CredentialFreshness Circuit

**Files:**
- Create: `packages/contracts/circuits/CredentialFreshness.circom`
- Create: `packages/contracts/test/circuits/CredentialFreshness.test.ts`

- [ ] **Step 1: Write failing circuit tests**

Tests should cover:
- Valid: `issuance < current < expiry` → passes
- SOUNDNESS: `current < issuance` (not yet active) → fails
- SOUNDNESS: `current > expiry` (expired) → fails
- Boundary: `current == issuance` → passes
- Boundary: `current == expiry - 1` → passes
- SOUNDNESS: `current == expiry` (exact boundary) → fails (spec requires strict `current < expiry`)
- Commitment verification: `Poseidon(credential_data_hash, issuance, expiry, blinding_factor)` matches

- [ ] **Step 2: Implement CredentialFreshness circuit**

```circom
// packages/contracts/circuits/CredentialFreshness.circom
pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/bitify.circom";

template CredentialFreshness(n) {
    signal input current_timestamp;
    signal input credential_commitment;

    signal input issuance_timestamp;
    signal input expiry_timestamp;
    signal input credential_data_hash;
    signal input blinding_factor;

    // 1. Check current_timestamp ≥ issuance_timestamp
    signal diffIssued;
    diffIssued <== current_timestamp - issuance_timestamp;
    component issuedCheck = Num2Bits(n);
    issuedCheck.in <== diffIssued;

    // 2. Check expiry_timestamp > current_timestamp (i.e. expiry - current - 1 ≥ 0)
    signal diffExpiry;
    diffExpiry <== expiry_timestamp - current_timestamp - 1;
    component expiryCheck = Num2Bits(n);
    expiryCheck.in <== diffExpiry;

    // 3. Verify credential_commitment = Poseidon(credential_data_hash, issuance, expiry, blinding)
    component hasher = Poseidon(4);
    hasher.inputs[0] <== credential_data_hash;
    hasher.inputs[1] <== issuance_timestamp;
    hasher.inputs[2] <== expiry_timestamp;
    hasher.inputs[3] <== blinding_factor;
    credential_commitment === hasher.out;
}

component main {public [current_timestamp, credential_commitment]} = CredentialFreshness(64);
```

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: implement CredentialFreshness circuit with issuance+expiry checks and Poseidon(4) commitment"
```

---

### Task 9: Implement IdentityBinding Circuit

**Files:**
- Create: `packages/contracts/circuits/IdentityBinding.circom`
- Create: `packages/contracts/test/circuits/IdentityBinding.test.ts`

**Note:** This is the most complex circuit (~3,000-6,000 constraints). If Week 5 benchmarks exceed 5s proof time, switch to the fallback spec (external EdDSA signature + on-chain verification).

- [ ] **Step 1: Write failing tests** (include both ZK path and fallback path stubs)
- [ ] **Step 2: Implement circuit** (EdDSA verification inside Circom using circomlib's EdDSAPoseidonVerifier)
- [ ] **Step 3: Run tests + benchmark proof generation time**
- [ ] **Step 4: If proof time > 5s, implement fallback** (SignatureVerifier.sol contract)
- [ ] **Step 5: Commit**

---

### Task 10: Trusted Setup Ceremony + Verifier Generation

**Files:**
- Create: `scripts/ceremony/setup.sh`
- Create: `scripts/ceremony/generate-verifiers.sh`
- Create: `packages/contracts/scripts/generate-verifiers.ts`

- [ ] **Step 1: Create ceremony script**

```bash
#!/usr/bin/env bash
# scripts/ceremony/setup.sh
# PoC ceremony: 2-5 participants, NOT production-grade
set -euo pipefail

CIRCUITS=("MandateBound" "ParameterRange" "CredentialFreshness" "IdentityBinding")
BUILD_DIR="packages/contracts/circuits/build"
PTAU_FILE="$BUILD_DIR/pot14_final.ptau"

mkdir -p "$BUILD_DIR"

# Download powers of tau (use existing ceremony artifact)
if [ ! -f "$PTAU_FILE" ]; then
  echo "Downloading powers of tau..."
  curl -L -o "$PTAU_FILE" \
    "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau"
fi

for CIRCUIT in "${CIRCUITS[@]}"; do
  echo "=== Processing $CIRCUIT ==="

  # Compile circuit
  circom "packages/contracts/circuits/$CIRCUIT.circom" \
    --r1cs --wasm --sym \
    -o "$BUILD_DIR" \
    -l node_modules

  # Phase 2 setup
  npx snarkjs groth16 setup \
    "$BUILD_DIR/$CIRCUIT.r1cs" \
    "$PTAU_FILE" \
    "$BUILD_DIR/${CIRCUIT}_0000.zkey"

  # Contribute (PoC: single contribution)
  npx snarkjs zkey contribute \
    "$BUILD_DIR/${CIRCUIT}_0000.zkey" \
    "$BUILD_DIR/${CIRCUIT}_final.zkey" \
    --name="PoC contribution 1" -v -e="$(head -c 64 /dev/urandom | xxd -p)"

  # Export verification key
  npx snarkjs zkey export verificationkey \
    "$BUILD_DIR/${CIRCUIT}_final.zkey" \
    "$BUILD_DIR/${CIRCUIT}_vkey.json"

  # Generate Solidity verifier
  npx snarkjs zkey export solidityverifier \
    "$BUILD_DIR/${CIRCUIT}_final.zkey" \
    "packages/contracts/contracts/verifiers/${CIRCUIT}Verifier.sol"

  echo "=== $CIRCUIT complete ==="
done

echo "All circuits processed. Verifier contracts generated."
```

- [ ] **Step 2: Run ceremony, generate all artifacts**
- [ ] **Step 3: Benchmark all circuits** (proof generation time, constraint counts)
- [ ] **Step 4: Record results in `docs/benchmarks.md`**
- [ ] **Step 5: Commit**

```bash
git add scripts/ceremony/ packages/contracts/contracts/verifiers/ docs/benchmarks.md
git commit -m "feat: trusted setup ceremony + Groth16 verifier contract generation for all 4 circuits"
```

---

### Task 11: Implement AgentRegistry Contract

**Files:**
- Create: `packages/contracts/contracts/AgentRegistry.sol`
- Create: `packages/contracts/test/AgentRegistry.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/contracts/test/AgentRegistry.test.ts
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { AgentRegistry } from '../typechain-types'

describe('AgentRegistry', () => {
  let registry: AgentRegistry
  let owner: any, orgAdmin: any, other: any

  beforeEach(async () => {
    [owner, orgAdmin, other] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory('AgentRegistry')
    registry = await Factory.deploy()
  })

  describe('registerAgent', () => {
    it('should register an agent and emit AgentRegistered', async () => {
      const did = 'did:ethr:arb1:0x1234567890abcdef'
      const metadata = '{"name":"buyer-agent"}'
      const pubKey = ethers.randomBytes(32)

      const tx = await registry.connect(orgAdmin).registerAgent(did, metadata, pubKey)
      const receipt = await tx.wait()

      // Verify event
      const event = receipt?.logs.find(l => l.fragment?.name === 'AgentRegistered')
      expect(event).to.not.be.undefined
    })

    it('should reject duplicate DID registration', async () => {
      const did = 'did:ethr:arb1:0xduplicate'
      const pubKey = ethers.randomBytes(32)
      await registry.connect(orgAdmin).registerAgent(did, '{}', pubKey)

      await expect(
        registry.connect(orgAdmin).registerAgent(did, '{}', pubKey)
      ).to.be.revertedWith('DID already registered')
    })
  })

  describe('resolveAgent', () => {
    it('should resolve a registered agent by DID', async () => {
      const did = 'did:ethr:arb1:0xresolvable'
      const pubKey = ethers.randomBytes(32)
      await registry.connect(orgAdmin).registerAgent(did, '{"name":"test"}', pubKey)

      const record = await registry.resolveAgent(did)
      expect(record.did).to.equal(did)
      expect(record.active).to.be.true
      expect(record.orgAdmin).to.equal(orgAdmin.address)
    })
  })

  describe('rotateKey', () => {
    it('should rotate key and emit KeyRotated', async () => {
      const did = 'did:ethr:arb1:0xrotatable'
      const pubKey = ethers.randomBytes(32)
      await registry.connect(orgAdmin).registerAgent(did, '{}', pubKey)

      const record = await registry.resolveAgent(did)
      const newKey = ethers.randomBytes(32)
      await expect(registry.connect(orgAdmin).rotateKey(record.agentId, newKey))
        .to.emit(registry, 'KeyRotated')
    })

    it('should reject key rotation from non-admin', async () => {
      const did = 'did:ethr:arb1:0xprotected'
      const pubKey = ethers.randomBytes(32)
      await registry.connect(orgAdmin).registerAgent(did, '{}', pubKey)

      const record = await registry.resolveAgent(did)
      await expect(
        registry.connect(other).rotateKey(record.agentId, ethers.randomBytes(32))
      ).to.be.revertedWith('Not agent admin')
    })
  })

  describe('deactivateAgent', () => {
    it('should deactivate agent and mark as inactive', async () => {
      const did = 'did:ethr:arb1:0xdeactivatable'
      const pubKey = ethers.randomBytes(32)
      await registry.connect(orgAdmin).registerAgent(did, '{}', pubKey)

      const record = await registry.resolveAgent(did)
      await registry.connect(orgAdmin).deactivateAgent(record.agentId)

      const updated = await registry.resolveAgent(did)
      expect(updated.active).to.be.false
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement AgentRegistry.sol**

```solidity
// packages/contracts/contracts/AgentRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAgentRegistry.sol";

contract AgentRegistry is IAgentRegistry {
    mapping(bytes32 => AgentRecord) private agents;
    mapping(bytes32 => bytes32) private didToAgentId; // keccak256(did) → agentId
    uint256 private agentCounter;

    function registerAgent(
        string calldata did,
        string calldata metadata,
        bytes calldata publicKey
    ) external returns (bytes32 agentId) {
        bytes32 didHash = keccak256(bytes(did));
        require(didToAgentId[didHash] == bytes32(0), "DID already registered");

        agentCounter++;
        agentId = keccak256(abi.encodePacked(msg.sender, did, agentCounter));

        agents[agentId] = AgentRecord({
            agentId: agentId,
            did: did,
            orgAdmin: msg.sender,
            publicKey: publicKey,
            metadata: metadata,
            active: true,
            registeredAt: block.timestamp
        });

        didToAgentId[didHash] = agentId;
        emit AgentRegistered(agentId, did, msg.sender);
    }

    function updateAgent(bytes32 agentId, string calldata metadata) external {
        require(agents[agentId].orgAdmin == msg.sender, "Not agent admin");
        require(agents[agentId].active, "Agent deactivated");
        agents[agentId].metadata = metadata;
        emit AgentUpdated(agentId, metadata);
    }

    function rotateKey(bytes32 agentId, bytes calldata newPublicKey) external {
        require(agents[agentId].orgAdmin == msg.sender, "Not agent admin");
        require(agents[agentId].active, "Agent deactivated");
        agents[agentId].publicKey = newPublicKey;
        emit KeyRotated(agentId, newPublicKey);
    }

    function resolveAgent(string calldata did) external view returns (AgentRecord memory) {
        bytes32 didHash = keccak256(bytes(did));
        bytes32 agentId = didToAgentId[didHash];
        require(agentId != bytes32(0), "Agent not found");
        return agents[agentId];
    }

    function resolveAgentById(bytes32 agentId) external view returns (AgentRecord memory) {
        require(agents[agentId].registeredAt != 0, "Agent not found");
        return agents[agentId];
    }

    function deactivateAgent(bytes32 agentId) external {
        require(agents[agentId].orgAdmin == msg.sender, "Not agent admin");
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    function isRegistered(string calldata did) external view returns (bool) {
        bytes32 didHash = keccak256(bytes(did));
        return didToAgentId[didHash] != bytes32(0);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: implement AgentRegistry contract with DID registration, key rotation, and access control"
```

---

### Task 12: Implement CredentialRegistry Contract

**Files:**
- Create: `packages/contracts/contracts/CredentialRegistry.sol`
- Create: `packages/contracts/test/CredentialRegistry.test.ts`

Follow same TDD pattern as Task 11. Tests cover:
- Register credential with expiry
- Revoke credential
- `isValid()` returns true for active, false for revoked, false for expired
- Only issuer can revoke
- Double-revoke is idempotent

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Implement CredentialRegistry.sol**
- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

### Task 13: Implement VerifierRegistry Contract

**Note:** The spec embeds the `verifiers` mapping inside `CommitmentContract`. This plan intentionally extracts it into a standalone `VerifierRegistry` for better separation of concerns — verifier management has its own access control and timelock governance requirements. This is an improvement over the spec; update the spec to reflect this if not already done.

**Files:**
- Create: `packages/contracts/contracts/VerifierRegistry.sol`
- Create: `packages/contracts/test/VerifierRegistry.test.ts`

Tests cover:
- Register a verifier for a circuit ID
- Look up verifier by circuit ID
- Deprecate a circuit version
- Only owner can register/deprecate
- Querying unregistered circuit returns zero address
- **48-hour timelock on verifier registration**: `proposeVerifier()` → 48h delay → `executeVerifier()` (use OpenZeppelin `TimelockController`)
- **48-hour timelock on circuit deprecation**: same propose/execute pattern
- Immediate reads via `getVerifier()` return only executed (live) verifiers

The contract should use OpenZeppelin `TimelockController` as the governance layer. The deploy script must configure the timelock with a 48-hour `minDelay` for mainnet (0 for local/testnet for dev convenience).

- [ ] **Step 1: Write failing tests** (include timelock tests)
- [ ] **Step 2: Implement VerifierRegistry.sol with TimelockController integration**
- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

### Task 14: Implement CommitmentContract

**Files:**
- Create: `packages/contracts/contracts/CommitmentContract.sol`
- Create: `packages/contracts/test/CommitmentContract.test.ts`

This is the most complex contract. Tests cover:
- Anchor session with merkle root
- Create commitment with dual signatures + proof verification
- `proofTypes[]` routes to correct verifier via VerifierRegistry
- Revert if any verifier is zero address (unregistered circuit)
- Revert if proof verification fails
- `flagCommitment()` emits event but has no enforcement
- Get commitment by ID
- Get session commitments
- Only registered agents can anchor/commit

- [ ] **Step 1: Write failing tests** (use mock verifier contracts that always return true/false for testing)
- [ ] **Step 2: Implement CommitmentContract.sol**
- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

### Task 15: Deploy Scripts + Testnet Deployment

**Files:**
- Create: `packages/contracts/scripts/deploy-local.ts`
- Create: `packages/contracts/scripts/deploy-testnet.ts`
- Create: `packages/contracts/scripts/deploy-mainnet.ts`

- [ ] **Step 1: Create local deploy script**

```typescript
// packages/contracts/scripts/deploy-local.ts
import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying with:', deployer.address)

  // Deploy AgentRegistry
  const AgentRegistry = await ethers.getContractFactory('AgentRegistry')
  const agentRegistry = await AgentRegistry.deploy()
  await agentRegistry.waitForDeployment()
  console.log('AgentRegistry:', await agentRegistry.getAddress())

  // Deploy CredentialRegistry
  const CredentialRegistry = await ethers.getContractFactory('CredentialRegistry')
  const credentialRegistry = await CredentialRegistry.deploy()
  await credentialRegistry.waitForDeployment()
  console.log('CredentialRegistry:', await credentialRegistry.getAddress())

  // Deploy VerifierRegistry
  const VerifierRegistry = await ethers.getContractFactory('VerifierRegistry')
  const verifierRegistry = await VerifierRegistry.deploy()
  await verifierRegistry.waitForDeployment()
  console.log('VerifierRegistry:', await verifierRegistry.getAddress())

  // Deploy verifier contracts (generated from ceremony)
  // ... deploy each circuit verifier and register in VerifierRegistry

  // Deploy CommitmentContract
  const CommitmentContract = await ethers.getContractFactory('CommitmentContract')
  const commitmentContract = await CommitmentContract.deploy(
    await agentRegistry.getAddress(),
    await credentialRegistry.getAddress(),
    await verifierRegistry.getAddress()
  )
  await commitmentContract.waitForDeployment()
  console.log('CommitmentContract:', await commitmentContract.getAddress())

  // Write addresses to deployments.json
  const addresses = {
    agentRegistry: await agentRegistry.getAddress(),
    credentialRegistry: await credentialRegistry.getAddress(),
    verifierRegistry: await verifierRegistry.getAddress(),
    commitmentContract: await commitmentContract.getAddress(),
  }
  const fs = await import('fs')
  fs.writeFileSync('deployments.local.json', JSON.stringify(addresses, null, 2))
  console.log('Addresses written to deployments.local.json')
}

main().catch(console.error)
```

- [ ] **Step 2: Create testnet deploy script** (same pattern, uses Arbitrum Sepolia config, verifies on Arbiscan)
- [ ] **Step 3: Create mainnet deploy script** (AgentRegistry + CommitmentContract only, TransparentProxy, requires multi-sig)
- [ ] **Step 4: Deploy to Arbitrum Sepolia, verify on Arbiscan**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: deploy scripts for local, testnet (Arbitrum Sepolia), and mainnet (Arbitrum One)"
```

---

## Track 2: SDK + Backend (Weeks 2-10)

> **Owner:** Claude Code + You (review)
> **Dependency:** Phase 0 complete; integrates with Track 1 output at Week 7

### Task 16: SDK — Identity Module (Veramo DID)

**Files:**
- Create: `packages/sdk/src/identity/index.ts`
- Create: `packages/sdk/src/identity/veramo.ts`
- Test: `packages/sdk/test/identity.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/sdk/test/identity.test.ts
import { describe, it, expect } from 'vitest'
import { DIDManager } from '../src/identity/index.js'

describe('DIDManager', () => {
  it('should create a new DID with keypair', async () => {
    const manager = new DIDManager({ chain: 'local', rpcUrl: 'http://localhost:8545' })
    const result = await manager.create('test-agent')
    expect(result.did).toMatch(/^did:ethr:/)
    expect(result.publicKey).toBeDefined()
    expect(result.keyFile).toBeDefined()
  })

  it('should resolve a DID to agent record', async () => {
    const manager = new DIDManager({ chain: 'local', rpcUrl: 'http://localhost:8545' })
    const { did } = await manager.create('test-agent')
    const resolved = await manager.resolve(did)
    expect(resolved.id).toBe(did)
  })

  it('should rotate an agents key', async () => {
    const manager = new DIDManager({ chain: 'local', rpcUrl: 'http://localhost:8545' })
    const { did, publicKey: oldKey } = await manager.create('test-agent')
    const { publicKey: newKey } = await manager.rotateKey(did)
    expect(newKey).not.toBe(oldKey)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement DIDManager using Veramo**
- [ ] **Step 4: Run tests, verify pass**
- [ ] **Step 5: Commit**

---

### Task 17: SDK — Credentials Module (VC + IPFS)

**Files:**
- Create: `packages/sdk/src/credentials/index.ts`
- Create: `packages/sdk/src/credentials/ipfs.ts`
- Create: `packages/sdk/src/credentials/schemas.ts`
- Test: `packages/sdk/test/credentials.test.ts`

Tests cover:
- Issue a W3C Verifiable Credential with mandate params
- Verify a credential signature
- Store credential on IPFS, retrieve by CID
- Revoke credential on-chain
- Verify revoked credential returns invalid

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 18: SDK — Prover Module (Local + Remote)

**Files:**
- Create: `packages/sdk/src/prover/index.ts`
- Create: `packages/sdk/src/prover/local.ts`
- Create: `packages/sdk/src/prover/remote.ts`
- Test: `packages/sdk/test/prover.test.ts`

Tests cover:
- Generate MandateBound proof locally (using TestProver for speed in unit tests)
- Generate all 4 proof types
- Verify proof locally
- Remote prover sends HTTP request (mock server)
- Transparent mode switching (local vs remote same API)

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 19: SDK — Negotiation Module (Session + Turns)

**Files:**
- Create: `packages/sdk/src/negotiation/index.ts`
- Create: `packages/sdk/src/negotiation/session.ts`
- Create: `packages/sdk/src/negotiation/merkle.ts`
- Create: `packages/sdk/src/negotiation/turn.ts`
- Test: `packages/sdk/test/negotiation.test.ts`

Tests cover:
- Create a session
- Submit a turn with signed terms + proof
- Receive counterparty turn
- Accept a turn → session status becomes completed
- Reject a turn → session status becomes rejected
- Merkle root accumulates correctly across turns
- Turn sequence numbers increment correctly
- Event emitter fires correct events

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 20: SDK — Commitment Module (On-chain)

**Files:**
- Create: `packages/sdk/src/commitment/index.ts`
- Create: `packages/sdk/src/commitment/chain.ts`
- Test: `packages/sdk/test/commitment.test.ts`

Tests cover:
- Anchor session on-chain
- Create commitment with proofs + signatures
- Get commitment by ID
- List commitments with filters
- Verify commitment proofs on-chain
- Transaction retry on failure (gas increase)

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 21: SDK — Strategy System (Rule-based, LLM, Scripted)

**Files:**
- Create: `packages/sdk/src/agents/rule-based.ts`
- Create: `packages/sdk/src/agents/llm.ts`
- Create: `packages/sdk/src/agents/scripted.ts`
- Test: `packages/sdk/test/strategies.test.ts`

Tests cover:
- RuleBasedStrategy: follows concession rate, walks away at threshold, respects max turns
- LLMStrategy: calls LLM API (mocked), parses response into TurnDecision, stays within mandate
- ScriptedStrategy: replays pre-configured responses in order
- All strategies implement NegotiationStrategy interface

Also create `packages/sdk/src/agents/strategy.ts` as a barrel re-export of the `NegotiationStrategy` interface from `@attestara/types`.

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 22: SDK — Testing Utilities

**Files:**
- Create: `packages/sdk/src/testing/index.ts`
- Create: `packages/sdk/src/testing/mock-agent.ts`
- Create: `packages/sdk/src/testing/local-chain.ts`
- Create: `packages/sdk/src/testing/test-credentials.ts`
- Create: `packages/sdk/src/testing/test-prover.ts`
- Create: `packages/sdk/src/testing/session-recorder.ts`
- Test: `packages/sdk/test/testing-utils.test.ts`

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 23: SDK — AttestaraClient (Main Entry Point)

**Files:**
- Create: `packages/sdk/src/client.ts`
- Test: `packages/sdk/test/client.test.ts`

Wires all 5 modules together. Tests cover:
- Client initializes with config
- `client.identity`, `client.credentials`, `client.prover`, `client.negotiation`, `client.commitment` are accessible
- Full integration: create agent → issue credential → generate proof → create session → commit

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 24: Relay — Prisma Schema + Auth Routes

**Files:**
- Create: `packages/relay/prisma/schema.prisma`
- Create: `packages/relay/src/server.ts`
- Create: `packages/relay/src/routes/auth.ts`
- Create: `packages/relay/src/services/auth.service.ts`
- Create: `packages/relay/src/middleware/auth.ts`
- Create: `packages/relay/src/middleware/error-handler.ts`
- Test: `packages/relay/test/auth.test.ts`

- [ ] **Step 1: Create Prisma schema** (all tables from spec Section 7)

```prisma
// packages/relay/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organisation {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  plan      String   @default("starter")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users       User[]
  agents      Agent[]
  credentials Credential[]
  apiKeys     ApiKey[]
  webhooks    Webhook[]

  initiatedSessions   Session[] @relation("initiator_org")
  counterpartySessions Session[] @relation("counterparty_org")

  @@map("organisations")
}

model User {
  id            String   @id @default(uuid())
  orgId         String   @map("org_id")
  email         String   @unique
  passwordHash  String   @map("password_hash")
  walletAddress String?  @unique @map("wallet_address")
  role          String   @default("member")
  emailVerified Boolean  @default(false) @map("email_verified")
  createdAt     DateTime @default(now()) @map("created_at")

  org Organisation @relation(fields: [orgId], references: [id])

  @@map("users")
}

model Agent {
  id               String   @id @default(uuid())
  orgId            String   @map("org_id")
  did              String   @unique
  name             String
  status           String   @default("active")
  metadata         Json     @default("{}")
  publicKey        String   @map("public_key")
  registeredTxHash String?  @map("registered_tx_hash")
  createdAt        DateTime @default(now()) @map("created_at")

  org         Organisation @relation(fields: [orgId], references: [id])
  credentials Credential[]
  turns       Turn[]

  initiatedSessions   Session[] @relation("initiator_agent")
  counterpartySessions Session[] @relation("counterparty_agent")

  @@map("agents")
}

model Credential {
  id                    String   @id @default(uuid())
  orgId                 String   @map("org_id")
  agentId               String   @map("agent_id")
  credentialHash        String   @unique @map("credential_hash")
  schemaHash            String   @map("schema_hash")
  ipfsCid               String?  @map("ipfs_cid")
  credentialDataCached  Json?    @map("credential_data_cached")
  mandateParamsEncrypted Bytes?  @map("mandate_params_encrypted")
  mandateKeyVersion     Int      @default(1) @map("mandate_key_version")
  expiry                DateTime
  revoked               Boolean  @default(false)
  registeredTxHash      String?  @map("registered_tx_hash")
  createdAt             DateTime @default(now()) @map("created_at")

  org   Organisation @relation(fields: [orgId], references: [id])
  agent Agent        @relation(fields: [agentId], references: [id])

  @@map("credentials")
}

enum SessionType {
  intra_org
  cross_org
}

enum SessionStatus {
  pending_acceptance
  active
  completed
  rejected
  expired
  committed
  paused
}

model Session {
  id                  String        @id @default(uuid())
  initiatorAgentId    String        @map("initiator_agent_id")
  initiatorOrgId      String        @map("initiator_org_id")
  counterpartyAgentId String        @map("counterparty_agent_id")
  counterpartyOrgId   String        @map("counterparty_org_id")
  sessionType         SessionType   @default(intra_org) @map("session_type")
  inviteTokenHash     String?       @map("invite_token_hash")
  status              SessionStatus // No default — session.service must set explicitly (active for intra_org, pending_acceptance for cross_org)
  sessionConfig       Json          @default("{}") @map("session_config")
  merkleRoot          String?       @map("merkle_root")
  turnCount           Int           @default(0) @map("turn_count")
  anchorTxHash        String?       @map("anchor_tx_hash")
  createdAt           DateTime      @default(now()) @map("created_at")
  updatedAt           DateTime      @updatedAt @map("updated_at")

  initiatorAgent    Agent        @relation("initiator_agent", fields: [initiatorAgentId], references: [id])
  initiatorOrg      Organisation @relation("initiator_org", fields: [initiatorOrgId], references: [id])
  counterpartyAgent Agent        @relation("counterparty_agent", fields: [counterpartyAgentId], references: [id])
  counterpartyOrg   Organisation @relation("counterparty_org", fields: [counterpartyOrgId], references: [id])
  turns             Turn[]
  commitment        Commitment?

  @@index([initiatorAgentId])
  @@index([counterpartyAgentId])
  @@index([initiatorOrgId])
  @@index([counterpartyOrgId])
  @@index([status])
  @@map("sessions")
}

model Turn {
  id             String   @id @default(uuid())
  sessionId      String   @map("session_id")
  agentId        String   @map("agent_id")
  sequenceNumber Int      @map("sequence_number")
  terms          Json
  proofType      String   @map("proof_type")
  proof          Json
  publicSignals  Json     @map("public_signals")
  signature      String
  createdAt      DateTime @default(now()) @map("created_at")

  session Session @relation(fields: [sessionId], references: [id])
  agent   Agent   @relation(fields: [agentId], references: [id])

  @@unique([sessionId, sequenceNumber])
  @@map("turns")
}

model Commitment {
  id               String   @id @default(uuid())
  sessionId        String   @unique @map("session_id")
  agreementHash    String   @map("agreement_hash")
  parties          String[] // agent IDs
  credentialHashes String[] @map("credential_hashes")
  proofs           Json
  circuitVersions  String[] @map("circuit_versions")
  txHash           String?  @map("tx_hash")
  blockNumber      Int?     @map("block_number")
  verified         Boolean  @default(false)
  createdAt        DateTime @default(now()) @map("created_at")

  session Session @relation(fields: [sessionId], references: [id])

  @@index([txHash])
  @@map("commitments")
}

model ApiKey {
  id         String    @id @default(uuid())
  orgId      String    @map("org_id")
  keyHash    String    @unique @map("key_hash")
  name       String
  scopes     String[]
  lastUsedAt DateTime? @map("last_used_at")
  expiresAt  DateTime? @map("expires_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  org Organisation @relation(fields: [orgId], references: [id])

  @@map("api_keys")
}

model Webhook {
  id         String   @id @default(uuid())
  orgId      String   @map("org_id")
  url        String
  secretHash String   @map("secret_hash")
  events     String[]
  active     Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")

  org        Organisation      @relation(fields: [orgId], references: [id])
  deliveries WebhookDelivery[]

  @@map("webhooks")
}

enum DeliveryStatus {
  pending
  delivered
  failed
}

model WebhookDelivery {
  id              String         @id @default(uuid())
  webhookId       String         @map("webhook_id")
  event           String
  payload         Json
  status          DeliveryStatus @default(pending)
  attempts        Int            @default(0)
  lastAttemptedAt DateTime?      @map("last_attempted_at")
  deliveredAt     DateTime?      @map("delivered_at")
  createdAt       DateTime       @default(now()) @map("created_at")

  webhook Webhook @relation(fields: [webhookId], references: [id])

  @@map("webhook_deliveries")
}
```

- [ ] **Step 2: Run Prisma migration**

```bash
cd packages/relay && npx prisma migrate dev --name init
```

- [ ] **Step 3: Set up Fastify server with security middleware**

The server must include from the start:
- `@fastify/cors` — locked to portal origin (`CORS_ORIGIN` env var, defaults to `http://localhost:3000`)
- `@fastify/helmet` — security headers (CSP, X-Frame-Options, etc.)
- `@fastify/csrf-protection` — CSRF tokens for cookie-authenticated routes
- `@fastify/rate-limit` — configure per spec Section 11 rate limits
- `pino` logger (built into Fastify) — JSON structured logging with `requestId` correlation

```typescript
// packages/relay/src/server.ts (skeleton)
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import csrf from '@fastify/csrf-protection'
import rateLimit from '@fastify/rate-limit'
import { loadConfig } from './config.js'

const config = loadConfig()

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  },
  genReqId: () => crypto.randomUUID(),
})

await app.register(cors, { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true })
await app.register(helmet)
await app.register(csrf, { cookieOpts: { signed: true, httpOnly: true } })
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
```

- [ ] **Step 4: Write auth route tests** (register, login, wallet auth, refresh token)
- [ ] **Step 5: Implement auth routes + auth middleware**
- [ ] **Step 6: Run tests, verify pass**
- [ ] **Step 7: Commit**

```bash
git commit -m "feat: relay service — Prisma schema, Fastify server (CORS/Helmet/CSRF/rate-limit), auth routes"
```

---

### Task 25: Relay — Org, Agent, Credential CRUD Routes

**Files:**
- Create: `packages/relay/src/routes/orgs.ts`
- Create: `packages/relay/src/routes/agents.ts`
- Create: `packages/relay/src/routes/credentials.ts`
- Create: `packages/relay/src/services/org.service.ts`
- Create: `packages/relay/src/services/agent.service.ts`
- Create: `packages/relay/src/services/credential.service.ts`
- Create: `packages/relay/src/middleware/org-scope.ts`
- Test: `packages/relay/test/orgs.test.ts`, `packages/relay/test/agents.test.ts`, `packages/relay/test/credentials.test.ts`

All endpoints follow RESTful patterns from spec Section 7. Every query scoped by `orgId`.

- [ ] **Steps 1-5: TDD cycle for each route group**
- [ ] **Step 6: Commit**

---

### Task 26: Relay — Session Routes + Cross-Org Flow

**Files:**
- Create: `packages/relay/src/routes/sessions.ts`
- Create: `packages/relay/src/services/session.service.ts`
- Test: `packages/relay/test/sessions.test.ts`

Key tests:
- Create intra-org session
- Create cross-org session → status `pending_acceptance`
- POST `/sessions/:id/invite` sends invite token
- POST `/sessions/:id/accept` validates token, moves to `active`
- Submit turn (validates sequence number, stores turn + proof)
- Cross-org turn data scoping (counterparty terms redacted)
- Session status transitions (active → completed → committed)

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 27: Relay — WebSocket Server

**Files:**
- Create: `packages/relay/src/websocket/index.ts`
- Create: `packages/relay/src/websocket/session-channel.ts`
- Create: `packages/relay/src/websocket/org-feed.ts`
- Create: `packages/relay/src/websocket/presence.ts`
- Test: `packages/relay/test/websocket.test.ts`

Tests cover:
- Connect with JWT → authenticated
- Connect without JWT → rejected
- Subscribe to session channel → receive turn events
- Subscribe to org feed → receive session.created, agent.status events
- Heartbeat (30s ping, 90s timeout)
- Reconnect → replay missed events from Redis buffer
- Cross-org: each org sees only permitted data on shared session channel
- `turn.proof_failed` event delivered when proof generation fails mid-session

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 28: Relay — Chain Indexer

**Files:**
- Create: `packages/relay/src/indexer/index.ts`
- Create: `packages/relay/src/indexer/listener.ts`
- Create: `packages/relay/src/indexer/backfill.ts`
- Test: `packages/relay/test/indexer.test.ts`

Tests cover:
- Listen for AgentRegistered event → update agent record with tx hash
- Listen for CommitmentCreated event → update commitment record
- Store last processed block in Redis
- Reconnect on RPC failure (switch to fallback)
- Backfill on startup (from last processed block)
- Cap backfill at 10,000 blocks

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 29a: Relay — Commitments + Analytics Routes

**Files:**
- Create: `packages/relay/src/routes/commitments.ts`, `analytics.ts`
- Create: `packages/relay/src/services/commitment.service.ts`
- Test: `packages/relay/test/commitments.test.ts`, `packages/relay/test/analytics.test.ts`

- [ ] **Steps 1-5: TDD cycle for commitments + analytics**
- [ ] **Step 6: Commit**

### Task 29b: Relay — API Keys, Webhooks, Admin Routes

**Files:**
- Create: `packages/relay/src/routes/api-keys.ts`, `webhooks.ts`, `admin.ts`
- Create: `packages/relay/src/services/webhook.service.ts`
- Test: `packages/relay/test/api-keys.test.ts`, `packages/relay/test/webhooks.test.ts`

**API key generation:** Keys must use `ac_` prefix per spec Section 11. Generate as `ac_` + 32 random hex characters. Store `key_hash` (SHA-256) in DB, return full key only at creation time.

**Webhook delivery:** HMAC-SHA256 signature in `X-Attestara-Signature` header. Async delivery with 3 retries (exponential backoff: 1s, 5s, 25s).

**Admin routes:** `POST /v1/admin/indexer/backfill` — trigger manual chain indexer backfill. Protected by admin role check.

- [ ] **Steps 1-5: TDD cycle for each route group**
- [ ] **Step 6: Commit**

---

### Task 30: Prover Service

**Files:**
- Create: `packages/prover/src/server.ts`
- Create: `packages/prover/src/routes/prove.ts`
- Create: `packages/prover/src/routes/verify.ts`
- Create: `packages/prover/src/routes/health.ts`
- Create: `packages/prover/src/worker.ts`
- Create: `packages/prover/src/cache.ts`
- Test: `packages/prover/test/server.test.ts`

Tests cover:
- POST `/prove/mandate-bound` → returns proof + public signals
- POST `/verify` → returns valid/invalid
- Reject request without internal auth token
- GET `/health` → returns circuit status
- GET `/metrics` → returns Prometheus format metrics
- Worker pool handles concurrent requests
- Redis cache hit skips re-generation

- [ ] **Steps 1-5: TDD cycle + commit**

---

### Task 31: CLI Tools

**Files:**
- Create: all files in `packages/cli/src/`
- Test: `packages/cli/test/commands.test.ts`

Implement all commands from spec Section 9:
- `init [--demo]` — scaffold project
- `agent create|list|info|rotate-key`
- `credential issue|list|verify|revoke`
- `session create|list|watch|replay`
- `commitment list|verify|show`
- `prove`, `verify`, `config`, `status`

Tests cover:
- `init --demo` creates correct file structure
- `agent create` calls SDK and outputs DID
- `status` shows connection health
- Error handling for missing config

- [ ] **Steps 1-5: TDD cycle + commit**

---

## Track 3: Portal + DX (Weeks 2-14)

> **Owner:** Claude Code + You (review + design direction)
> **Dependency:** Phase 0 complete; connects to real relay API at Week 5

### Task 32: Portal — Next.js Scaffold + Tailwind Theme

**Files:**
- Create: `packages/portal/` (Next.js app)
- Create: `packages/portal/tailwind.config.ts`
- Create: `packages/portal/app/layout.tsx`
- Create: `packages/portal/lib/api-client.ts`

- [ ] **Step 1: Create Next.js app**

```bash
cd packages && npx create-next-app@latest portal --typescript --tailwind --app --src-dir=false --import-alias="@/*"
```

- [ ] **Step 2: Configure Tailwind theme** (navy primary, blue accent, green verified)

```typescript
// packages/portal/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f1f5',
          900: '#0F172A',
          950: '#0a0f1c',
        },
        accent: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        verified: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Create root layout with providers**
- [ ] **Step 4: Create API client wrapper**
- [ ] **Step 5: Commit**

---

### Task 33: Portal — Core UI Components

**Files:**
- Create: all files in `packages/portal/components/ui/`
- Test: `packages/portal/test/components/` (one test file per component)

Build all 12 components from spec Section 8:
- `StatCard`, `DataTable`, `StatusBadge`, `ProofBadge`, `TurnTimeline`, `ChainLink`, `LiveIndicator`, `Modal`, `Wizard`, `Toast`, `TimeSeriesChart`, `WalletButton`

- [ ] **Step 1: Build StatCard + test**
- [ ] **Step 2: Build DataTable + test** (sortable, filterable, paginated)
- [ ] **Step 3: Build StatusBadge + ProofBadge + test**
- [ ] **Step 4: Build TurnTimeline + test**
- [ ] **Step 5: Build remaining components + tests**
- [ ] **Step 6: Commit**

---

### Task 34: Portal — Auth Pages (Login, Register, Wallet)

**Files:**
- Create: `packages/portal/app/(auth)/login/page.tsx`
- Create: `packages/portal/app/(auth)/register/page.tsx`
- Create: `packages/portal/app/(auth)/verify-email/page.tsx`
- Create: `packages/portal/lib/auth.ts`
- Test: `packages/portal/test/auth.test.tsx`

- [ ] **Step 1: Implement login page** (email/password + "Connect Wallet" via RainbowKit)
- [ ] **Step 2: Implement register page** (org name, email, password, optional wallet)
- [ ] **Step 3: Implement auth helpers** (JWT storage, refresh, middleware)
- [ ] **Step 4: Write component tests**
- [ ] **Step 5: Commit**

---

### Task 35: Portal — Dashboard Layout + Overview Page

**Files:**
- Create: `packages/portal/app/(dashboard)/layout.tsx`
- Create: `packages/portal/app/(dashboard)/page.tsx`
- Create: `packages/portal/components/layout/sidebar.tsx`
- Create: `packages/portal/components/layout/header.tsx`
- Create: `packages/portal/components/layout/org-switcher.tsx`
- Create: `packages/portal/lib/hooks/use-org.ts`
- Test: `packages/portal/test/dashboard.test.tsx`

- [ ] **Steps 1-5: Build layout shell, sidebar nav, overview with StatCards + ActivityFeed**
- [ ] **Step 6: Commit**

---

### Task 36: Portal — Agents Pages

**Files:**
- Create: `packages/portal/app/(dashboard)/agents/page.tsx`
- Create: `packages/portal/app/(dashboard)/agents/[id]/page.tsx`
- Create: `packages/portal/lib/hooks/use-agents.ts`
- Test: `packages/portal/test/agents.test.tsx`

- [ ] **Steps 1-5: Agent list (DataTable), provision modal, agent detail page**
- [ ] **Step 6: Commit**

---

### Task 37: Portal — Credentials Pages + Issuance Wizard

**Files:**
- Create: `packages/portal/app/(dashboard)/credentials/page.tsx`
- Create: `packages/portal/app/(dashboard)/credentials/[id]/page.tsx`
- Create: `packages/portal/lib/hooks/use-credentials.ts`
- Test: `packages/portal/test/credentials.test.tsx`

Multi-step wizard: select agent → define mandate → set expiry → review → sign → confirm

- [ ] **Steps 1-5: Build credential list, issuance wizard, credential detail page**
- [ ] **Step 6: Commit**

---

### Task 38: Portal — Session Pages + Live Monitor

**Files:**
- Create: `packages/portal/app/(dashboard)/sessions/page.tsx`
- Create: `packages/portal/app/(dashboard)/sessions/[id]/page.tsx`
- Create: `packages/portal/lib/hooks/use-session.ts`
- Create: `packages/portal/lib/websocket.ts`
- Test: `packages/portal/test/sessions.test.tsx`

The live session monitor (`sessions/[id]`) is the highest-impact page. It includes:
- TurnTimeline (vertical, real-time via WebSocket)
- Terms comparison table (buyer vs seller)
- ProofBadge for each turn (generating → verified → on-chain)
- Session metadata (merkle root, gas used)
- "Verify On-Chain" button linking to Arbiscan

- [ ] **Steps 1-5: Build session list, live session monitor with WebSocket**
- [ ] **Step 6: Commit**

---

### Task 39: Portal — Commitment Pages

**Files:**
- Create: `packages/portal/app/(dashboard)/commitments/page.tsx`
- Create: `packages/portal/app/(dashboard)/commitments/[id]/page.tsx`
- Create: `packages/portal/lib/hooks/use-commitments.ts`
- Test: `packages/portal/test/commitments.test.tsx`

Commitment explorer with ChainLink components to Arbiscan, verification status, proof viewer.

- [ ] **Steps 1-5: Build commitment explorer, commitment detail with proof viewer**
- [ ] **Step 6: Commit**

---

### Task 40: Portal — Analytics Page

**Files:**
- Create: `packages/portal/app/(dashboard)/analytics/page.tsx`
- Create: `packages/portal/lib/hooks/use-analytics.ts`
- Test: `packages/portal/test/analytics.test.tsx`

Charts: session volume over time, proof generation metrics (latency histogram), gas cost tracking (`CostBreakdown` component), success rates.

- [ ] **Steps 1-5: Build analytics dashboard with TimeSeriesChart + CostBreakdown**
- [ ] **Step 6: Commit**

---

### Task 41: Portal — Settings Pages (Org, API Keys, Billing)

**Files:**
- Create: `packages/portal/app/(dashboard)/settings/page.tsx`
- Create: `packages/portal/app/(dashboard)/settings/api-keys/page.tsx`
- Create: `packages/portal/app/(dashboard)/settings/billing/page.tsx`
- Test: `packages/portal/test/settings.test.tsx`

- [ ] **Steps 1-5: Build org settings, member management, API key generation/revocation, billing page**
- [ ] **Step 6: Commit**

---

### Task 42: Portal — Landing Page

**Files:**
- Create: `packages/portal/app/(marketing)/page.tsx`
- Test: `packages/portal/test/landing.test.tsx`

SSR landing page with:
- Hero section ("Cryptographic trust for AI agents")
- Value proposition (3 pillars: Authority, Privacy, Commitment)
- Live stats from mainnet contracts (agent count, commitment count)
- Social proof / use case callouts
- CTA buttons (Get Started, View Demo)

- [ ] **Steps 1-5: Build landing page with SSR data fetching**
- [ ] **Step 6: Commit**

---

### Task 43: Portal — Interactive Demo Page

**Files:**
- Create: `packages/portal/app/(marketing)/demo/page.tsx`
- Test: `packages/portal/test/demo.test.tsx`

4-step guided walkthrough:
1. "Meet the agents" — visual agent cards with mandates
2. "Watch them negotiate" — live or prerecorded session replay
3. "Verify the commitment" — on-chain link + proof details
4. "Try it yourself" — editable params, trigger negotiation

Includes `?mode=prerecorded` fallback (3-second RPC timeout auto-switch).

- [ ] **Steps 1-5: Build interactive demo with live/prerecorded toggle**
- [ ] **Step 6: Commit**

---

### Task 44: Portal — Pricing + Docs Pages

**Files:**
- Create: `packages/portal/app/(marketing)/pricing/page.tsx`
- Create: `packages/portal/app/(marketing)/docs/page.tsx`

- [ ] **Steps 1-3: Build pricing page (3 tiers from spec), docs hub (links to SDK/CLI/API docs)**
- [ ] **Step 4: Commit**

---

### Task 45: Portal — BFF API Routes

**Files:**
- Create: `packages/portal/app/api/` (proxy routes to relay)

Next.js API routes that proxy authenticated requests to the relay service. Handles cookie → JWT conversion, CSRF protection.

- [ ] **Steps 1-3: Implement BFF proxy routes**
- [ ] **Step 4: Commit**

---

## Integration & Polish (Weeks 10-14)

### Task 46: SDK ↔ Real Circuits Integration

**Files:**
- Modify: `packages/sdk/src/prover/local.ts` (replace TestProver stubs with real snarkjs)
- Test: `packages/sdk/test/integration/prover-circuits.test.ts`

Connect SDK prover module to the real circuit artifacts from Track 1.

- [ ] **Step 1: Write integration tests** (generate real MandateBound proof, verify on-chain)
- [ ] **Step 2: Update local prover to load real wasm + zkey files**
- [ ] **Step 3: Run integration tests against Hardhat node with deployed contracts**
- [ ] **Step 4: Benchmark end-to-end: SDK proof gen → on-chain verification**
- [ ] **Step 5: Commit**

---

### Task 47: Full End-to-End Integration Test

**Files:**
- Create: `test/integration/full-flow.test.ts` (root-level)

Test the complete flow: register → provision agent → issue credential → create session → negotiate 5 turns → commit on-chain → verify.

- [ ] **Step 1: Write end-to-end integration test**
- [ ] **Step 2: Run against docker-compose test environment**
- [ ] **Step 3: Fix any integration issues**
- [ ] **Step 4: Commit**

---

### Task 48: Testnet Deployment

**Files:**
- Modify: `infrastructure/render.yaml`
- Create: `packages/contracts/deployments.arbitrum-sepolia.json`

- [ ] **Step 1: Deploy all contracts to Arbitrum Sepolia**
- [ ] **Step 2: Verify contracts on Arbiscan**
- [ ] **Step 3: Deploy relay + prover + portal to Render**
- [ ] **Step 4: Run integration tests against testnet**
- [ ] **Step 5: Commit deployment addresses**

---

### Task 49: Mainnet Contract Deployment

**Files:**
- Create: `packages/contracts/deployments.arbitrum-one.json`

- [ ] **Step 1: Set up Gnosis Safe multi-sig (2-of-3)**
- [ ] **Step 2: Deploy AgentRegistry via TransparentProxy**
- [ ] **Step 3: Deploy CommitmentContract via TransparentProxy**
- [ ] **Step 4: Configure 48-hour timelock**
- [ ] **Step 5: Verify on Arbiscan**
- [ ] **Step 6: Update portal landing page with mainnet addresses**
- [ ] **Step 7: Commit**

---

### Task 50: Playwright E2E Tests

**Files:**
- Create: `packages/portal/e2e/investor-demo.spec.ts`
- Create: `packages/portal/e2e/onboarding.spec.ts`
- Create: `packages/portal/e2e/full-negotiation.spec.ts`
- Create: `packages/portal/e2e/wallet-auth.spec.ts`
- Create: `packages/portal/e2e/credentials.spec.ts`
- Create: `packages/portal/e2e/session-monitor.spec.ts`
- Create: `packages/portal/e2e/api-keys.spec.ts`
- Create: `packages/portal/playwright.config.ts`

All 7 E2E test flows from spec Section 12.

- [ ] **Step 1: Configure Playwright**
- [ ] **Step 2: Write investor demo E2E** (Landing → Demo → Negotiate → Verify)
- [ ] **Step 3: Write remaining E2E tests**
- [ ] **Step 4: Run all E2E against testnet deployment**
- [ ] **Step 5: Commit**

---

### Task 51: Documentation

**Files:**
- Create: `packages/portal/app/(marketing)/docs/` subpages
- Modify: `packages/cli/src/commands/init.ts` (ensure `--demo` scaffold includes README)

Documentation sections from spec Section 9:
- Quickstart (9-minute onboarding flow)
- Concepts (DIDs, VCs, ZK proofs explained for non-crypto developers)
- SDK Reference
- CLI Reference
- Strategies Guide
- API Reference (REST + WebSocket)
- Examples (procurement, supply chain, financial contracting)
- Deployment Guide

- [ ] **Step 1: Write Quickstart guide**
- [ ] **Step 2: Write Concepts guide**
- [ ] **Step 3: Write SDK + CLI reference**
- [ ] **Step 4: Write API reference**
- [ ] **Step 5: Commit**

---

### Task 52: Final Polish + Demo Readiness

**Files:**
- Various portal components (loading states, error boundaries, empty states)
- Demo seed data script

- [ ] **Step 1: Add loading skeletons to all dashboard pages**
- [ ] **Step 2: Add error boundaries with friendly messages**
- [ ] **Step 3: Add empty states** ("No agents yet — provision your first agent")
- [ ] **Step 4: Create demo seed script** (pre-populated org, agents, credentials, completed session, commitment)
- [ ] **Step 5: Test investor demo script end-to-end** (both live and prerecorded modes)
- [ ] **Step 6: Test pilot customer onboarding flow end-to-end**
- [ ] **Step 7: Responsive design pass** (tablet + mobile breakpoints)
- [ ] **Step 8: Performance audit** (Lighthouse, code splitting, image optimization)
- [ ] **Step 9: Final commit**

```bash
git commit -m "feat: final polish — loading states, error boundaries, demo mode, responsive design"
```

---

## Summary

| Phase | Tasks | Estimated Duration |
|-------|-------|--------------------|
| Phase 0: Foundation | Tasks 1-5 | Week 1 |
| Track 1: ZK + Contracts | Tasks 6-15 | Weeks 2-10 |
| Track 2: SDK + Backend | Tasks 16-31 | Weeks 2-10 |
| Track 3: Portal + DX | Tasks 32-45 | Weeks 2-12 |
| Integration & Polish | Tasks 46-52 | Weeks 10-14 |

**Total: 53 tasks, 14 weeks, 3 parallel tracks.**

Track dependencies:
- Track 2 (Task 18 SDK prover module + Task 30 prover service) blocks on Track 1 (Task 10 ceremony) for real circuit integration at Week 7
- Track 3 (Task 36+ dashboard pages) blocks on Track 2 (Task 25 relay CRUD routes) for real API data at Week 5
- Tasks 46-52 (Integration) require all 3 tracks to have core functionality complete
- Both Track 2 prover tasks use TestProver stubs until Week 7 integration point
