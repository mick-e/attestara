# Attestara — Expanded Threat Model
## Security Analysis v0.1

---

## 1. Scope and Methodology

This document extends the threat model in the Attestara Protocol Specification (§9) to cover the full attack surface. It follows the STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) applied to each protocol component, supplemented by ZK-specific and blockchain-specific threat categories.

Each threat is assessed on:
- **Likelihood:** Low / Medium / High
- **Impact:** Low / Medium / High / Critical
- **Mitigated by:** Which protocol mechanism addresses it
- **Residual risk:** Risk remaining after mitigation

---

## 2. Trust Boundary Map

```
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 1: Principal Organisation                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Principal  │  │  Authority   │  │  Credential        │  │
│  │  Key Store  │  │  Credential  │  │  Issuance Process  │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ (Credential issuance)
┌────────────────────────────▼────────────────────────────────┐
│ TRUST BOUNDARY 2: Agent Runtime                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Agent   │  │  Credential  │  │  ZK Prover             │ │
│  │  DID Key │  │  Wallet      │  │  (local / service)     │ │
│  └──────────┘  └──────────────┘  └────────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │ (Negotiation messages + proofs)
┌────────────────────────────▼────────────────────────────────┐
│ TRUST BOUNDARY 3: Negotiation Channel                        │
│  (Off-chain, encrypted transport)                            │
└────────────────────────────┬────────────────────────────────┘
                             │ (Session anchors + commitments)
┌────────────────────────────▼────────────────────────────────┐
│ TRUST BOUNDARY 4: On-Chain Infrastructure                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Identity    │  │  Commitment  │  │  Governance        │ │
│  │  Registry    │  │  Contract    │  │  Contract          │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Threat Catalogue

### T-01: Replay Attack on Session Initiation

**Category:** Spoofing  
**Likelihood:** High  
**Impact:** High  
**Description:** An attacker captures a valid session initiation message (including ZK proofs and credential presentations) from a prior session and replays it to initiate a new session, impersonating the original agent.

**Attack scenario:**
1. Attacker intercepts Session Proposal from Agent A to Agent B
2. Attacker replays the proposal at a later time to impersonate Agent A
3. If accepted, attacker gains a negotiation session appearing to be Agent A

**Mitigation:**
- Session IDs include a cryptographic nonce generated fresh per session
- Session Proposals include a timestamp with a ±5 minute validity window
- ZK proofs bind to the session ID; a proof generated for session X is invalid for session Y
- Credential Freshness circuit verifies against current block timestamp

**Residual risk:** Low — nonce + timestamp binding makes replay computationally infeasible

---

### T-02: Man-in-the-Middle on Session Initialisation

**Category:** Tampering / Spoofing  
**Likelihood:** Medium  
**Impact:** Critical  
**Description:** An attacker intercepts the session channel between Agent A and Agent B during initialisation, substituting their own credentials and keys, positioning themselves to observe and manipulate the negotiation.

**Attack scenario:**
1. Attacker intercepts Session Proposal before Agent B receives it
2. Attacker substitutes their own DID and credentials for Agent A's
3. Agent B verifies the attacker's credentials (which are valid) and proceeds
4. Attacker now relays messages, observing and potentially modifying negotiation turns

**Mitigation:**
- Session initiation must include a channel binding commitment: both agents sign a hash of the session's transport-layer parameters (TLS certificate fingerprint or equivalent)
- DID resolution is on-chain and immutable; the DID claimed in the proposal must resolve to a registered agent
- All session anchors are co-signed; any substitution breaks the anchor chain

**Residual risk:** Medium — channel binding requires correct implementation; if TLS is compromised at the transport layer, this threat requires additional mitigations (mutual TLS with agent-specific certificates)

**Recommended additional mitigation:** Require mutual TLS with certificates derived from the agent's DID key material. This cryptographically binds the transport channel to the verified identity.

---

### T-03: Credential Stuffing via Compromised Principal Key

**Category:** Elevation of Privilege  
**Likelihood:** Low-Medium  
**Impact:** Critical  
**Description:** An attacker compromises the principal organisation's signing key and issues fraudulent Authority Credentials to new or existing agents, granting them expanded authority they should not have.

**Attack scenario:**
1. Attacker compromises the principal's key management system
2. Attacker issues an Authority Credential with maxCommitmentValue: unlimited
3. Agent (possibly also compromised) uses this credential to commit to multi-million agreements
4. Principal discovers the breach only after commitments are made

**Mitigation:**
- Authority Credentials are time-limited (maximum 90-day validity recommended)
- Credential Registry monitors for unusual issuance patterns (multiple high-value credentials in short succession)
- Hardware Security Module (HSM) requirement for principal key storage
- Multi-signature requirement for Authority Credentials above configurable value thresholds (e.g. credentials authorising >€1M commitments require 2-of-3 principal key signatures)
- Governance layer can flag credentials issued after a reported key compromise for immediate revocation

**Residual risk:** Medium — key compromise is always a critical risk; HSM + multi-sig reduces but does not eliminate it

**Incident response:** Protocol must support emergency credential revocation with <1 minute propagation to on-chain registry

---

### T-04: ZK Proof Malleability

**Category:** Tampering  
**Likelihood:** Low  
**Impact:** High  
**Description:** An attacker attempts to take a valid ZK proof for one statement and modify it to prove a different, more favourable statement without knowing the underlying witness.

**Technical background:** Groth16 proofs have a known malleability property: a valid proof (π_a, π_b, π_c) can be transformed into another valid proof (π_a', π_b', π_c') for the same statement by scalar multiplication. However, this does not change the *public inputs* — it cannot change what statement is proven, only produce a different-looking proof for the same statement.

**Attack scenario:**
1. Agent A generates a valid MandateBound proof for proposed=420,000 with commitment C
2. Attacker intercepts this proof and attempts to modify it to be valid for proposed=600,000
3. If successful, the counterparty accepts the proof as valid for an over-mandate commitment

**Why this doesn't work in Attestara:**
- Groth16 malleability allows producing a different proof for the *same* statement
- The public input `proposed` is plaintext in the proof — changing it would require producing a valid proof for a different public input, which requires knowledge of the witness (max_value, randomness)
- The commitment C binds to the specific max_value; a proof for commitment C cannot be valid for commitment C' where C' commits to a different max_value

**Mitigation:**
- Proof uniqueness check: the Commitment Contract rejects proofs that have been previously submitted (nullifier pattern)
- Proof-session binding: proofs include the session ID as a public input, preventing cross-session reuse

**Residual risk:** Low — the attack requires breaking the computational binding of Pedersen/Poseidon commitments

---

### T-05: Front-Running on Commitment Transactions

**Category:** Tampering / Information Disclosure  
**Likelihood:** Medium (on public chains)  
**Impact:** Medium  
**Description:** An attacker (including a malicious validator/sequencer) observes a pending commitment transaction in the mempool and either front-runs it to create a conflicting commitment or extracts information about the agreement terms.

**Attack scenario:**
1. Agent A and Agent B reach agreement and Agent A submits the commitment transaction
2. Attacker sees the transaction in the mempool
3. Attacker submits a conflicting commitment for the same session ID with higher gas
4. Attacker's transaction is mined first, potentially invalidating or corrupting the agreement record

**Mitigation:**
- Commitment transactions include both agents' signatures; an attacker cannot produce a valid competing commitment without Agent B's signature
- Use of commit-reveal scheme for the final commitment: both agents submit a commitment hash in round 1, reveal in round 2; front-running the reveal without knowing the hash is infeasible
- Arbitrum's sequencer (centralised in the current version) provides FIFO ordering, reducing front-running risk vs Ethereum mainnet

**Residual risk:** Low-Medium — the dual-signature requirement is the primary protection; commit-reveal adds defence-in-depth

---

### T-06: Oracle Manipulation

**Category:** Tampering  
**Likelihood:** Medium  
**Impact:** High  
**Description:** If Attestara's commitment conditions reference external data (e.g. "this contract is valid if FX rate EUR/USD > 1.05 at settlement"), a malicious actor could manipulate the oracle providing that data.

**Note:** The current Attestara spec (v0.1) does not include oracle-dependent commitment conditions. This threat applies to future extensions only.

**Mitigation (for future versions):**
- Use decentralised oracle networks (Chainlink, Pyth) with multi-source aggregation
- Time-weighted average prices rather than spot prices for FX references
- Dispute window allowing parties to challenge oracle data before commitment finalises

**Residual risk:** Medium — oracle manipulation is a known DeFi risk; standard mitigations apply

---

### T-07: Smart Contract Vulnerability (Reentrancy / Logic Bug)

**Category:** Elevation of Privilege / Tampering  
**Likelihood:** Medium (without audits)  
**Impact:** Critical  
**Description:** A bug in the Commitment Contract allows an attacker to create fraudulent commitment records, drain any deposited collateral, or corrupt the credential registry.

**Specific attack patterns:**
- **Reentrancy:** A malicious token/callback triggers re-entry into the commitment function before state is updated
- **Integer overflow:** Commitment values that overflow cause incorrect authorisation checks
- **Access control failure:** Missing `onlyGovernance` modifier on critical functions

**Mitigation:**
- Checks-Effects-Interactions pattern throughout all contract functions
- Use OpenZeppelin ReentrancyGuard on all state-changing functions
- Formal verification of core commitment logic (Certora or Halmos)
- Minimum two independent security audits before mainnet deployment
- Upgradeability pattern with 48-hour timelock on changes (prevents rushed emergency changes that introduce bugs)
- Bug bounty programme (Immunefi or equivalent) prior to mainnet

**Residual risk:** Medium (pre-audit) → Low (post-audit + formal verification)

---

### T-08: Sybil Attack on DAO Governance (DAO Mode)

**Category:** Elevation of Privilege  
**Likelihood:** Medium  
**Impact:** High  
**Description:** An attacker creates many fake organisations to gain disproportionate influence over DAO governance — potentially approving malicious protocol upgrades, revoking legitimate participants, or manipulating verification key governance.

**Attack scenario:**
1. Attacker creates 50 shell organisations, each passing KYB with minimal documentation
2. Attacker accumulates governance tokens representing majority voting power
3. Attacker proposes and passes a protocol upgrade that weakens ZK circuit verification
4. Compromised verification allows attacker to generate false proofs

**Mitigation:**
- KYB requirement with minimum documentation threshold (company registration, director verification)
- Governance stake lockup period (minimum 90 days) prevents quick entry and exit
- Quadratic voting rather than token-weighted voting reduces the advantage of large single-entity holdings
- Technical Committee veto on circuit and verification key changes (requires cryptography expertise, not just token ownership)
- Reputation-weighted voting: organisations with longer track records have more governance weight

**Residual risk:** Medium — KYB + stake requirements make Sybil attacks expensive but not impossible; the Technical Committee veto is the critical safeguard for protocol integrity

---

### T-09: Denial of Service on Prover Service

**Category:** Denial of Service  
**Likelihood:** High  
**Impact:** Medium  
**Description:** An attacker floods the ZK prover service with proof requests, denying legitimate agents the ability to generate proofs and participate in negotiations.

**Attack scenario:**
1. Attacker spins up many agents, each initiating many sessions simultaneously
2. Each session requires proof generation, overwhelming the prover service
3. Legitimate agents cannot generate proofs; their sessions time out

**Mitigation:**
- Rate limiting on proof requests per DID per time window
- Proof request authentication: only registered agents (with valid DIDs) can request proofs
- Proof generation as a paid service with economic friction for abuse
- Distributed prover network in DAO mode (no single point of failure)
- Client-side proving option: agents can generate their own proofs without using the service

**Residual risk:** Low — combination of authentication + rate limiting + client-side fallback makes sustained DoS economically costly

---

### T-10: Information Disclosure via Session Metadata

**Category:** Information Disclosure  
**Likelihood:** High (without care)  
**Impact:** Medium  
**Description:** Even though individual negotiation parameters are protected by ZK proofs, session metadata (frequency, timing, counterparty identities, session duration, number of turns) may reveal commercially sensitive information to observers of on-chain data.

**Attack scenario:**
1. Competitor observes that Organisation A is conducting frequent negotiations with Supplier B
2. Session timing patterns reveal when A is under supply chain pressure
3. Session duration and turn count reveals whether negotiations are easy or contested
4. This metadata, aggregated over time, reveals strategic commercial information

**Mitigation:**
- Pseudonymous session IDs (not directly linked to organisation names on-chain)
- Optional: use zero-knowledge session identifiers that reveal to the counterparty but not to chain observers
- Session batching: anchor multiple sessions in a single transaction to obscure individual timing
- Frequency obfuscation: schedule non-urgent sessions at randomised intervals

**Residual risk:** Medium — blockchain transparency creates inherent metadata leakage; complete privacy requires additional cryptographic work beyond the current spec

---

### T-11: Model Extraction via Negotiation Patterns

**Category:** Information Disclosure  
**Likelihood:** Medium  
**Impact:** Medium  
**Description:** An adversary conducts many negotiation sessions with a target agent, systematically probing its responses to infer the agent's underlying negotiation strategy, reservation price, and authority parameters.

**Note:** This threat is at the intersection of the protocol layer and the model behaviour layer. Attestara addresses the protocol layer; model security is the deploying organisation's responsibility.

**Attack scenario:**
1. Attacker conducts 100 negotiation sessions with Target Agent
2. Each session varies one parameter and records the response
3. Over time, attacker builds a model of Target Agent's utility function and reservation price
4. Attacker uses this model to structure future negotiations that extract maximum value from Target Agent

**Mitigation (protocol level):**
- Authority Credential can encode a maximum number of active sessions per counterparty
- Anomalous session pattern detection (many sessions from same counterparty without commitments) triggers escalation
- ZK proofs on negotiation parameters prevent direct observation of the underlying values

**Mitigation (model level, outside Attestara scope):**
- Agents should implement random noise in response timing and value increments
- Regular re-training or parameter rotation

**Residual risk:** Medium-High — this is a fundamental limitation of any automated negotiation system; full mitigation requires model-level changes

---

### T-12: Governance Capture via Protocol Upgrade

**Category:** Elevation of Privilege  
**Likelihood:** Low-Medium  
**Impact:** Critical  
**Description:** A coalition of DAO members (or a single entity with majority stake) proposes and passes a protocol upgrade that introduces a backdoor, weakens security guarantees, or enables extraction of protected information.

**Attack scenario:**
1. Attacker (or cartel) accumulates 51% of governance tokens over time
2. Proposes an "optimisation" upgrade that subtly weakens the ZK verifier
3. After upgrade, attacker can generate false proofs without the circuit constraints
4. All post-upgrade commitment records are potentially fraudulent

**Mitigation:**
- Supermajority requirement (75%) for protocol security parameter changes
- Technical Committee veto on cryptographic changes
- Mandatory 30-day community review period for all upgrades
- Independent security review required for any changes to circuit verification keys
- Upgrade timelock of minimum 48 hours (allows detection and fork if malicious)
- Immutable core: the ZK circuit verification keys should be upgradeable only via a separate, more stringent process than general protocol changes

**Residual risk:** Low — supermajority + Technical Committee veto + timelock makes governance capture both expensive and detectable

---

## 4. Risk Summary Matrix

| ID | Threat | Likelihood | Impact | Residual Risk |
|----|--------|-----------|--------|---------------|
| T-01 | Replay Attack | High | High | Low |
| T-02 | MitM Session Init | Medium | Critical | Medium |
| T-03 | Principal Key Compromise | Low-Med | Critical | Medium |
| T-04 | ZK Proof Malleability | Low | High | Low |
| T-05 | Front-Running Commitment | Medium | Medium | Low-Med |
| T-06 | Oracle Manipulation | Medium | High | Medium |
| T-07 | Smart Contract Bug | Medium | Critical | Low (post-audit) |
| T-08 | DAO Sybil Attack | Medium | High | Medium |
| T-09 | Prover DoS | High | Medium | Low |
| T-10 | Session Metadata Leakage | High | Medium | Medium |
| T-11 | Model Extraction | Medium | Medium | Medium-High |
| T-12 | Governance Capture | Low-Med | Critical | Low |

---

## 5. Pre-Launch Security Requirements

Before mainnet deployment, the following must be completed:

- [ ] Formal verification of Commitment Contract core logic (Certora)
- [ ] Minimum two independent smart contract audits
- [ ] ZK circuit audit by a specialised ZK security firm (e.g. Trail of Bits, Zellic, Veridise)
- [ ] Penetration test of off-chain components (prover service, session relay)
- [ ] Trusted setup ceremony with minimum 10 participants
- [ ] Bug bounty programme established with minimum $100,000 pool
- [ ] Incident response plan documented and tested
- [ ] Emergency pause mechanism implemented and tested
- [ ] T-02 mitigation (mutual TLS with DID key binding) implemented and tested

---

*Attestara Expanded Threat Model v0.1*
