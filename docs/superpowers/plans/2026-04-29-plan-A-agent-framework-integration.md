# Plan A — Agent Framework Integration (CrewAI + LangGraph)

> **Strategic priority:** #1 from `docs/attestara-next.txt`. Convert Attestara from "a thing you could use" to "a thing you just import." Wins developer mindshare ahead of ERC-8004/x402 + Fetch.ai.
>
> **Goal:** Ship `@attestara/crewai-plugin` (Python) and `@attestara/langgraph-plugin` (Python) as agent tools. 10-minute quickstart: agent gets DID → issues self mandate credential → negotiates with another agent → settles commitment on Arbitrum Sepolia.
>
> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Constraints:**
- Each phase ends with `pnpm test` green (TS) + `pytest` green (Python plugins) + plugin example runs end-to-end.
- No regressions in existing TS test suites.
- Plugins are Python because CrewAI and LangGraph are Python ecosystems. They wrap the existing TS SDK via a thin HTTP relay client (no Python rewrite of SDK internals).
- ISO dates YYYY-MM-DD everywhere.

---

## Architecture Decision

**Plugins call the relay HTTP API (server-side SDK), not embed Veramo/snarkjs in Python.** Justification:
- ZK proof generation requires Node + snarkjs WASM bindings — porting to Python loses ground.
- The relay already exposes a stable REST API with OpenAPI types (Task A10).
- Security: keystore stays server-side; agents only hold short-lived JWTs.

**Two Python packages, one shared `attestara-core` Python client:**

```
plugins/
├── attestara-core-py/          # Shared HTTP client, auth, retry, types
│   └── attestara_core/
│       ├── __init__.py
│       ├── client.py            # AttestaraClient (auth, agents, credentials, sessions, commitments)
│       ├── models.py            # Pydantic models matching OpenAPI schema
│       ├── exceptions.py
│       └── proof.py             # ZK proof request/poll wrapper
├── attestara-crewai/            # CrewAI tool wrappers
│   └── attestara_crewai/
│       ├── __init__.py
│       ├── tools.py             # CrewAI Tool subclasses
│       ├── agent_factory.py     # AttestaraAgent factory
│       └── examples/
│           └── procurement_negotiation.py
└── attestara-langgraph/         # LangGraph node wrappers
    └── attestara_langgraph/
        ├── __init__.py
        ├── nodes.py             # LangGraph node functions
        ├── state.py             # AttestaraState TypedDict
        └── examples/
            └── treasury_swap.py
```

Published to PyPI as `attestara`, `attestara-crewai`, `attestara-langgraph`.

---

## Phase Layout

```
Phase A1: Core Python client      (5 days)  ── foundation
Phase A2: CrewAI plugin            (3 days)  ┐ parallel
Phase A3: LangGraph plugin         (3 days)  ┘
Phase A4: Quickstart + docs        (2 days)
Phase A5: PyPI release + CI        (2 days)
Phase A6: Reference demos          (3 days)
```

**Total: ~18 working days, single engineer. Parallelizable to ~12 days with 2 engineers.**

---

## Phase A1 — Core Python Client (`attestara-core-py`)

### Task A1.1: Scaffold Python package

**Files:**
- Create: `plugins/attestara-core-py/pyproject.toml` (uv or hatch as build backend)
- Create: `plugins/attestara-core-py/README.md`
- Create: `plugins/attestara-core-py/.python-version` (3.10)
- Create: `plugins/attestara-core-py/attestara_core/__init__.py`

- [ ] **Step 1:** Write `pyproject.toml` with deps: `httpx>=0.27`, `pydantic>=2.6`, `tenacity>=8.2`, `eth-account>=0.13`. Dev deps: `pytest`, `pytest-asyncio`, `pytest-httpx`, `respx`, `mypy`, `ruff`.
- [ ] **Step 2:** Set Python ≥3.10, MIT license, PEP 621 metadata, `attestara` as the package name (resolves to `attestara_core` on disk per src layout).
- [ ] **Step 3:** Add `tool.ruff` (line-length 100, select E/F/I/N/B/UP), `tool.mypy` (strict, disallow_untyped_defs), `tool.pytest.ini_options` (asyncio_mode=auto).
- [ ] **Step 4:** Commit — `feat(plugins): scaffold attestara-core-py package`

### Task A1.2: Generate Pydantic models from OpenAPI

**Files:**
- Create: `plugins/attestara-core-py/scripts/generate_models.sh`
- Create: `plugins/attestara-core-py/attestara_core/models.py` (generated)

- [ ] **Step 1:** Use `datamodel-code-generator` to generate Pydantic v2 models from `packages/relay/openapi.json`.
- [ ] **Step 2:** Script produces `models.py` with all request/response types.
- [ ] **Step 3:** Commit script + initial generated file. Add CI step (Phase A5) to verify regeneration is clean.
- [ ] **Step 4:** Commit — `feat(core): generate Pydantic models from relay OpenAPI`

### Task A1.3: HTTP client with auth

**Files:**
- Create: `plugins/attestara-core-py/attestara_core/client.py`
- Create: `plugins/attestara-core-py/attestara_core/exceptions.py`
- Create: `plugins/attestara-core-py/tests/test_client.py`

- [ ] **Step 1:** `AttestaraClient(base_url, api_key)` constructor. Stores `httpx.AsyncClient` with default headers (`Authorization: Bearer <key>`, `User-Agent: attestara-core-py/<version>`).
- [ ] **Step 2:** Methods (one per relay route, async):
  - `agents.create(name, did_method='ethr') -> Agent`
  - `agents.list(org_id=None) -> list[Agent]`
  - `agents.get(agent_id) -> Agent`
  - `credentials.issue(agent_id, mandate, max_value, valid_until) -> Credential`
  - `credentials.list(agent_id=None) -> list[Credential]`
  - `credentials.revoke(credential_id) -> None`
  - `sessions.create(counterparty_did, terms) -> Session`
  - `sessions.propose_turn(session_id, value, conditions, proof) -> Turn`
  - `sessions.accept(session_id, invite_token) -> Session`
  - `commitments.create(session_id) -> Commitment`
  - `commitments.verify(commitment_id) -> VerificationResult`
- [ ] **Step 3:** Error handling — map 4xx/5xx to typed exceptions: `AuthError`, `NotFound`, `RateLimited`, `ServerError`. Tenacity retry on 5xx (3 attempts, exponential backoff).
- [ ] **Step 4:** Tests with `respx` mocking each endpoint. Cover happy path + each error class.
- [ ] **Step 5:** Commit — `feat(core): AttestaraClient with auth, retry, typed exceptions`

### Task A1.4: ZK proof generation wrapper

**Files:**
- Create: `plugins/attestara-core-py/attestara_core/proof.py`
- Create: `plugins/attestara-core-py/tests/test_proof.py`

- [ ] **Step 1:** `ProofClient(prover_url, secret)`. Methods:
  - `mandate_bound(credential_id, value, max_value) -> Proof` — calls prover `POST /v1/prove/mandate-bound`, polls for completion if async.
  - `parameter_range(value, min, max) -> Proof`
  - `credential_freshness(credential_id, current_time) -> Proof`
  - `identity_binding(agent_did, signature) -> Proof`
- [ ] **Step 2:** `Proof` is a Pydantic model wrapping `proof: dict, public_signals: list[str], circuit: str`.
- [ ] **Step 3:** Helper `verify_proof_locally(proof) -> bool` that POSTs to relay's `/v1/proofs/verify` (no Python snarkjs).
- [ ] **Step 4:** Tests with `respx` covering all 4 circuits.
- [ ] **Step 5:** Commit — `feat(core): ZK proof client for all 4 circuits`

### Task A1.5: Identity helpers

**Files:**
- Create: `plugins/attestara-core-py/attestara_core/identity.py`

- [ ] **Step 1:** `generate_did_ethr() -> tuple[str, str]` — returns `(did, private_key_hex)`. Uses `eth_account.Account.create()` and formats DID as `did:ethr:<chainId>:<address>`.
- [ ] **Step 2:** `sign_message(message, private_key) -> str` — for SIWE wallet auth flow if used.
- [ ] **Step 3:** Tests covering DID format and signature determinism.
- [ ] **Step 4:** Commit — `feat(core): did:ethr generation and message signing`

### Task A1.6: Integration test against running relay

**Files:**
- Create: `plugins/attestara-core-py/tests/integration/test_full_flow.py`
- Modify: `plugins/attestara-core-py/pyproject.toml` (add integration test marker)

- [ ] **Step 1:** Test fixture starts relay + prover via `docker-compose.test.yml` (already exists at attestara root) and seeds a test org + API key.
- [ ] **Step 2:** Test runs full flow: register agent → issue credential → create session → propose turn with proof → accept → commit → verify on-chain.
- [ ] **Step 3:** Skip in CI unless `ATTESTARA_INTEGRATION=1` env var is set.
- [ ] **Step 4:** Commit — `test(core): end-to-end integration test against live relay`

---

## Phase A2 — CrewAI Plugin (`attestara-crewai`)

### Task A2.1: Scaffold + CrewAI Tool subclasses

**Files:**
- Create: `plugins/attestara-crewai/pyproject.toml` (depends on `attestara` + `crewai>=0.80`)
- Create: `plugins/attestara-crewai/attestara_crewai/__init__.py`
- Create: `plugins/attestara-crewai/attestara_crewai/tools.py`

- [ ] **Step 1:** Define tools as CrewAI `BaseTool` subclasses:
  - `RegisterAgentTool` — args: `{name, role}`, returns `{did, agent_id}`
  - `IssueCredentialTool` — args: `{agent_id, domain, max_value, valid_days}`, returns `{credential_id, ipfs_cid}`
  - `OpenSessionTool` — args: `{counterparty_did, initial_terms}`, returns `{session_id, invite_token}`
  - `ProposeTurnTool` — args: `{session_id, value, justification}`, returns `{turn_id, proof_hash}`
  - `AcceptOfferTool` — args: `{session_id}`, returns `{commitment_id, tx_hash, arbiscan_url}`
  - `VerifyCommitmentTool` — args: `{commitment_id}`, returns `{valid, on_chain_status}`
- [ ] **Step 2:** Each tool wraps an `AttestaraClient` instance, handles async-to-sync bridging (CrewAI is sync).
- [ ] **Step 3:** Tool descriptions are LLM-readable (CrewAI uses these as the tool prompt).
- [ ] **Step 4:** Commit — `feat(crewai): six CrewAI tools wrapping Attestara protocol`

### Task A2.2: Agent factory

**Files:**
- Create: `plugins/attestara-crewai/attestara_crewai/agent_factory.py`

- [ ] **Step 1:** `create_attestara_agent(role, goal, backstory, attestara_client, **kwargs) -> Agent`. Returns a CrewAI `Agent` pre-loaded with all 6 tools and a system prompt that explains the protocol semantics.
- [ ] **Step 2:** Helper `create_negotiating_crew(buyer_agent, seller_agent, scenario)` that returns a Crew configured with appropriate tasks.
- [ ] **Step 3:** Commit — `feat(crewai): agent factory with pre-configured Attestara tools`

### Task A2.3: Procurement negotiation example

**Files:**
- Create: `plugins/attestara-crewai/examples/procurement_negotiation.py`
- Create: `plugins/attestara-crewai/examples/.env.example`
- Create: `plugins/attestara-crewai/examples/README.md`

- [ ] **Step 1:** Two agents — Buyer (has $500k procurement mandate) and Seller (offers cloud compute). They negotiate over price, with each turn proving they're acting within their respective mandates via ZK proofs.
- [ ] **Step 2:** Example runs against Arbitrum Sepolia testnet, prints the on-chain commitment txHash + Arbiscan URL.
- [ ] **Step 3:** README has 5-minute walkthrough with expected output.
- [ ] **Step 4:** Smoke test: `pytest examples/procurement_negotiation.py::test_runs` (uses mocked LLM).
- [ ] **Step 5:** Commit — `docs(crewai): procurement negotiation example with mandate-bound proofs`

### Task A2.4: Tests

**Files:**
- Create: `plugins/attestara-crewai/tests/test_tools.py`
- Create: `plugins/attestara-crewai/tests/test_agent_factory.py`

- [ ] **Step 1:** Mock `AttestaraClient`; assert each tool's `_run()` invokes the right client method with the right args.
- [ ] **Step 2:** Agent factory returns CrewAI Agent with expected tools attached.
- [ ] **Step 3:** Commit — `test(crewai): unit coverage for tools and agent factory`

---

## Phase A3 — LangGraph Plugin (`attestara-langgraph`)

### Task A3.1: Scaffold + node functions

**Files:**
- Create: `plugins/attestara-langgraph/pyproject.toml` (depends on `attestara` + `langgraph>=0.2`)
- Create: `plugins/attestara-langgraph/attestara_langgraph/state.py`
- Create: `plugins/attestara-langgraph/attestara_langgraph/nodes.py`

- [ ] **Step 1:** `AttestaraState` TypedDict: `agent_id, did, credentials, active_session, last_proof, commitment_id, errors`.
- [ ] **Step 2:** Node functions (each takes state, returns updated state):
  - `register_agent_node(state, *, name) -> state`
  - `issue_credential_node(state, *, mandate) -> state`
  - `open_session_node(state, *, counterparty) -> state`
  - `propose_turn_node(state, *, value) -> state`
  - `verify_proof_node(state) -> state`
  - `commit_node(state) -> state`
- [ ] **Step 3:** Commit — `feat(langgraph): typed state + 6 protocol node functions`

### Task A3.2: Pre-built graph

**Files:**
- Create: `plugins/attestara-langgraph/attestara_langgraph/graphs.py`

- [ ] **Step 1:** `build_negotiation_graph(client) -> CompiledGraph` — pre-wired graph with: register → issue → open → loop[propose ↔ verify] → commit. Conditional edges based on agreement reached.
- [ ] **Step 2:** Graph exposes a checkpoint API (LangGraph's persistence layer) so multi-turn negotiations can pause/resume.
- [ ] **Step 3:** Commit — `feat(langgraph): pre-built negotiation graph with checkpoint support`

### Task A3.3: Treasury swap example

**Files:**
- Create: `plugins/attestara-langgraph/examples/treasury_swap.py`

- [ ] **Step 1:** DAO treasury bot agent swaps tokens with another DAO's bot. Each side proves it's within the treasury manager's mandate (max swap value, allowed token list).
- [ ] **Step 2:** Uses LangGraph's streaming output so each negotiation turn appears live in the terminal.
- [ ] **Step 3:** Commit — `docs(langgraph): treasury swap example with mandate-bounded DAO bots`

### Task A3.4: Tests

**Files:**
- Create: `plugins/attestara-langgraph/tests/test_nodes.py`
- Create: `plugins/attestara-langgraph/tests/test_graphs.py`

- [ ] **Step 1:** Each node tested with mocked `AttestaraClient`.
- [ ] **Step 2:** Graph executes end-to-end with mocks; assert final state has `commitment_id`.
- [ ] **Step 3:** Commit — `test(langgraph): node and graph coverage`

---

## Phase A4 — Quickstart + Docs

### Task A4.1: 10-minute quickstart

**Files:**
- Create: `docs/quickstart/AGENT-FRAMEWORK-QUICKSTART.md`

- [ ] **Step 1:** Step-by-step (with timed sections):
  1. Install (1 min): `pip install attestara attestara-crewai`
  2. Get API key (2 min): signup on portal, create org, mint API key
  3. First agent (2 min): paste 20-line script that registers an agent
  4. Issue credential (1 min)
  5. Open session against the demo counterparty (2 min)
  6. Negotiate + commit (2 min)
- [ ] **Step 2:** End state: user sees their agent's commitment on Arbiscan Sepolia.
- [ ] **Step 3:** Commit — `docs: 10-minute agent framework quickstart`

### Task A4.2: Per-plugin READMEs

**Files:**
- Modify: `plugins/attestara-core-py/README.md`
- Modify: `plugins/attestara-crewai/README.md`
- Modify: `plugins/attestara-langgraph/README.md`

- [ ] **Step 1:** Each README: install, minimal example, link to API docs, troubleshooting.
- [ ] **Step 2:** Cross-link between the three.
- [ ] **Step 3:** Commit — `docs(plugins): comprehensive READMEs across the three Python packages`

### Task A4.3: Add to portal /docs site

**Files:**
- Modify: `packages/portal/app/(public)/docs/page.tsx`
- Create: `packages/portal/app/(public)/docs/agent-frameworks/page.tsx`

- [ ] **Step 1:** New section "Agent Framework Integrations" with tabs for CrewAI / LangGraph.
- [ ] **Step 2:** Embedded code samples, expected output, link to PyPI.
- [ ] **Step 3:** Commit — `feat(portal): agent framework integration docs in /docs`

---

## Phase A5 — PyPI Release + CI

### Task A5.1: GitHub Actions for Python plugins

**Files:**
- Create: `.github/workflows/python-plugins.yml`

- [ ] **Step 1:** On push/PR, for each Python package:
  - `ruff check` + `ruff format --check`
  - `mypy --strict`
  - `pytest -m "not integration"`
- [ ] **Step 2:** Matrix: Python 3.10, 3.11, 3.12.
- [ ] **Step 3:** Commit — `ci: lint/typecheck/test for Python plugins`

### Task A5.2: PyPI publish workflow

**Files:**
- Create: `.github/workflows/python-release.yml`
- Create: `plugins/*/CHANGELOG.md`

- [ ] **Step 1:** Trigger on tag `py-v*`. Builds wheels via `python -m build`, publishes to PyPI via `pypa/gh-action-pypi-publish` with trusted publisher (OIDC, no token).
- [ ] **Step 2:** Use Test PyPI for first release; promote to PyPI after smoke test.
- [ ] **Step 3:** Commit — `ci: PyPI release workflow with OIDC trusted publisher`

### Task A5.3: First release tag

- [ ] **Step 1:** Tag `py-v0.1.0` after Phase A4 lands.
- [ ] **Step 2:** Verify install works: `pip install attestara==0.1.0 attestara-crewai==0.1.0 attestara-langgraph==0.1.0`.
- [ ] **Step 3:** Run quickstart end-to-end on a clean machine to confirm.

---

## Phase A6 — Reference Demos

### Task A6.1: Live demo video / asciinema recording

**Files:**
- Create: `docs/demo/agent-framework-recording.md` with embedded asciinema cast

- [ ] **Step 1:** Record a 10-min terminal session running the CrewAI procurement example end-to-end.
- [ ] **Step 2:** Annotate key moments (DID generation, ZK proof creation, on-chain commitment).
- [ ] **Step 3:** Embed in portal landing page hero section.
- [ ] **Step 4:** Commit — `docs: agent framework live demo recording`

### Task A6.2: Hosted demo agent

**Files:**
- Create: `infrastructure/demo-agent/Dockerfile`
- Create: `infrastructure/demo-agent/agent.py`

- [ ] **Step 1:** Public counterparty agent hosted at `demo.attestara.ai` that anyone running the quickstart can negotiate with. It always plays the seller role, accepts any reasonable offer.
- [ ] **Step 2:** Rate-limited (1 negotiation per IP per minute).
- [ ] **Step 3:** Deploy to Render.
- [ ] **Step 4:** Commit — `feat(demo): hosted counterparty agent for quickstart users`

### Task A6.3: Comparison table — Attestara vs ERC-8004 vs Fetch.ai

**Files:**
- Create: `docs/comparisons/AGENT-TRUST-PROTOCOLS.md`

- [ ] **Step 1:** Honest feature/maturity comparison: ZK privacy, audit trail, on-chain settlement, framework integrations, mainnet readiness.
- [ ] **Step 2:** Highlight where Attestara genuinely wins (selective disclosure via ZK) and where competitors lead (mainnet maturity).
- [ ] **Step 3:** Commit — `docs: protocol comparison vs ERC-8004 and Fetch.ai`

---

## Final Task: Update memory + announce

- [ ] **Step 1:** Update `C:\Users\mpesb\.claude\projects\C--claude\memory\project_attestara.md` with Plan A completion: PyPI packages, framework support matrix, hosted demo URL.
- [ ] **Step 2:** Tweet thread / Discord announcement (template in `docs/launch/agent-framework-launch.md`).
- [ ] **Step 3:** Submit example PRs to CrewAI and LangGraph "examples" repos showcasing Attestara integration.

---

## Success Criteria

- [ ] `pip install attestara attestara-crewai` — works on fresh Python 3.10/3.11/3.12 environment
- [ ] CrewAI procurement example runs end-to-end in <10 minutes (LLM API + Attestara API keys ready)
- [ ] LangGraph treasury swap example runs end-to-end in <10 minutes
- [ ] Hosted demo counterparty handles ≥10 concurrent negotiations
- [ ] Portal /docs has the "Agent Frameworks" section live
- [ ] Both PyPI packages appear in CrewAI / LangGraph community examples
- [ ] First 5 external users complete the quickstart (measure via API key telemetry)

---

## Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| CrewAI/LangGraph APIs change rapidly | Pin to current minor; CI alerts on new releases; keep plugins thin |
| Async/sync impedance with CrewAI (sync) | Use `asyncio.run()` per tool call; document the cost; offer batch tool variant |
| Python typing drift from OpenAPI changes | CI step regenerates models and fails on diff |
| Demo agent abuse | Rate limits + per-IP quotas + read-only credential scope |
| LLM hallucinates tool invocations | Tool input validation via Pydantic; tools return structured errors |

---

## Execution Order Summary

1. **Phase A1** sequential (each task depends on prior).
2. **Phases A2 + A3** parallel after A1 completes.
3. **Phase A4** after A2 + A3.
4. **Phase A5** after A4.
5. **Phase A6** after A5.

Each task ends with:
```
ruff check && mypy --strict && pytest -m "not integration"
```
All green before commit.
