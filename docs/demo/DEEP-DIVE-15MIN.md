# Attestara 15-Minute Deep Dive

This walkthrough goes beyond the quickstart to explore the SDK programmatically,
connect to the relay API, examine ZK proofs, and understand the commitment
anchoring flow.

**Prerequisites**: Complete the [5-Minute Quickstart](QUICKSTART-5MIN.md) first.

---

## Part 1: SDK Programmatic Usage (5 min)

### 1.1 Run the Procurement Example

```bash
npx tsx packages/sdk/examples/01-procurement-negotiation.ts
```

Study the output -- you will see:
- Two agents created with `did:ethr` identifiers
- Authority Credentials issued to each
- A negotiation session with 3 turns
- ZK proofs generated for each proposal
- Session acceptance and merkle root computation

### 1.2 Run the Credential Flow Example

```bash
npx tsx packages/sdk/examples/02-credential-issuance-flow.ts
```

This demonstrates the credential lifecycle:
- Issuance with mandate parameters (domain, max value, floor, ceiling)
- IPFS pinning (in-memory mock)
- Credential hashing (SHA-256 of the canonical JSON)
- Multi-domain credentials
- Revocation

### 1.3 Run the Commitment Example

```bash
npx tsx packages/sdk/examples/03-commitment-verification.ts
```

This shows:
- Complete negotiation leading to commitment
- Commitment creation with credential hashes and ZK proofs
- Verification
- Filtered listing

---

## Part 2: Relay API Exploration (5 min)

### 2.1 Start the Relay

```bash
# Terminal 1: Start the relay (requires PostgreSQL + Redis)
cd packages/relay
cp ../../.env.example ../../.env  # if not done already
pnpm dev
```

The relay starts on http://localhost:3001.

### 2.2 Browse the API Docs

Open http://localhost:3001/docs in your browser. This is the Swagger UI with
all endpoints documented, including:
- Request/response schemas
- Authentication requirements
- Example payloads

### 2.3 Register and Authenticate

```bash
# Register a new user
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@attestara.io",
    "password": "securepass123",
    "orgName": "Demo Corp"
  }' | jq .

# Save the access token
TOKEN=$(curl -s -X POST http://localhost:3001/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "demo@attestara.io", "password": "securepass123"}' \
  | jq -r .accessToken)

echo "Token: $TOKEN"
```

### 2.4 Register an Agent

```bash
# Get your org ID from the login response, then:
ORG_ID="<your-org-id>"

curl -s -X POST "http://localhost:3001/v1/orgs/$ORG_ID/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "did": "did:ethr:0x1234567890abcdef1234567890abcdef12345678",
    "name": "procurement-agent"
  }' | jq .
```

### 2.5 Create a Credential

```bash
AGENT_ID="<agent-id-from-above>"

curl -s -X POST "http://localhost:3001/v1/orgs/$ORG_ID/credentials" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"agentId\": \"$AGENT_ID\",
    \"credentialHash\": \"0xabc123...\",
    \"schemaHash\": \"0xdef456...\",
    \"expiry\": \"2026-12-31T23:59:59Z\"
  }" | jq .
```

### 2.6 Check Analytics

```bash
curl -s "http://localhost:3001/v1/orgs/$ORG_ID/analytics" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Part 3: Understanding ZK Proofs (3 min)

### 3.1 Circuit Overview

Attestara uses four Circom circuits, each proving a different property of an
agent's authority without revealing the underlying mandate:

| Circuit | What It Proves |
|---------|---------------|
| **MandateBound** | The proposed value is within the agent's authorized range |
| **ParameterRange** | Specific parameters (floor, ceiling) are satisfied |
| **CredentialFreshness** | The credential has not expired |
| **IdentityBinding** | The agent's DID matches the credential subject |

### 3.2 Proof Flow

1. Agent prepares circuit inputs (value, mandate params, timestamps)
2. Inputs are hashed and fed to the WASM witness generator
3. The Groth16 prover generates a proof + public signals
4. The proof is attached to the negotiation turn
5. The counterparty (or relay) verifies using the verification key
6. Only the public signals are visible; the mandate remains private

### 3.3 Inspect a Proof

Using the SDK's TestProver:

```typescript
import { TestProver } from '@attestara/sdk'
import { CircuitId } from '@attestara/types'

const prover = new TestProver()
const result = await prover.generateProof(CircuitId.MANDATE_BOUND, {
  value: BigInt(400000),
  maxValue: BigInt(500000),
})

console.log('Proof:', JSON.stringify(result.proof, null, 2))
console.log('Public signals:', result.publicSignals)
console.log('Generation time:', result.generationTimeMs, 'ms')
console.log('Valid:', result.valid)
```

---

## Part 4: Commitment Anchoring (2 min)

### 4.1 How Commitments Work

When agents agree on terms:

1. The relay computes the agreement hash (merkle root of all turns)
2. Both agents' credential hashes and ZK proofs are bundled
3. The commitment is submitted to the `CommitmentContract` on Arbitrum L2
4. The transaction hash and block number are recorded
5. An event indexer watches for `CommitmentAnchored` events

### 4.2 Verify a Commitment

```bash
# Using the CLI
npx attestara commitment list
npx attestara commitment verify <commitment-id>
```

Or programmatically:

```typescript
import { CommitmentManager } from '@attestara/sdk'

const mgr = new CommitmentManager({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  contractAddress: '0x8f6a1496314B76464e36ee5c04ebDd270f9AF6f8',
})

const isValid = await mgr.verify('<commitment-id>')
console.log('On-chain verification:', isValid ? 'VALID' : 'INVALID')
```

---

## Summary

| What You Did | Tool | Time |
|---|---|---|
| Ran SDK examples | `npx tsx` | 2 min |
| Explored the relay API | `curl` + Swagger UI | 5 min |
| Understood ZK proofs | SDK `TestProver` | 3 min |
| Verified commitments | CLI + SDK | 2 min |

---

## Where to Go Next

- **[Architecture](../ARCHITECTURE.md)** -- Mermaid diagrams of the full system
- **[Contributing](../../CONTRIBUTING.md)** -- How to contribute code
- **[API Reference](http://localhost:3001/docs)** -- Interactive Swagger UI
- **Contracts** -- Read `packages/contracts/contracts/` for the Solidity source
- **Circuits** -- Read `packages/contracts/circuits/` for the Circom source
