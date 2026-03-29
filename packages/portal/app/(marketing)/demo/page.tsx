"use client";

import { useState } from "react";
import Link from "next/link";

const steps = [
  {
    title: "Agent DID Registration",
    description:
      "An AI procurement agent registers its decentralised identity (DID) on Arbitrum. The agent's public key is anchored on-chain via AgentRegistry.sol, establishing a cryptographic root of trust.",
    output: `$ attestara identity create --name procurement-bot-eu

✓ Generating secp256k1 key pair...
✓ Resolving DID method: did:ethr
✓ Publishing DID document to Arbitrum Sepolia...

Agent DID:   did:ethr:arb-sepolia:0x04a8f3...c2d1
Key ID:      did:ethr:arb-sepolia:0x04a8f3...c2d1#keys-1
Registry TX: 0x7fa3c...b891 (block 12,847,392)

✓ Agent identity created and anchored on-chain.`,
  },
  {
    title: "Credential Issuance",
    description:
      "An authorised issuer grants the agent a W3C Verifiable Credential defining its mandate: it may negotiate procurement contracts in the EU region up to a maximum value of €500,000.",
    output: `$ attestara credential issue \\
    --subject did:ethr:arb-sepolia:0x04a8f3...c2d1 \\
    --domain procurement.contracts \\
    --region EU \\
    --max-value 500000 \\
    --currency EUR

✓ Building VC 2.0 credential document...
✓ Signing with issuer key (ES256K)...
✓ Anchoring credential hash on CredentialRegistry.sol...

Credential ID:  urn:uuid:3f9a2c1d-8b7e-4f3a-9d2c-1b8e7f3a9d2c
Issuer DID:     did:ethr:arb-sepolia:0x1a2b3c...f4e5
Subject DID:    did:ethr:arb-sepolia:0x04a8f3...c2d1
Expires:        2026-12-31T23:59:59Z
Registry TX:    0x3b8d1...4f72 (block 12,847,401)

✓ Verifiable Credential issued and on-chain hash recorded.`,
  },
  {
    title: "ZK Proof Generation",
    description:
      "Before negotiating, the agent generates a Groth16 zero-knowledge proof using the MandateBound circuit. The proof cryptographically asserts that the agent has authority to negotiate within a given value range — without revealing the actual mandate ceiling to the counterparty.",
    output: `$ attestara session prove \\
    --credential urn:uuid:3f9a2c1d... \\
    --circuit MandateBound \\
    --public-input max_value:450000

⟳  Compiling circuit witness...
⟳  Running Groth16 prover (snarkjs)...
   Constraints:  12,847
   Proving time: 312ms

✓ Proof generated.

Proof (Groth16):
  pi_a: ["0x1a2b3c...", "0x4d5e6f..."]
  pi_b: [["0x7g8h9i...", "0xjklmno..."], ...]
  pi_c: ["0xpqrstu...", "0xvwxyz1..."]

Public signals:
  credential_hash:  0x9f3a2c...
  max_value_bound:  450000  ← proven WITHOUT revealing 500000
  not_expired:      1

✓ Proof size: 256 bytes. Verifiable by any party on-chain.`,
  },
  {
    title: "Negotiation Round",
    description:
      "The procurement agent opens a negotiation session with a sales agent from another organisation. Both agents exchange ZK-proof-backed proposals. The relay service coordinates multi-turn negotiation and records each turn.",
    output: `$ attestara negotiate propose \\
    --session sess_01HZN5A1... \\
    --value 420000 \\
    --currency EUR \\
    --terms '{"delivery":"30d","warranty":"12m"}'

→  Submitting proposal (turn 1/∞)...
✓  Proposal accepted by relay.

← Counterparty response (turn 2):
   Proposed value: €435,000
   Terms: delivery=21d, warranty=18m
   ZK proof:       ✓ VALID (ParameterRange circuit)

→  Counter-proposal (turn 3):
   Proposed value: €430,000
   Terms: delivery=25d, warranty=18m

← Counterparty response (turn 4):
   Status: ACCEPTED
   Final value: €430,000

✓ Negotiation complete. 4 turns. Agreement reached.`,
  },
  {
    title: "Commitment On-Chain",
    description:
      "With both agents in agreement, the session terms are committed to CommitmentContract.sol on Arbitrum. Both agent DIDs co-sign the commitment hash. The record is immutable, auditable, and enforceable.",
    output: `$ attestara commitment create \\
    --session sess_01HZN5A1... \\
    --sign

✓ Building commitment record...
   Session:        sess_01HZN5A1B2C3D4E5F6G7H8I9J0
   Agent A DID:    did:ethr:arb-sepolia:0x04a8f3...
   Agent B DID:    did:ethr:arb-sepolia:0x9e1d7b...
   Value:          €430,000
   Currency:       EUR
   Terms hash:     0xab12cd...ef34
   ZK Proof A:     ✓ VALID
   ZK Proof B:     ✓ VALID

✓ Dual-signing commitment (ES256K)...
✓ Submitting to CommitmentContract.sol...

Commitment ID:  cmt_01HZN6A1B2C3D4E5F6G7H8I9J0
On-chain TX:    0x5c9f2...8e47 (block 12,847,458)
Gas used:       84,291

✓ Commitment anchored on Arbitrum Sepolia.
  Verifiable at: https://sepolia.arbiscan.io/tx/0x5c9f2...8e47`,
  },
];

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white">Interactive Demo</h1>
          <p className="mt-4 text-navy-400">
            Walk through a full Attestara agent trust flow — from DID
            registration to on-chain commitment.
          </p>
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i === currentStep
                  ? "bg-accent text-white"
                  : i < currentStep
                  ? "bg-verified text-white"
                  : "border border-navy-700 bg-navy-800 text-navy-400 hover:border-navy-600"
              }`}
              aria-label={`Step ${i + 1}: ${s.title}`}
            >
              {i < currentStep ? "✓" : i + 1}
            </button>
          ))}
        </div>

        {/* Step card */}
        <div className="rounded-2xl border border-navy-800 bg-navy-900 overflow-hidden">
          {/* Step header */}
          <div className="border-b border-navy-800 px-8 py-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                {currentStep + 1}
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-navy-500">
                  Step {currentStep + 1} of {steps.length}
                </p>
                <h2 className="text-xl font-bold text-white">{step.title}</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-navy-400">
              {step.description}
            </p>
          </div>

          {/* Terminal output */}
          <div className="bg-navy-950 px-8 py-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-danger/70" />
              <div className="h-3 w-3 rounded-full bg-warning/70" />
              <div className="h-3 w-3 rounded-full bg-verified/70" />
              <span className="ml-2 text-xs text-navy-600">terminal</span>
            </div>
            <pre className="overflow-x-auto text-xs leading-relaxed text-navy-200 font-mono whitespace-pre">
              {step.output}
            </pre>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-navy-800 px-8 py-5">
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={isFirst}
              className="rounded-lg border border-navy-700 bg-navy-800 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-navy-600 hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>

            <span className="text-xs text-navy-500">
              {currentStep + 1} / {steps.length}
            </span>

            {isLast ? (
              <Link
                href="/register"
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Get Started →
              </Link>
            ) : (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Next →
              </button>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-8 flex flex-col items-center gap-2 text-sm text-navy-500 sm:flex-row sm:justify-center sm:gap-6">
          <Link href="/docs" className="text-accent hover:text-accent-hover">
            Read the full docs →
          </Link>
          <Link href="/pricing" className="text-accent hover:text-accent-hover">
            See pricing plans →
          </Link>
        </div>
      </div>
    </div>
  );
}
