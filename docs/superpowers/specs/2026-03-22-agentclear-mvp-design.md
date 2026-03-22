# AgentClear MVP — Design Specification

**Version:** 1.1
**Date:** 2026-03-22
**Status:** Approved
**Scope:** Production-ready MVP (3-4 months)
**Audience:** Investor demos + pilot customer engagement

---

## 1. Overview

AgentClear is a cryptographic trust protocol for AI agent negotiation and commitment in B2B enterprise contexts. The MVP delivers a complete, demo-ready platform: ZK circuits proving agent authority, smart contracts recording commitments on-chain, a TypeScript SDK, hosted prover and session relay services, CLI tools, and a full portal experience.

### Goals

- Validate ZK circuit performance (proof generation <2s for standard circuits, <5s for IdentityBinding; on-chain verification <250k L1-equivalent gas)
- Demonstrate end-to-end negotiation with cryptographic trust to investors and pilot customers
- Deploy core contracts to Arbitrum mainnet as a credibility signal
- Provide SDK + CLI enabling <30 minute developer onboarding
- Deliver an enterprise-grade portal with org management, live session monitoring, and commitment explorer

### Non-Goals (Deferred Past MVP)

- Python SDK
- Framework adapters (LangChain, AutoGen, Agentforce)
- DisputeResolution contract (Phase 2)
- Full trusted setup ceremony (20+ participants)
- Recursive proof aggregation
- PLONK migration (decision after benchmarks)
- SI partnership tooling
- Formal verification (Certora)
- Full security audit (pre-mainnet production, not pre-MVP)
- i18n (English only)
- Mobile app

---

## 2. Architecture

### Implementation Approach

Middle-Out with parallel tracks. Define shared interfaces and contract ABIs first (1 week), then run three tracks concurrently:

1. **Track 1: ZK + Contracts** — Contractor builds circuits, you build smart contracts
2. **Track 2: SDK + Backend** — SDK, relay service, prover service, CLI
3. **Track 3: Portal + DX** — Full portal, marketing pages, interactive demo, documentation

Tracks converge at bi-weekly integration checkpoints.

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript (end-to-end) | ZK tooling is JS-native (snarkjs, circomlibjs); unified type system across SDK, backend, portal |
| Monorepo | Turborepo + pnpm workspaces | 7 packages, parallel builds, CI caching |
| ZK Circuits | Circom 2.x + Groth16 | Largest ecosystem, smallest proofs, cheapest verification |
| Hash | Poseidon | ZK-optimized (240 constraints vs SHA-256 1600+) |
| Smart Contracts | Solidity 0.8.x + Hardhat + OpenZeppelin v5 | Standard, well-audited |
| Chain | Arbitrum One (mainnet) + Arbitrum Sepolia (testnet) | L2 cost savings (~$0.06/session) |
| DID | did:ethr (ERC-1056) + Veramo | Ethereum-native, most complete W3C implementation |
| Backend | Fastify | High performance, WebSocket-native |
| Portal | Next.js App Router + Tailwind | SSR for marketing, App Router for dashboard |
| Database | PostgreSQL + Redis + IPFS (Pinata) | Persistent storage + real-time/caching + content-addressed credentials |
| Auth | JWT + API key + EIP-4361 (SIWE) | Enterprise (email/password) + crypto-native (wallet) |
| ORM | Prisma | Type-safe queries, migration management, schema-first |
| Deployment | Render (services) + Alchemy (RPC) + Pinata (IPFS) | Matches existing workflow |
| CI/CD | GitHub Actions | Lint, typecheck, test, build, deploy |

### Team Structure

- **You:** Architecture, smart contracts, review across all tracks, GTM
- **Claude Code:** SDK, relay, prover, portal, CLI, tests, CI/CD
- **ZK Contractor:** Circom circuits, trusted setup, benchmarks, integration support (6-7 weeks)
- **Optional second contractor:** Solidity review (Week 10-12)

---

## 3. Monorepo Structure

```
agentclear/
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── docs/
│   └── superpowers/specs/
│
├── packages/
│   ├── types/                   # @agentclear/types — shared interfaces
│   ├── contracts/               # @agentclear/contracts — Solidity + Circom
│   │   ├── contracts/           # Solidity contracts
│   │   ├── circuits/            # Circom circuits
│   │   ├── test/
│   │   └── scripts/
│   ├── sdk/                     # @agentclear/sdk — main developer SDK
│   │   └── src/
│   │       ├── client.ts
│   │       ├── identity/
│   │       ├── credentials/
│   │       ├── prover/
│   │       ├── negotiation/
│   │       ├── commitment/
│   │       └── agents/
│   ├── prover/                  # @agentclear/prover — ZK proof service
│   ├── relay/                   # @agentclear/relay — API + WebSocket
│   ├── cli/                     # @agentclear/cli — command-line tools
│   └── portal/                  # @agentclear/portal — Next.js app
│       ├── app/
│       │   ├── (marketing)/
│       │   ├── (auth)/
│       │   └── (dashboard)/
│       ├── components/
│       └── lib/
│
├── infrastructure/
│   ├── docker-compose.yml
│   ├── Dockerfile.prover
│   ├── Dockerfile.relay
│   └── render.yaml
│
└── scripts/
    ├── setup.sh
    ├── deploy-testnet.sh
    ├── deploy-mainnet.sh
    └── ceremony/
```

`packages/types` is the single source of truth — every other package imports from it. `contracts` owns both Solidity and Circom because verifier contracts are generated from circuits. Portal uses BFF pattern (Next.js API routes proxy to relay).

---

## 4. ZK Circuit Architecture

Four circuits using Poseidon hashing, all Circom 2.x with Groth16 proving system.

### Circuit 1: MandateBound(n=64)

- **Purpose:** Proves `proposed_value ≤ max_value` without revealing `max_value`
- **Public inputs:** `proposed` (plaintext proposed value — visible to verifier/counterparty), `commitment` (Poseidon hash of max_value + randomness)
- **Private inputs:** `max_value`, `randomness`
- **Constraints:** ~350 estimated
- **Target proof time:** <1s
- **Logic:** Bit decomposition range check proving `proposed ≤ max_value`; verify `commitment == Poseidon(max_value, randomness)`. The counterparty sees the proposed value (it's the negotiation offer) but cannot learn the mandate ceiling.

### Circuit 2: ParameterRange(n=64)

- **Purpose:** Proves `floor ≤ proposed ≤ ceiling` without revealing bounds
- **Public inputs:** `proposed` (plaintext proposed value), `commitment` (Poseidon hash of floor + ceiling + randomness)
- **Private inputs:** `floor`, `ceiling`, `randomness`
- **Constraints:** ~550 estimated
- **Target proof time:** <1.5s
- **Logic:** Two range checks (`proposed - floor ≥ 0`, `ceiling - proposed ≥ 0`); verify `commitment == Poseidon(floor, ceiling, randomness)`. Counterparty sees the proposed value but not the acceptable range.
- **Note:** The original PoC spec uses two separate commitments (`Poseidon(floor, r1)` + `Poseidon(ceiling, r2)`). This design intentionally consolidates into a single commitment for efficiency (~240 fewer constraints, fewer public inputs). The contractor should implement the single-commitment version.

### Circuit 3: CredentialFreshness

- **Purpose:** Proves credential is currently valid (issued and not expired) without revealing dates
- **Public inputs:** `current_timestamp`, `credential_commitment` (Poseidon hash of credential data)
- **Private inputs:** `issuance_timestamp`, `expiry_timestamp`, `credential_data_hash`, `blinding_factor`
- **Constraints:** ~540-560 estimated (Poseidon(4) adds ~80 constraints over PoC's Poseidon(3))
- **Target proof time:** <1.5s
- **Logic:** Verify `current_timestamp ≥ issuance_timestamp` (credential has been activated) AND `current_timestamp < expiry_timestamp` (not expired); verify `credential_commitment == Poseidon(credential_data_hash, issuance_timestamp, expiry_timestamp, blinding_factor)`.
- **Note:** The PoC spec uses Poseidon(3) without blinding factor. This design adds `blinding_factor` as a fourth input for stronger commitment hiding. Input ordering differs from PoC — contractor should follow this spec, not the PoC.

### Circuit 4: IdentityBinding

- **Purpose:** Proves agent controls the private key for a DID without revealing it
- **Public inputs:** `did_commitment` (derived from public key), `challenge`
- **Private inputs:** `private_key`, `public_key`
- **Constraints:** ~3,000-6,000 estimated (EdDSA verification on Baby JubJub curve)
- **Target proof time:** <3s (target), <5s (acceptable)
- **Note:** Full EdDSA verification inside Circom is constraint-heavy. If benchmarks exceed 5s, fallback approach: sign challenge externally and verify signature on-chain instead of inside ZK circuit, trading ZK privacy for performance.
- **Design change from PoC:** The PoC exposes `did_public_key[2]` as public inputs. This design hides the public key behind `did_commitment` for stronger metadata privacy — the verifier confirms the agent controls a DID without learning the raw public key. Contractor should implement the `did_commitment` version.

### Proof System

- **MVP:** Groth16 (smallest proofs, cheapest on-chain verification at ~220k gas)
- **Trusted setup:** PoC-level ceremony with 2-5 participants
- **PLONK evaluation:** Deferred to post-MVP based on benchmark results
- **Gas cost:** ~220k gas L1-equivalent per Groth16 verification. On Arbitrum One, effective cost is significantly lower due to L2 gas pricing (~$0.001-$0.01 per verification). Target: <220k L1-equivalent gas (acceptable: <250k).
- **Verification flow:** Off-chain generation (~0.5-3s depending on circuit) → off-chain counterparty verification (~10ms) → on-chain commitment verification (~220k L1-equivalent gas)

---

## 5. Smart Contracts

Solidity 0.8.x with Hardhat + OpenZeppelin v5. Mainnet contracts use TransparentProxy for upgradeability with 48-hour timelock governance.

### AgentRegistry

```
registerAgent(did, orgId, metadata) → agentId
updateAgent(agentId, metadata)
rotateKey(agentId, newPubKey)
resolveAgent(did) → AgentRecord
deactivateAgent(agentId)

Events: AgentRegistered, AgentUpdated, KeyRotated, AgentDeactivated
Access: Only org admin can register/modify agents
```

### CredentialRegistry

```
registerCredential(credentialHash, agentId, schemaHash, expiry)
revokeCredential(credentialHash)
isValid(credentialHash) → bool

Events: CredentialRegistered, CredentialRevoked
Access: Only credential issuer (org) can register/revoke
```

### CommitmentContract

```
anchorSession(sessionId, merkleRoot, parties[], turnCount)
createCommitment(sessionId, agreementHash, parties[],
    credentialHashes[], proofs[], publicSignals[], signatures[])
getCommitment(commitmentId) → CommitmentRecord
getSessionCommitments(sessionId) → CommitmentRecord[]

Events: SessionAnchored, CommitmentCreated
Verification: On-chain Groth16 pairing check via auto-generated verifier contracts
Access: Only registered agents can anchor/commit

Note: All MVP commitments are FINAL and IRREVOCABLE. DisputeResolution contract
is deferred to Phase 2. A flagCommitment(commitmentId, reason) function with a
CommitmentFlagged event is included for manual dispute signaling, but has no
on-chain enforcement effect in MVP.
```

### Groth16Verifier (auto-generated)

- One verifier contract per circuit (4 total)
- Generated by snarkjs from trusted setup artifacts
- Called by CommitmentContract.createCommitment()
- Pure function: `verifyProof(proof, publicSignals) → bool`

### Deployment Strategy

| Target | Contracts | Method |
|--------|-----------|--------|
| Hardhat local | All | Auto-deploy on startup |
| Arbitrum Sepolia | All | Deploy script + Alchemy RPC |
| Arbitrum One | AgentRegistry + CommitmentContract only | Multi-sig (Gnosis Safe 2-of-3) + TransparentProxy + timelock |

---

## 6. SDK Design

### AgentClearClient

Main entry point wrapping all protocol complexity:

```typescript
const client = new AgentClearClient({
  agent: { did: 'did:ethr:arb1:0x...', keyFile: './keys/agent.key' },
  credential: './credentials/authority.vc.json',
  network: { chain: 'arbitrum-sepolia', rpcUrl: process.env.ALCHEMY_RPC_URL },
  prover: { mode: 'local' },
})
```

### Five Modules

| Module | Responsibility |
|--------|---------------|
| `client.identity` | DID creation, resolution, key rotation (Veramo) |
| `client.credentials` | VC issuance, verification, IPFS storage, revocation |
| `client.prover` | ZK proof generation — transparent local/remote switching |
| `client.negotiation` | Session lifecycle, turn signing, merkle accumulation |
| `client.commitment` | On-chain commitment creation, query, verification |

### Agent Strategy System

Pluggable negotiation logic — the protocol is agent-logic-agnostic:

```typescript
interface NegotiationStrategy {
  name: string
  initialize(mandate: MandateParams): Promise<void>
  decideTurn(context: TurnContext): Promise<TurnDecision>
  onCounterOffer(turn: NegotiationTurn): Promise<TurnDecision>
  shouldAccept(turn: NegotiationTurn): Promise<boolean>
  shouldWalkAway(context: TurnContext): Promise<boolean>
}
```

**Built-in strategies:**

| Strategy | Use Case |
|----------|----------|
| `RuleBasedStrategy` | Deterministic logic with configurable thresholds (concession rate, walk-away point, max turns) |
| `LLMStrategy` | Claude/GPT-powered decisions within mandate bounds. LLM decides WHAT; SDK handles proof generation |
| `MockStrategy` | Pre-scripted responses for testing and demos |

### Testing Utilities (`@agentclear/sdk/testing`)

- `MockAgent` — pre-configured agent with in-memory keys
- `LocalChain` — Hardhat node with contracts deployed
- `TestCredentials` — valid VCs with known parameters
- `TestProver` — deterministic proofs (skips real ZK for speed)
- `SessionRecorder` — captures full session for replay/assertions

---

## 7. Backend Services

### Service Topology

```
Portal (Next.js) → BFF → Relay (Fastify) → Prover (Fastify)
                                          → PostgreSQL
                                          → Redis
                                          → IPFS (Pinata)
```

### Relay Service (`packages/relay`)

Central API and session orchestrator.

**REST endpoints:**

| Group | Routes |
|-------|--------|
| Auth | `POST /auth/register, /auth/login, /auth/wallet, /auth/refresh` |
| Orgs | `POST /orgs`, `GET/PATCH /orgs/:orgId`, `GET /orgs/:orgId/members`, `POST /orgs/:orgId/invite` |
| Agents | `POST/GET /orgs/:orgId/agents`, `GET/PATCH/DELETE /orgs/:orgId/agents/:agentId` |
| Credentials | `POST/GET /orgs/:orgId/credentials`, `GET/DELETE /orgs/:orgId/credentials/:id` |
| Sessions | `POST/GET /sessions`, `GET /sessions/:sessionId`, `GET /sessions/:sessionId/turns` |
| Commitments | `GET /commitments`, `GET /commitments/:id`, `POST /commitments/:id/verify` |
| Analytics | `GET /analytics/overview, /sessions, /proofs, /costs` |
| API Keys | `POST/GET /orgs/:orgId/api-keys`, `DELETE /orgs/:orgId/api-keys/:id` |

**WebSocket channels:**

| Channel | Events |
|---------|--------|
| `ws://relay/sessions/:sessionId` | `turn.proposed`, `turn.countered`, `turn.accepted`, `turn.rejected`, `proof.verified`, `commitment.created` |
| `ws://relay/orgs/:orgId/feed` | `session.created`, `session.completed`, `agent.status`, `alert` |

### Prover Service (`packages/prover`)

Dedicated CPU-intensive proof generation service. Not publicly exposed — relay proxies requests.

```
POST /prove/mandate-bound
POST /prove/parameter-range
POST /prove/credential-freshness
POST /prove/identity-binding
POST /verify
GET  /health
GET  /metrics
```

Worker pool for parallel proof generation. Redis caching for verification keys and proof results.

### Chain Indexer (within Relay)

The relay service includes a chain indexer component that listens for on-chain events and syncs them to PostgreSQL:

- Uses ethers.js event listeners connected to Alchemy RPC (WebSocket)
- Listens for: `AgentRegistered`, `CredentialRegistered`, `CredentialRevoked`, `SessionAnchored`, `CommitmentCreated`, `CommitmentFlagged`
- On event: updates corresponding database record with tx hash, block number, confirmation status
- Handles RPC disconnections with automatic reconnection and block gap backfill
- Stores last processed block number in Redis for crash recovery
- Runs as a background process within the relay service (not a separate service)

### Database Schema

```sql
-- Core entities
organisations (id UUID PK, name, slug UNIQUE, plan, created_at, updated_at)
users (id UUID PK, org_id FK→organisations, email UNIQUE, password_hash, wallet_address UNIQUE NULLABLE,
       role, email_verified, created_at)
agents (id UUID PK, org_id FK→organisations, did UNIQUE, name, status, metadata JSONB,
        public_key, registered_tx_hash, created_at)
credentials (id UUID PK, org_id FK→organisations, agent_id FK→agents, credential_hash UNIQUE,
             schema_hash, ipfs_cid, mandate_params_encrypted, expiry, revoked DEFAULT false,
             registered_tx_hash, created_at)

-- Negotiation
sessions (id UUID PK, initiator_agent_id FK→agents, counterparty_agent_id FK→agents,
          status ENUM(active,completed,rejected,expired,committed), session_config JSONB,
          merkle_root, turn_count, anchor_tx_hash, created_at, updated_at)
         INDEX ON (initiator_agent_id), INDEX ON (counterparty_agent_id), INDEX ON (status)
turns (id UUID PK, session_id FK→sessions, agent_id FK→agents, sequence_number INT,
       terms JSONB, proof_type, proof JSONB, public_signals JSONB, signature, created_at)
      UNIQUE ON (session_id, sequence_number)

-- Commitments
commitments (id UUID PK, session_id FK→sessions UNIQUE, agreement_hash, parties UUID[],
             credential_hashes TEXT[], proofs JSONB, tx_hash, block_number, verified, created_at)
            INDEX ON (tx_hash)

-- Access
api_keys (id UUID PK, org_id FK→organisations, key_hash UNIQUE, name, scopes TEXT[],
          last_used_at, expires_at, created_at)
```

Redis handles: active WebSocket connections, session presence, pub/sub for turn delivery, proof verification cache.

---

## 8. Portal Design

### Page Architecture

**Marketing (SSR, public):**

| Route | Purpose |
|-------|---------|
| `/` | Landing page — hero, value prop, live demo animation, social proof |
| `/pricing` | Plan tiers |
| `/docs` | Documentation hub |
| `/demo` | Interactive guided negotiation demo (no login required) |

**Auth:**

| Route | Purpose |
|-------|---------|
| `/login` | Email/password + wallet connect |
| `/register` | Org signup |
| `/verify-email` | Email verification |

**Dashboard (authenticated):**

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview — active sessions, recent commitments, agent status, cost summary |
| `/dashboard/agents` | Agent provisioning, DID management |
| `/dashboard/agents/[id]` | Agent detail, credentials, session history, key rotation |
| `/dashboard/credentials` | Credential issuance wizard, listing, revocation |
| `/dashboard/credentials/[id]` | Credential detail, IPFS link, on-chain hash |
| `/dashboard/sessions` | Session list, status filters |
| `/dashboard/sessions/[id]` | **Live session monitor** — real-time turns, ZK proof badges, terms comparison |
| `/dashboard/commitments` | Commitment explorer, on-chain links |
| `/dashboard/commitments/[id]` | Commitment detail, proof viewer, session replay |
| `/dashboard/analytics` | Session volume, proof metrics, gas costs |
| `/dashboard/settings` | Org settings, members, roles |
| `/dashboard/settings/api-keys` | API key management |
| `/dashboard/settings/billing` | Plan management |

### Key Components

| Component | Purpose |
|-----------|---------|
| `StatCard` | Metric display (number + label + trend) |
| `DataTable` | Sortable, filterable, paginated table |
| `StatusBadge` | Color-coded status indicator |
| `ProofBadge` | ZK proof status (generating → verified → on-chain) |
| `TurnTimeline` | Vertical timeline of negotiation turns |
| `ChainLink` | Clickable link to Arbiscan transaction |
| `LiveIndicator` | Pulsing dot for active WebSocket connections |
| `Modal` | Standard modal |
| `Wizard` | Multi-step form flow |
| `TimeSeriesChart` | Recharts time series |
| `Toast` | WebSocket-driven notifications |
| `WalletButton` | RainbowKit connect/disconnect |

### Visual Identity

- **Palette:** Deep navy primary (`#0F172A`), electric blue accent (`#3B82F6`), verified green (`#10B981`), circuit-board background pattern
- **Typography:** Inter
- **Tone:** "Cryptographic trust for AI agents" — technical but accessible, institutional not crypto-bro

### Interactive Demo (`/demo`)

Guided walkthrough for investors (no login):

1. "Meet the agents" — two pre-configured agents with visible mandates
2. "Watch them negotiate" — auto-plays negotiation with real ZK proofs (testnet)
3. "Verify the commitment" — on-chain record with Arbiscan link
4. "Try it yourself" — editable parameters, run your own negotiation

Each step has explanatory annotations for non-technical audiences.

---

## 9. CLI Tools

Command structure using `commander.js`:

```
agentclear init [--demo]                    # Initialize project / scaffold demo
agentclear agent create|list|info|rotate-key
agentclear credential issue|list|verify|revoke
agentclear session create|list|watch|replay
agentclear commitment list|verify|show
agentclear prove <circuit> --input <file>
agentclear verify <proof-file>
agentclear config set|show
agentclear status
```

### Developer Onboarding (<30 minutes, target ~9 minutes)

```
npm install -g @agentclear/cli
agentclear init --demo
docker-compose up -d
agentclear agent create buyer && agentclear agent create seller
agentclear credential issue --agent buyer --max-value 500000 --currency EUR
agentclear credential issue --agent seller --max-value 600000 --currency EUR
agentclear session create --config demo/negotiation.json
agentclear commitment list && agentclear commitment verify <id>
```

The `--demo` scaffold generates a ready-to-run project with pre-configured agents, example strategies (rule-based + LLM), and a one-file complete example.

---

## 10. Deployment & Infrastructure

### Local Development

```yaml
# docker-compose.yml
services:
  postgres:   # Port 5432
  redis:      # Port 6379
  ipfs:       # Port 5001
  hardhat:    # Port 8545 (contracts auto-deployed)
  relay:      # Port 3001
  prover:     # Port 3002
  portal:     # Port 3000
```

One-command: `pnpm dev` via Turborepo.

### Testnet (Render)

| Service | Render Type |
|---------|-------------|
| Portal | Web Service (Next.js) |
| Relay | Web Service (Fastify, WebSocket enabled) |
| Prover | Web Service (CPU-optimized) |
| Postgres | Render Postgres |
| Redis | Render Redis |
| IPFS | Pinata (external) |

Contracts on Arbitrum Sepolia via Alchemy RPC, verified on Arbiscan.

### Mainnet (Credibility Signal)

AgentRegistry + CommitmentContract on Arbitrum One:
- TransparentProxy + 48-hour timelock
- Gnosis Safe multi-sig (2-of-3) for deploys
- Verified on Arbiscan
- Landing page displays mainnet contract addresses

### CI/CD (GitHub Actions)

```
on push to master:
  lint → typecheck → test:contracts → test:sdk → test:relay → test:portal → build → deploy

Circuit compilation + trusted setup artifacts cached (deterministic, slow to generate).
```

---

## 11. Security

### Authentication

| Consumer | Method | Token |
|----------|--------|-------|
| Portal user (email) | Email/password (bcrypt) | JWT (15m access + 7d refresh) |
| Portal user (wallet) | EIP-4361 SIWE | JWT (same) |
| SDK consumer | API key (`ac_` prefix) | Authorization header |
| Service-to-service | Shared secret | Internal bearer token |

### Multi-Tenancy

Every database query includes `org_id` filter enforced at ORM layer. API keys scoped to org. JWT contains `orgId` claim. WebSocket connections scoped to org's sessions.

### Key Management

- Agent private keys: AES-256-GCM encrypted at rest, decrypted in memory for signing
- Org signing keys: encrypted in Postgres, optional external KMS (AWS/GCP) for production pilots
- Wallet auth: keys never touch server — client-side signing

### Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Public (register, login) | 5/min per IP |
| Authenticated API | 100/min per API key |
| Proof generation | 20/min per org |
| WebSocket messages | 60/min per connection |

### Additional Measures

- Zod schemas on every endpoint (types from `@agentclear/types`)
- DID format validation, credential hash verification, proof format validation
- CORS locked to portal origin, Helmet.js headers, TLS 1.3
- CSRF protection on cookie-authenticated routes

### Threat Model Coverage (MVP vs Deferred)

Mapped against the 12 threats in `03-threat-model.md`:

| Threat | MVP Mitigation | Residual Risk |
|--------|---------------|---------------|
| T-01: Replay Attack | Nonce + timestamp + session binding in every turn | Low |
| T-02: MitM Session Init | TLS 1.3 on all connections. DID-based channel binding deferred to Phase 2 | Medium (accepted) |
| T-03: Compromised Principal Key | AES-256-GCM encryption at rest, optional KMS. HSM + multi-sig deferred | Medium (accepted) |
| T-04: ZK Proof Malleability | Proof uniqueness check + session binding in public inputs | Low |
| T-05: Front-Running Commitments | Dual-signature requirement. Commit-reveal scheme deferred to Phase 2 | Low-Medium (accepted) |
| T-06: Oracle Manipulation | Not applicable in MVP (no oracle dependency) | N/A |
| T-07: Smart Contract Bug | OpenZeppelin v5, comprehensive tests. Formal verification deferred | Medium (accepted) |
| T-08: Sybil DAO Attack | Not applicable in MVP (no DAO governance) | N/A |
| T-09: Prover DoS | Rate limiting (20/min per org) + API key authentication required for proof requests | Low |
| T-10: Session Metadata Leakage | Session IDs are UUIDs (not agent-identifying). Pseudonymous agent aliases and batching deferred to Phase 2 | Medium (accepted) |
| T-11: Model Extraction | Outside protocol scope — enterprise responsibility | N/A |
| T-12: Governance Capture | Not applicable in MVP (no DAO) | N/A |

---

## 12. Testing Strategy

### Testing Pyramid

| Layer | Test Count | Tools |
|-------|-----------|-------|
| Unit | 300-400 | circom_tester, Hardhat/Chai, Vitest, React Testing Library |
| Integration | 80-100 | Vitest, docker-compose test env |
| E2E | 15-20 | Playwright |

### Unit Test Breakdown

| Package | Tests | Coverage |
|---------|-------|----------|
| Circuits | ~40 | Valid/invalid proofs, edge cases, constraint regression |
| Contracts | ~80 | All functions, access control, edge cases |
| SDK | ~120 | All modules, all strategies, testing utilities |
| Relay | ~80 | All endpoints, auth, WebSocket, multi-tenancy |
| Portal | ~60 | Components, pages, auth flows |

### Integration Tests

- SDK ↔ Contracts: full lifecycle with real ZK proofs (~15 tests)
- SDK ↔ Relay ↔ Prover: API auth → session → turns → commitment (~20 tests)
- Portal ↔ Relay: BFF routes, auth cookies, WebSocket (~15 tests)
- Multi-tenancy isolation: cross-org access denied (~10 tests)

### E2E Tests (Playwright)

| Test | Flow |
|------|------|
| Investor demo | Landing → Demo → Watch negotiation → Verify commitment |
| Org onboarding | Register → Create org → Provision agent → Issue credential |
| Full negotiation | Login → Create session → Watch turns → View commitment |
| Wallet auth | Connect wallet → Sign → Dashboard |
| Credential lifecycle | Issue → Verify → Revoke → Verify revoked |
| Session monitor | Open session → Receive WebSocket turns → Proof badges |
| API key management | Generate → Copy → Use → Revoke → Verify rejected |

### Performance Benchmarks (CI-tracked)

| Metric | Target | Acceptable |
|--------|--------|-----------|
| MandateBound proof gen | <1s | <2s |
| ParameterRange proof gen | <1.5s | <2.5s |
| CredentialFreshness proof gen | <1.5s | <2.5s |
| IdentityBinding proof gen | <3s | <5s |
| Off-chain verification | <50ms | <100ms |
| On-chain verification gas | <220k | <250k |
| Session creation API | <200ms | <500ms |
| Turn submission (with proof) | <3s | <5s |
| End-to-end 5-turn negotiation | <36s | <60s |

### Test Commands

```
pnpm test                # All unit tests (parallel via Turborepo)
pnpm test:contracts      # Circuit + Solidity
pnpm test:sdk            # SDK unit tests
pnpm test:relay          # Relay unit tests
pnpm test:portal         # Portal component tests
pnpm test:integration    # Requires docker-compose
pnpm test:e2e            # Requires deployed services
pnpm test:ci             # Full CI suite
```

---

## 13. Timeline & Parallel Tracks

### Phase 0: Foundation (Week 1)

- Initialize Turborepo monorepo with all package scaffolds
- Define `@agentclear/types` — all shared interfaces
- Define smart contract ABIs (Solidity interfaces)
- Set up CI pipeline, docker-compose, config schema
- Onboard ZK contractor

**Exit criteria:** All three tracks can start independently with stable interfaces.

### Track 1: ZK + Contracts (Weeks 2-10)

| Period | Work |
|--------|------|
| Week 2-4 | 4 Circom circuits + tests (contractor) |
| Week 4-5 | Trusted setup ceremony, benchmarks, generate Solidity verifiers |
| Week 3-6 | Smart contracts: AgentRegistry, CredentialRegistry, CommitmentContract + tests |
| Week 7 | SDK prover integration with real circuits, end-to-end benchmarks |
| Week 8-9 | Testnet deployment (Arbitrum Sepolia), Arbiscan verification |
| Week 10-12 | Mainnet deployment (AgentRegistry + CommitmentContract), proxy + timelock + multi-sig |

### Track 2: SDK + Backend (Weeks 2-10)

| Period | Work |
|--------|------|
| Week 2-3 | SDK core: client, identity, credentials, prover (TestProver stub) |
| Week 3-5 | Relay service: auth, CRUD endpoints, sessions, WebSocket, Prisma migrations |
| Week 4-6 | Prover service: API, worker pool, Redis cache, circuit integration |
| Week 5-7 | SDK negotiation + commitment modules, strategy system, integration tests |
| Week 7-8 | CLI tools, `init --demo` scaffold, config management |
| Week 9-10 | Full integration: SDK ↔ contracts ↔ relay ↔ prover, testnet deployment |

### Track 3: Portal + DX (Weeks 2-14)

| Period | Work |
|--------|------|
| Week 2-4 | Next.js scaffold, Tailwind theme, auth pages, layout, core components |
| Week 4-6 | Dashboard: overview, agents, credentials, settings + connect to real relay API |
| Week 6-8 | Sessions (live monitor), commitments (explorer), analytics |
| Week 8-10 | Landing page, pricing, interactive demo, docs hub |
| Week 10-12 | Responsive design, loading/error states, notifications, Playwright E2E |
| Week 12-14 | Final integration, demo mode, investor script, pilot onboarding flow, doc review |

### Integration Checkpoints

| Week | What's Verified |
|------|-----------------|
| Week 5 | ZK benchmarks reviewed; relay API ready for portal |
| Week 7 | Real circuits integrated into SDK prover |
| Week 9 | Full flow: portal → relay → prover → contracts (testnet) |
| Week 12 | Mainnet contracts live; testnet full stack operational |
| Week 14 | Investor demo + pilot customer demo both run cleanly |

### Contractor Engagement

| Period | Deliverables |
|--------|--------------|
| Week 1 | Onboarding: review specs, set up Circom environment |
| Week 2-4 | 4 circuits + tests + constraint validation |
| Week 4-5 | Trusted setup, proving/verification keys, Solidity verifiers |
| Week 6-7 | Integration support: circuits → SDK prover module |
| Week 8 (optional) | Code review: contract security, circuit edge cases |

### Risk Mitigation

| Risk | Detection | Response |
|------|-----------|----------|
| ZK proof >2s | Week 5 | Evaluate PLONK, reduce complexity, or accept with caveat |
| Gas >250k | Week 5 | Optimize constraints, consider recursive aggregation |
| Relay↔Prover integration | Week 7 | Fallback to local-only proving |
| Portal scope creep | Week 9 | Cut analytics, simplify demo — core flow non-negotiable |
| Mainnet deployment blocked | Week 10 | Ship testnet-only, mainnet fast-follow |

---

## 14. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| TypeScript end-to-end | vs. Python backend | ZK tooling (snarkjs) is JS-native; unified type system |
| Turborepo | vs. pnpm-only or Nx | 7 packages, parallel builds, CI caching; already familiar |
| Groth16 for MVP | vs. PLONK | Smallest proofs, cheapest verification; PLONK evaluated post-benchmark |
| Fastify | vs. Express | Performance for WebSocket-heavy workloads |
| Next.js App Router | vs. Vite SPA | SSR for marketing/SEO, layout nesting for dashboard |
| Pinata | vs. self-hosted IPFS | Managed service avoids ops overhead for MVP |
| Prisma | vs. raw SQL | Type-safe queries, migration management |
| BFF pattern | vs. direct API calls | Simplifies CORS, auth proxy, single origin |
| Hybrid auth | vs. wallet-only or email-only | Serves both enterprise and crypto-native audiences |
| Hybrid deployment | vs. testnet-only or mainnet-only | Testnet for dev, mainnet contracts as credibility signal |

---

## 15. Error Handling & Resilience

### Proof Generation Failures

- If proof generation fails mid-session (circuit error, timeout), the SDK retries once with exponential backoff
- If retry fails, the turn is marked as `proof_failed` and the session enters a `paused` state
- The counterparty receives a `turn.proof_failed` WebSocket event
- Sessions in `paused` state auto-expire after 15 minutes if not resumed

### WebSocket Disconnections

- Client-side heartbeat every 30s; server drops connection after 90s of silence
- On reconnection, client requests missed events since last received sequence number
- Relay stores last 100 events per session in Redis for replay on reconnect
- Portal shows "Reconnecting..." indicator during disconnection

### On-Chain Transaction Failures

- Failed transactions (out of gas, revert) trigger automatic retry with 10% gas increase (max 2 retries)
- If all retries fail, the operation is queued and the user is notified via WebSocket + portal toast
- Commitment creation failures do NOT affect the session state — the session remains `completed` and commitment can be re-attempted

### RPC Provider Outages

- Alchemy is primary RPC; Infura configured as fallback
- Chain indexer switches to fallback automatically on 3 consecutive failures
- SDK accepts `rpcUrl` array in config for client-side fallback

---

## 16. Observability

### Structured Logging

- All services use `pino` (Fastify's default logger) with JSON output
- Every log entry includes: `timestamp`, `level`, `service`, `requestId` (correlation ID), `orgId` (when authenticated)
- Request logging middleware: method, path, status, duration_ms
- Proof generation logs: circuit, constraint_count, proof_time_ms, success/failure

### Metrics

- Prover service exposes `/metrics` in Prometheus format
- Key metrics: proof_generation_duration_seconds (histogram by circuit), proof_requests_total, active_sessions, websocket_connections
- Relay service exposes `/metrics`: request_duration_seconds, requests_total (by endpoint), auth_failures_total

### Uptime Monitoring

- Render native health checks on all services (`/health` endpoint)
- External uptime monitor (e.g., UptimeRobot free tier) for the demo environment
- Alerting: email notification on service downtime (critical for investor demo reliability)

---

## 17. CI Artifact Caching

### Circuit Artifacts

Trusted setup artifacts (proving keys, verification keys, WASM files) are large (~100-200MB per circuit) and deterministic. Caching strategy:

- **Development:** Artifacts generated once via `scripts/setup.sh`, stored in `packages/contracts/circuits/build/` (gitignored)
- **CI:** Cached using GitHub Actions cache with key based on circuit source file hashes. Cache hit skips compilation + setup (~5 min savings per run)
- **Production:** Artifacts stored in a dedicated GitHub Release asset (versioned, immutable, publicly downloadable). Deploy scripts pull from release rather than regenerating.
- **Docker:** Multi-stage build copies pre-built artifacts into prover image

---

## 18. Future Considerations

### A2A Compatibility (Phase 2 Priority)

The SDK's agent identity and capability model is designed to align with Google A2A's Agent Card specification. Phase 2 will add:
- `AgentCard` export from SDK (A2A-compatible capability advertisement)
- A2A trust extension using AgentClear's ZK proof layer
- Standards contribution to AAIF for A2A trust extension draft (Month 14 per standards roadmap)

The MVP SDK's DID-based identity and W3C VC credentials are architecturally compatible with A2A — the adapter is a mapping layer, not a rewrite.

### Legal Disclaimer

MVP commitment records are technical proofs of agreement between AI agents. They are NOT automatically legally binding contracts. The legal enforceability analysis in `05-legal-enforceability.md` identifies open questions requiring external counsel opinion before any commitment is represented as legally binding to pilot customers or investors.
