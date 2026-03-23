"use client";

import Link from "next/link";
import { DataTable, ChainLink } from "@/components/ui";

interface Commitment {
  id: string;
  sessionId: string;
  agreementHash: string;
  partyA: string;
  partyB: string;
  verified: string;
  txHash: string;
  createdAt: string;
}

const mockCommitments: Commitment[] = [
  {
    id: "cmt_01HZN6A1B2C3D4E5F6G7H8I9J0",
    sessionId: "sess_01HZN5U1V2W3X4Y5Z6A7B8C9D0",
    agreementHash:
      "0x3e8b2f9a1c4d6e7f0a5b8c3d9e1f2a4b6c7d8e0f1a3b5c7d9e0f2a4b6c8d0e",
    partyA: "procurement-bot-eu",
    partyB: "sales-agent-na",
    verified: "true",
    txHash:
      "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8",
    createdAt: "2026-03-21T17:00:00Z",
  },
  {
    id: "cmt_01HZN6K1L2M3N4O5P6Q7R8S9T0",
    sessionId: "sess_01HZN5E1F2G3H4I5J6K7L8M9N0",
    agreementHash:
      "0x7a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
    partyA: "procurement-bot-eu",
    partyB: "vendor-assessment-v1",
    verified: "true",
    txHash:
      "0x4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f87e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2",
    createdAt: "2026-03-20T10:30:00Z",
  },
  {
    id: "cmt_01HZN6U1V2W3X4Y5Z6A7B8C9D0",
    sessionId: "sess_01HZN5K1L2M3N4O5P6Q7R8S9T0",
    agreementHash:
      "0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
    partyA: "compliance-checker",
    partyB: "logistics-negotiator",
    verified: "true",
    txHash:
      "0x2a1f0e9d8c7b6a5f4e3d2c1b0a9f87e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0",
    createdAt: "2026-03-19T14:15:00Z",
  },
  {
    id: "cmt_01HZN6E1F2G3H4I5J6K7L8M9N0",
    sessionId: "sess_01HZN5Y1Z2A3B4C5D6E7F8G9H0",
    agreementHash:
      "0xd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
    partyA: "sales-agent-na",
    partyB: "compliance-checker",
    verified: "false",
    txHash:
      "0x0e9d8c7b6a5f4e3d2c1b0a9f87e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8",
    createdAt: "2026-03-18T08:45:00Z",
  },
];

const columns = [
  {
    key: "id" as const,
    label: "ID",
    render: (_: unknown, row: Commitment) => (
      <Link
        href={`/commitments/${row.id}`}
        className="font-mono text-xs text-accent hover:text-accent-hover underline"
      >
        {row.id.slice(0, 16)}...
      </Link>
    ),
  },
  {
    key: "sessionId" as const,
    label: "Session",
    render: (v: unknown) => (
      <Link
        href={`/sessions/${String(v)}`}
        className="font-mono text-xs text-gray-400 hover:text-white underline"
      >
        {String(v).slice(0, 12)}...
      </Link>
    ),
  },
  {
    key: "agreementHash" as const,
    label: "Agreement Hash",
    render: (v: unknown) => {
      const hash = String(v);
      return (
        <span className="font-mono text-xs text-gray-400">
          {hash.slice(0, 10)}...{hash.slice(-6)}
        </span>
      );
    },
  },
  {
    key: "partyA" as const,
    label: "Parties",
    render: (_: unknown, row: Commitment) => (
      <span className="text-sm text-white">
        {row.partyA}{" "}
        <span className="text-gray-500">&amp;</span>{" "}
        {row.partyB}
      </span>
    ),
  },
  {
    key: "verified" as const,
    label: "Verified",
    sortable: true,
    render: (v: unknown) => (
      <span
        className={`text-sm ${String(v) === "true" ? "text-verified" : "text-warning"}`}
      >
        {String(v) === "true" ? "\u2713" : "\u25CB"}
      </span>
    ),
  },
  {
    key: "txHash" as const,
    label: "Tx Hash",
    render: (v: unknown) => <ChainLink txHash={String(v)} />,
  },
  {
    key: "createdAt" as const,
    label: "Created",
    sortable: true,
    render: (v: unknown) => (
      <span className="text-sm text-gray-400">
        {new Date(String(v)).toLocaleDateString()}
      </span>
    ),
  },
];

export default function CommitmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Commitments</h1>
        <p className="mt-1 text-sm text-gray-400">
          On-chain commitment records and verification status
        </p>
      </div>

      <DataTable
        columns={columns}
        data={mockCommitments as unknown as Record<string, unknown>[]}
      />
    </div>
  );
}
