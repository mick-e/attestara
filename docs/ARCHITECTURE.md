# Attestara Architecture

This document describes the system architecture of the Attestara cryptographic trust protocol. All diagrams use Mermaid syntax for inline rendering on GitHub and compatible platforms.

---

## Protocol Overview

Attestara implements a three-layer trust protocol for autonomous AI agent commerce:

```mermaid
graph TB
    subgraph "Layer 1: Credential Layer"
        VC[W3C Verifiable Credentials]
        DID[did:ethr Identities]
        Veramo[Veramo Framework]
        DID --> Veramo
        Veramo --> VC
    end

    subgraph "Layer 2: ZK Proof Layer"
        MB[MandateBound Circuit]
        PR[ParameterRange Circuit]
        CF[CredentialFreshness Circuit]
        IB[IdentityBinding Circuit]
        Groth16[Groth16 Prover / snarkjs]
        MB --> Groth16
        PR --> Groth16
        CF --> Groth16
        IB --> Groth16
    end

    subgraph "Layer 3: Commitment Layer"
        CC[CommitmentContract]
        AR[AgentRegistry]
        CR[CredentialRegistry]
        VR[VerifierRegistry]
        L2[Arbitrum L2]
        CC --> L2
        AR --> L2
        CR --> L2
        VR --> L2
    end

    VC --> MB
    VC --> PR
    VC --> CF
    VC --> IB
    Groth16 --> CC
```

## Negotiation Sequence

The following diagram shows the full lifecycle of a negotiation between two agents:

```mermaid
sequenceDiagram
    participant A as Buyer Agent
    participant R as Relay API
    participant P as Prover Service
    participant B as Supplier Agent
    participant C as Arbitrum L2

    Note over A,B: Phase 1: Setup
    A->>R: POST /v1/auth/register
    R-->>A: JWT tokens
    A->>R: POST /v1/orgs/:orgId/agents (register agent)
    B->>R: POST /v1/auth/register
    R-->>B: JWT tokens
    B->>R: POST /v1/orgs/:orgId/agents (register agent)

    Note over A,B: Phase 2: Credential Issuance
    A->>A: Issue Authority Credential (VC 2.0)
    A->>R: POST /v1/orgs/:orgId/credentials
    B->>B: Issue Authority Credential (VC 2.0)
    B->>R: POST /v1/orgs/:orgId/credentials

    Note over A,B: Phase 3: Negotiation
    A->>R: POST /v1/sessions (create session)
    R-->>A: session + inviteToken
    A-->>B: Share inviteToken (out-of-band)
    B->>R: POST /v1/sessions/:id/accept

    loop Each Turn
        A->>P: Generate ZK proof (MandateBound)
        P-->>A: Groth16 proof + publicSignals
        A->>R: POST /v1/sessions/:id/turns (propose terms)
        R-->>B: Turn notification (WebSocket)
        B->>P: Generate ZK proof (ParameterRange)
        P-->>B: Groth16 proof + publicSignals
        B->>R: POST /v1/sessions/:id/turns (counter-propose)
        R-->>A: Turn notification (WebSocket)
    end

    Note over A,B: Phase 4: Commitment
    A->>R: POST /v1/sessions/:id/commitment
    R->>C: Submit to CommitmentContract
    C-->>R: Transaction receipt
    R-->>A: Commitment anchored
    R-->>B: Commitment notification
```

## Deployment Topology

```mermaid
graph LR
    subgraph "Client Tier"
        Portal[Portal - Next.js 16]
        SDK[SDK Client]
        CLI[CLI Tool]
    end

    subgraph "API Tier"
        Relay[Relay API<br/>Fastify :3001]
        Prover[Prover Service<br/>Fastify :3002]
        WS[WebSocket Server]
    end

    subgraph "Data Tier"
        PG[(PostgreSQL)]
        Redis[(Redis)]
        IPFS[IPFS / Pinata]
    end

    subgraph "Chain Tier"
        Arbitrum[Arbitrum L2]
        Indexer[Event Indexer]
    end

    Portal --> Relay
    SDK --> Relay
    SDK --> Prover
    CLI --> SDK
    Relay --> WS
    Relay --> PG
    Relay --> Redis
    Relay --> IPFS
    Prover --> Redis
    Relay --> Arbitrum
    Indexer --> Arbitrum
    Indexer --> PG
```

## Package Dependency Graph

```mermaid
graph TD
    types["@attestara/types"]
    contracts["@attestara/contracts"]
    sdk["@attestara/sdk"]
    relay["@attestara/relay"]
    prover["@attestara/prover"]
    portal["@attestara/portal"]
    cli["@attestara/cli"]

    sdk --> types
    sdk --> contracts
    relay --> types
    relay --> contracts
    prover --> types
    prover --> contracts
    cli --> sdk
    cli --> types
    portal -.-> relay

    style types fill:#4a5568,stroke:#718096,color:#fff
    style contracts fill:#4a5568,stroke:#718096,color:#fff
    style sdk fill:#2b6cb0,stroke:#3182ce,color:#fff
    style relay fill:#2f855a,stroke:#38a169,color:#fff
    style prover fill:#2f855a,stroke:#38a169,color:#fff
    style portal fill:#805ad5,stroke:#9f7aea,color:#fff
    style cli fill:#d69e2e,stroke:#ecc94b,color:#000
```

## Proof Generation Data Flow

```mermaid
flowchart LR
    subgraph "Input Preparation"
        VC[Authority Credential]
        MP[Mandate Params]
        TP[Turn Params]
        VC --> MP
        TP --> Hash[Hash Inputs]
        MP --> Hash
    end

    subgraph "Circuit Selection"
        Hash --> Router{Circuit Router}
        Router -->|value in range| MB[MandateBound.circom]
        Router -->|param bounds| PR[ParameterRange.circom]
        Router -->|not expired| CF[CredentialFreshness.circom]
        Router -->|DID matches| IB[IdentityBinding.circom]
    end

    subgraph "Proof Generation"
        MB --> WP[Worker Pool]
        PR --> WP
        CF --> WP
        IB --> WP
        WP --> WASM[WASM Witness Generator]
        WASM --> Groth16[Groth16 Prover]
        Groth16 --> Proof[ZK Proof + Public Signals]
    end

    subgraph "Caching"
        Proof --> Cache{Redis Cache}
        Cache -->|hit| Return[Return Cached]
        Cache -->|miss| Store[Store & Return]
    end

    subgraph "Verification"
        Proof --> VK[Verification Key]
        VK --> Verify{snarkjs.verify}
        Verify -->|valid| Accept[Accept Turn]
        Verify -->|invalid| Reject[Reject Turn]
    end
```

## Smart Contract Architecture

```mermaid
graph TB
    subgraph "On-Chain (Arbitrum L2)"
        AR[AgentRegistry<br/><i>register/deactivate agents</i>]
        CR[CredentialRegistry<br/><i>anchor credential hashes</i>]
        VR[VerifierRegistry<br/><i>on-chain proof verification keys</i>]
        CC[CommitmentContract<br/><i>dual-signed commitments</i>]

        AR --> CC
        CR --> CC
        VR --> CC
    end

    subgraph "Off-Chain"
        Relay[Relay API]
        Indexer[Event Indexer]
    end

    Relay -->|submitCommitment| CC
    Relay -->|registerAgent| AR
    Relay -->|anchorCredential| CR
    Indexer -->|AgentRegistered| AR
    Indexer -->|CommitmentAnchored| CC
```

## Data Model (Relay)

```mermaid
erDiagram
    Organisation ||--o{ User : has
    Organisation ||--o{ Agent : owns
    Organisation ||--o{ ApiKey : has
    Organisation ||--o{ Webhook : configures
    User ||--o{ RefreshToken : holds
    Agent ||--o{ Credential : holds
    Session ||--o{ Turn : contains
    Session ||--|| Commitment : produces

    Organisation {
        string id PK
        string name
        string plan
        datetime createdAt
    }
    User {
        string id PK
        string email UK
        string passwordHash
        string orgId FK
        string role
        string walletAddress
    }
    Agent {
        string id PK
        string did UK
        string name
        string orgId FK
        string publicKey
        string status
        json metadata
    }
    Credential {
        string id PK
        string agentId FK
        string orgId FK
        string credentialHash
        string schemaHash
        string ipfsCid
        string status
        datetime expiry
    }
    Session {
        string id PK
        string initiatorAgentId
        string counterpartyAgentId
        string initiatorOrgId FK
        string counterpartyOrgId FK
        string sessionType
        string status
        int turnCount
        datetime expiresAt
    }
    Turn {
        string id PK
        string sessionId FK
        string agentId
        int sequenceNumber
        json terms
        string proofType
        json proof
    }
    Commitment {
        string id PK
        string sessionId FK
        string agreementHash
        json parties
        string txHash
        int blockNumber
        boolean verified
    }
```

## Security Boundaries

```mermaid
graph TB
    subgraph "Public Internet"
        Client[Client / Agent]
    end

    subgraph "DMZ"
        LB[Load Balancer]
        Rate[Rate Limiter]
        CORS[CORS / Helmet]
    end

    subgraph "Application Zone"
        Auth[JWT Auth Middleware]
        OrgAccess[Org Access Control]
        Relay[Route Handlers]
    end

    subgraph "Data Zone"
        PG[(PostgreSQL)]
        Redis[(Redis)]
    end

    subgraph "Chain Zone"
        RPC[Arbitrum RPC]
    end

    Client --> LB
    LB --> Rate
    Rate --> CORS
    CORS --> Auth
    Auth --> OrgAccess
    OrgAccess --> Relay
    Relay --> PG
    Relay --> Redis
    Relay --> RPC
```
