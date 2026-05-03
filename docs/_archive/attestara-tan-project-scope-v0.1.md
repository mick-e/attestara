# Attestara Threshold Anchoring Network
## Project Scope Document v0.1

**Classification:** Confidential — Internal  
**Date:** April 2026  
**Author:** Littledata Research & Engineering  
**Contact:** mick@littledata.ai  
**Status:** Draft for Review  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background and Context](#2-background-and-context)
3. [Objectives](#3-objectives)
4. [Node Operator Programme](#4-node-operator-programme)
5. [Technical Architecture](#5-technical-architecture)
6. [Staged Migration Plan](#6-staged-migration-plan)
7. [Legal and Compliance Framework](#7-legal-and-compliance-framework)
8. [Operational Infrastructure](#8-operational-infrastructure)
9. [Financial Model](#9-financial-model)
10. [Risk Register](#10-risk-register)
11. [Timeline](#11-timeline)
12. [Open Items and Decisions Required](#12-open-items-and-decisions-required)
13. [Document Control](#13-document-control)

---

## 1. Executive Summary

The Attestara Threshold Anchoring Network (TAN) is the production infrastructure programme that migrates the Attestara protocol's credential status anchoring from a centralised Littledata-operated service to a decentralised 3-of-5 threshold multi-party network.

The TAN is a prerequisite for full production deployment of the Attestara protocol at enterprise scale. It addresses the centralisation risk inherent in the v1 demo and pilot anchoring service, satisfies DORA self-hosting requirements for financial services deployments, and fulfils the decentralisation commitment made in the Attestara whitepaper v5.0.

This document defines the full scope, architecture, governance model, legal requirements, operational plan, and timeline for TAN delivery.

---

## 2. Background and Context

### 2.1 Current State

The Attestara protocol currently operates with a centralised anchoring service operated by Littledata. This service:

- Monitors the W3C Bitstring Status List credential for revocation events
- Computes the Poseidon Merkle root over the current bitstring state
- Submits the computed root to the CredentialRegistry contract on Arbitrum
- Operates with a hybrid trigger model — revocation event plus heartbeat

The centralised service is appropriate for the testnet demo and Phase 2 pilot deployments. It is not appropriate for full production deployment at enterprise scale for the following reasons:

- **Single point of failure** — if Littledata's anchoring service is unavailable, all active sessions are affected regardless of their tier
- **Centralisation trust assumption** — enterprise customers, particularly DORA-subject financial institutions, cannot accept a critical infrastructure dependency on a single third-party operator
- **Standards body positioning** — the Attestara whitepaper commits to decentralised governance and the DIF and W3C CCG submissions will be scrutinised for centralisation risks

### 2.2 Target State

A 3-of-5 threshold multi-party anchoring network where:

- Five independent node operators each run anchoring infrastructure
- Off-chain consensus requires agreement from at least three of five nodes before any root is submitted on-chain
- The CredentialRegistry contract verifies co-signatures before accepting a root
- No single operator — including Littledata — can unilaterally control the anchoring infrastructure
- Node addition and removal is governed by a supermajority process requiring no contract upgrade

### 2.3 Relationship to Attestara Roadmap

| Attestara Phase | Anchoring Model | TAN Status |
|---|---|---|
| Phase 0 — Foundation | Centralised (Littledata) | Not required |
| Phase 1 — MVP | Centralised with self-hosting option | Not required |
| Phase 2 — Pilots | Centralised with self-hosting option | Planning and recruitment in progress |
| Phase 3 — Scale | Threshold 3-of-5 production | Full deployment |

---

## 3. Objectives

### 3.1 Primary Objectives

- Deploy a production-grade 3-of-5 threshold anchoring network before Phase 3 scale deployment
- Migrate all active enterprise deployments from centralised to threshold anchoring without service disruption
- Satisfy DORA ICT risk governance requirements for financial services customers
- Fulfil the decentralisation commitment in the Attestara whitepaper

### 3.2 Secondary Objectives

- Establish node operator relationships that strengthen Attestara's standards body positioning
- Create a governance model that can accommodate network growth beyond 5 nodes
- Produce a node operator onboarding programme reusable for future network expansion
- Generate a publicly auditable transparency log of anchoring operations

### 3.3 Out of Scope

- Changes to the ZK circuit architecture
- Changes to the CommitmentContract design
- Changes to the session protocol or DIDComm bindings
- Payment or compensation model for node operators in v1
- Network expansion beyond 5 nodes in Phase 3

---

## 4. Node Operator Programme

### 4.1 Target Operator Profile

Five node operators are required. Each must independently satisfy the following criteria:

**Independence criteria:**
- No subsidiary, parent, or affiliate relationship with any other node operator
- No material financial interest in any other node operator
- No existing commercial relationship with Littledata that creates a conflict of interest

**Technical criteria:**
- Demonstrated capability to operate 99.9%+ uptime infrastructure
- HSM or equivalent key management capability
- Dedicated compute resources — no shared infrastructure with competing workloads
- Engineering team capable of maintaining and updating node software

**Legal criteria:**
- Legal entity capable of entering the Node Operator Agreement
- Jurisdiction-appropriate data processing capability for GDPR compliance
- No regulatory restriction preventing operation of blockchain transaction infrastructure

**Credibility criteria:**
- Recognised in at least one of: DIF community, W3C CCG community, enterprise AI governance space, academic cryptography or distributed systems research, enterprise blockchain infrastructure industry

### 4.2 Target Operator Composition

| Node | Operator Type | Rationale | Status |
|---|---|---|---|
| Node 1 | Littledata | Protocol developer and network coordinator — operational visibility and technical expertise | Confirmed |
| Node 2 | DIF Member Organisation | Standards body representative — strengthens DIF working group relationship and decentralised identity community credibility | To be identified through DIF working group engagement |
| Node 3 | Pilot Customer Organisation | Enterprise customer operator — direct commercial stake in reliability, satisfies DORA self-hosting preference | Dependent on Phase 2 pilot recruitment |
| Node 4 | Independent Infrastructure Provider | Neutral technical operator — professional infrastructure operations, no conflicting commercial interests, geographic distribution | To be approached Month 4 |
| Node 5 | Academic Institution | Independent research operator — genuine independence, technical credibility, no commercial conflicts | To be explored through co-author outreach |

### 4.3 Node Operator Commitments

Each node operator commits to the following through the Node Operator Agreement:

**Operational commitments:**
- Minimum 99.9% uptime for the anchoring node
- Consensus participation response within tier-specific consensus windows
- Incident notification to all other operators within 30 minutes of detection
- Planned maintenance notification minimum 72 hours in advance
- Key rotation procedure compliance

**Security commitments:**
- HSM storage of anchoring signing key — mandatory, no exceptions
- Dedicated compute instance — no shared resources
- Security patch application within 48 hours of critical patches
- Participation in key generation ceremony per specified procedure
- Immediate notification of suspected key compromise

**Governance commitments:**
- Participation in node operator governance votes within 5 business days
- Compliance with network parameter updates approved by supermajority
- Exit procedure compliance — minimum 90-day notice before departure

**Audit and transparency commitments:**
- Append-only audit log retained for minimum 5 years
- Health metrics exposed to centralised monitoring dashboard
- Participation in annual network security review

---

## 5. Technical Architecture

### 5.1 Consensus Mechanism

The TAN uses off-chain consensus with single on-chain submission. This approach minimises on-chain gas costs while maintaining cryptographic security guarantees.

**Consensus flow:**

```
1. Trigger fires (revocation event or heartbeat) at any node
2. Triggering node computes Merkle root and broadcasts to all other nodes
3. Each receiving node independently verifies the root computation
4. Nodes that agree respond with a co-signature within the consensus window
5. Once 3-of-5 co-signatures are collected, the triggering node submits
   the root on-chain with all co-signatures
6. CredentialRegistry contract verifies co-signatures and updates root
7. All nodes record the confirmed anchor in their audit logs
```

**Consensus window by tier:**

| Tier | Maximum Staleness | Heartbeat Interval | Consensus Window |
|---|---|---|---|
| High Security | 30 seconds | 20 seconds | 5 seconds |
| Standard | 90 seconds | 60 seconds | 15 seconds |
| Low Frequency | 300 seconds | 200 seconds | 60 seconds |

> **Note:** Heartbeat interval is set at two-thirds of maximum staleness window to provide a safety margin if one heartbeat transaction requires resubmission.

> **Deduplication:** If a revocation event trigger and heartbeat trigger fire within a 5-second window, one consensus round covers both.

### 5.2 Freshness Tiers

The freshness tier is specified at two levels:

- **Deployment-level minimum tier** — set by the enterprise administrator, cannot be overridden by individual Principals
- **Credential-level tier** — set by the Principal at issuance, must be at or above the deployment minimum

**Default tier if unspecified:** Standard

This hierarchy prevents a Principal from accidentally issuing a Low Frequency credential for a high-value or regulated deployment.

### 5.3 Node Communication Protocol

Inter-node consensus communication uses DIDComm v2 authenticated messaging. Each anchoring node has a DID registered on Arbitrum via ERC-1056. This reuses existing protocol infrastructure and makes all consensus communication auditable.

**Root proposal message:**

```json
{
  "type": "https://attestara.ai/protocols/anchoring/1.0/root-proposal",
  "from": "did:ethr:0x<node_address>",
  "to": ["did:ethr:0x<node_2>", "did:ethr:0x<node_3>"],
  "body": {
    "merkleRoot": "0x...",
    "statusListHash": "0x...",
    "timestamp": 1742601600,
    "trigger": "revocation_event | heartbeat",
    "tier": "high_security | standard | low_frequency"
  }
}
```

**Co-signature message:**

```json
{
  "type": "https://attestara.ai/protocols/anchoring/1.0/root-cosignature",
  "from": "did:ethr:0x<node_address>",
  "to": ["did:ethr:0x<proposing_node>"],
  "body": {
    "merkleRoot": "0x...",
    "timestamp": 1742601600,
    "signature": "0x..."
  }
}
```

### 5.4 CredentialRegistry Contract Updates

The existing CredentialRegistry contract requires the following updates for threshold production:

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

contract CredentialRegistry {

    // Threshold configuration
    address[] public anchoringNodes;
    uint256 public threshold; // 3
    uint256 public constant MAX_NODES = 10;

    // Current anchored root per tier
    mapping(uint8 => bytes32) public currentRoot;       // tier => root
    mapping(uint8 => uint256) public lastAnchorTimestamp; // tier => timestamp

    // Governance
    mapping(address => bool) public isAnchoringNode;

    // Events
    event RootAnchored(
        bytes32 indexed merkleRoot,
        uint8 tier,
        uint256 timestamp,
        address submitter
    );
    event NodeAdded(address indexed node);
    event NodeRemoved(address indexed node);

    // Submit anchor root with co-signatures
    function submitAnchorRoot(
        bytes32 merkleRoot,
        uint8 tier,
        uint256 anchorTimestamp,
        bytes[] calldata coSignatures,
        address[] calldata coSigners
    ) external {
        require(isAnchoringNode[msg.sender], "Not authorised node");
        require(coSignatures.length >= threshold - 1, "Insufficient signatures");
        require(
            block.timestamp - anchorTimestamp <= _freshnessWindow(tier),
            "Anchor timestamp too old"
        );

        // Verify each co-signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(merkleRoot, tier, anchorTimestamp)
        );
        for (uint i = 0; i < coSigners.length; i++) {
            require(isAnchoringNode[coSigners[i]], "Co-signer not authorised");
            require(
                _verifySignature(messageHash, coSignatures[i], coSigners[i]),
                "Invalid co-signature"
            );
        }

        // Update root
        currentRoot[tier] = merkleRoot;
        lastAnchorTimestamp[tier] = anchorTimestamp;

        emit RootAnchored(merkleRoot, tier, anchorTimestamp, msg.sender);
    }

    // Governance — node addition requires supermajority (4-of-5)
    function proposeNodeAddition(address newNode) external {
        require(isAnchoringNode[msg.sender], "Not authorised");
        require(anchoringNodes.length < MAX_NODES, "Maximum nodes reached");
        // Voting mechanism implementation
    }

    // Freshness window per tier (seconds)
    function _freshnessWindow(uint8 tier) internal pure returns (uint256) {
        if (tier == 0) return 30;   // High Security
        if (tier == 1) return 90;   // Standard
        if (tier == 2) return 300;  // Low Frequency
        revert("Invalid tier");
    }
}
```

> **Key design principle:** The authorised anchoring set is governance-controlled, not hardcoded. Migration from v1 centralised to v2 threshold production is a governance transaction — updating the authorised anchoring set — not a contract upgrade.

### 5.5 Self-Healing and Node Failure

**Failure detection:** Each node monitors the consensus participation of all other nodes. A node is flagged as potentially unavailable after missing 10 consecutive consensus rounds.

**Network continuity:** The network continues operating with 3+ active nodes. Two simultaneous node failures maintain operation. Three simultaneous failures suspend the network.

**Recovery procedure:**

| Unavailability Duration | Action |
|---|---|
| Less than 4 hours | Node rejoins automatically on recovery |
| 4–24 hours | Manual reconnection procedure required |
| More than 24 hours | Governance review initiated — node may be temporarily suspended |

**Suspension during transition:** Threshold adjusts to 2-of-4 during suspension. Maximum suspension period: 30 days. If node is not recovered within 30 days, replacement recruitment begins.

### 5.6 Key Management Requirements

**Key generation ceremony:** Each node operator generates their anchoring key in a documented ceremony:
- Performed on air-gapped hardware
- Key generated directly into HSM — never in plaintext on any connected system
- Ceremony record documents hardware, procedure, and witnesses
- Public key published to Attestara transparency log

**Accepted HSM types:** AWS CloudHSM, Azure Dedicated HSM, Thales Luna, YubiHSM 2 (FIPS 140-2 Level 3 or equivalent)

**Key rotation:** Minimum annually via ERC-1056 delegate rotation. All other operators notified minimum 48 hours before rotation.

### 5.7 Failure Handling

**Status List Endpoint Unavailable:**

| Tier | Behaviour |
|---|---|
| High Security | All CredentialFreshness proof verifications fail immediately. Active sessions suspended. Principals notified. |
| Standard | Active sessions suspended after maximum staleness period. New sessions cannot be initiated. Principals notified. |
| Low Frequency | Active sessions suspended after 600 seconds of unavailability. New sessions cannot be initiated. Principals notified. |

**Session suspension expiry:**

| Tier | Suspension Expiry |
|---|---|
| Standard | Sessions may resume within 4 hours of suspension |
| Low Frequency | Sessions may resume within 8 hours of suspension |

After suspension expiry, sessions are terminated. Both principals are notified and a new session must be initiated. Partial session transcript archived for audit purposes.

**Transaction Submission Failure:** Retry at 10-second intervals with gas price incrementing 10% per retry. Alert after 3 failed attempts. Degraded state after 5 failed attempts.

**Transaction Confirmation Timeout:** If pending more than 300 seconds, cancel and resubmit with current gas pricing.

**DataIntegrityProof Verification Failure:** Previous cached state retained. Three consecutive failures trigger alert and degraded state. Treat as security event requiring manual investigation.

---

## 6. Staged Migration Plan

### 6.1 Migration Stages

| Stage | Description | Duration | Entry Criteria | Exit Criteria |
|---|---|---|---|---|
| Stage 1 — Shadow Mode | Threshold network runs in parallel, computes roots but does not submit on-chain. Outputs compared against centralised service. | 30 days | All five nodes operational and passing health checks | 30 days operation with less than 0.1% root discrepancy rate |
| Stage 2 — Dual Submission | Both centralised and threshold network submit roots on-chain. CredentialRegistry accepts either. | 30 days | Stage 1 exit criteria met | 30 days with zero unresolved discrepancies and threshold network transaction success rate above 99.5% |
| Stage 3 — Threshold Primary | Threshold network is primary. Centralised service runs as fallback only if threshold fails to anchor within 1.5x freshness window. | 30 days | Stage 2 exit criteria met | 30 days with centralised fallback not triggered more than twice |
| Stage 4 — Full Threshold | Centralised service decommissioned. | — | Stage 3 exit criteria met and all active enterprise customers notified and migrated | Centralised service confirmed inactive for 30 days |

### 6.2 Rollback Procedure

| From | To | Trigger | Action |
|---|---|---|---|
| Stage 2 | Stage 1 | Exit criteria not met | Disable threshold on-chain submission, continue shadow mode, investigate |
| Stage 3 | Stage 2 | Exit criteria not met | Re-enable centralised submission as co-primary, investigate |
| Stage 4 | Stage 3 | Critical incident | Re-enable centralised service as fallback, root cause analysis required |

Rollback decisions are made jointly by Littledata and a majority of active node operators.

---

## 7. Legal and Compliance Framework

### 7.1 Node Operator Agreement

Must be executed with each of the four external node operators before Stage 1 begins.

**Agreement covers:**
- Operational SLA commitments and consequences of breach
- Security requirements and audit rights
- Data processing obligations under GDPR
- Liability framework and indemnification
- Intellectual property — node operators acquire no IP rights in the Attestara protocol
- Exit procedure and notice requirements
- Governing law — Gibraltar law recommended

**Estimated cost:** €15,000–€25,000 for drafting and review across four operators

### 7.2 GDPR and Data Processing

Node operators processing session metadata as part of consensus operations are data processors under GDPR. Data Processing Agreements must be executed alongside Node Operator Agreements.

**Key DPA terms:**
- Processing limited to consensus operations only — no secondary use of session metadata
- Retention limited to 5-year audit log minimum for Article 12 compliance
- Sub-processor restrictions — operators cannot delegate consensus operations without approval
- Data subject rights — procedure for deletion requests conflicting with immutable audit log requirements

### 7.3 DORA Compliance for Financial Services Node Operators

Littledata must provide to any DORA-subject node operator:
- Technical architecture documentation suitable for DORA ICT risk assessment
- SLA documentation meeting DORA Article 30 contractual requirements
- Audit rights provisions meeting DORA Article 30(3) requirements
- Incident notification procedures meeting DORA Article 19 requirements

> **Note:** Regulatory notification for material ICT changes is the node operator's responsibility. Littledata provides supporting documentation only.

---

## 8. Operational Infrastructure

### 8.1 Monitoring Dashboard

Centralised dashboard accessible to all node operators and Littledata.

**Per-node metrics:**
- Uptime percentage — rolling 24-hour, 7-day, 30-day windows
- Consensus participation rate
- Average consensus response latency
- Transaction submission success rate
- Current ETH balance on Arbitrum
- Last successful anchor timestamp

**Network-level metrics:**
- Consensus round success rate across all tiers
- Average time from trigger to on-chain confirmation
- Root discrepancy events
- Nodes currently in degraded or suspended state
- Total anchors submitted in current 24-hour period

**Alert conditions:**
- Any node missing more than 5 consecutive consensus rounds
- Network consensus success rate below 99% over any 1-hour window
- Any node ETH balance below 30-day operational minimum
- Root discrepancy detected between nodes
- Network entering degraded state

### 8.2 Transparency Log

Public append-only log at a defined URL containing for each anchor:
- Anchor timestamp
- Merkle root value
- Tier
- Submitting node DID
- Co-signing node DIDs
- Arbitrum transaction hash
- Confirmation block number

### 8.3 Incident Response

| Severity | Definition | Response Time | Communication |
|---|---|---|---|
| P1 | Network unable to anchor — all tiers affected | 15 minutes | All operators, all enterprise customers |
| P2 | One tier unable to anchor | 30 minutes | All operators, affected customers |
| P3 | Single node failure — network operational | 2 hours | All operators |
| P4 | Performance degradation — SLA at risk | 4 hours | Internal |

> **Incident commander:** Littledata nominates the incident commander for all severity levels in v1. Rotating responsibility across node operators introduced in v2.

---

## 9. Financial Model

### 9.1 Anchoring Cost Model

On-chain anchoring costs at current Arbitrum gas prices (~$0.04 per transaction):

| Tier | Heartbeat Interval | Daily Transactions | Daily Cost (USD) | Annual Cost (USD) |
|---|---|---|---|---|
| High Security | 20 seconds | 4,320 | $172.80 | $63,072 |
| Standard | 60 seconds | 1,440 | $57.60 | $21,024 |
| Low Frequency | 200 seconds | 432 | $17.28 | $6,307 |

> **Note:** Costs represent maximum daily spend. Revocation event triggers replace some heartbeat transactions at no additional cost. Actual costs will be lower.

### 9.2 Node Operator Compensation — v1

The threshold network operates without direct financial compensation to external node operators in v1. Value proposition by operator type:

| Node | Value Proposition |
|---|---|
| Node 2 — DIF Member | Protocol credibility and standards influence |
| Node 3 — Pilot Customer | Infrastructure control and DORA compliance |
| Node 4 — Infrastructure Provider | Reference deployment and partnership positioning |
| Node 5 — Academic | Research access and protocol citation |

> **Note:** Token-based compensation model is a Phase 3+ consideration, explicitly out of scope for this document.

### 9.3 Budget Requirements

| Item | Estimated Cost | Timing |
|---|---|---|
| Legal — Node Operator Agreements (4 operators) | €15,000–€25,000 | Month 3–5 |
| Legal — DPA drafting and review | €5,000–€8,000 | Month 4–5 |
| Legal — DORA briefing document | €3,000–€5,000 | Month 5 |
| Technical — CredentialRegistry contract update | Internal resource | Month 4–5 |
| Technical — Consensus protocol implementation | Internal resource | Month 5–6 |
| Technical — Monitoring dashboard | Internal resource | Month 6–7 |
| Key generation ceremonies (4 external operators) | €2,000–€4,000 | Month 8–9 |
| Audit — TAN security review | €20,000–€40,000 | Month 9–10 |
| **Total estimated external cost** | **€45,000–€82,000** | |

---

## 10. Risk Register

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Node operator recruitment fails to find 5 qualified operators | High | Medium | Start recruitment Month 2, maintain longlist of 10+ candidates, define minimum viable network at 4 nodes with 3-of-4 threshold as fallback |
| DORA-subject node operator cannot get regulatory approval | High | Medium | Provide comprehensive regulatory briefing documentation, identify non-DORA alternative for Node 3 slot |
| Node operator key compromise | Critical | Low | HSM mandatory, immediate revocation and replacement procedure, liability framework in Node Operator Agreement |
| Consensus protocol implementation bug | Critical | Low | Dedicated security audit of consensus mechanism before Stage 1, separate from main circuit audit |
| Migration stage rollback required | Medium | Medium | Rollback procedures defined for all stages, centralised service maintained until Stage 4 confirmed |
| Gas price spike makes anchoring economically unviable | Medium | Low | Gas price monitoring, automatic heartbeat interval adjustment if gas price exceeds threshold, emergency governance procedure |
| Legal agreement negotiation extends timeline | Medium | High | Start legal scoping immediately, use standard template with defined negotiation parameters, set maximum 60-day negotiation period per operator |
| Node operator exits network post-deployment | Medium | Medium | 90-day exit notice requirement, replacement recruitment protocol, 2-of-4 threshold during transition |

---

## 11. Timeline

| Month | Activity | Owner | Dependencies |
|---|---|---|---|
| Now — Month 1 | Finalise TAN architecture specification | Littledata Engineering | This document |
| Month 1 | Draft Node Operator criteria document | Littledata | Architecture spec |
| Month 1 | Confirm minimum viable network decision | Littledata | — |
| Month 1 | Confirm v1 compensation model | Littledata | — |
| Month 2 | Identify longlist of 10+ candidate operators | Littledata | Criteria document |
| Month 2 | Brief Gibraltar counsel on legal requirements | Littledata | Criteria document |
| Month 2–3 | DIF working group engagement — identify Node 2 candidate | Littledata | DIF membership active |
| Month 2 | Confirm DIDComm v2 for inter-node communication | Littledata Engineering | Architecture spec |
| Month 2 | Confirm TAN audit scope — combined or separate from circuit audit | Littledata | — |
| Month 3 | Begin Node Operator outreach — Nodes 2, 4, 5 | Littledata | Longlist ready |
| Month 3–4 | Node Operator Agreement drafting | Gibraltar counsel | Legal brief |
| Month 4 | Node 3 candidate identified through Phase 2 pilot recruitment | Littledata | Pilot recruitment |
| Month 4–5 | CredentialRegistry contract update implementation | Littledata Engineering | Architecture spec |
| Month 5–6 | Consensus protocol implementation | Littledata Engineering | Contract update |
| Month 5–6 | Node Operator Agreements executed — all four external operators | Littledata + counsel | Recruitment complete |
| Month 6–7 | Monitoring dashboard implementation | Littledata Engineering | Consensus protocol |
| Month 7–8 | Transparency log implementation | Littledata Engineering | Monitoring dashboard |
| Month 8 | TAN security audit scoped and initiated | Littledata | All implementations |
| Month 8–9 | Key generation ceremonies — all five operators | All operators | Agreements executed |
| Month 9 | Node software deployment and testing — all five operators | All operators | Key ceremonies |
| Month 9–10 | TAN security audit completed | External auditor | — |
| Month 10 | Audit findings remediated | Littledata Engineering | Audit report |
| Month 11 | **Stage 1 — Shadow mode begins** | All operators | Audit clean |
| Month 12 | Stage 1 exit criteria review | Littledata + operators | 30 days shadow |
| Month 12 | **Stage 2 — Dual submission begins** | All operators | Stage 1 exit |
| Month 13 | Stage 2 exit criteria review | Littledata + operators | 30 days dual |
| Month 13 | **Stage 3 — Threshold primary begins** | All operators | Stage 2 exit |
| Month 14 | Stage 3 exit criteria review | Littledata + operators | 30 days threshold primary |
| Month 14–15 | Enterprise customer migration notifications | Littledata | Stage 3 stable |
| Month 15 | **Stage 4 — Full threshold, centralised decommission** | Littledata | All customers migrated |

> **Total timeline: 15 months from this document to full production.**

---

## 12. Open Items and Decisions Required

| # | Item | Decision Required | Owner | Target Date |
|---|---|---|---|---|
| 1 | Minimum viable network | Confirm whether 4-of-5 with 3-of-4 threshold is acceptable fallback if one operator cannot be recruited | Littledata | Month 1 |
| 2 | Node 2 identification | Identify specific DIF working group member as candidate | Littledata | Month 2 |
| 3 | Node 5 identification | Confirm whether Rodriguez Garzon academic connection is viable path to Node 5 | Littledata | Month 2 |
| 4 | Compensation model | Confirm v1 operates without node operator compensation and document value proposition for each operator type | Littledata | Month 1 |
| 5 | Consensus protocol | Confirm DIDComm v2 for inter-node communication vs alternative | Littledata Engineering | Month 2 |
| 6 | Audit scope | Confirm whether TAN security audit is in scope of main circuit audit or separate engagement | Littledata | Month 2 |
| 7 | Governance token | Confirm Phase 3+ consideration and explicitly remove from current scope | Littledata | Month 1 |

---

## 13. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| v0.1 | April 2026 | Littledata Research & Engineering | Initial draft |

**Next review:** Upon completion of DIF working group initial engagement and Node 2 candidate identification.

**Distribution:** Littledata internal team only until Node Operator outreach begins.

---

*This document contains proprietary information belonging to Littledata. It is intended solely for the use of authorised recipients. Unauthorised distribution, reproduction, or disclosure is strictly prohibited.*

*© 2026 Littledata. All rights reserved.*
