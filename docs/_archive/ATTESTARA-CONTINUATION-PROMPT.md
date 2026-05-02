# Attestara: Continuation Prompt — Full E2E Demo Readiness

> **Purpose**: Paste this into a fresh Claude Code session to continue building Attestara toward a complete, real end-to-end demo with nothing mocked.
> **Project path**: `C:\claude\attestara`
> **Date**: 2026-03-27
> **Version**: 0.1.0 (MVP)

---

## PROJECT CONTEXT

Attestara is an open cryptographic trust protocol for autonomous AI agent commerce. It enables AI agents to negotiate contracts, commit to agreements with cryptographic accountability (ZK proofs), and settle commitments on-chain (Arbitrum L2).

**Monorepo**: pnpm workspace + Turborepo with 7 packages:

| Package | Stack | Port | Status |
|---------|-------|------|--------|
| `@attestara/types` | TypeScript | — | Complete |
| `@attestara/contracts` | Solidity 0.8.24, Circom 2, Hardhat | — | Contracts complete, circuits defined but NOT compiled |
| `@attestara/relay` | Fastify 5, PostgreSQL (Prisma), Redis | 3001 | Routes complete, **services use in-memory Maps — NOT Prisma** |
| `@attestara/prover` | Fastify 5, snarkjs, worker pool, Redis | 3002 | Code complete, **circuit artifacts (WASM/zkey) missing** |
| `@attestara/sdk` | TypeScript, Veramo, ethers v6, snarkjs | — | Identity/credentials/prover real; **negotiation/commitment mocked** |
| `@attestara/portal` | Next.js 16, React 19, Tailwind v4 | 3000 | Pages exist, API client wired, **5 Playwright E2E tests failing** |
| `@attestara/cli` | Commander.js | — | All commands exist, demo uses mocks |

**Current test status** (as of 2026-03-27):
- `pnpm test` — ALL PASSING (13/13 turbo tasks)
- `pnpm test:e2e` — 38/43 Playwright tests pass, **5 fail** (tests written ahead of implementation)
- Security tests (97/97) — all passing
- Integration tests — all passing

**Git**: master branch, pushed to `origin/master`, up to date.

---

## WHAT WORKS TODAY (REAL)

- Smart contracts: 4 Solidity contracts fully tested (84 Hardhat tests pass)
- ZK circuits: 4 Circom circuits defined (MandateBound, ParameterRange, CredentialFreshness, IdentityBinding)
- Relay API: Full REST API (auth, orgs, agents, credentials, sessions, turns, commitments, API keys, webhooks, analytics, admin, WebSocket)
- SDK DIDManager: Real Veramo integration with did:ethr
- SDK CredentialManager: Real W3C VC 2.0 issuance, verification, revocation
- SDK ProverManager: Real snarkjs integration (local + remote modes)
- Portal: Auth pages, dashboard pages (agents, credentials, sessions, commitments, settings), marketing pages, BFF proxy
- CLI: 7 commands (init, identity, credential, session, negotiate, commitment, demo)
- Security: JWT auth, bcrypt passwords, SIWE wallet auth, org isolation, cross-org invite tokens, term redaction, rate limiting

## WHAT IS MOCKED / IN-MEMORY (Must Be Made Real)

### 1. Relay Services — In-Memory Maps Instead of Prisma
**All 8 relay services** use `new Map()` for storage instead of Prisma/PostgreSQL:
- `packages/relay/src/services/auth.service.ts`
- `packages/relay/src/services/org.service.ts`
- `packages/relay/src/services/agent.service.ts`
- `packages/relay/src/services/credential.service.ts`
- `packages/relay/src/services/session.service.ts`
- `packages/relay/src/services/commitment.service.ts`
- `packages/relay/src/services/api-key.service.ts`
- `packages/relay/src/services/webhook.service.ts`

**The Prisma schema already exists** at `packages/relay/prisma/schema.prisma` with all 10 tables (Organisation, User, Agent, Credential, Session, Turn, Commitment, ApiKey, Webhook, WebhookDelivery). The migration just needs to be wired in.

### 2. ZK Circuit Artifacts — Not Compiled
The 4 Circom circuits are **defined** but never compiled. Missing:
- WASM files (e.g., `mandate_bound_js/mandate_bound.wasm`)
- zkey files (e.g., `mandate_bound_final.zkey`)
- Verification keys (e.g., `verification_keys/mandate_bound_vkey.json`)

Without these, the prover service and SDK LocalProver cannot generate real proofs.

Circuit source files:
- `packages/contracts/circuits/MandateBound.circom`
- `packages/contracts/circuits/ParameterRange.circom`
- `packages/contracts/circuits/CredentialFreshness.circom`
- `packages/contracts/circuits/IdentityBinding.circom`

### 3. On-Chain Commitment Settlement — Stub
`packages/sdk/src/commitment/chain.ts` has `ChainCommitmentClient` with:
```
submit() → throws "On-chain submission not yet implemented"
verifyOnChain() → throws "On-chain verification not yet implemented"
```
SDK `CommitmentManager` (`packages/sdk/src/commitment/index.ts`) uses in-memory Map and mock verification.

### 4. SDK SessionManager — In-Memory
`packages/sdk/src/negotiation/index.ts` — sessions stored in Map, no relay API calls.

### 5. IPFS — Memory Client
SDK uses `MemoryIPFSClient` instead of `PinataIPFSClient` for credential storage.

### 6. Chain Event Indexer — Placeholder
`packages/relay/src/indexer.ts` — starts but doesn't process real events without deployed contracts.

---

## WHAT IS MISSING ENTIRELY

1. **Circuit compilation pipeline** — No scripts to compile Circom → WASM/zkey
2. **Trusted setup ceremony** — No powers-of-tau ceremony for Groth16 proof keys
3. **Contract deployment to testnet** — Scripts exist (`packages/contracts/scripts/deploy-testnet.ts`) but never run
4. **On-chain commitment submission** — ethers.js contract calls not implemented
5. **Real IPFS integration** — Pinata client exists but not wired into default config
6. **Portal credential wizard modal** — Tests expect it but UI doesn't exist
7. **Portal demo step navigation** — Tests expect Next/Previous buttons on /demo page
8. **Portal sessions table** — Test expects mock sessions displayed in table format

---

## GOAL

Make Attestara a **complete, real, end-to-end working system** where nothing is mocked:

1. Real ZK proofs generated from compiled Circom circuits
2. Real PostgreSQL persistence via Prisma (no in-memory Maps)
3. Real smart contracts deployed to Arbitrum Sepolia testnet
4. Real on-chain commitment settlement with actual transaction hashes
5. Real IPFS credential storage via Pinata
6. All 43 Playwright E2E tests passing
7. Full test suite green (`pnpm test`, `pnpm test:e2e`, `pnpm test:integration`)
8. Working demo: CLI `attestara demo` + Portal UI both exercise the full real flow

---

## TASK BREAKDOWN (Execute in Order)

### Phase 1: ZK Circuit Compilation & Trusted Setup

**Goal**: Generate WASM, zkey, and verification key files for all 4 circuits.

**Prerequisites**: Install circom 2.x and snarkjs globally.

**Tasks**:
1. Create `packages/contracts/circuits/build.sh` script that:
   - Compiles each .circom file to R1CS + WASM (`circom circuit.circom --r1cs --wasm --sym`)
   - Downloads powers-of-tau file (powersOfTau28_hez_final_14.ptau for circuits under 16K constraints)
   - Runs Groth16 setup for each circuit (`snarkjs groth16 setup circuit.r1cs pot.ptau circuit_0000.zkey`)
   - Contributes entropy (`snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey`)
   - Exports verification key (`snarkjs zkey export verificationkey circuit_final.zkey circuit_vkey.json`)
   - Generates Solidity verifier (`snarkjs zkey export solidityverifier circuit_final.zkey Verifier.sol`)
2. Run the build script and commit artifacts to `packages/contracts/circuits/build/`
3. Update prover service circuit paths to match build output structure
4. Verify prover service can load artifacts and generate a real proof
5. Update SDK LocalProver circuit directory config

**Verification**: `pnpm test:contracts` still passes. Prover can generate and verify a real Groth16 proof for each circuit.

**Key files**:
- `packages/contracts/circuits/*.circom` (4 circuit source files)
- `packages/contracts/hardhat.config.ts` (circom plugin config)
- `packages/prover/src/circuits.ts` (artifact loading)
- `packages/sdk/src/prover/local.ts` (SDK local prover)
- `01-zk-circuit-poc.md` (circuit design reference)

---

### Phase 2: Relay Prisma Migration (In-Memory Maps → PostgreSQL)

**Goal**: Replace all 8 relay services' in-memory Map storage with Prisma queries.

**Prerequisites**: PostgreSQL running (via `infrastructure/docker-compose.yml`), `pnpm db:generate && pnpm db:migrate` in packages/relay.

**Tasks**:
1. Create shared Prisma error mapping utility:
   - Map Prisma error codes (P2002 unique constraint, P2025 not found, etc.) to service error types
   - Add retry logic for transient connection errors
   - File: `packages/relay/src/utils/prisma-errors.ts`

2. Migrate each service (one at a time, test after each):

   a. **OrgService** (`org.service.ts`):
      - Replace `orgs Map`, `users Map`, `memberships Map` with Prisma Organisation, User queries
      - Wire `createOrg()`, `getOrg()`, `listMembers()`, `inviteMember()` to Prisma
      - Handle unique constraint on org slug and user email

   b. **AuthService** (`auth.service.ts`):
      - Uses org service for user lookup — may just need Prisma user queries for login/register
      - Ensure bcrypt password hashing is preserved
      - Wire wallet auth (SIWE nonce) — nonces can stay in Redis/memory (ephemeral by design)

   c. **AgentService** (`agent.service.ts`):
      - Replace `agents Map`, `didIndex Map` with Prisma Agent queries
      - Enforce DID uniqueness via Prisma unique constraint
      - Wire `create()`, `listByOrg()`, `getById()`, `deactivate()`

   d. **CredentialService** (`credential.service.ts`):
      - Replace `credentials Map` with Prisma Credential queries
      - Wire `create()`, `listByOrg()`, `getById()`, `revoke()`
      - Enforce credential hash uniqueness

   e. **SessionService** (`session.service.ts`):
      - Replace `sessions Map`, `turns Map`, `inviteTokens Map` with Prisma Session + Turn queries
      - Wire `createSession()`, `listByOrg()`, `getById()`, `appendTurn()`, `getTurns()`
      - Preserve cross-org invite token hashing and term redaction logic
      - Use Prisma transactions for turn appending (update session merkle root + create turn atomically)

   f. **CommitmentService** (`commitment.service.ts`):
      - Replace `commitments Map`, `sessionIndex Map` with Prisma Commitment queries
      - Wire `create()`, `getById()`, `listBySession()`, `verify()`, `updateOnChainStatus()`

   g. **ApiKeyService** (`api-key.service.ts`):
      - Replace `apiKeys Map` with Prisma ApiKey queries
      - Wire `create()`, `listByOrg()`, `validateByHash()`, `revoke()`

   h. **WebhookService** (`webhook.service.ts`):
      - Replace `webhooks Map`, `deliveries Map` with Prisma Webhook + WebhookDelivery queries
      - Wire `create()`, `listByOrg()`, `deliver()`, `getDeliveryHistory()`, `deactivate()`

3. Update test infrastructure:
   - Create `packages/relay/test/helpers/db.ts` — test database setup/teardown (truncate tables between tests)
   - Update `packages/relay/vitest.config.ts` — add globalSetup for DB connection
   - Consider `infrastructure/docker-compose.test.yml` (PostgreSQL on port 5433, Redis on 6380)

4. Run all relay tests and fix any failures from the migration

**Verification**: `pnpm test:relay` passes with real PostgreSQL. `pnpm test:e2e` (the vitest E2E suite in `tests/e2e/`) passes. Data survives relay restart.

**Key files**:
- `packages/relay/prisma/schema.prisma` (already complete)
- `packages/relay/src/services/*.ts` (8 service files to migrate)
- `packages/relay/src/server.ts` (Prisma client initialization)
- `packages/relay/test/` (all test files need DB setup)
- `infrastructure/docker-compose.yml` (PostgreSQL + Redis)

---

### Phase 3: Smart Contract Deployment to Arbitrum Sepolia

**Goal**: Deploy all 4 contracts to Arbitrum Sepolia testnet and record addresses.

**Prerequisites**: Funded deployer wallet on Arbitrum Sepolia, Alchemy RPC URL.

**Tasks**:
1. Set up `.env` with:
   - `ARBITRUM_SEPOLIA_RPC_URL` (Alchemy)
   - `DEPLOYER_PRIVATE_KEY`
2. Run `packages/contracts/scripts/deploy-testnet.ts`:
   - Deploys AgentRegistry, CredentialRegistry, VerifierRegistry, CommitmentContract
   - Outputs `deployments.arbitrum-sepolia.json` with contract addresses
3. Register Groth16 verifier contracts on VerifierRegistry for each circuit
4. Verify contracts on Arbiscan (optional but recommended)
5. Update `.env.example` and SDK config with deployed contract addresses

**Verification**: Contracts visible on Arbiscan Sepolia. `hardhat test --network arbitrumSepolia` (smoke test).

**Key files**:
- `packages/contracts/scripts/deploy-testnet.ts`
- `packages/contracts/hardhat.config.ts` (network config)
- `.env.example` (contract address vars)

---

### Phase 4: On-Chain Commitment Settlement

**Goal**: Implement real ethers.js contract interaction so commitments are recorded on Arbitrum.

**Tasks**:
1. Implement `ChainCommitmentClient.submit()` in `packages/sdk/src/commitment/chain.ts`:
   - Connect to Arbitrum Sepolia via ethers.js provider
   - Load CommitmentContract ABI from `packages/contracts/artifacts/`
   - Call `commitmentContract.recordAgreement(agreementHash, parties, credentialHashes, proofs)`
   - Return transaction hash and block number

2. Implement `ChainCommitmentClient.verifyOnChain()`:
   - Query CommitmentContract for commitment by hash
   - Verify commitment exists and matches local record
   - Return verification result

3. Update `CommitmentManager` to use `ChainCommitmentClient` instead of in-memory mock:
   - `create()` should call `chainClient.submit()` after local validation
   - `verify()` should call `chainClient.verifyOnChain()`
   - Store txHash and blockNumber in commitment record

4. Update relay `CommitmentService` to call SDK or directly use ethers.js:
   - `POST /v1/commitments` should trigger on-chain submission
   - `GET /v1/commitments/:id` should return txHash/blockNumber
   - `POST /v1/commitments/:id/verify` should check on-chain state

5. Update chain event indexer to watch for CommitmentContract events

**Verification**: Creating a commitment through the relay API results in a real Arbitrum Sepolia transaction. Transaction hash is visible on Arbiscan.

**Key files**:
- `packages/sdk/src/commitment/chain.ts` (stub to implement)
- `packages/sdk/src/commitment/index.ts` (CommitmentManager)
- `packages/relay/src/services/commitment.service.ts`
- `packages/relay/src/routes/commitments.ts`
- `packages/contracts/contracts/CommitmentContract.sol` (ABI reference)

---

### Phase 5: Real IPFS Integration

**Goal**: Switch credential storage from in-memory to Pinata IPFS.

**Tasks**:
1. Wire `PinataIPFSClient` as default in SDK CredentialManager when `PINATA_API_KEY` is set
2. Update relay credential routes to store/retrieve IPFS CIDs
3. Verify credential round-trip: issue → store on IPFS → retrieve by CID → verify

**Key files**:
- `packages/sdk/src/credentials/ipfs.ts` (PinataIPFSClient already exists)
- `packages/sdk/src/credentials/index.ts`
- `.env.example` (PINATA_API_KEY, PINATA_API_SECRET, IPFS_GATEWAY_URL)

---

### Phase 6: SDK SessionManager → Relay API Integration

**Goal**: SDK SessionManager calls relay API instead of using in-memory Maps.

**Tasks**:
1. Update `packages/sdk/src/negotiation/index.ts`:
   - `create()` → `POST /v1/sessions`
   - `get()` → `GET /v1/sessions/:id`
   - `list()` → `GET /v1/sessions`
   - `proposeTurn()` → `POST /v1/sessions/:id/turns`
   - `acceptSession()` → `POST /v1/sessions/:id/accept`
2. Add relay URL and auth token to SDK client config
3. Update CLI commands to use relay-backed SDK

**Key files**:
- `packages/sdk/src/negotiation/index.ts`
- `packages/sdk/src/client.ts` (AttestaraClient config)
- `packages/cli/src/commands/session.ts`
- `packages/cli/src/commands/negotiate.ts`

---

### Phase 7: Portal UI — Fix 5 Failing Playwright E2E Tests

**Goal**: Implement the missing portal UI features that the Playwright tests expect.

**Failing tests and what they need**:

1. **`e2e/negotiation.spec.ts:51` — "Issue Credential button opens wizard modal at step 1"**
   - Implement credential issuance wizard modal on `/credentials` page
   - Modal should have step indicator showing "Step 1"
   - Triggered by "Issue Credential" button

2. **`e2e/negotiation.spec.ts:59` — "wizard modal can be closed"**
   - Add close button (X) to the credential wizard modal
   - Clicking close should dismiss the modal

3. **`e2e/negotiation.spec.ts:86` — "Sessions page shows mock sessions in table"**
   - Update `/sessions` page to render sessions in a proper HTML table
   - Ensure mock fallback data displays in table rows

4. **`e2e/onboarding.spec.ts:117` — "Next button advances to step 2"**
   - Implement step navigation on `/demo` page
   - Add "Next" button that advances through demo steps
   - Show step indicator (e.g., "2 / N")

5. **`e2e/onboarding.spec.ts:125` — "Previous button is disabled on first step"**
   - Add "Previous" button to `/demo` page
   - Disable it when on step 1

**Key files**:
- `packages/portal/app/(dashboard)/credentials/page.tsx`
- `packages/portal/app/(dashboard)/sessions/page.tsx`
- `packages/portal/app/(dashboard)/demo/page.tsx` or `packages/portal/app/demo/page.tsx`
- `packages/portal/e2e/negotiation.spec.ts` (read to understand exact expectations)
- `packages/portal/e2e/onboarding.spec.ts` (read to understand exact expectations)

**Verification**: `cd packages/portal && npx playwright test` — all 43 tests pass.

---

### Phase 8: CLI Demo — Wire to Real Services

**Goal**: `attestara demo` exercises the full real flow (real proofs, real DB, real chain).

**Tasks**:
1. Update `packages/cli/src/commands/demo.ts`:
   - Replace `TestProver` with real `LocalProver` or `RemoteProver` (prover service)
   - Replace `MemoryIPFSClient` with `PinataIPFSClient`
   - Replace `MockAgent` in-memory sessions with relay API calls
   - Replace mock commitment with real on-chain settlement
2. Add `--testnet` flag that uses Arbitrum Sepolia
3. Add `--local` flag that uses local Hardhat node (for offline demos)
4. Ensure demo output shows real txHash links to Arbiscan

**Key files**:
- `packages/cli/src/commands/demo.ts`
- `packages/sdk/src/client.ts`

---

### Phase 9: Integration Testing & Final Verification

**Goal**: All test suites green, full end-to-end flow verified.

**Tasks**:
1. Run and fix: `pnpm test` (all unit tests)
2. Run and fix: `pnpm test:integration` (SDK↔Relay, Relay↔Prover, full flow)
3. Run and fix: `pnpm test:e2e` (43 Playwright tests)
4. Run and fix: security tests (`packages/relay/test/security/`)
5. Run and fix: `pnpm test:naming` (naming regression)
6. Run `pnpm build` — zero errors
7. Manual smoke test:
   - Start relay: `cd packages/relay && pnpm dev`
   - Start prover: `cd packages/prover && pnpm dev`
   - Start portal: `cd packages/portal && pnpm dev`
   - Run: `npx attestara demo --testnet`
   - Verify txHash on Arbiscan Sepolia
   - Navigate portal dashboard and verify data appears

**Expected final state**:
```
pnpm test          → ALL PASSING
pnpm test:e2e      → 43/43 PASSING
pnpm test:integration → ALL PASSING
pnpm build         → SUCCESS
attestara demo     → Real proofs, real DB, real chain tx
Portal UI          → Fully functional dashboard
```

---

## ARCHITECTURE REFERENCE

### Database Schema (Prisma — already defined)
```
Organisation ──< User
Organisation ──< Agent
Organisation ──< Credential
Organisation ──< ApiKey
Organisation ──< Webhook ──< WebhookDelivery
Agent ──< Credential
Session (initiatorAgent, counterpartyAgent, initiatorOrg, counterpartyOrg) ──< Turn
Session ──< Commitment
```

### Protocol Flow
```
1. Agent Registration    → Relay API → Prisma DB (+ optional on-chain AgentRegistry)
2. Credential Issuance   → SDK (W3C VC) → Relay API → Prisma DB + IPFS (Pinata)
3. ZK Proof Generation   → SDK ProverManager → Prover Service (snarkjs + circuit artifacts)
4. Session Creation      → Relay API → Prisma DB (+ WebSocket notification)
5. Negotiation Turns     → Relay API → Prisma DB (each turn includes ZK proof)
6. Agreement             → Final turn marks session complete
7. Commitment Settlement → SDK CommitmentManager → Relay API → Prisma DB + Arbitrum L2
8. Verification          → On-chain query + ZK proof verification
```

### Key Environment Variables
```env
DATABASE_URL=postgresql://attestara:attestara@localhost:5432/attestara
REDIS_URL=redis://localhost:6379
ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0x...
JWT_SECRET=...
PROVER_INTERNAL_SECRET=...
PROVER_URL=http://localhost:3002
PINATA_API_KEY=...
PINATA_API_SECRET=...
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
ORG_MASTER_KEY_SECRET=...
NEXT_PUBLIC_RELAY_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=421614
```

### Infrastructure
- `infrastructure/docker-compose.yml` — PostgreSQL 16 + Redis 7 + IPFS (dev)
- `infrastructure/docker-compose.test.yml` — Separate DB/Redis for CI (ports 5433/6380)
- `infrastructure/Dockerfile.relay` — Multi-stage relay build
- `infrastructure/Dockerfile.prover` — Multi-stage prover build (needs circuit artifacts)
- `infrastructure/render.yaml` — Render.com deployment config

---

## CONVENTIONS

- TypeScript strict mode, ESM (`"type": "module"`) in all packages except contracts and portal
- Conventional commits: `feat(scope):`, `fix(scope):`, `test(scope):`, `docs:`, `chore:`
- Vitest for unit/integration tests; Hardhat for contract tests; Playwright for portal E2E
- Zod for request validation (relay, prover)
- Prisma for database access (relay)
- All packages scoped under `@attestara/`
- Workspace dependencies via `workspace:*`
- Master branch, direct push

---

## COMMANDS REFERENCE

```bash
# Build & test
pnpm install
pnpm build
pnpm test
pnpm test:contracts
pnpm test:sdk
pnpm test:relay
pnpm test:portal
pnpm test:integration
pnpm test:e2e
pnpm test:naming
pnpm lint
pnpm typecheck

# Database
cd packages/relay
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed data
pnpm db:reset       # Reset DB

# Dev servers
pnpm dev            # All packages in watch mode

# CLI
npx attestara demo
npx attestara init
npx attestara identity create
npx attestara credential issue --domain procurement.contracts --max-value 500000

# Infrastructure
docker compose -f infrastructure/docker-compose.yml up -d
```

---

## IMPORTANT NOTES

- Read CLAUDE.md at project root for full project documentation
- The Prisma schema is ALREADY COMPLETE — you're wiring services to it, not designing it
- Smart contracts are ALREADY TESTED (84 tests) — don't modify them unless necessary
- Relay routes are ALREADY COMPLETE — you're changing the service layer underneath, not the API surface
- The SDK has real implementations for identity, credentials, and prover — only negotiation and commitment need work
- All E2E tests in `tests/e2e/` (vitest) already pass with in-memory backend — they need to keep passing after Prisma migration
- The 5 failing Playwright tests are in `packages/portal/e2e/` — read them to understand exact UI expectations
- Circuit constraint counts: MandateBound ~350, ParameterRange ~550, CredentialFreshness ~430, IdentityBinding ~932
- GitHub has 27 dependency vulnerabilities flagged — address if time permits but not blocking for demo
