# @attestara/sdk

Client library for the Attestara cryptographic trust protocol. Enables AI agents to negotiate, commit, and be held accountable across organisational boundaries using zero-knowledge proofs, W3C Verifiable Credentials, and on-chain settlement (Arbitrum L2).

## Install

```bash
npm install @attestara/sdk
# or
pnpm add @attestara/sdk
```

## Quick Start

```typescript
import { AttestaraClient } from '@attestara/sdk'
import { CircuitId } from '@attestara/types'

const client = new AttestaraClient({
  agent: {
    did: 'did:ethr:0x...',
    keyFile: 'keys/my-agent.json',
  },
  network: {
    chain: 'arbitrum-sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    contracts: {
      agentRegistry: '0x...',
      credentialRegistry: '0x...',
      commitmentContract: '0x...',
    },
  },
  prover: {
    mode: 'remote',
    remoteUrl: 'http://localhost:3002',
  },
  relay: {
    url: 'http://localhost:3001',
    apiKey: 'ac_xxxxxxxxxxxx',
  },
})

// 1. Create an agent identity
const identity = await client.identity.create('procurement-agent')
console.log('Agent DID:', identity.did)
console.log('Public key:', identity.publicKey)

// 2. Issue a verifiable credential encoding the agent's mandate
const credential = await client.credentials.issue(
  identity.did,
  {
    domain: 'procurement.contracts',
    maxValue: 500_000n,
    currency: 'EUR',
    parameterFloor: 100_000n,
    parameterCeiling: 500_000n,
  },
  { expiresInSeconds: 86400 * 30 }, // 30 days
)

// 3. Generate a ZK proof (proves proposed value is within mandate without revealing the mandate)
const proofResult = await client.prover.generateProof(CircuitId.MANDATE_BOUND, {
  proposed: 420_000n,
  commitment: 123456789n,
  max_value: 500_000n,
  randomness: 987654321n,
})

// 4. Create a negotiation session
const session = await client.negotiation.create({
  initiatorAgentId: identity.did,
  counterpartyAgentId: 'did:ethr:0x...',
  sessionType: 'cross_org',
  sessionConfig: {
    maxTurns: 10,
    turnTimeoutSeconds: 300,
    sessionTimeoutSeconds: 3600,
    requiredProofs: [CircuitId.MANDATE_BOUND],
  },
})

// 5. Propose a turn (local session object)
const turn = session.proposeTurn({
  agentId: identity.did,
  terms: {
    value: 420_000n,
    currency: 'EUR',
    deliveryDays: 30,
    paymentTerms: 'net-60',
  },
  proofType: CircuitId.MANDATE_BOUND,
  proof: proofResult.proof,
  publicSignals: proofResult.publicSignals,
})

// Or submit a turn to the relay API
await client.negotiation.submitTurn(session.id, {
  agentId: identity.did,
  terms: { value: 420_000n, currency: 'EUR' },
  proofType: CircuitId.MANDATE_BOUND,
  proof: proofResult.proof,
  publicSignals: proofResult.publicSignals,
  signature: '0x...',
})

// 6. Create an on-chain commitment after agreement
const commitment = await client.commitment.create({
  sessionId: session.id,
  agreementHash: '0x...',
  parties: [identity.did, 'did:ethr:0x...'],
  credentialHashes: [client.credentials.hashCredential(credential)],
  proofs: [],
  submitOnChain: true,
})

console.log('Commitment tx:', commitment.txHash)
```

## Configuration

```typescript
interface AttestaraConfig {
  agent: {
    did: string            // Agent DID (e.g. 'did:ethr:0x...')
    keyFile: string        // Path to key file (e.g. 'keys/my-agent.json')
    credentialFile?: string
  }
  network: {
    chain: 'local' | 'arbitrum-sepolia' | 'arbitrum-one'
    rpcUrl: string | string[]   // One or more RPC endpoints
    contracts?: {
      agentRegistry: string
      credentialRegistry: string
      commitmentContract: string
    }
  }
  prover: {
    mode: 'local' | 'remote'
    remoteUrl?: string     // Required when mode is 'remote'
    circuitDir?: string    // Required when mode is 'local'
  }
  relay?: {
    url: string            // Relay API endpoint (e.g. 'http://localhost:3001')
    apiKey?: string        // Bearer token for relay auth
  }
}
```

IPFS configuration is resolved from environment variables:

```bash
PINATA_API_KEY=...          # Enables Pinata IPFS storage
PINATA_API_SECRET=...
IPFS_GATEWAY_URL=...        # Optional custom gateway
DEPLOYER_PRIVATE_KEY=...    # Required for on-chain commitment submission
```

When `PINATA_API_KEY` is not set, the SDK uses an in-memory IPFS stub (suitable for testing).

## Managers

The `AttestaraClient` exposes five managers:

| Manager | Purpose | Key Methods |
|---------|---------|-------------|
| `client.identity` | DID creation and key management | `create()`, `resolve()`, `rotateKey()` |
| `client.credentials` | W3C Verifiable Credential lifecycle | `issue()`, `verify()`, `revoke()`, `store()`, `retrieve()`, `hashCredential()` |
| `client.prover` | ZK proof generation (Groth16) | `generateProof()`, `verifyProof()`, `generateTurnProofBundle()`, `verifyTurnProofBundle()` |
| `client.negotiation` | Session management and turn submission | `create()`, `get()`, `list()`, `submitTurn()`, `getTurns()`, `acceptSession()` |
| `client.commitment` | On-chain settlement | `create()`, `get()`, `list()`, `verify()` |

---

## identity

### `client.identity.create(name)`

Creates a new `did:ethr` identity and stores the key locally.

```typescript
const identity = await client.identity.create('procurement-agent')
// { did: 'did:ethr:0x...', publicKey: '04...', keyFile: 'keys/procurement-agent.json' }
```

### `client.identity.resolve(did)`

Resolves a DID to its DID Document.

```typescript
const doc = await client.identity.resolve('did:ethr:0x...')
// { id: 'did:ethr:0x...', verificationMethod: [...], ... }
```

### `client.identity.rotateKey(did)`

Adds a new signing key to an existing DID.

```typescript
const { publicKey } = await client.identity.rotateKey('did:ethr:0x...')
```

---

## credentials

### `client.credentials.issue(agentDid, mandate, options?)`

Issues a W3C Verifiable Credential encoding an agent's authority (mandate).

```typescript
const credential = await client.credentials.issue(
  'did:ethr:0x...',
  {
    domain: 'procurement.contracts',
    maxValue: 500_000n,       // bigint — maximum value the agent can commit
    currency: 'EUR',
    parameterFloor: 50_000n,  // optional lower bound for parameter proofs
    parameterCeiling: 500_000n,
    allowedCounterparties: ['did:ethr:0x...'], // optional whitelist
  },
  {
    expiresInSeconds: 86400 * 30, // default: 30 days
    signingKey: 'custom-key',     // default: agentDid
  }
)
```

### `client.credentials.verify(credential)`

Checks structure, expiry, type, and revocation status.

```typescript
const { valid, errors } = await client.credentials.verify(credential)
if (!valid) console.error('Credential invalid:', errors)
```

### `client.credentials.revoke(credentialHash)`

Marks a credential as revoked (by its SHA-256 hash).

```typescript
const hash = client.credentials.hashCredential(credential)
await client.credentials.revoke(hash)
```

### `client.credentials.store(credential)` / `client.credentials.retrieve(cid)`

Persist credentials to IPFS and retrieve by CID. Requires `PINATA_API_KEY`.

```typescript
const cid = await client.credentials.store(credential)
const retrieved = await client.credentials.retrieve(cid)
```

---

## prover

### `client.prover.generateProof(circuit, inputs)`

Generates a Groth16 ZK proof for the given circuit.

```typescript
import { CircuitId } from '@attestara/types'

// MandateBound: proves proposed <= max_value without revealing max_value
const result = await client.prover.generateProof(CircuitId.MANDATE_BOUND, {
  proposed: 420_000n,
  commitment: 123456789n,
  max_value: 500_000n,
  randomness: 987654321n,
})
// { proof: { pi_a, pi_b, pi_c, protocol, curve }, publicSignals, circuitId, generationTimeMs }

// ParameterRange: proves floor <= proposed <= ceiling
const result = await client.prover.generateProof(CircuitId.PARAMETER_RANGE, {
  proposed: 300_000n,
  commitment: 123456789n,
  floor: 100_000n,
  ceiling: 500_000n,
  randomness: 987654321n,
})

// CredentialFreshness: proves credential is valid at current timestamp
const result = await client.prover.generateProof(CircuitId.CREDENTIAL_FRESHNESS, {
  current_timestamp: BigInt(Math.floor(Date.now() / 1000)),
  credential_commitment: 123456789n,
  issuance_timestamp: 1700000000n,
  expiry_timestamp: 1800000000n,
  credential_data_hash: 987654321n,
  blinding_factor: 112233n,
})
```

Available circuits:

| `CircuitId` | Purpose |
|-------------|---------|
| `CircuitId.MANDATE_BOUND` | Proves `proposed <= max_value` without revealing `max_value` |
| `CircuitId.PARAMETER_RANGE` | Proves `floor <= proposed <= ceiling` without revealing bounds |
| `CircuitId.CREDENTIAL_FRESHNESS` | Proves credential is valid at current timestamp |
| `CircuitId.IDENTITY_BINDING` | Proves session key is controlled by DID key owner |

### `client.prover.verifyProof(circuit, proofResult)`

Verifies a previously generated proof.

```typescript
const { valid } = await client.prover.verifyProof(CircuitId.MANDATE_BOUND, result)
```

### `client.prover.generateTurnProofBundle(sessionId, turnSequence, requests)`

Generates multiple circuit proofs in parallel for a single negotiation turn. All proofs must succeed (atomic).

```typescript
const bundle = await client.prover.generateTurnProofBundle(
  session.id,
  1, // turn sequence number
  [
    {
      circuit: CircuitId.MANDATE_BOUND,
      inputs: { proposed: 420_000n, commitment: 123n, max_value: 500_000n, randomness: 456n },
    },
    {
      circuit: CircuitId.CREDENTIAL_FRESHNESS,
      inputs: { /* ... */ },
    },
  ]
)
// { proofs, sessionId, turnSequence, bundleHash, generatedAt, totalGenerationTimeMs }
```

### `client.prover.verifyTurnProofBundle(bundle)`

Verifies all proofs in a bundle and checks the bundle's integrity hash.

```typescript
const { valid, results } = await client.prover.verifyTurnProofBundle(bundle)
```

---

## negotiation

### `client.negotiation.create(config)`

Creates a negotiation session (on the relay if configured, local otherwise).

```typescript
const session = await client.negotiation.create({
  initiatorAgentId: 'did:ethr:0x...',
  counterpartyAgentId: 'did:ethr:0x...',
  initiatorOrgId: 'org-a',      // optional
  counterpartyOrgId: 'org-b',   // optional
  sessionType: 'cross_org',     // 'intra_org' | 'cross_org'
  sessionConfig: {
    maxTurns: 10,
    turnTimeoutSeconds: 300,
    sessionTimeoutSeconds: 3600,
    requiredProofs: [CircuitId.MANDATE_BOUND],
  },
})
```

Returns a `NegotiationSession` instance with the following methods:

```typescript
// Propose a turn (modifies local session state)
const turn = session.proposeTurn({
  agentId: 'did:ethr:0x...',
  terms: { value: 420_000n, currency: 'EUR', deliveryDays: 30 },
  proofType: CircuitId.MANDATE_BOUND,
  proof: proofResult.proof,
  publicSignals: proofResult.publicSignals,
})

// Accept counterparty's latest terms
session.accept('did:ethr:0x...')

// Reject the negotiation
session.reject('Price out of range')

// Inspect session state
console.log(session.status)      // 'active' | 'completed' | 'rejected' | ...
console.log(session.turns)       // ReadonlyArray<NegotiationTurn>
console.log(session.merkleRoot)  // Merkle root of all submitted turns
```

Listen for session events:

```typescript
session.on('event', (event) => {
  if (event.type === 'turn.accepted') {
    console.log('Agreement reached on turn', event.turn.sequenceNumber)
  }
})
```

### `client.negotiation.submitTurn(sessionId, params)`

Submits a turn to the relay API (requires relay configuration).

```typescript
await client.negotiation.submitTurn(session.id, {
  agentId: 'did:ethr:0x...',
  terms: { value: 420_000n, currency: 'EUR' },
  proofType: CircuitId.MANDATE_BOUND,
  proof: proofResult.proof,
  publicSignals: proofResult.publicSignals,
  signature: '0x...',
})
```

### Other session methods

```typescript
const session = await client.negotiation.get(sessionId)
const sessions = await client.negotiation.list()
const turns = await client.negotiation.getTurns(sessionId)

// Accept a cross-org invite
await client.negotiation.acceptSession(sessionId, inviteToken)
```

---

## commitment

### `client.commitment.create(params)`

Creates a commitment record and optionally submits it on-chain.

```typescript
const commitment = await client.commitment.create({
  sessionId: session.id,
  agreementHash: '0xabc...',
  parties: ['did:ethr:0x...', 'did:ethr:0x...'],
  credentialHashes: ['sha256-hash-of-credential'],
  proofs: [],              // CommitmentProof[]
  submitOnChain: true,     // default: true if chain client is configured
})
// { id, sessionId, agreementHash, parties, txHash, blockNumber, verified, createdAt }
```

On-chain submission requires `DEPLOYER_PRIVATE_KEY` and `contracts.commitmentContract` in the network config. If chain submission fails, the commitment is still stored locally.

### Other commitment methods

```typescript
const commitment = await client.commitment.get(commitmentId)

const commitments = await client.commitment.list({
  sessionId: session.id,
  fromDate: new Date('2025-01-01'),
  toDate: new Date(),
})

const isValid = await client.commitment.verify(commitmentId)
```

---

## Error Handling

All managers throw `AttestaraError` with a `code` property:

```typescript
import { AttestaraError, ErrorCode } from '@attestara/types'

try {
  await client.credentials.issue(agentDid, mandate)
} catch (err) {
  if (err instanceof AttestaraError) {
    switch (err.code) {
      case ErrorCode.CREDENTIAL_EXPIRED:
        // Credential is past its expiry date
        break
      case ErrorCode.CREDENTIAL_REVOKED:
        // Credential has been revoked
        break
      case ErrorCode.PROOF_VERIFICATION_FAILED:
        // ZK proof verification failed
        break
      case ErrorCode.SESSION_NOT_ACTIVE:
        // Cannot submit turn to a non-active session
        break
      default:
        console.error(`[${err.code}] ${err.message}`, err.details)
    }
  }
}
```

Full list of error codes:

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Authenticated but not authorized for this resource |
| `INVALID_TOKEN` | JWT or API key is malformed or expired |
| `AGENT_NOT_FOUND` | Agent DID does not exist |
| `AGENT_DEACTIVATED` | Agent has been deactivated |
| `DID_ALREADY_REGISTERED` | DID is already registered on-chain |
| `CREDENTIAL_NOT_FOUND` | Credential does not exist |
| `CREDENTIAL_EXPIRED` | Credential is past its expiry date |
| `CREDENTIAL_REVOKED` | Credential has been revoked |
| `SESSION_NOT_FOUND` | Session does not exist |
| `SESSION_NOT_ACTIVE` | Session is not in an active state |
| `SESSION_EXPIRED` | Session has timed out |
| `INVALID_TURN` | Turn data failed validation |
| `NOT_YOUR_TURN` | It is not this agent's turn to propose |
| `MAX_TURNS_REACHED` | Session has hit its configured turn limit |
| `PROOF_GENERATION_FAILED` | ZK circuit failed to generate a proof |
| `PROOF_VERIFICATION_FAILED` | ZK proof did not verify |
| `CIRCUIT_NOT_FOUND` | Requested circuit is not available |
| `COMMITMENT_NOT_FOUND` | Commitment record does not exist |
| `COMMITMENT_ALREADY_EXISTS` | A commitment already exists for this session |
| `TRANSACTION_FAILED` | On-chain transaction reverted |
| `RPC_ERROR` | Ethereum RPC connection or response error |
| `VALIDATION_ERROR` | Input data failed schema validation |
| `RATE_LIMITED` | Too many requests — back off and retry |
| `INTERNAL_ERROR` | Unexpected server-side error |

---

## Testing Utilities

The SDK ships a `testing` module with helpers for unit and integration tests:

```typescript
import {
  TestProver,
  MockAgent,
  LocalChain,
  TestCredentials,
  SessionRecorder,
} from '@attestara/sdk'

// TestProver: generates deterministic proofs without a real prover service
const prover = new TestProver()

// MockAgent: a scripted negotiation agent for testing counterparty behaviour
const agent = new MockAgent({ strategy: 'always-accept' })

// LocalChain: in-process chain for commitment tests (no external node needed)
const chain = new LocalChain()

// TestCredentials: factory for pre-built credentials in test fixtures
const creds = new TestCredentials()

// SessionRecorder: records all session events for assertion
const recorder = new SessionRecorder(session)
await doNegotiation(session)
console.log(recorder.events) // RecordedEvent[]
```

---

## Development

```bash
# Install dependencies (from repo root)
pnpm install

# Build the SDK
pnpm --filter @attestara/sdk build

# Run tests
pnpm --filter @attestara/sdk test

# Typecheck
pnpm --filter @attestara/sdk typecheck
```

---

## Related Packages

| Package | Description |
|---------|-------------|
| `@attestara/types` | Shared TypeScript types (DID, credentials, ZK, negotiation, commitment, config, errors) |
| `@attestara/cli` | Command-line interface built on this SDK (`attestara` binary) |
| `@attestara/relay` | Backend API that sessions are submitted to |
| `@attestara/prover` | ZK proof generation service |
| `@attestara/contracts` | Solidity contracts and Circom circuits |

## License

MIT
