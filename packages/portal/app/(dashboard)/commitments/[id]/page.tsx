"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge, ChainLink, ProofBadge, LoadingSpinner, ErrorState } from "@/components/ui";
import { useCommitment } from "@/lib/hooks";

const mockCommitment = {
  id: "cmt_01HZN6A1B2C3D4E5F6G7H8I9J0",
  sessionId: "sess_01HZN5U1V2W3X4Y5Z6A7B8C9D0",
  agreementHash:
    "0x3e8b2f9a1c4d6e7f0a5b8c3d9e1f2a4b6c7d8e0f1a3b5c7d9e0f2a4b6c8d0e",
  partyA: {
    name: "procurement-bot-eu",
    id: "ag_01HZN3KQXV7YJWF8RMTG5B2P4D",
    credentialHash:
      "0xaa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  },
  partyB: {
    name: "sales-agent-na",
    id: "ag_01HZN3KQXV7YJWF8RMTG5B2P5E",
    credentialHash:
      "0xbb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  verified: true,
  createdAt: "2026-03-21T17:00:00Z",
  onChain: {
    txHash:
      "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8",
    blockNumber: 18_294_571,
    chainId: 421614,
  },
  proofs: [
    {
      circuit: "MandateBound",
      version: "v1.2.0",
      status: "on-chain" as const,
      timeMs: 420,
      proofData: {
        pi_a: [
          "0x2a8f3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
          "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
        ],
        pi_b: [
          [
            "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
            "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
          ],
        ],
        pi_c: [
          "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
          "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a",
        ],
        protocol: "groth16",
        curve: "bn128",
      },
    },
    {
      circuit: "CredFreshness",
      version: "v1.1.0",
      status: "on-chain" as const,
      timeMs: 380,
      proofData: {
        pi_a: [
          "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
          "0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c",
        ],
        pi_b: [
          [
            "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
            "0x0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e",
          ],
        ],
        pi_c: [
          "0x1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
          "0x2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
        ],
        protocol: "groth16",
        curve: "bn128",
      },
    },
    {
      circuit: "ParamRange",
      version: "v1.0.0",
      status: "on-chain" as const,
      timeMs: 510,
      proofData: {
        pi_a: [
          "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
          "0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
        ],
        pi_b: [
          [
            "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
            "0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
          ],
        ],
        pi_c: [
          "0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
          "0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
        ],
        protocol: "groth16",
        curve: "bn128",
      },
    },
  ],
};

export default function CommitmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: commitment, loading, error } = useCommitment(id);
  const [expandedProof, setExpandedProof] = useState<number | null>(null);

  if (loading)
    return (
      <div className="py-12">
        <LoadingSpinner label="Loading commitment..." />
      </div>
    );
  if (error) return <ErrorState message={error} />;

  const display = commitment ?? mockCommitment;

  // Determine if we're using API data (has flat parties array) or mock (has partyA/partyB objects)
  const isApiData = commitment !== null;

  // On-chain info: API uses top-level txHash/blockNumber, mock uses onChain object
  const txHash = isApiData
    ? (commitment.txHash ?? "")
    : mockCommitment.onChain.txHash;
  const blockNumber = isApiData
    ? (commitment.blockNumber ?? null)
    : mockCommitment.onChain.blockNumber;
  const chainId = isApiData ? 421614 : mockCommitment.onChain.chainId;

  // Proofs: API returns Record<string, unknown>, mock has rich array
  const apiProofs = isApiData
    ? Object.entries(commitment.proofs).map(([circuit, data]) => ({
        circuit,
        version: "v1.x.x",
        status: "on-chain" as const,
        timeMs: 0,
        proofData: data as Record<string, unknown>,
      }))
    : null;
  const displayProofs = apiProofs ?? mockCommitment.proofs;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link
          href="/commitments"
          className="hover:text-white transition-colors"
        >
          Commitments
        </Link>
        <span>/</span>
        <span className="text-white">{display.id.slice(0, 16)}...</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Commitment Detail
          </h1>
          <p className="mt-1 text-sm text-gray-400">{display.id}</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-accent/30 px-4 py-2 text-sm text-accent hover:bg-accent/10 transition-colors">
            Re-verify
          </button>
          <Link
            href={`/sessions/${display.sessionId}`}
            className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Session Replay
          </Link>
        </div>
      </div>

      {/* Commitment Info */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Verified
            </p>
            <span
              className={`inline-flex items-center gap-1.5 text-sm ${
                display.verified ? "text-verified" : "text-warning"
              }`}
            >
              {display.verified ? "\u2713 Verified" : "\u25CB Pending"}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Session
            </p>
            <Link
              href={`/sessions/${display.sessionId}`}
              className="text-sm text-accent hover:text-accent-hover underline"
            >
              {display.sessionId.slice(0, 16)}...
            </Link>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Created
            </p>
            <p className="text-sm text-white">
              {new Date(display.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Agreement Hash
            </p>
            <p className="font-mono text-sm text-gray-300 break-all">
              {display.agreementHash}
            </p>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isApiData ? (
          // API data: flat parties array of strings
          commitment.parties.map((partyName, i) => (
            <div
              key={i}
              className="rounded-lg border border-navy-800 bg-navy-900 p-6"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
                Party {i === 0 ? "A" : "B"}
              </p>
              <span className="text-sm font-medium text-white">{partyName}</span>
              {commitment.credentialHashes[i] && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Credential Hash</p>
                  <p className="font-mono text-xs text-gray-400 break-all">
                    {commitment.credentialHashes[i]}
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          // Mock data: partyA/partyB objects with id/name/credentialHash
          [mockCommitment.partyA, mockCommitment.partyB].map((party, i) => (
            <div
              key={i}
              className="rounded-lg border border-navy-800 bg-navy-900 p-6"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
                Party {i === 0 ? "A" : "B"}
              </p>
              <Link
                href={`/agents/${party.id}`}
                className="text-sm font-medium text-accent hover:text-accent-hover underline"
              >
                {party.name}
              </Link>
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Credential Hash</p>
                <p className="font-mono text-xs text-gray-400 break-all">
                  {party.credentialHash}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Proof Viewer */}
      <div className="rounded-lg border border-navy-800 bg-navy-900">
        <div className="border-b border-navy-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Proofs</h2>
        </div>
        <div className="divide-y divide-navy-800">
          {displayProofs.map((proof, i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ProofBadge
                    status={proof.status}
                    circuit={proof.circuit}
                    timeMs={proof.timeMs}
                  />
                  <span className="text-xs text-gray-500">{proof.version}</span>
                </div>
                <button
                  onClick={() =>
                    setExpandedProof(expandedProof === i ? null : i)
                  }
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {expandedProof === i ? "Hide JSON" : "Show JSON"}
                </button>
              </div>
              {expandedProof === i && (
                <div className="mt-3 rounded-lg border border-navy-800 bg-navy-950 p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                    {JSON.stringify(proof.proofData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* On-Chain Record */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          On-Chain Record
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Transaction
            </p>
            <ChainLink txHash={txHash} chainId={chainId} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Block Number
            </p>
            <p className="text-sm text-white font-mono">
              {blockNumber !== null ? blockNumber.toLocaleString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Chain ID
            </p>
            <p className="text-sm text-white font-mono">
              {chainId}{" "}
              <span className="text-gray-500">(Arbitrum Sepolia)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
