"""
Attestara CrewAI Procurement Agent
===================================
Demonstrates the full Attestara protocol lifecycle using CrewAI:
  1. Register agent identity (did:ethr)
  2. Request credential
  3. Open negotiation session
  4. Exchange negotiation turns
  5. Submit on-chain commitment
"""

import os
import json
import hashlib
import time
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from crewai import Agent, Task, Crew

load_dotenv()

RELAY_URL = os.getenv("ATTESTARA_RELAY_URL", "http://localhost:3001")
API_KEY = os.getenv("ATTESTARA_API_KEY", "")
ORG_ID = os.getenv("ATTESTARA_ORG_ID", "")


def api_headers() -> dict:
    """Build authorization headers for the Attestara Relay API."""
    return {
        "Authorization": f"ApiKey {API_KEY}",
        "Content-Type": "application/json",
    }


def log(msg: str) -> None:
    print(f"[Agent] {msg}")


# ---------------------------------------------------------------------------
# Protocol steps (called by CrewAI tasks)
# ---------------------------------------------------------------------------


def register_agent_identity(agent_name: str) -> dict:
    """Step 1: Generate a real did:ethr via the relay's DID provisioning endpoint."""
    log("Registering agent identity...")
    resp = requests.post(
        f"{RELAY_URL}/v1/agents/provision-did",
        headers=api_headers(),
        json={"name": agent_name},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    log(f"DID: {data['did']}")
    return data


def create_agent(did: str, name: str, public_key: str) -> dict:
    """Step 2: Register the agent in the org."""
    log(f"Creating agent '{name}'...")
    resp = requests.post(
        f"{RELAY_URL}/v1/orgs/{ORG_ID}/agents",
        headers=api_headers(),
        json={
            "did": did,
            "name": name,
            "publicKey": public_key,
            "metadata": {"type": "procurement", "framework": "crewai"},
        },
        timeout=30,
    )
    resp.raise_for_status()
    agent = resp.json()
    log(f"Agent ID: {agent['id']}")
    return agent


def issue_credential(agent_id: str) -> dict:
    """Step 3: Issue a W3C Verifiable Credential for the agent's mandate."""
    log("Requesting procurement credential...")
    credential_hash = "0x" + hashlib.sha256(
        f"mandate:{agent_id}:{time.time()}".encode()
    ).hexdigest()
    schema_hash = "0x" + hashlib.sha256(b"procurement.contracts.v1").hexdigest()
    expiry = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()

    resp = requests.post(
        f"{RELAY_URL}/v1/orgs/{ORG_ID}/credentials",
        headers=api_headers(),
        json={
            "agentId": agent_id,
            "credentialHash": credential_hash,
            "schemaHash": schema_hash,
            "credentialData": {
                "domain": "procurement.contracts",
                "maxValue": 500000,
                "currency": "EUR",
            },
            "expiry": expiry,
        },
        timeout=30,
    )
    resp.raise_for_status()
    cred = resp.json()
    log(f"Credential issued: {cred['id']}")
    return cred


def open_session(initiator_agent_id: str, counterparty_agent_id: str, counterparty_org_id: str) -> dict:
    """Step 4: Open a negotiation session."""
    log("Opening negotiation session...")
    resp = requests.post(
        f"{RELAY_URL}/v1/sessions",
        headers=api_headers(),
        json={
            "initiatorAgentId": initiator_agent_id,
            "counterpartyAgentId": counterparty_agent_id,
            "initiatorOrgId": ORG_ID,
            "counterpartyOrgId": counterparty_org_id,
            "sessionType": "cross_org",
            "sessionConfig": {"maxTurns": 10, "domain": "procurement"},
        },
        timeout=30,
    )
    resp.raise_for_status()
    session = resp.json()
    log(f"Session ID: {session['id']}")
    return session


def submit_turn(session_id: str, agent_id: str, terms: dict) -> dict:
    """Step 5: Submit a negotiation turn with terms."""
    log(f"Submitting proposal: {json.dumps(terms)}")
    resp = requests.post(
        f"{RELAY_URL}/v1/sessions/{session_id}/turns",
        headers=api_headers(),
        json={
            "agentId": agent_id,
            "terms": terms,
            "proofType": "Groth16",
            "proof": {"placeholder": True},
            "publicSignals": {},
            "signature": "pending",
        },
        timeout=30,
    )
    resp.raise_for_status()
    turn = resp.json()
    log(f"Turn submitted: sequence {turn.get('sequenceNumber', '?')}")
    return turn


def submit_commitment(session_id: str, parties: list, credential_hashes: list) -> dict:
    """Step 6: Submit the on-chain commitment."""
    log("Submitting commitment...")
    agreement_hash = "0x" + hashlib.sha256(
        f"agreement:{session_id}:{time.time()}".encode()
    ).hexdigest()

    resp = requests.post(
        f"{RELAY_URL}/v1/commitments",
        headers=api_headers(),
        json={
            "sessionId": session_id,
            "agreementHash": agreement_hash,
            "parties": parties,
            "credentialHashes": credential_hashes,
            "proofs": {"MandateBound": {"verified": True}},
            "circuitVersions": ["v1.2.0"],
        },
        timeout=30,
    )
    resp.raise_for_status()
    commitment = resp.json()
    log(f"Commitment ID: {commitment['id']}")
    if commitment.get("txHash"):
        log(f"On-chain tx: {commitment['txHash']}")
    return commitment


# ---------------------------------------------------------------------------
# CrewAI Agent & Workflow
# ---------------------------------------------------------------------------


def build_crew() -> Crew:
    """Build the CrewAI crew with the procurement agent and lifecycle tasks."""

    procurement_agent = Agent(
        role="Procurement Negotiator",
        goal="Complete a full Attestara procurement lifecycle: register, credential, negotiate, commit",
        backstory=(
            "You are an autonomous procurement agent operating under Attestara's "
            "cryptographic trust protocol. You register your identity, obtain credentials, "
            "negotiate terms with counterparties, and submit on-chain commitments."
        ),
        verbose=True,
    )

    # Task definitions -- each wraps a protocol step
    task_register = Task(
        description="Register a new agent identity via the Attestara relay",
        expected_output="Agent DID and public key",
        agent=procurement_agent,
    )

    task_credential = Task(
        description="Issue a procurement credential for the registered agent",
        expected_output="Credential ID",
        agent=procurement_agent,
    )

    task_negotiate = Task(
        description="Open a session and exchange negotiation turns",
        expected_output="Session ID with submitted turns",
        agent=procurement_agent,
    )

    task_commit = Task(
        description="Submit the final on-chain commitment",
        expected_output="Commitment ID and transaction hash",
        agent=procurement_agent,
    )

    return Crew(
        agents=[procurement_agent],
        tasks=[task_register, task_credential, task_negotiate, task_commit],
        verbose=True,
    )


def run_lifecycle():
    """Execute the full Attestara lifecycle programmatically."""
    log("Starting Attestara procurement lifecycle...")

    # Step 1: Register identity
    identity = register_agent_identity("crewai-procurement-agent")

    # Step 2: Create agent in org
    agent = create_agent(identity["did"], "crewai-procurement-agent", identity["publicKey"])

    # Step 3: Issue credential
    credential = issue_credential(agent["id"])

    # Step 4: Open session (using self as counterparty for demo)
    session = open_session(agent["id"], agent["id"], ORG_ID)

    # Step 5: Exchange turns
    submit_turn(session["id"], agent["id"], {
        "value": 400000,
        "currency": "EUR",
        "delivery": "60 days",
        "warranty": "24 months",
    })

    submit_turn(session["id"], agent["id"], {
        "value": 460000,
        "currency": "EUR",
        "delivery": "50 days",
        "warranty": "18 months",
    })

    # Step 6: Commit
    commitment = submit_commitment(
        session["id"],
        parties=[agent["did"]],
        credential_hashes=[credential["credentialHash"]],
    )

    log("Full lifecycle complete.")
    return commitment


if __name__ == "__main__":
    if not API_KEY:
        print("Error: ATTESTARA_API_KEY not set. Copy .env.example to .env and fill in values.")
        exit(1)
    if not ORG_ID:
        print("Error: ATTESTARA_ORG_ID not set.")
        exit(1)

    # Run the direct lifecycle (CrewAI orchestration is available via build_crew())
    run_lifecycle()
