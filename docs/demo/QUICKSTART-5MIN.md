# Attestara 5-Minute Quickstart

This walkthrough gets you from zero to a completed negotiation in under
5 minutes. No database or blockchain needed -- everything runs locally
using in-memory stores and mock provers.

---

## Prerequisites

- Node.js 20+
- pnpm 9+

## Step 1: Install and Build (1 min)

```bash
git clone https://github.com/attestara/attestara.git
cd attestara
pnpm install
pnpm build
```

## Step 2: Initialize Your Agent (30 sec)

```bash
npx attestara init --name my-procurement-agent
```

You should see:

```
> Attestara project initialized!
  Config          ~/.attestara/config.json
  Agent DID       did:ethr:0x...
  Key file        ~/.attestara/keys/agent.json
  Credential      ~/.attestara/credentials/authority.vc.json
  Network         arbitrum-sepolia
```

Verify with:

```bash
npx attestara identity show
```

## Step 3: Issue a Credential (30 sec)

Issue an Authority Credential that authorizes your agent to negotiate
procurement contracts up to EUR 500,000:

```bash
npx attestara credential issue \
  --domain procurement.contracts \
  --max-value 500000 \
  --currency EUR
```

Output:

```
> Credential issued!
  Credential ID   urn:uuid:...
  Domain          procurement.contracts
  Max Value       EUR 500,000
  Expires         2026-05-15 12:00:00
```

List your credentials:

```bash
npx attestara credential list
```

## Step 4: Run the Interactive Demo (2 min)

The built-in demo simulates a full negotiation between two agents:

```bash
npx attestara demo
```

The demo will:

1. Create two mock agents (buyer + supplier)
2. Issue Authority Credentials to both
3. Open a negotiation session
4. Run 3 rounds of proposals with ZK proofs
5. Accept the final terms
6. Anchor a commitment

Watch the output as each step executes with live status indicators.

## Step 5: Explore (30 sec)

After the demo completes, explore what was created:

```bash
# List sessions
npx attestara session list

# List commitments
npx attestara commitment list

# Show credential details
npx attestara credential list --json

# Check your setup
npx attestara doctor
```

---

## What Just Happened?

1. **Identity**: Your agent received a `did:ethr` decentralized identifier
2. **Credential**: A W3C Verifiable Credential was issued defining your agent's
   negotiation authority (domain, max value, currency)
3. **Negotiation**: Two agents exchanged proposals, each backed by Groth16
   ZK proofs that demonstrate mandate compliance without revealing the mandate
4. **Commitment**: The agreed terms were packaged into a commitment record
   ready for on-chain anchoring

---

## Next Steps

- **[15-Minute Deep Dive](DEEP-DIVE-15MIN.md)** -- Connect to the relay API,
  use the SDK programmatically, and explore the proof system
- **[SDK Examples](../../packages/sdk/examples/)** -- Three runnable TypeScript
  scripts demonstrating procurement, credential, and commitment workflows
- **[API Reference](http://localhost:3001/docs)** -- Start the relay and browse
  the interactive Swagger UI
- **[Architecture](../ARCHITECTURE.md)** -- Understand the three-layer protocol
  design
