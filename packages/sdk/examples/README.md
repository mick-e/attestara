# @attestara/sdk Examples

Runnable TypeScript examples demonstrating the Attestara SDK.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Build the workspace first: `pnpm build` from the monorepo root

## Running

Each example is a self-contained script that can be executed with `tsx`:

```bash
# From the monorepo root
npx tsx packages/sdk/examples/01-procurement-negotiation.ts
npx tsx packages/sdk/examples/02-credential-issuance-flow.ts
npx tsx packages/sdk/examples/03-commitment-verification.ts
```

## Examples

### 01 - Procurement Negotiation

End-to-end negotiation between a buyer and supplier agent. Demonstrates
DID creation, credential issuance, session management, ZK proof generation,
multi-turn negotiation, and session acceptance.

### 02 - Credential Issuance Flow

W3C Verifiable Credential lifecycle: issuance with mandate parameters,
IPFS pinning, hashing, multi-domain credentials, and revocation.

### 03 - Commitment Verification

On-chain commitment anchoring: negotiation completion, commitment creation
with credential hashes and ZK proofs, verification, and filtered listing.

## Key Concepts

| Concept | SDK Class | Example |
|---------|-----------|---------|
| Agent identity | `MockAgent` | 01, 02, 03 |
| Credentials | `CredentialManager` | 01, 02, 03 |
| IPFS storage | `MemoryIPFSClient` | 02 |
| Negotiation | `SessionManager` | 01, 03 |
| ZK proofs | `TestProver` | 01, 03 |
| Commitments | `CommitmentManager` | 03 |

All examples use in-memory/mock implementations so no external services
(PostgreSQL, Redis, Ethereum RPC) are required.
