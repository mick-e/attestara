# Attestara — ZK Circuit Proof of Concept
## Technical Design Document v0.1

---

## 1. Purpose and Scope

This document defines the proof-of-concept (PoC) implementation plan for Attestara's Zero-Knowledge proof circuits. The PoC has one goal: **validate the core cryptographic assumptions before any infrastructure commitments are made**.

Specifically, it must answer three questions:

1. Can the Mandate Bound circuit be implemented correctly in Circom/snarkjs with proof generation time under 2 seconds on consumer hardware?
2. Are on-chain verification gas costs acceptable for the target deployment chains (Ethereum L2)?
3. Does the trusted setup requirement for Groth16 pose an unacceptable governance risk at PoC stage, or should the PoC use PLONK (universal setup) instead?

---

## 2. Framework Selection: Circom / snarkjs

**Recommendation: Circom 2.x with snarkjs for PoC phase.**

Rationale:
- Largest developer community and ecosystem; most tutorials, audited circuit libraries, and tooling
- Circom's R1CS (Rank-1 Constraint System) compilation pipeline is well-understood and has production-grade tooling
- snarkjs supports both Groth16 and PLONK from the same circuit definition, enabling direct comparison of both proof systems with a single implementation
- Extensive prior art in DeFi / ZK identity projects (Tornado Cash, Semaphore, PolygonID) using Circom provides auditable reference implementations for component circuits

**Future migration path:** If the PoC validates the approach, production implementation should evaluate Halo2 (no trusted setup, better for DAO governance) or Cairo (if StarkNet is the target chain). The circuit logic is portable; the framework is an engineering choice.

---

## 3. Circuit Implementations

### 3.1 Mandate Bound Circuit (Priority 1)

This is the critical circuit. Everything else depends on it working correctly and efficiently.

**File:** `circuits/mandate_bound.circom`

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

/*
 * MandateBound Circuit
 * 
 * Proves: proposed_value <= max_value
 * Without revealing: max_value
 * 
 * Public inputs:
 *   commitment   - Poseidon hash of (max_value, randomness)
 *   proposed     - the proposed commitment value (plaintext)
 *   max_bits     - bit width constraint (e.g. 64 for values up to 2^64)
 *
 * Private inputs:
 *   max_value    - the actual mandate maximum
 *   randomness   - blinding factor for the commitment
 */
template MandateBound(max_bits) {
    // Public inputs
    signal input commitment;
    signal input proposed;
    
    // Private inputs  
    signal input max_value;
    signal input randomness;
    
    // Verify commitment opens correctly
    component hasher = Poseidon(2);
    hasher.inputs[0] <== max_value;
    hasher.inputs[1] <== randomness;
    commitment === hasher.out;
    
    // Verify proposed <= max_value
    // LessEqThan requires both inputs to be in range [0, 2^max_bits)
    component lte = LessEqThan(max_bits);
    lte.in[0] <== proposed;
    lte.in[1] <== max_value;
    lte.out === 1;
    
    // Range check: proposed must be positive
    component gtZero = GreaterThan(max_bits);
    gtZero.in[0] <== proposed;
    gtZero.in[1] <== 0;
    gtZero.out === 1;
}

component main {public [commitment, proposed]} = MandateBound(64);
```

**Constraint count estimate:** ~350 constraints (Poseidon hash ~240, LessEqThan ~64, GreaterThan ~64). This is extremely lightweight and should generate proofs in well under 100ms.

**Test vectors:**
```
max_value: 500000 (EUR cents: 50000000)
randomness: random 254-bit field element
proposed:  420000 (EUR cents: 42000000)
expected:  VALID

proposed:  600000 (EUR cents: 60000000)  
expected:  INVALID (constraint violation)

proposed:  0
expected:  INVALID (must be positive)
```

---

### 3.2 Parameter Range Circuit (Priority 1)

**File:** `circuits/parameter_range.circom`

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

/*
 * ParameterRange Circuit
 *
 * Proves: floor <= proposed_parameter <= ceiling
 * Without revealing: floor, ceiling
 *
 * Use cases: price range, delivery window, payment terms range
 *
 * Public inputs:
 *   commitment_floor   - Poseidon(floor, r1)
 *   commitment_ceiling - Poseidon(ceiling, r2)
 *   proposed           - proposed parameter value
 *
 * Private inputs:
 *   floor, ceiling     - range bounds
 *   r1, r2             - blinding factors
 */
template ParameterRange(max_bits) {
    signal input commitment_floor;
    signal input commitment_ceiling;
    signal input proposed;
    
    signal input floor_val;
    signal input ceiling_val;
    signal input r1;
    signal input r2;
    
    // Verify floor commitment
    component hash_floor = Poseidon(2);
    hash_floor.inputs[0] <== floor_val;
    hash_floor.inputs[1] <== r1;
    commitment_floor === hash_floor.out;
    
    // Verify ceiling commitment
    component hash_ceil = Poseidon(2);
    hash_ceil.inputs[0] <== ceiling_val;
    hash_ceil.inputs[1] <== r2;
    commitment_ceiling === hash_ceil.out;
    
    // Verify floor <= proposed
    component gte_floor = GreaterEqThan(max_bits);
    gte_floor.in[0] <== proposed;
    gte_floor.in[1] <== floor_val;
    gte_floor.out === 1;
    
    // Verify proposed <= ceiling
    component lte_ceil = LessEqThan(max_bits);
    lte_ceil.in[0] <== proposed;
    lte_ceil.in[1] <== ceiling_val;
    lte_ceil.out === 1;
    
    // Verify valid range: floor < ceiling
    component valid_range = LessThan(max_bits);
    valid_range.in[0] <== floor_val;
    valid_range.in[1] <== ceiling_val;
    valid_range.out === 1;
}

component main {public [commitment_floor, commitment_ceiling, proposed]} 
    = ParameterRange(64);
```

**Constraint count estimate:** ~550 constraints. Still lightweight.

---

### 3.3 Credential Freshness Circuit (Priority 2)

**File:** `circuits/credential_freshness.circom`

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

/*
 * CredentialFreshness Circuit
 *
 * Proves: credential is valid (not expired) at current_timestamp
 * Without revealing: full credential contents
 *
 * Note: timestamps represented as Unix timestamps (uint64)
 */
template CredentialFreshness() {
    // Public inputs
    signal input credential_hash;     // Poseidon hash of credential fields
    signal input current_timestamp;   // Current block timestamp (from on-chain)
    
    // Private inputs
    signal input issuance_timestamp;
    signal input expiry_timestamp;
    signal input credential_data_hash; // Hash of actual credential data
    signal input r;                    // Blinding factor
    
    // Verify credential hash commitment
    component hasher = Poseidon(3);
    hasher.inputs[0] <== issuance_timestamp;
    hasher.inputs[1] <== expiry_timestamp;
    hasher.inputs[2] <== credential_data_hash;
    credential_hash === hasher.out;
    
    // Verify: current_timestamp >= issuance_timestamp (after issuance)
    component after_issuance = GreaterEqThan(64);
    after_issuance.in[0] <== current_timestamp;
    after_issuance.in[1] <== issuance_timestamp;
    after_issuance.out === 1;
    
    // Verify: current_timestamp <= expiry_timestamp (before expiry)
    component before_expiry = LessEqThan(64);
    before_expiry.in[0] <== current_timestamp;
    before_expiry.in[1] <== expiry_timestamp;
    before_expiry.out === 1;
}

component main {public [credential_hash, current_timestamp]} 
    = CredentialFreshness();
```

---

### 3.4 Identity Binding Circuit (Priority 2)

**File:** `circuits/identity_binding.circom`

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/eddsa.circom";

/*
 * IdentityBinding Circuit
 *
 * Proves: the session key used in this negotiation is controlled by
 *         the entity that controls the registered DID key
 * Without revealing: the DID private key
 *
 * This prevents key delegation attacks where a compromised
 * session key is used to impersonate the registered agent.
 */
template IdentityBinding() {
    // Public inputs
    signal input did_public_key[2];   // Registered DID verification key (x, y)
    signal input session_commitment;  // Hash of session ID + session public key
    
    // Private inputs
    signal input did_private_key;     // DID private key (proves ownership)
    signal input session_id;
    signal input session_public_key[2];
    
    // Verify session commitment
    component session_hasher = Poseidon(3);
    session_hasher.inputs[0] <== session_id;
    session_hasher.inputs[1] <== session_public_key[0];
    session_hasher.inputs[2] <== session_public_key[1];
    session_commitment === session_hasher.out;
    
    // Verify DID key ownership via EdDSA
    // (signature of session_commitment with DID private key)
    component eddsa = EdDSAVerifier();
    eddsa.enabled <== 1;
    eddsa.Ax <== did_public_key[0];
    eddsa.Ay <== did_public_key[1];
    // ... (signature inputs from private key)
}

component main {public [did_public_key, session_commitment]} 
    = IdentityBinding();
```

---

## 4. Proof System Comparison: Groth16 vs PLONK

The PoC should benchmark both. Here are the theoretical expectations to validate:

| Metric | Groth16 | PLONK | Notes |
|--------|---------|-------|-------|
| Proof size | ~200 bytes | ~800 bytes | Groth16 significantly smaller |
| Verification gas (EVM) | ~220k | ~300k | Groth16 cheaper on-chain |
| Proof generation time | ~0.5-2s | ~1-5s | Circuit-dependent |
| Trusted setup | Per-circuit | Universal (once) | Critical governance difference |
| Setup ceremony | Required | Required (universal) | PLONK simpler to govern |
| Recursive proofs | Complex | Native support | Important for aggregation |

**PoC recommendation:** Implement Mandate Bound and Parameter Range in both Groth16 and PLONK. Benchmark on:
- Consumer laptop (M2 MacBook baseline)
- Server hardware (c5.2xlarge AWS equivalent)
- Measure: proof generation time, proof size, verification gas on Arbitrum fork

**Decision threshold:** If Groth16 generates proofs in <500ms and verification costs <100k gas on L2, use Groth16 for Phase 1 (accepting per-circuit trusted setup with a small ceremony). If latency or governance concerns dominate, switch to PLONK.

---

## 5. Trusted Setup PoC Ceremony

For the PoC phase, a minimal Powers of Tau ceremony is acceptable. Production requires a full multi-party ceremony.

**PoC ceremony (2-5 participants):**
```bash
# Phase 1: Powers of Tau (circuit-independent)
snarkjs powersoftau new bn128 14 pot14_0000.ptau
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau \
  --name="Participant 1" -e="random entropy string"

# Phase 2: Circuit-specific setup
snarkjs groth16 setup mandate_bound.r1cs pot14_final.ptau \
  mandate_bound_0000.zkey
snarkjs zkey contribute mandate_bound_0000.zkey mandate_bound_0001.zkey \
  --name="Attestara Team" -e="more entropy"
snarkjs zkey export verificationkey mandate_bound_final.zkey \
  verification_key.json
```

**Production ceremony:** Requires public participation from DAO founding members. Target minimum 20 participants using the bn128 curve, with publicly verifiable contributions. Reference: Hermez Network ceremony (2021), Tornado Cash ceremony (2020).

---

## 6. On-Chain Verifier Contract

The snarkjs-exported Solidity verifier for the Mandate Bound circuit:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Auto-generated by snarkjs — do not modify directly
// Circuit: MandateBound(64)
// Proof system: Groth16

contract MandateBoundVerifier {
    
    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }
    
    // Verification key (generated from trusted setup)
    uint256 constant ALPHA_X = /* from ceremony */;
    uint256 constant ALPHA_Y = /* from ceremony */;
    // ... (full VK omitted for brevity; generated by snarkjs)
    
    function verifyProof(
        Proof calldata proof,
        uint256[2] calldata publicSignals  // [commitment, proposed]
    ) external view returns (bool) {
        // Pairing check
        // ... (snarkjs-generated pairing arithmetic)
        return true; // placeholder
    }
}
```

**Gas benchmark targets (Arbitrum One):**
- Target: < 80,000 gas per MandateBound verification
- Acceptable: < 150,000 gas
- Unacceptable: > 300,000 gas (forces architecture reconsideration)

At Arbitrum's typical gas prices (~0.01 gwei), 80k gas = ~$0.001 per proof verification. Acceptable for enterprise use cases.

---

## 7. PoC Test Suite

**File:** `test/circuits.test.js`

```javascript
const { expect } = require("chai");
const { buildPoseidon } = require("circomlibjs");
const snarkjs = require("snarkjs");
const { utils } = require("ffjavascript");

describe("MandateBound Circuit", () => {
  let poseidon;
  
  before(async () => {
    poseidon = await buildPoseidon();
  });

  it("should accept a valid proof (proposed <= max)", async () => {
    const maxValue = BigInt(500000);
    const proposed = BigInt(420000);
    const randomness = BigInt("1234567890abcdef"); // use crypto.randomBytes in prod
    
    const commitment = poseidon([maxValue, randomness]);
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      {
        commitment: commitment.toString(),
        proposed: proposed.toString(),
        max_value: maxValue.toString(),
        randomness: randomness.toString()
      },
      "circuits/mandate_bound_js/mandate_bound.wasm",
      "circuits/mandate_bound_final.zkey"
    );
    
    const vkey = require("./verification_key.json");
    const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    
    expect(valid).to.be.true;
  });

  it("should reject a proof where proposed > max", async () => {
    // Attempting to create a proof for an over-mandate commitment
    // should either fail during proof generation or produce an invalid proof
    const maxValue = BigInt(500000);
    const proposed = BigInt(600000); // OVER MANDATE
    
    // This should throw during witness generation
    await expect(
      snarkjs.groth16.fullProve(
        { proposed: proposed.toString(), max_value: maxValue.toString(), ... },
        "circuits/mandate_bound_js/mandate_bound.wasm",
        "circuits/mandate_bound_final.zkey"
      )
    ).to.be.rejected;
  });
  
  it("should benchmark proof generation time", async () => {
    const start = Date.now();
    // ... (standard valid proof)
    const elapsed = Date.now() - start;
    console.log(`Proof generation: ${elapsed}ms`);
    expect(elapsed).to.be.below(2000); // 2 second threshold
  });
});
```

---

## 8. PoC Success Criteria

The PoC is considered successful when:

| Criterion | Pass Threshold | Fail Threshold |
|-----------|---------------|----------------|
| Mandate Bound proof generation | < 1s on M2 MacBook | > 3s |
| Parameter Range proof generation | < 1.5s | > 4s |
| Mandate Bound verification gas (L2) | < 100k gas | > 250k gas |
| Proof size (Groth16) | < 300 bytes | > 1KB |
| All test vectors pass | 100% | Any failure |
| PLONK alternative benchmarked | Completed | Not completed |

---

## 9. Implementation Checklist

- [ ] Install Circom 2.x and snarkjs
- [ ] Implement MandateBound circuit
- [ ] Implement ParameterRange circuit
- [ ] Run Powers of Tau ceremony (PoC level, 3 participants)
- [ ] Generate Groth16 proving/verification keys
- [ ] Generate PLONK proving/verification keys (same circuits)
- [ ] Implement test suite with all test vectors
- [ ] Benchmark proof generation times
- [ ] Deploy verifier contracts to Arbitrum Goerli testnet
- [ ] Measure on-chain verification gas costs
- [ ] Document results against success criteria
- [ ] Decision: Groth16 vs PLONK for Phase 1

**Estimated effort:** 3-5 days for a developer with ZK circuit experience; 2-3 weeks for a developer learning Circom from scratch.

**Recommended resource:** Circom documentation at docs.circom.io; 0xPARC ZK Learning Group materials; iden3/circomlib for audited component circuits.

---

*Attestara ZK Circuit PoC Design Document v0.1*
