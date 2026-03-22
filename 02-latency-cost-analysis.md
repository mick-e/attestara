# AgentClear — Latency and Cost Analysis
## Performance Viability Assessment v0.1

---

## 1. Overview

This document models the end-to-end latency and cost profile of an AgentClear negotiation session to determine which use cases are viable at launch and which require performance optimisation before deployment.

The core question: **Is AgentClear fast enough and cheap enough for real-world enterprise B2B negotiation?**

---

## 2. Latency Budget by Operation

### 2.1 Session Initialisation

| Operation | Component | Estimated Latency | Notes |
|-----------|-----------|-----------------|-------|
| DID resolution | On-chain read | 50–200ms | Depends on chain/RPC provider |
| Credential verification | Off-chain signature check | 5–20ms | Ed25519 is fast |
| Mandate Bound ZK proof generation | Off-chain (prover hardware) | 100–800ms | See §3 |
| Compliance Status ZK proof | Off-chain | 100–500ms | |
| Proof verification (counterparty) | Off-chain | 10–50ms | Groth16 verify is fast off-chain |
| On-chain session anchor | L2 transaction | 500ms–3s | Arbitrum ~1-2s typical |
| **Total session init** | | **~1–5 seconds** | Acceptable for B2B |

### 2.2 Per-Turn Latency (Negotiation Exchange)

| Operation | Component | Estimated Latency | Notes |
|-----------|-----------|-----------------|-------|
| Turn ZK proof generation | Off-chain | 100–800ms | Per-offer mandate proof |
| Message signing | Off-chain | <5ms | |
| Network transmission | P2P / off-chain relay | 20–200ms | Geography-dependent |
| Counterparty proof verification | Off-chain | 10–50ms | |
| Business logic processing | Agent reasoning | 500ms–10s | LLM inference dominates |
| **Total per turn** | | **~1–12 seconds** | LLM is the bottleneck |

**Key insight:** LLM inference time (the agent deciding what to offer) dominates per-turn latency, not the ZK proof generation. AgentClear adds ~200-900ms overhead per turn on top of whatever the underlying agent response time is. For negotiation contexts (not real-time trading), this is acceptable.

### 2.3 Commitment and Settlement

| Operation | Component | Estimated Latency | Notes |
|-----------|-----------|-----------------|-------|
| Final agreement signing | Off-chain | <10ms | |
| Commitment Contract transaction | On-chain L2 | 1–3s | Arbitrum finality |
| Transaction confirmation | On-chain | 2–12s | Depends on confirmation threshold |
| **Total commitment** | | **~3–15 seconds** | Acceptable |

### 2.4 Full Session End-to-End

For a representative 5-turn negotiation:

```
Session init:          ~3s
Turn 1 (offer):        ~5s
Turn 2 (counter):      ~5s  
Turn 3 (counter):      ~5s
Turn 4 (counter):      ~5s
Turn 5 (agreement):    ~5s
Commitment:            ~8s
─────────────────────────
Total:                 ~36s
```

A full negotiation session resolves in approximately **30-60 seconds** for a 5-turn exchange. This compares favourably to human email-based negotiation (hours to days) and is acceptable for B2B contexts.

**Not acceptable for:** High-frequency trading, real-time price discovery (millisecond contexts). AgentClear is explicitly not designed for these use cases.

---

## 3. ZK Proof Generation — Detailed Analysis

Proof generation time is hardware-dependent. The following estimates are based on Circom/snarkjs benchmarks for comparable constraint counts.

### 3.1 Constraint Counts

| Circuit | Estimated Constraints | Rationale |
|---------|----------------------|-----------|
| MandateBound(64) | ~350 | Poseidon(240) + LessEqThan(64) + GreaterThan(64) |
| ParameterRange(64) | ~550 | 2x Poseidon + 3x comparators |
| CredentialFreshness | ~480 | Poseidon + 2x comparators |
| IdentityBinding | ~800 | EdDSA verification + Poseidon |

### 3.2 Proof Generation Time by Hardware

Benchmarks based on snarkjs Groth16 with similar constraint counts from public ZK benchmarking data:

| Hardware | ~350 constraints | ~550 constraints | ~800 constraints |
|----------|-----------------|-----------------|-----------------|
| M2 MacBook Pro | ~80ms | ~120ms | ~180ms |
| AWS c5.2xlarge | ~150ms | ~220ms | ~320ms |
| AWS c5.xlarge | ~300ms | ~450ms | ~650ms |
| Mid-range server | ~200ms | ~300ms | ~450ms |

**Conclusion:** Even on modest server hardware, individual circuit proof generation is well under 1 second. A full session initialisation requiring 2-3 proofs generates in ~500-1000ms total on production server hardware.

### 3.3 Proof Aggregation Impact

When session anchoring uses recursive proof aggregation (compressing N turn proofs into one):

| Turns aggregated | Aggregation time | Verification saving |
|-----------------|-----------------|---------------------|
| 5 turns | +200ms | 5x → 1x on-chain verification |
| 10 turns | +350ms | 10x → 1x on-chain verification |
| 20 turns | +600ms | 20x → 1x on-chain verification |

Aggregation trades a small generation overhead for significant on-chain verification cost savings. For sessions with >5 turns, aggregation is strongly recommended.

---

## 4. On-Chain Cost Analysis

### 4.1 Chain Selection Comparison

AgentClear is chain-agnostic. The cost analysis below covers the most relevant deployment options:

| Chain | Groth16 Verify Gas | Gas Price (typical) | Cost per Verify |
|-------|-------------------|--------------------:|-----------------|
| Ethereum Mainnet | ~220,000 | 20–50 gwei | $2.50–$15 |
| Arbitrum One | ~220,000 | 0.01–0.1 gwei | $0.001–$0.01 |
| Polygon PoS | ~220,000 | 30–100 gwei | $0.005–$0.02 |
| Polygon zkEVM | ~220,000 | 0.02–0.2 gwei | $0.002–$0.02 |
| StarkNet | ~0 (native STARK) | Per-tx fee | ~$0.001–$0.05 |
| Optimism | ~220,000 | 0.001–0.05 gwei | $0.0001–$0.005 |

**Recommendation: Arbitrum One for Phase 1.** Lowest cost for EVM-compatible Groth16 verification, largest ecosystem, Ethereum security guarantees, good enterprise tooling.

### 4.2 Per-Session Cost Model

For a representative 5-turn negotiation on Arbitrum One:

| Operation | Gas | Cost (USD) |
|-----------|-----|-----------|
| Session initiation anchor | ~50,000 | ~$0.002 |
| Turn proof verification (×5) | ~220,000 × 5 | ~$0.05 |
| Commitment record creation | ~80,000 | ~$0.003 |
| Credential registry lookup (×2) | ~10,000 × 2 | ~$0.001 |
| **Total per session** | **~1,240,000** | **~$0.06** |

At $0.06 per negotiation session, on-chain costs are negligible for enterprise B2B use cases. Even 10,000 sessions per month = ~$600 in gas costs.

### 4.3 Cost Scaling

| Monthly Sessions | Gas Cost (Arbitrum) | Gas Cost (ETH Mainnet) |
|-----------------|---------------------|----------------------|
| 100 | ~$6 | ~$600 |
| 1,000 | ~$60 | ~$6,000 |
| 10,000 | ~$600 | ~$60,000 |
| 100,000 | ~$6,000 | ~$600,000 |

Ethereum mainnet becomes cost-prohibitive above ~1,000 sessions/month for large enterprises. L2 deployment is essential for scale.

### 4.4 Proof Aggregation Cost Impact

With recursive aggregation (10 turns → 1 proof):

| Approach | Gas per Session | Cost per Session |
|----------|----------------|-----------------|
| Per-turn verification | ~1,240,000 | ~$0.06 |
| Aggregated (5 turns) | ~420,000 | ~$0.02 |
| Aggregated (10 turns) | ~320,000 | ~$0.015 |

Aggregation reduces on-chain costs by ~65-75%. For high-volume deployments, aggregation is worthwhile.

---

## 5. Use Case Viability Matrix

| Use Case | Typical Turn Count | Session Duration | $/session | Viable? |
|----------|-------------------|-----------------|-----------|---------|
| Procurement contract negotiation | 5–20 turns | Hours–days (async) | $0.06–$0.20 | ✅ Yes |
| Supply chain term negotiation | 3–10 turns | Minutes–hours | $0.04–$0.10 | ✅ Yes |
| Financial services contracting | 10–50 turns | Hours–days (async) | $0.10–$0.50 | ✅ Yes |
| Insurance policy negotiation | 5–15 turns | Hours | $0.06–$0.15 | ✅ Yes |
| Legal contract negotiation | 10–100 turns | Days–weeks | $0.10–$1.00 | ✅ Yes |
| Real-time B2B pricing | 1–2 turns | Seconds | $0.03–$0.04 | ⚠️ Marginal |
| High-frequency trading | <1ms required | — | N/A | ❌ No |
| Real-time payment authorisation | <500ms required | — | N/A | ❌ No |

---

## 6. Performance Optimisation Roadmap

### Phase 1 (Launch): Acceptable Performance
- Single-circuit proofs (no aggregation)
- Arbitrum One deployment
- Client-side proof generation (agent's own hardware)
- Expected: ~$0.06/session, ~30-60s total

### Phase 2 (6-12 months): Optimised Performance
- Proof aggregation for multi-turn sessions
- Dedicated prover service (GPU-accelerated)
- Expected: ~$0.02/session, ~15-30s total

### Phase 3 (12-24 months): High-Performance
- Halo2 or PLONK migration (recursive proofs natively)
- ZK co-processor integration (RiscZero, SP1)
- Expected: ~$0.005/session, ~5-10s total

---

## 7. Infrastructure Requirements

### 7.1 Minimum Viable (Phase 1)

- **Prover:** Standard server with 4 CPU cores, 8GB RAM. No GPU required for Circom circuits at these constraint sizes.
- **RPC Provider:** Arbitrum One access via Alchemy, Infura, or Quicknode. Estimated cost: $50-500/month depending on volume.
- **Storage:** Off-chain negotiation session storage (encrypted). Standard object storage (S3 equivalent) at ~1KB per turn.

### 7.2 Prover Service Architecture

For production, a dedicated prover service is recommended rather than client-side proving:

```
Agent A ──► Prover Service (off-chain) ──► ZK Proof ──► Agent A
                    │
                    ▼
           Verification key (public)
                    │
                    ▼
          On-chain Verifier Contract
```

Benefits: Consistent performance regardless of agent hardware, upgradeable without agent updates, enables proof caching for repeated patterns.

---

*AgentClear Latency and Cost Analysis v0.1*
