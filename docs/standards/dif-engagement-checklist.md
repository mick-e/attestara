# DIF Engagement Checklist

**Attestara -- Decentralized Identity Foundation Standards Engagement**

**Version:** 1.0
**Date:** 2026-03-24
**Owner:** Littledata Research & Engineering (mick@littledata.ai)

---

## Phase 1: Join DIF and Establish Presence (Month 0--1)

- [ ] **Join DIF as an organisational member**
  - URL: https://identity.foundation/join
  - Cost: Free for organisations under 1,000 employees (Littledata qualifies)
  - Requirements: Company name, primary contact, domain of interest
  - Deadline: Immediate -- the Trusted AI Agents WG is actively developing specs now

- [ ] **Sign the DIF Operating Addendum**
  - The Operating Addendum governs IP contributions to DIF specifications
  - Required before any technical contributions can be accepted
  - Available during the membership onboarding process
  - Note: Review IP terms against Attestara's licence strategy (Apache 2.0 for DIF submissions, W3C CLA for W3C CCG submissions)

- [ ] **Subscribe to DIF mailing lists**
  - General: https://lists.identity.foundation/
  - Trusted AI Agents WG list (access granted after membership)

- [ ] **Request access to Trusted AI Agents Working Group**
  - Contact the WG chair directly after membership is confirmed
  - State interest area: ZK-based agent authority enforcement, delegation chains, mandate verification
  - Reference the Agentic Authority Use Cases work item specifically
  - Attend the first available WG call to introduce Attestara

- [ ] **Create DIF community profile**
  - GitHub: Ensure github.com/attestara org exists and is linked
  - DIF Slack workspace: Join and introduce yourself in the relevant channels

---

## Phase 2: Present Attestara as Use Case Input (Month 1--2)

- [ ] **Prepare 15-minute presentation deck**
  - See `docs/standards/dif-presentation-outline.md` for detailed outline
  - Focus: Attestara as a concrete use case input to the Agentic Authority Use Cases work item
  - Include: Problem statement, architecture overview, DIDComm v2 bindings, ZK integration, demo plan
  - Format: Slides (PDF or Google Slides), shareable in advance
  - Rehearse to 15 minutes; allow 10 minutes for Q&A

- [ ] **Request a presentation slot at a WG call**
  - Contact WG chair to schedule
  - Typical WG calls are biweekly; request a slot 2--4 weeks in advance
  - Share the deck with the WG mailing list at least 3 business days before the call

- [ ] **Deliver the presentation**
  - Record any feedback, objections, and follow-up requests
  - Identify potential co-editors or collaborators from the discussion
  - Follow up with individual attendees who expressed interest

---

## Phase 3: Submit Protocol Bindings as Spec Input (Month 1--3)

- [ ] **Submit DIF DIDComm v2 protocol bindings (Whitepaper Section 5.4) as spec input**
  - Content: Session invitation message type (`attestara.ai/protocols/session/1.0/invite`), negotiation turn message type (`attestara.ai/protocols/negotiation/1.0/turn`), credential issuance via WACI-DIDComm Issue Credential v3
  - Format: Markdown or DIF specification template
  - Submit to: Trusted AI Agents WG repository or contribution channel

- [ ] **Submit DIF Presentation Exchange v2 binding (Whitepaper Section 5.5) as spec input**
  - Content: `attestara-turn-verification` presentation definition for agent authority verification
  - Demonstrates composability with existing PE v2 wallet infrastructure
  - Includes input descriptors for `AgentAuthorityCredential` and `AttestaraTurnProofBundle`

- [ ] **Submit DIF Credential Manifest (Whitepaper Section 5.6) as spec input**
  - Content: `attestara-authority-credential-manifest` defining issuance requirements
  - Demonstrates composability with DIF-compatible issuance infrastructure

- [ ] **Respond to WG feedback on submitted bindings**
  - Track issues/comments in the WG repository
  - Iterate on bindings based on WG member input
  - Document any design decisions or trade-offs

---

## Phase 4: Reference Implementation and DIF Labs (Month 3--4)

- [ ] **Offer the Attestara SDK as a reference implementation candidate**
  - Target: Phase 1 MVP of the SDK (TypeScript, Veramo-based)
  - Scope: DIDComm v2 session protocol, credential issuance, ZK proof generation/verification
  - Repository: github.com/attestara (public, Apache 2.0 licence)
  - Ensure the SDK demonstrates all three submitted protocol bindings

- [ ] **Apply for the DIF Labs programme (Month 4)**
  - URL: https://identity.foundation/labs/
  - DIF Labs provides a fast incubation track for emerging specifications
  - Application should reference: WG presentation, submitted protocol bindings, reference implementation
  - Benefits: Increased visibility, structured feedback, path to DIF specification status

- [ ] **Engage potential co-editors from WG participants**
  - Identify 1--2 individuals from other organisations who have engaged with the contributions
  - A co-editor from a second organisation is required for the subsequent W3C CCG Work Item (Month 8)
  - Formalise co-editor commitment before the W3C CCG submission

---

## Phase 5: W3C CCG Work Item Submission (Month 8)

- [ ] **Publish Attestara extension context at stable URL**
  - URL: `https://attestara.ai/contexts/v1`
  - Must resolve and serve valid JSON-LD before submission
  - See `docs/standards/attestara-context-v1.jsonld` for the draft context file
  - Also publish vocabulary document at `https://attestara.ai/vocab/v1`

- [ ] **Submit W3C CCG `AgentAuthorityCredential` Work Item**
  - See `docs/standards/w3c-ccg-work-item-draft.md` for the full draft proposal
  - URL: https://w3c-ccg.github.io/
  - Mailing list: public-credentials@w3.org
  - Requirements:
    - Primary editor: Littledata Research & Engineering
    - Co-editor from a second organisation (secured from DIF WG engagement)
    - W3C Community Contributor License Agreement signed
    - Target category: Community Report
  - Submit via CCG Work Item proposal process on the public-credentials mailing list

- [ ] **Publish first draft of `AgentAuthorityCredential` Community Report (Month 10)**
  - Based on DIF WG feedback and pilot customer input
  - Circulate to CCG mailing list for review

---

## Phase 6: Ongoing Engagement (Month 8+)

- [ ] **Propose ZK proof binding pattern for VCs as second W3C CCG Work Item (Month 12)**
  - Addresses the standards gap in embedding ZK commitments in Verifiable Credentials
  - Builds on the ZK PoC results and DIF community feedback

- [ ] **Submit `did:attestara` DID method specification (Month 16)**
  - Agent-specific DID resolution with mandate metadata pointers
  - Complements did:ethr for deployments requiring richer DID document semantics
  - Submit for CCG registry listing

- [ ] **Seek W3C CCG / JTC 21 WG3 liaison status (Month 18)**
  - Enables cross-pollination between identity standards and EU AI Act harmonised standards

---

## Key Contacts and Resources

| Resource | URL |
|----------|-----|
| DIF membership | https://identity.foundation/join |
| DIF GitHub | https://github.com/decentralized-identity |
| DIF Trusted AI Agents WG | https://identity.foundation/working-groups/ai-agents.html |
| DIF Labs | https://identity.foundation/labs/ |
| W3C CCG | https://w3c-ccg.github.io/ |
| W3C CCG mailing list | public-credentials@w3.org |
| W3C CLA | https://www.w3.org/community/about/agreements/cla/ |
| VC Data Model 2.0 | https://www.w3.org/TR/vc-data-model-2.0/ |
| DIDComm v2 specification | https://identity.foundation/didcomm-messaging/spec/ |
| Presentation Exchange v2 | https://identity.foundation/presentation-exchange/spec/v2.0.0/ |
| Credential Manifest | https://identity.foundation/credential-manifest/ |
| Attestara whitepaper | Attestara_Whitepaper_v5.md (Sections 5.4, 5.5, 5.6, 12) |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-24 | DIF first, W3C CCG second | DIF WG is actively building what Attestara implements; free membership; builds community for CCG submission |
| 2026-03-24 | Target DIF Labs at Month 4 | Fast incubation track; requires WG presentation and protocol binding submissions first |
| 2026-03-24 | W3C CCG Work Item at Month 8 | Needs co-editor from second organisation; DIF engagement secures this |

---

*Attestara DIF Engagement Checklist v1.0*
