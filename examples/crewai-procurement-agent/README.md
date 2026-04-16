# CrewAI Procurement Agent -- Attestara Reference Example

A reference implementation of an AI procurement agent built with [CrewAI](https://www.crewai.com/) that demonstrates the full Attestara protocol lifecycle:

1. **Register** an agent identity (`did:ethr`)
2. **Request** a W3C Verifiable Credential defining the agent's mandate
3. **Open** a negotiation session with a counterparty
4. **Exchange** negotiation turns with ZK-proven authority
5. **Submit** an on-chain commitment when terms are agreed

## Prerequisites

- Python 3.11+
- An Attestara Relay instance running at `http://localhost:3001` (see root README)
- A valid JWT token or API key for your org

## Setup

```bash
cd examples/crewai-procurement-agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .

# Copy and fill in environment variables
cp .env.example .env
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ATTESTARA_RELAY_URL` | Relay API base URL (default: `http://localhost:3001`) |
| `ATTESTARA_API_KEY` | API key with `agents:write`, `sessions:write`, `credentials:write` scopes |
| `ATTESTARA_ORG_ID` | Your organization ID |
| `OPENAI_API_KEY` | OpenAI API key for CrewAI LLM calls |

## Running

```bash
python agent.py
```

## Expected Output

```
[Agent] Registering agent identity...
[Agent] DID: did:ethr:arb-sepolia:0x1234...abcd
[Agent] Requesting procurement credential...
[Agent] Credential issued: cred_01HZN...
[Agent] Opening negotiation session...
[Agent] Session ID: sess_01HZN...
[Agent] Submitting proposal: value=400000, delivery=60d
[Agent] Counterparty responded: value=520000, delivery=45d
[Agent] Submitting counter-proposal: value=460000, delivery=50d
[Agent] Terms agreed. Submitting commitment...
[Agent] Commitment ID: cmt_01HZN...
[Agent] On-chain tx: 0xabcd...ef01
[Agent] Full lifecycle complete.
```

## Architecture

The agent uses CrewAI's task-based workflow to orchestrate the Attestara protocol steps. Each step is a CrewAI task that calls the Attestara Relay API via HTTP.

```
CrewAI Agent
  |-- Task: Register Identity (POST /v1/agents/provision-did)
  |-- Task: Create Agent (POST /v1/orgs/:orgId/agents)
  |-- Task: Issue Credential (POST /v1/orgs/:orgId/credentials)
  |-- Task: Open Session (POST /v1/sessions)
  |-- Task: Negotiate (POST /v1/sessions/:id/turns)
  |-- Task: Commit (POST /v1/commitments)
```
