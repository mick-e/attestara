"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge, ChainLink, ProofBadge } from "@/components/ui";

// Mock agent detail
const mockAgent = {
  id: "ag_01HZN3KQXV7YJWF8RMTG5B2P4D",
  name: "procurement-bot-eu",
  did: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  status: "active",
  publicKey:
    "0x04a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  registrationTx:
    "0x7f3a9b2e4d6c8f1a0e5b7d3c9f2a4e6b8d0c1f3a5e7b9d2c4f6a8e0b1d3c5f7",
  createdAt: "2026-03-15T09:30:00Z",
  credentials: [
    {
      id: "cred_01HZN4ABCD",
      domain: "IT Equipment",
      maxValue: "500000",
      currency: "EUR",
      status: "active",
      expiry: "2026-09-15",
    },
    {
      id: "cred_01HZN4EFGH",
      domain: "Cloud Services",
      maxValue: "200000",
      currency: "EUR",
      status: "active",
      expiry: "2026-06-30",
    },
    {
      id: "cred_01HZN4IJKL",
      domain: "Office Supplies",
      maxValue: "50000",
      currency: "EUR",
      status: "expired",
      expiry: "2026-02-28",
    },
  ],
  sessions: [
    {
      id: "sess_01HZN5MNOP",
      counterparty: "sales-agent-na",
      status: "completed",
      turns: 6,
      date: "2026-03-20",
    },
    {
      id: "sess_01HZN5QRST",
      counterparty: "vendor-assessment-v1",
      status: "active",
      turns: 3,
      date: "2026-03-22",
    },
    {
      id: "sess_01HZN5UVWX",
      counterparty: "logistics-negotiator",
      status: "rejected",
      turns: 4,
      date: "2026-03-18",
    },
  ],
};

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/agents" className="hover:text-white transition-colors">
          Agents
        </Link>
        <span>/</span>
        <span className="text-white">{mockAgent.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {mockAgent.name}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Agent ID: {agentId}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-gray-400 hover:text-white hover:border-warning transition-colors">
            Rotate Key
          </button>
          <button className="rounded-lg border border-danger/30 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors">
            Deactivate
          </button>
        </div>
      </div>

      {/* Agent Info */}
      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Status
            </p>
            <StatusBadge status={mockAgent.status} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Created
            </p>
            <p className="text-sm text-white">
              {new Date(mockAgent.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              DID
            </p>
            <p className="font-mono text-sm text-gray-300 break-all">
              {mockAgent.did}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Public Key
            </p>
            <p className="font-mono text-xs text-gray-400 break-all">
              {mockAgent.publicKey}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              Registration Transaction
            </p>
            <ChainLink txHash={mockAgent.registrationTx} />
          </div>
        </div>
      </div>

      {/* Assigned Credentials */}
      <div className="rounded-lg border border-navy-800 bg-navy-900">
        <div className="border-b border-navy-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Assigned Credentials
          </h2>
        </div>
        <div className="divide-y divide-navy-800">
          {mockAgent.credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex-1">
                <Link
                  href={`/credentials/${cred.id}`}
                  className="text-sm font-medium text-accent hover:text-accent-hover underline"
                >
                  {cred.domain}
                </Link>
                <p className="mt-0.5 text-xs text-gray-500">
                  Max: {cred.currency === "EUR" ? "\u20AC" : "$"}
                  {Number(cred.maxValue).toLocaleString()} &middot; Expires{" "}
                  {cred.expiry}
                </p>
              </div>
              <StatusBadge status={cred.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Session History */}
      <div className="rounded-lg border border-navy-800 bg-navy-900">
        <div className="border-b border-navy-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Session History</h2>
        </div>
        <div className="divide-y divide-navy-800">
          {mockAgent.sessions.map((sess) => (
            <div
              key={sess.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex-1">
                <Link
                  href={`/sessions/${sess.id}`}
                  className="text-sm font-medium text-accent hover:text-accent-hover underline"
                >
                  {sess.id.slice(0, 16)}...
                </Link>
                <p className="mt-0.5 text-xs text-gray-500">
                  vs {sess.counterparty} &middot; {sess.turns} turns &middot;{" "}
                  {sess.date}
                </p>
              </div>
              <StatusBadge status={sess.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
