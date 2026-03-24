# Attestara — Reference Implementation Architecture
## Technology Stack Decision Document v0.1

---

## 1. Purpose

This document makes concrete technology stack decisions for the Attestara Phase 1 reference implementation. The protocol specification is deliberately chain-agnostic and framework-agnostic; this document is not. It makes opinionated choices to enable a buildable, auditable, deployable implementation.

All decisions include rationale and the conditions under which they should be revisited.

---

## 2. Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTCLEAR REFERENCE STACK                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  APPLICATION LAYER                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Attestara SDK (TypeScript / Python)                    │    │
│  │  Integration adapters: LangChain, AutoGen, Agentforce   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  CREDENTIAL LAYER                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  DID Method: did:ethr (Ethereum DID)                     │    │
│  │  VC Library: @veramo/core (W3C VC compliant)            │    │
│  │  Key Management: @veramo/key-manager + HSM optional     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ZK PROOF LAYER                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Circuit Language: Circom 2.x                            │    │
│  │  Proof System: Groth16 (Phase 1), PLONK (Phase 2)       │    │
│  │  Library: snarkjs (proof gen) + circomlibjs (utilities)  │    │
│  │  Prover Service: Node.js + worker threads                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  SMART CONTRACT LAYER                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Language: Solidity 0.8.x                                │    │
│  │  Framework: Hardhat + OpenZeppelin                       │    │
│  │  Chain: Arbitrum One (primary) + Ethereum (anchor)      │    │
│  │  Upgrade pattern: OpenZeppelin TransparentProxy          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  NEGOTIATION RAIL LAYER                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Transport: HTTPS + WebSockets                           │    │
│  │  Encryption: TLS 1.3 + Ed25519 message signing          │    │
│  │  Session relay: Self-hosted or IPFS pubsub              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  INFRASTRUCTURE                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  RPC: Alchemy (Arbitrum One)                             │    │
│  │  Indexer: The Graph (event indexing)                     │    │
│  │  Storage: IPFS (credential documents) + PostgreSQL      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. DID Method: did:ethr

**Decision:** Use `did:ethr` (Ethereum DID method, ERC-1056) for Phase 1.

**Rationale:**
- Anchored on Ethereum/Arbitrum — same infrastructure as the Commitment Contract
- No additional chain or registry infrastructure required
- Widely adopted: supported by Veramo, uPort, and most enterprise DID toolkits
- Key rotation and delegation natively supported on-chain
- Resolvers are production-grade and maintained by the Ethereum community

**DID format:** `did:ethr:arb1:0x<agent-ethereum-address>`

**Example resolution:**
```json
{
  "id": "did:ethr:arb1:0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
  "verificationMethod": [{
    "id": "did:ethr:arb1:0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE#controller",
    "type": "EcdsaSecp256k1RecoveryMethod2020",
    "controller": "did:ethr:arb1:0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    "blockchainAccountId": "eip155:42161:0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE"
  }]
}
```

**When to revisit:** If the protocol requires DIDs for multiple non-EVM chains simultaneously, consider `did:web` as an alternative that is chain-independent.

---

## 4. VC Library: Veramo

**Decision:** Use `@veramo/core` as the Verifiable Credentials stack.

**Rationale:**
- Most complete W3C VC implementation in the JavaScript/TypeScript ecosystem
- Supports JSON-LD and JWT credential formats
- Pluggable key management (software keys → HSM)
- Active maintenance by Consensys/Disco
- Works with did:ethr out of the box
- TypeScript-first with good type safety

**Key packages:**
```json
{
  "@veramo/core": "^5.x",
  "@veramo/did-manager": "^5.x",
  "@veramo/did-provider-ethr": "^5.x",
  "@veramo/credential-w3c": "^5.x",
  "@veramo/key-manager": "^5.x",
  "@veramo/data-store": "^5.x"
}
```

**Credential issuance example:**
```typescript
import { createAgent } from '@veramo/core'
import { CredentialPlugin } from '@veramo/credential-w3c'

const agent = createAgent({
  plugins: [new CredentialPlugin()]
})

const authorityCredential = await agent.createVerifiableCredential({
  credential: {
    issuer: { id: 'did:ethr:arb1:0xPrincipalAddress' },
    credentialSubject: {
      id: 'did:ethr:arb1:0xAgentAddress',
      authorityScope: {
        domain: 'procurement.contracts',
        maxCommitmentValue: { amount: 500000, currency: 'EUR' },
        // ZK committed parameters (hashes only)
        negotiationParameters: {
          priceFloor: 'poseidon:a4b2c...',
          deliveryTermsRange: 'poseidon:f7e3a...'
        }
      }
    }
  },
  proofFormat: 'jwt'
})
```

---

## 5. ZK Stack: Circom + snarkjs

**Decision:** Circom 2.x circuit language with snarkjs for proof generation and verification, Groth16 proof system for Phase 1.

**Rationale:**

| Factor | Decision | Rationale |
|--------|----------|-----------|
| Circuit language | Circom 2.x | Largest ecosystem, best tooling, most audited libraries (circomlib) |
| Proof system | Groth16 | Smallest proofs, cheapest on-chain verification, best L2 support |
| Hash function | Poseidon | ZK-friendly, significantly fewer constraints than SHA-256 in circuits |
| Comparison circuits | circomlib LessEqThan / GreaterThan | Audited, well-tested implementations |
| JS/TS library | snarkjs | Reference implementation, supports both Groth16 and PLONK |

**Project structure:**
```
attestara-circuits/
├── circuits/
│   ├── mandate_bound.circom
│   ├── parameter_range.circom
│   ├── credential_freshness.circom
│   ├── identity_binding.circom
│   └── lib/              (circomlib imports)
├── scripts/
│   ├── compile.sh        (circom → r1cs + wasm)
│   ├── setup.sh          (powers of tau + zkey)
│   └── export-verifier.sh (solidity verifier)
├── test/
│   └── circuits.test.js
├── artifacts/
│   ├── *.r1cs
│   ├── *.wasm
│   ├── *.zkey
│   └── verification_keys/
└── contracts/
    └── *Verifier.sol     (auto-generated)
```

**Build pipeline:**
```bash
# 1. Compile circuit to R1CS and WASM
circom circuits/mandate_bound.circom --r1cs --wasm --sym -o artifacts/

# 2. Powers of Tau ceremony
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="Party1"
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau

# 3. Circuit-specific setup
snarkjs groth16 setup artifacts/mandate_bound.r1cs pot14_final.ptau \
  artifacts/mandate_bound_0000.zkey
snarkjs zkey contribute artifacts/mandate_bound_0000.zkey \
  artifacts/mandate_bound_final.zkey --name="Attestara"

# 4. Export Solidity verifier
snarkjs zkey export solidityverifier artifacts/mandate_bound_final.zkey \
  contracts/MandateBoundVerifier.sol
```

---

## 6. Smart Contracts: Solidity + Hardhat + OpenZeppelin

**Decision:** Solidity 0.8.x, Hardhat development environment, OpenZeppelin Contracts v5.

**Contract architecture:**

```
contracts/
├── core/
│   ├── AgentRegistry.sol          # DID registration + metadata
│   ├── CredentialRegistry.sol     # Credential hash registry + revocation
│   ├── CommitmentContract.sol     # Session anchors + final commitments
│   └── DisputeResolution.sol      # On-chain dispute anchoring
├── verifiers/
│   ├── MandateBoundVerifier.sol   # Auto-generated by snarkjs
│   ├── ParameterRangeVerifier.sol
│   └── CredentialFreshnessVerifier.sol
├── governance/
│   ├── AttestaraDAO.sol          # DAO governance (Phase 2)
│   └── GovernanceToken.sol        # ACL governance token (Phase 2)
├── proxy/
│   └── AttestaraProxy.sol        # Transparent proxy for upgrades
└── interfaces/
    ├── IAgentRegistry.sol
    ├── ICommitmentContract.sol
    └── IDisputeResolution.sol
```

**Key CommitmentContract interface:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CommitmentContract is ReentrancyGuard, AccessControl {
    
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    
    struct SessionAnchor {
        bytes32 merkleRoot;       // Root of all turns in session
        address agentA;           // DID hash → address
        address agentB;
        uint256 timestamp;
        uint256 turnCount;
    }
    
    struct CommitmentRecord {
        bytes32 agreementHash;
        bytes32 sessionId;
        address agentA;
        address agentB;
        bytes32 credentialHashA;
        bytes32 credentialHashB;
        uint256 timestamp;
        CommitmentStatus status;
    }
    
    enum CommitmentStatus { ACTIVE, DISPUTED, RESOLVED, CANCELLED }
    
    mapping(bytes32 => SessionAnchor) public sessionAnchors;
    mapping(bytes32 => CommitmentRecord) public commitments;
    
    // Verifier contracts (set at deployment, upgradeable via governance)
    address public mandateBoundVerifier;
    address public credentialFreshnessVerifier;
    
    event SessionAnchored(bytes32 indexed sessionId, bytes32 merkleRoot);
    event CommitmentCreated(bytes32 indexed commitmentId, address agentA, address agentB);
    event DisputeRaised(bytes32 indexed commitmentId, address raiser);
    
    function anchorSession(
        bytes32 sessionId,
        bytes32 merkleRoot,
        address agentB,
        uint256 turnCount
    ) external nonReentrant {
        require(sessionAnchors[sessionId].timestamp == 0, "Session already anchored");
        
        sessionAnchors[sessionId] = SessionAnchor({
            merkleRoot: merkleRoot,
            agentA: msg.sender,
            agentB: agentB,
            timestamp: block.timestamp,
            turnCount: turnCount
        });
        
        emit SessionAnchored(sessionId, merkleRoot);
    }
    
    function createCommitment(
        bytes32 sessionId,
        bytes32 agreementHash,
        address agentB,
        bytes32 credentialHashA,
        bytes32 credentialHashB,
        bytes calldata mandateBoundProofA,
        uint256[2] calldata publicSignalsA,
        bytes calldata mandateBoundProofB,
        uint256[2] calldata publicSignalsB,
        bytes calldata sigA,
        bytes calldata sigB
    ) external nonReentrant returns (bytes32 commitmentId) {
        
        // Verify both mandate bound proofs
        require(
            IMandateBoundVerifier(mandateBoundVerifier)
                .verifyProof(mandateBoundProofA, publicSignalsA),
            "Invalid mandate proof A"
        );
        require(
            IMandateBoundVerifier(mandateBoundVerifier)
                .verifyProof(mandateBoundProofB, publicSignalsB),
            "Invalid mandate proof B"
        );
        
        // Verify signatures
        bytes32 commitHash = keccak256(abi.encode(sessionId, agreementHash));
        require(_verifySignature(commitHash, sigA, msg.sender), "Invalid sig A");
        require(_verifySignature(commitHash, sigB, agentB), "Invalid sig B");
        
        // Create commitment record
        commitmentId = keccak256(abi.encode(sessionId, agreementHash, block.timestamp));
        
        commitments[commitmentId] = CommitmentRecord({
            agreementHash: agreementHash,
            sessionId: sessionId,
            agentA: msg.sender,
            agentB: agentB,
            credentialHashA: credentialHashA,
            credentialHashB: credentialHashB,
            timestamp: block.timestamp,
            status: CommitmentStatus.ACTIVE
        });
        
        emit CommitmentCreated(commitmentId, msg.sender, agentB);
    }
}
```

---

## 7. Negotiation Rail: HTTPS + WebSockets

**Decision:** Standard HTTPS REST + WebSocket for real-time turn exchange. No custom P2P protocol for Phase 1.

**Rationale:** Custom P2P networking adds significant complexity and is not required for the core protocol validation. Phase 1 can use a centralised relay service (operated by Attestara Foundation) with the on-chain anchoring providing the tamper-proof record. Decentralised relay (IPFS pubsub, Waku) can be introduced in Phase 2.

**Session relay API:**
```typescript
// Session initiation
POST /api/v1/sessions
Body: { proposal: SessionProposal, proofs: ZKProofs }
Response: { sessionId, accepted: boolean, counterpartyProofs }

// Send turn
POST /api/v1/sessions/{sessionId}/turns
Body: { turn: NegotiationTurn, proof: ZKProof }
Response: { turnId, received: boolean }

// WebSocket for real-time turn reception
WS /api/v1/sessions/{sessionId}/stream
Events: { type: 'turn', data: NegotiationTurn }
        { type: 'escalation', data: EscalationRequest }
        { type: 'agreement', data: FinalAgreement }
```

---

## 8. Attestara SDK Design

**Languages:** TypeScript (primary) + Python (secondary, for ML/AI agent frameworks)

**TypeScript SDK structure:**
```typescript
// Core SDK exports
export { AttestaraClient } from './client'
export { CredentialManager } from './credentials'
export { ProofGenerator } from './proofs'
export { NegotiationSession } from './session'
export type { AuthorityCredential, NegotiationTurn, CommitmentRecord } from './types'

// Usage example
import { AttestaraClient } from '@attestara/sdk'

const client = new AttestaraClient({
  did: 'did:ethr:arb1:0xAgentAddress',
  privateKey: process.env.AGENT_PRIVATE_KEY,
  rpcUrl: 'https://arb1.alchemy.com/v2/...',
  proverUrl: 'https://prover.attestara.io' // or 'local'
})

// Load credentials
await client.loadCredential(authorityCredential)

// Initiate negotiation
const session = await client.initiateSession({
  counterpartyDID: 'did:ethr:arb1:0xCounterpartyAddress',
  subject: 'procurement.contract.software_services'
})

// Send offer with automatic proof generation
await session.sendTurn({
  type: 'offer',
  terms: { value: 420000, currency: 'EUR', deliveryDays: 45 }
  // SDK automatically generates MandateBound proof
})

// Listen for counter-offers
session.on('turn', async (turn) => {
  // Proofs are automatically verified by SDK
  console.log('Received:', turn.terms)
})
```

**LangChain integration:**
```python
from attestara import AttestaraTool

# Add Attestara as a LangChain tool
attestara_tool = AttestaraTool(
    did="did:ethr:arb1:0xAgentAddress",
    credential_path="./authority_credential.json"
)

tools = [attestara_tool, ...other_tools]
agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION)
```

---

## 9. Infrastructure and DevOps

**RPC Provider:** Alchemy (Arbitrum One)
- Chosen for reliability, rate limits suitable for enterprise, and good Arbitrum support
- Fallback: Infura or Quicknode

**Indexer:** The Graph Protocol
- Index `CommitmentCreated`, `SessionAnchored`, and `DisputeRaised` events
- Enables fast querying of an organisation's commitment history without scanning all blocks

**Storage:**
- **Credential documents:** IPFS (content-addressed, immutable)
- **Negotiation session records:** PostgreSQL (off-chain, encrypted, org-controlled)
- **Proof artifacts:** Ephemeral (proofs are only needed at verification time; verified proofs are discarded)

**Deployment:**
- Contracts deployed via Hardhat Deploy with deterministic addresses
- SDK distributed via npm (@attestara/sdk) and PyPI (attestara)
- Prover service: Docker container, deployable on any cloud or on-premises

---

## 10. Technology Decision Log

| Decision | Chosen | Alternatives Considered | Revisit If |
|----------|--------|------------------------|------------|
| DID method | did:ethr | did:web, did:key, did:ion | Multi-chain requirement |
| VC library | Veramo | SpruceID, ACA-py | Python-first requirement |
| ZK framework | Circom | Halo2, Cairo, Noir | Need no trusted setup |
| Proof system | Groth16 | PLONK, STARKs | DAO governance ceremony concerns |
| Smart contract chain | Arbitrum One | Polygon zkEVM, Optimism | L2 ecosystem fragmentation |
| Development framework | Hardhat | Foundry, Truffle | Larger Solidity team preference |
| Negotiation transport | HTTPS/WS | libp2p, Waku | Decentralisation requirement |
| Hash function (circuits) | Poseidon | SHA-256, MiMC | Interoperability with non-ZK systems |
| SDK language | TypeScript | Rust, Go | Performance-critical embedding |

---

*Attestara Reference Implementation Architecture v0.1*
