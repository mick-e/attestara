"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable, StatusBadge, Modal, LoadingSpinner, ErrorState, EmptyState } from "@/components/ui";
import { useAgents, useCreateAgent } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient, type Agent } from "@/lib/api-client";

// Mock fallback data
const mockAgents: Agent[] = [
  {
    id: "ag_01HZN3KQXV7YJWF8RMTG5B2P4D",
    orgId: "",
    name: "procurement-bot-eu",
    did: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    status: "active",
    metadata: {},
    publicKey: "",
    registeredTxHash: null,
    createdAt: "2026-03-15T09:30:00Z",
  },
  {
    id: "ag_01HZN3KQXV7YJWF8RMTG5B2P5E",
    orgId: "",
    name: "sales-agent-na",
    did: "did:key:z6MkpTHR8VNs5zPAj48NStGqtZKmME7t42DXYhQHnvVAkgs2",
    status: "active",
    metadata: {},
    publicKey: "",
    registeredTxHash: null,
    createdAt: "2026-03-14T14:22:00Z",
  },
  {
    id: "ag_01HZN3KQXV7YJWF8RMTG5B2P6F",
    orgId: "",
    name: "compliance-checker",
    did: "did:key:z6Mkw1KSvGWNR7MYq8FL1ZBzbFPwyYkDCALNY9RNxEd7jKs3",
    status: "active",
    metadata: {},
    publicKey: "",
    registeredTxHash: null,
    createdAt: "2026-03-12T11:45:00Z",
  },
  {
    id: "ag_01HZN3KQXV7YJWF8RMTG5B2P7G",
    orgId: "",
    name: "logistics-negotiator",
    did: "did:key:z6MknGc3ocHs3zdPiJbnaaqDi58GCBQ1iP6jD55gPgrFiEr4",
    status: "paused",
    metadata: {},
    publicKey: "",
    registeredTxHash: null,
    createdAt: "2026-03-10T08:15:00Z",
  },
  {
    id: "ag_01HZN3KQXV7YJWF8RMTG5B2P8H",
    orgId: "",
    name: "vendor-assessment-v1",
    did: "did:key:z6MksHh7qHWvybLg5QTPPdG2DYhqSJJkFmz8hZ7EQMj5CqnT",
    status: "expired",
    metadata: {},
    publicKey: "",
    registeredTxHash: null,
    createdAt: "2026-02-28T16:00:00Z",
  },
];

const columns = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (_: unknown, row: Record<string, unknown>) => (
      <Link
        href={`/agents/${row.id}`}
        className="font-medium text-accent hover:text-accent-hover underline"
      >
        {String(row.name)}
      </Link>
    ),
  },
  {
    key: "did",
    label: "DID",
    render: (v: unknown) => {
      const did = String(v);
      return (
        <span className="font-mono text-xs text-gray-400">
          {did.slice(0, 20)}...{did.slice(-8)}
        </span>
      );
    },
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (v: unknown) => <StatusBadge status={String(v)} />,
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    render: (v: unknown) => (
      <span className="text-gray-400">
        {new Date(String(v)).toLocaleDateString()}
      </span>
    ),
  },
];

export default function AgentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [agentName, setAgentName] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: agents, loading, error, refetch } = useAgents();
  const { createAgent, loading: creating } = useCreateAgent();

  // Use API data if available, mock data as fallback
  const displayAgents = agents ?? mockAgents;

  async function handleProvision() {
    if (!agentName.trim()) return;
    try {
      // Generate a real did:ethr via the relay's SDK Veramo integration
      const { did, publicKey } = await apiClient.did.provision(agentName);
      await createAgent({
        did,
        name: agentName,
        publicKey,
        metadata: {},
      });
      setModalOpen(false);
      setAgentName("");
      refetch();
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agents</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your autonomous AI agents and their credentials
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Provision Agent
        </button>
      </div>

      {loading ? (
        <div className="py-12">
          <LoadingSpinner label="Loading agents..." />
        </div>
      ) : displayAgents.length === 0 ? (
        <EmptyState
          title="No agents yet"
          description="Provision your first AI agent to get started with attestations."
          action={{ label: "Provision Agent", onClick: () => setModalOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={displayAgents as unknown as Record<string, unknown>[]} />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision Agent"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleProvision}
              disabled={!agentName.trim() || creating}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
            >
              {creating ? "Provisioning..." : "Provision"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Agent Name
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. procurement-bot-eu"
              className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
            />
          </div>
          <p className="text-xs text-gray-500">
            A DID and key pair will be generated automatically upon provisioning.
          </p>
        </div>
      </Modal>
    </div>
  );
}
