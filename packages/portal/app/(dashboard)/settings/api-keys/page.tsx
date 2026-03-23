"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, Modal } from "@/components/ui";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  lastUsed: string;
  createdAt: string;
}

const mockApiKeys: ApiKey[] = [
  {
    id: "key_01",
    name: "Production Backend",
    prefix: "ac_7f3a9b2e...c5f7",
    scopes: "agents:read, sessions:read, commitments:read",
    lastUsed: "2 min ago",
    createdAt: "2026-03-01",
  },
  {
    id: "key_02",
    name: "Staging Environment",
    prefix: "ac_4c3b2a1f...9f8e",
    scopes: "agents:*, sessions:*, credentials:*",
    lastUsed: "1 hr ago",
    createdAt: "2026-02-15",
  },
  {
    id: "key_03",
    name: "CI/CD Pipeline",
    prefix: "ac_2a1f0e9d...b1a0",
    scopes: "agents:read",
    lastUsed: "3 days ago",
    createdAt: "2026-02-01",
  },
];

const columns = [
  {
    key: "name" as const,
    label: "Name",
    sortable: true,
    render: (v: unknown) => (
      <span className="text-sm font-medium text-white">{String(v)}</span>
    ),
  },
  {
    key: "prefix" as const,
    label: "Key",
    render: (v: unknown) => (
      <span className="font-mono text-xs text-gray-400">{String(v)}</span>
    ),
  },
  {
    key: "scopes" as const,
    label: "Scopes",
    render: (v: unknown) => (
      <span className="text-xs text-gray-400">{String(v)}</span>
    ),
  },
  {
    key: "lastUsed" as const,
    label: "Last Used",
    render: (v: unknown) => (
      <span className="text-xs text-gray-500">{String(v)}</span>
    ),
  },
  {
    key: "createdAt" as const,
    label: "Created",
    sortable: true,
    render: (v: unknown) => (
      <span className="text-xs text-gray-500">{String(v)}</span>
    ),
  },
  {
    key: "id" as const,
    label: "Actions",
    render: () => (
      <button className="text-xs text-danger hover:text-danger/80 transition-colors">
        Revoke
      </button>
    ),
  },
];

export default function ApiKeysPage() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    // Simulate key generation
    const key =
      "ac_" +
      Array.from({ length: 48 }, () =>
        Math.floor(Math.random() * 36).toString(36)
      ).join("");
    setGeneratedKey(key);
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setGenerateOpen(false);
    setKeyName("");
    setGeneratedKey("");
    setCopied(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your organization, members, and preferences
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-4 border-b border-navy-800 pb-3">
        <Link
          href="/settings"
          className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors"
        >
          Organization
        </Link>
        <span className="text-sm font-medium text-accent border-b-2 border-accent pb-3 -mb-3">
          API Keys
        </span>
        <Link
          href="/settings/billing"
          className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors"
        >
          Billing
        </Link>
      </div>

      {/* API Keys */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">API Keys</h2>
        <button
          onClick={() => setGenerateOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Generate API Key
        </button>
      </div>

      <DataTable
        columns={columns}
        data={mockApiKeys as unknown as Record<string, unknown>[]}
        searchable={false}
      />

      <div className="rounded-lg border border-navy-800 bg-navy-950 p-4">
        <p className="text-xs text-gray-500">
          API keys provide programmatic access to the AgentClear API. Store them
          securely — they cannot be viewed again after creation.
        </p>
      </div>

      {/* Generate Key Modal */}
      <Modal
        open={generateOpen}
        onClose={handleClose}
        title={generatedKey ? "API Key Generated" : "Generate API Key"}
        footer={
          <div className="flex justify-end gap-3">
            {generatedKey ? (
              <button
                onClick={handleClose}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!keyName.trim()}
                  onClick={handleGenerate}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                >
                  Generate
                </button>
              </>
            )}
          </div>
        }
      >
        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs text-warning">
                Copy this key now. It will not be shown again.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={generatedKey}
                readOnly
                className="flex-1 rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-xs font-mono text-white outline-none"
              />
              <button
                onClick={handleCopy}
                className="rounded-lg border border-navy-800 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {copied ? "\u2713 Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Key Name
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Production Backend"
                className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
